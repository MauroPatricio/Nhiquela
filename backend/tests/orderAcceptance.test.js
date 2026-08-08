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

// Mock para IO
app.set('io', {
  to: () => ({ emit: () => {} }),
  emit: () => {}
});

app.use('/api/orders', orderRouter);

describe('Order Acceptance Flow', () => {
  let driverToken, driverId, orderId, sellerId, clientId, providerId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // Criar Cliente
    const client = new User({
      name: 'Client Test',
      email: `client_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000001 + Math.floor(Math.random() * 10000),
      latitude: 10,
      longitude: 10
    });
    await client.save();
    clientId = client._id;

    // Criar Seller/Provider
    const provider = new Provider({
      name: 'Loja Teste',
      providerType: 'Store',
      userId: clientId,
      location: {
        address: 'Rua do Vendedor',
        lat: -25.9692,
        lng: 32.5732
      }
    });
    await provider.save();
    providerId = provider._id;

    // Criar Motorista
    const driver = new User({
      name: 'Driver Test',
      email: `driver_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000002 + Math.floor(Math.random() * 10000),
      isDeliveryMan: true,
      latitude: -25.9690,
      longitude: 32.5730,
      deliveryman: {
        status: 'Ativo',
        register_conformance: 'CONFORMANCE',
        transport_type: 'Mota'
      }
    });
    await driver.save();
    driverId = driver._id;

    driverToken = jwt.sign(
      { _id: driverId, name: driver.name, email: driver.email, isAdmin: false },
      process.env.JWT_SECRET || 'somethingsecret',
      { expiresIn: '30d' }
    );

    // Carregar carteira do motorista para ele conseguir pagar a comissão
    const wallet = new Wallet({
      user: driverId,
      ownerType: 'User',
      ownerId: driverId,
      balance: 5000, // Saldo suficiente
      currency: 'MZN'
    });
    await wallet.save();

  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should populate seller location data when driver accepts an order', async () => {
    // Criar Order
    const order = new Order({
      user: clientId,
      seller: providerId,
      paymentMethod: 'Dinheiro',
      status: 'Pendente',
      totalPrice: 1000,
      deliveryPrice: 200,
      originDetails: { address: '' },
      deliveryAddress: { address: 'Rua do Cliente', latitude: -25.97, longitude: 32.58 }
    });
    await order.save();
    orderId = order._id;

    // Motorista aceita o pedido
    const response = await request(app)
      .put(`/api/orders/${orderId}/acceptedByDeliveryman`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    if (response.status !== 200) {
      console.log(response.text);
    }

    expect(response.status).toBe(200);
    expect(response.body.order).toBeDefined();
    
    // Verificar se o order possui seller populado com location
    const returnedOrder = response.body.order;
    expect(returnedOrder.seller).toBeDefined();
    expect(returnedOrder.seller.name).toBe('Loja Teste');
    expect(returnedOrder.seller.location).toBeDefined();
    expect(returnedOrder.seller.location.lat).toBe(-25.9692);
    expect(returnedOrder.seller.location.lng).toBe(32.5732);
    expect(returnedOrder.seller.location.address).toBe('Rua do Vendedor');

    // Verificar os dados do motorista também populados
    expect(returnedOrder.deliveryman).toBeDefined();
    expect(returnedOrder.deliveryman.id).toBe(driverId.toString());
  });
});
