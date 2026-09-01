import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import Wallet from '../models/WalletModel.js';
import orderRouter from '../routes/orderRoutes.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

app.set('io', {
  to: () => ({ emit: () => {} }),
  emit: () => {}
});

app.use('/api/orders', orderRouter);

describe('Delivery Flow Scenarios (E2E Tests)', () => {
  let sellerToken, clientToken, driverToken;
  let sellerUser, clientUser, driverUser;
  let providerDoc;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Criar Utilizador Cliente
    clientUser = new User({
      name: 'Cliente E2E Test',
      email: `client_e2e_${Date.now()}@test.com`,
      password: 'password123',
      phoneNumber: 841000001 + Math.floor(Math.random() * 10000),
      latitude: -25.9600,
      longitude: 32.5700
    });
    await clientUser.save();

    clientToken = jwt.sign(
      { _id: clientUser._id, name: clientUser.name, email: clientUser.email, isAdmin: false },
      process.env.JWT_SECRET || 'somethingsecret',
      { expiresIn: '1d' }
    );

    // 2. Criar Utilizador Fornecedor & Provider
    sellerUser = new User({
      name: 'Vendedor E2E Test',
      email: `seller_e2e_${Date.now()}@test.com`,
      password: 'password123',
      phoneNumber: 841000002 + Math.floor(Math.random() * 10000),
      isSeller: true,
      seller: { name: 'Loja E2E', openstore: true }
    });
    await sellerUser.save();

    providerDoc = new Provider({
      name: 'Loja E2E Test',
      providerType: 'Store',
      userId: sellerUser._id,
      ownerId: sellerUser._id,
      location: { address: 'Av. Eduardo Mondlane, Maputo', lat: -25.9692, lng: 32.5732 }
    });
    await providerDoc.save();

    sellerToken = jwt.sign(
      { _id: sellerUser._id, name: sellerUser.name, email: sellerUser.email, isAdmin: false },
      process.env.JWT_SECRET || 'somethingsecret',
      { expiresIn: '1d' }
    );

    // Wallet do Fornecedor para saldo de operacao
    const sellerWallet = new Wallet({
      ownerId: providerDoc._id,
      ownerType: 'seller',
      userId: sellerUser._id,
      balance: 1000,
      currency: 'MZN'
    });
    await sellerWallet.save();

    // 3. Criar Utilizador Motorista
    driverUser = new User({
      name: 'Motorista E2E Test',
      email: `driver_e2e_${Date.now()}@test.com`,
      password: 'password123',
      phoneNumber: 841000003 + Math.floor(Math.random() * 10000),
      isDeliveryMan: true,
      deliveryman: { status: 'Ativo', transport_type: 'Mota' }
    });
    await driverUser.save();

    driverToken = jwt.sign(
      { _id: driverUser._id, name: driverUser.name, email: driverUser.email, isAdmin: false },
      process.env.JWT_SECRET || 'somethingsecret',
      { expiresIn: '1d' }
    );

    const driverWallet = new Wallet({
      ownerId: driverUser._id,
      ownerType: 'User',
      userId: driverUser._id,
      balance: 2000,
      currency: 'MZN'
    });
    await driverWallet.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // --- CENÁRIO 1: Pedido SEM necessidade de transporte ---
  it('Cenário 1: Pedido SEM transporte (Disponível p/ entrega -> Em trânsito -> Cliente confirma recepção)', async () => {
    // 1. Criar Pedido sem transporte
    const order = new Order({
      code: `TEST-NO-TRANS-${Date.now().toString().slice(-4)}`,
      user: clientUser._id,
      seller: providerDoc._id,
      paymentMethod: 'Dinheiro',
      status: 'Pendente',
      stepStatus: 1,
      itemsPrice: 500,
      totalPrice: 500,
      deliveryPrice: 0,
      isUserWantDelivery: false,
      transportType: null,
    });
    await order.save();

    // 2. Fornecedor aceita o pedido
    const acceptRes = await request(app)
      .put(`/api/orders/${order._id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.order.status).toBe('Aceite');
    expect(acceptRes.body.order.stepStatus).toBe(2);

    // 3. Fornecedor clica em "Disponível p/ entrega" sem transporte -> avança diretamente para "Em trânsito"
    const toDelivRes = await request(app)
      .put(`/api/orders/${order._id}/toDeliv`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ noTransport: true });

    expect(toDelivRes.status).toBe(200);
    expect(toDelivRes.body.order.status).toBe('Em trânsito');
    expect(toDelivRes.body.order.isInTransit).toBe(true);
    expect(toDelivRes.body.order.stepStatus).toBe(4);

    // 4. Cliente clica em "Confirmar a recepção" -> finalizado com sucesso
    const deliverRes = await request(app)
      .put(`/api/orders/${order._id}/deliver`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({});

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('Entregue');
    expect(deliverRes.body.order.isDelivered).toBe(true);
    expect(deliverRes.body.order.stepStatus).toBe(5);
  });

  // --- CENÁRIO 2: Pedido COM transporte + Deliver Externo por chamada ---
  it('Cenário 2: Pedido COM transporte usando Deliver Externo (Solicitar Externo -> Em trânsito -> Cliente confirma)', async () => {
    // 1. Criar Pedido com transporte
    const order = new Order({
      code: `TEST-EXT-DELIV-${Date.now().toString().slice(-4)}`,
      user: clientUser._id,
      seller: providerDoc._id,
      paymentMethod: 'Transferência móvel',
      status: 'Pendente',
      stepStatus: 1,
      itemsPrice: 1200,
      deliveryPrice: 100,
      totalPrice: 1300,
      isUserWantDelivery: true,
      transportType: 'Mota',
    });
    await order.save();

    // 2. Fornecedor aceita o pedido
    const acceptRes = await request(app)
      .put(`/api/orders/${order._id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.order.status).toBe('Aceite');

    // 3. Fornecedor opta por Deliver Externo
    const extDelivRes = await request(app)
      .put(`/api/orders/${order._id}/toDeliv`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ isExternalDelivery: true });

    expect(extDelivRes.status).toBe(200);
    expect(extDelivRes.body.order.status).toBe('Disponível para entrega');
    expect(extDelivRes.body.order.isExternalDelivery).toBe(true);
    expect(extDelivRes.body.order.stepStatus).toBe(3);

    // 4. Fornecedor combina por chamada e marca "Em trânsito"
    const inTransitRes = await request(app)
      .put(`/api/orders/${order._id}/intransit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});

    expect(inTransitRes.status).toBe(200);
    expect(inTransitRes.body.order.status).toBe('Em trânsito');
    expect(inTransitRes.body.order.stepStatus).toBe(4);

    // 5. Cliente clica em "Confirmar entregue"
    const deliverRes = await request(app)
      .put(`/api/orders/${order._id}/deliver`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({});

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('Entregue');
    expect(deliverRes.body.order.isDelivered).toBe(true);
    expect(deliverRes.body.order.stepStatus).toBe(5);
  });

  // --- CENÁRIO 3: Pedido COM transporte com Motorista Nhiquela Interno ---
  it('Cenário 3: Pedido COM transporte com Motorista Nhiquela (Motorista aceita -> Em trânsito -> Cliente confirma)', async () => {
    // 1. Criar Pedido
    const order = new Order({
      code: `TEST-INT-DRIVER-${Date.now().toString().slice(-4)}`,
      user: clientUser._id,
      seller: providerDoc._id,
      paymentMethod: 'Dinheiro',
      status: 'Pendente',
      stepStatus: 1,
      itemsPrice: 800,
      deliveryPrice: 150,
      totalPrice: 950,
      isUserWantDelivery: true,
      transportType: 'Mota',
    });
    await order.save();

    // 2. Fornecedor aceita
    await request(app)
      .put(`/api/orders/${order._id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});

    // 3. Motorista aceita a corrida
    const driverAcceptRes = await request(app)
      .put(`/api/orders/${order._id}/acceptedByDeliveryman`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(driverAcceptRes.status).toBe(200);
    expect(driverAcceptRes.body.order.deliveryman).toBeDefined();

    // 4. Marca em trânsito
    const inTransitRes = await request(app)
      .put(`/api/orders/${order._id}/intransit`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(inTransitRes.status).toBe(200);
    expect(inTransitRes.body.order.status).toBe('Em trânsito');

    // 5. Cliente confirma a recepção
    const deliverRes = await request(app)
      .put(`/api/orders/${order._id}/deliver`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({});

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('Entregue');
    expect(deliverRes.body.order.stepStatus).toBe(5);
  });
});
