/**
 * ============================================================================
 * TESTES E2E JEST: Pedidos COM Delivery vs Pedidos SEM Delivery (Levantamento)
 * ============================================================================
 * Testes completos de integração cobrindo os fluxos de ponta a ponta:
 *  - Cenário 1: Pedido COM transporte/entrega (isUserWantDelivery: true)
 *    Cliente cria -> Vendedor aceita -> Vendedor agenda entrega -> Motorista aceita -> Em trânsito -> Entregue
 *  - Cenário 2: Pedido SEM transporte/entrega (isUserWantDelivery: false)
 *    Cliente cria -> Vendedor aceita -> Vendedor marca p/ levantamento (noTransport) -> Cliente confirma levantamento
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import User from '../models/UserModel.js';
import Order from '../models/OrderModel.js';
import Product from '../models/ProductModel.js';
import Provider from '../models/ProviderModel.js';
import Wallet from '../models/WalletModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Settings from '../models/SettingsModel.js';
import Category from '../models/CategoryModel.js';
import VehicleType from '../models/VehicleTypeModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import ProviderType from '../models/ProviderTypeModel.js';
import ProviderClassification from '../models/ProviderClassificationModel.js';

import orderRoutes from '../routes/orderRoutes.js';
import requestServiceRoutes from '../routes/requestServiceRoutes.js';
import driverRoutes from '../routes/driverRoutes.js';

const app = express();
app.use(express.json());

// Mock Socket.io
const mockIo = {
  to: () => ({ emit: () => {} }),
  in: () => ({ emit: () => {}, fetchSockets: async () => [] }),
  emit: () => {},
  sockets: {
    adapter: {
      rooms: {
        get: () => new Set(),
      },
    },
  },
};
app.set('io', mockIo);

app.use('/api/orders', orderRoutes);
app.use('/api/request-services', requestServiceRoutes);
app.use('/api/drivers', driverRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'somethingsecret';
const generateToken = (user) =>
  jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      isSeller: user.isSeller || false,
      isDeliveryMan: user.isDeliveryMan || false,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

describe('E2E Jest: Pedidos COM Delivery vs SEM Delivery', () => {
  let clientUser, clientToken;
  let sellerUser, sellerToken, providerId;
  let driverUser, driverToken;
  let vehicleTypeId, subcategoryId;
  let productDoc;

  const TS = Date.now();
  const SELLER_EMAIL = `seller_flow_${TS}@nhiquela.test`;
  const CLIENT_EMAIL = `client_flow_${TS}@nhiquela.test`;
  const DRIVER_EMAIL = `driver_flow_${TS}@nhiquela.test`;

  beforeAll(async () => {
    // Conectar ao Banco de Dados (Atlas / Test DB)
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Configuração inicial de taxa de comissão
    await Settings.findOneAndUpdate(
      { key: 'platform_commission_rate' },
      { key: 'platform_commission_rate', value: '10' },
      { upsert: true }
    );

    // Criar Veículo
    const vt = await VehicleType.create({
      name: `Mota Test ${TS}`,
      category: 'leve',
      basePrice: 50,
      baseFare: 50,
      pricePerKm: 10,
      isActive: true,
    });
    vehicleTypeId = vt._id;

    // Classification & Type
    let serviceCls = await ProviderClassification.findOne({ name: 'SERVICE' });
    if (!serviceCls) {
      serviceCls = await ProviderClassification.create({ name: 'SERVICE' });
    }
    let serviceProvType = await ProviderType.findOne({ classificationId: serviceCls._id });
    if (!serviceProvType) {
      serviceProvType = await ProviderType.create({ name: 'Transporte Test', classificationId: serviceCls._id });
    }

    const subcat = await ProviderSubcategory.create({
      name: `Entregas Mota ${TS}`,
      providerTypeId: serviceProvType._id,
      isActive: true,
      vehicleTypes: [vehicleTypeId],
      baseFare: 50,
      pricePerKm: 10,
    });
    subcategoryId = subcat._id;

    // 1. VENDEDOR / FORNECEDOR
    sellerUser = await User.create({
      name: 'Fornecedor E2E',
      email: SELLER_EMAIL,
      password: 'password123',
      phoneNumber: `258849${Math.floor(Math.random() * 900000) + 100000}`,
      isSeller: true,
      seller: {
        name: 'Loja Teste E2E',
        tipoEstabelecimento: subcategoryId,
        latitude: -25.9690,
        longitude: 32.5730,
        hasUsedFreeSale: true,
      },
    });
    sellerToken = generateToken(sellerUser);

    const provider = await Provider.create({
      ownerId: sellerUser._id,
      userId: sellerUser._id,
      name: 'Loja Teste E2E',
      providerType: 'Loja',
      phoneNumber: sellerUser.phoneNumber,
      status: 'active',
      location: { lat: -25.9690, lng: 32.5730, address: 'Av. Julius Nyerere 100, Maputo' },
    });
    providerId = provider._id;

    await Wallet.create({
      ownerId: sellerUser._id,
      ownerType: 'seller',
      userId: sellerUser._id,
      balance: 5000,
    });

    // 2. CLIENTE
    clientUser = await User.create({
      name: 'Cliente E2E',
      email: CLIENT_EMAIL,
      password: 'password123',
      phoneNumber: `258848${Math.floor(Math.random() * 900000) + 100000}`,
    });
    clientToken = generateToken(clientUser);

    // 3. MOTORISTA / ENTREGADOR
    driverUser = await User.create({
      name: 'Entregador E2E',
      email: DRIVER_EMAIL,
      password: 'password123',
      phoneNumber: `258847${Math.floor(Math.random() * 900000) + 100000}`,
      isDeliveryMan: true,
      isApproved: true,
      status: 'Disponível',
      latitude: -25.9700,
      longitude: 32.5740,
      deliveryman: {
        status: 'Ativo',
        transport_type: `Mota Test ${TS}`,
      },
    });
    driverToken = generateToken(driverUser);

    await Wallet.create({
      ownerId: driverUser._id,
      ownerType: 'driver',
      userId: driverUser._id,
      balance: 2000,
    });

    // Categoria & Produto
    let cat = await Category.findOne({ slug: 'cat-e2e-test' });
    if (!cat) {
      cat = await Category.create({ name: 'Cat Test', nome: 'Cat Test', slug: 'cat-e2e-test' });
    }

    productDoc = await Product.create({
      name: 'Item E2E',
      nome: 'Item E2E',
      slug: `item-e2e-${TS}`,
      price: 500,
      priceFromSeller: 450,
      comissionPercentage: 10,
      priceComission: 50,
      countInStock: 20,
      category: cat._id,
      seller: providerId,
      brand: 'Marca E2E',
      description: 'Item para teste de fluxo com e sem delivery',
      image: 'https://via.placeholder.com/150',
    });
  }, 60000);

  afterAll(async () => {
    // Limpeza de dados de teste
    try {
      const emails = [SELLER_EMAIL, CLIENT_EMAIL, DRIVER_EMAIL];
      await User.deleteMany({ email: { $in: emails } });
      await Provider.deleteMany({ ownerId: sellerUser?._id });
      await Wallet.deleteMany({ ownerId: { $in: [sellerUser?._id, driverUser?._id] } });
      await Order.deleteMany({ seller: providerId });
      await RequestService.deleteMany({ 'deliveryman.id': driverUser?._id });
      await VehicleType.deleteMany({ _id: vehicleTypeId });
      await ProviderSubcategory.deleteMany({ _id: subcategoryId });
      await Product.deleteMany({ _id: productDoc?._id });
    } catch (e) {}

    await mongoose.connection.close();
  }, 30000);

  // ==========================================================================
  // CENÁRIO 1: PEDIDO COM DELIVERY (isUserWantDelivery: true)
  // ==========================================================================
  describe('Cenário 1: Pedido COM Delivery (isUserWantDelivery: true)', () => {
    let orderWithDeliveryId;
    let requestServiceId;

    it('1.1 Cliente cria pedido solicitando entrega (isUserWantDelivery: true)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          orderItems: [
            {
              _id: productDoc._id,
              name: productDoc.name,
              quantity: 2,
              seller: providerId,
              price: 500,
              image: productDoc.image,
            },
          ],
          deliveryAddress: {
            fullName: 'Cliente E2E',
            address: 'Av. 24 de Julho, Maputo',
            city: 'Maputo',
            phoneNumber: clientUser.phoneNumber,
          },
          paymentMethod: 'Dinheiro',
          itemsPrice: 1000,
          deliveryPrice: 150,
          addressPrice: 150,
          totalPrice: 1150,
          itemsPriceForSeller: 1000,
          isUserWantDelivery: true,
          isPaid: false,
          stepStatus: 1,
          transportTypeId: vehicleTypeId,
          transportType: `Mota Test ${TS}`,
          origin: 'Av. Julius Nyerere 100, Maputo',
          destination: 'Av. 24 de Julho, Maputo',
        });

      if (res.status !== 201) {
        console.error('Erro na criação do pedido (Cenário 1):', res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      orderWithDeliveryId = res.body.order._id;

      const order = await Order.findById(orderWithDeliveryId);
      expect(order).toBeDefined();
      expect(order.isUserWantDelivery).toBe(true);
      expect(order.status).toBe('Pendente');
      expect(order.stepStatus).toBe(1);
    });

    it('1.2 Vendedor aceita o pedido com entrega', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderWithDeliveryId}/respond`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);

      const order = await Order.findById(orderWithDeliveryId);
      expect(order.isAccepted).toBe(true);
      expect(order.status).toBe('Aceite');
      expect(order.stepStatus).toBe(2);
    });

    it('1.3 Vendedor disponibiliza o pedido para entrega atribuindo motorista alvo', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderWithDeliveryId}/toDeliv`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          transportTypeId: vehicleTypeId,
          transportType: `Mota Test ${TS}`,
          targetDriverId: driverUser._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.order).toBeDefined();

      const order = await Order.findById(orderWithDeliveryId);
      expect(order.isAvailableToDeliver).toBe(true);
      expect(order.status).toBe('Disponível para entrega');
      expect(order.stepStatus).toBe(3);
      expect(order.requestServiceId).toBeDefined();

      requestServiceId = order.requestServiceId;
      const rs = await RequestService.findById(requestServiceId);
      expect(rs).toBeDefined();
      expect(rs.targetDriverId).toBe(driverUser._id.toString());
    });

    it('1.4 Motorista aceita a solicitação de entrega (RequestService)', async () => {
      const res = await request(app)
        .put(`/api/request-services/${requestServiceId}/acceptedByDeliveryman`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});

      expect(res.status).toBe(200);

      const rs = await RequestService.findById(requestServiceId);
      expect(rs.deliveryman).toBeDefined();
      expect(rs.deliveryman.id.toString()).toBe(driverUser._id.toString());
    });

    it('1.5 Pedido é marcado como "Em trânsito"', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderWithDeliveryId}/intransit`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});

      expect(res.status).toBe(200);

      const order = await Order.findById(orderWithDeliveryId);
      expect(order.status).toBe('Em trânsito');
      expect(order.isInTransit).toBe(true);
      expect(order.stepStatus).toBe(4);
    });

    it('1.6 Cliente confirma recepção do pedido com entrega', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderWithDeliveryId}/deliver`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({});

      expect(res.status).toBe(200);

      const order = await Order.findById(orderWithDeliveryId);
      expect(order.status).toBe('Entregue');
      expect(order.isDelivered).toBe(true);
      expect(order.stepStatus).toBe(5);
    });
  });

  // ==========================================================================
  // CENÁRIO 2: PEDIDO SEM DELIVERY (isUserWantDelivery: false - Levantamento)
  // ==========================================================================
  describe('Cenário 2: Pedido SEM Delivery / Levantamento na Loja (isUserWantDelivery: false)', () => {
    let orderWithoutDeliveryId;

    it('2.1 Cliente cria pedido optando por levantamento (isUserWantDelivery: false)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          orderItems: [
            {
              _id: productDoc._id,
              name: productDoc.name,
              quantity: 1,
              seller: providerId,
              price: 500,
              image: productDoc.image,
            },
          ],
          deliveryAddress: {
            fullName: 'Cliente Levantamento',
            address: 'Levantamento no Estabelecimento',
            city: 'Maputo',
            phoneNumber: clientUser.phoneNumber,
          },
          paymentMethod: 'Dinheiro',
          itemsPrice: 500,
          deliveryPrice: 0,
          addressPrice: 0,
          totalPrice: 500,
          itemsPriceForSeller: 500,
          isUserWantDelivery: false,
          isPaid: false,
          stepStatus: 1,
          transportType: null,
        });

      if (res.status !== 201) {
        console.error('Erro na criação do pedido (Cenário 2):', res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      orderWithoutDeliveryId = res.body.order._id;

      const order = await Order.findById(orderWithoutDeliveryId);
      expect(order).toBeDefined();
      expect(order.isUserWantDelivery).toBe(false);
      expect(order.deliveryPrice).toBe(0);
      expect(order.status).toBe('Pendente');
      expect(order.stepStatus).toBe(1);
    });

    it('2.2 Vendedor aceita o pedido sem entrega', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderWithoutDeliveryId}/respond`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);

      const order = await Order.findById(orderWithoutDeliveryId);
      expect(order.isAccepted).toBe(true);
      expect(order.status).toBe('Aceite');
      expect(order.stepStatus).toBe(2);
    });

    it('2.3 Vendedor marca pedido pronto/sem transporte (noTransport: true)', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderWithoutDeliveryId}/toDeliv`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ noTransport: true });

      expect(res.status).toBe(200);

      const order = await Order.findById(orderWithoutDeliveryId);
      expect(order.isAvailableToDeliver).toBe(true);
      // Quando noTransport é verdadeiro, salta a criação de entregador e vai direto para Em trânsito / Pronto
      expect(order.status).toBe('Em trânsito');
      expect(order.isInTransit).toBe(true);
      expect(order.stepStatus).toBe(4);
      // Garante que NENHUM RequestService foi criado para este pedido sem entrega
      expect(order.requestServiceId).toBeUndefined();
    });

    it('2.4 Cliente confirma recepção/levantamento na loja', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderWithoutDeliveryId}/deliver`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({});

      expect(res.status).toBe(200);

      const order = await Order.findById(orderWithoutDeliveryId);
      expect(order.status).toBe('Entregue');
      expect(order.isDelivered).toBe(true);
      expect(order.stepStatus).toBe(5);
    });
  });

  // ==========================================================================
  // CENÁRIO 3: PEDIDO COM DELIVERY + ENTREGA EXTERNA (Motoristas Nhiquela indisponíveis)
  // ==========================================================================
  describe('Cenário 3: Pedido COM Delivery usando Entrega Externa (isExternalDelivery: true)', () => {
    let orderExternalDeliveryId;

    it('3.1 Cliente cria pedido solicitando entrega (isUserWantDelivery: true)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          orderItems: [
            {
              _id: productDoc._id,
              name: productDoc.name,
              quantity: 1,
              seller: providerId,
              price: 500,
              image: productDoc.image,
            },
          ],
          deliveryAddress: {
            fullName: 'Cliente Entrega Externa',
            address: 'Rua das Flores 456, Maputo',
            city: 'Maputo',
            phoneNumber: clientUser.phoneNumber,
          },
          paymentMethod: 'Dinheiro',
          itemsPrice: 500,
          deliveryPrice: 120,
          addressPrice: 120,
          totalPrice: 620,
          itemsPriceForSeller: 500,
          isUserWantDelivery: true,
          isPaid: false,
          stepStatus: 1,
          transportTypeId: vehicleTypeId,
          transportType: `Mota Test ${TS}`,
          origin: 'Av. Julius Nyerere 100, Maputo',
          destination: 'Rua das Flores 456, Maputo',
        });

      if (res.status !== 201) {
        console.error('Erro na criação do pedido (Cenário 3):', res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      orderExternalDeliveryId = res.body.order._id;

      const order = await Order.findById(orderExternalDeliveryId);
      expect(order).toBeDefined();
      expect(order.isUserWantDelivery).toBe(true);
      expect(order.status).toBe('Pendente');
      expect(order.stepStatus).toBe(1);
    });

    it('3.2 Vendedor aceita o pedido', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderExternalDeliveryId}/respond`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);

      const order = await Order.findById(orderExternalDeliveryId);
      expect(order.isAccepted).toBe(true);
      expect(order.status).toBe('Aceite');
      expect(order.stepStatus).toBe(2);
    });

    it('3.3 Motoristas Nhiquela indisponíveis: Vendedor escolhe Entrega Externa (isExternalDelivery: true)', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderExternalDeliveryId}/toDeliv`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ isExternalDelivery: true });

      expect(res.status).toBe(200);

      const order = await Order.findById(orderExternalDeliveryId);
      expect(order.isAvailableToDeliver).toBe(true);
      expect(order.isExternalDelivery).toBe(true);
      expect(order.status).toBe('Disponível para entrega');
      expect(order.stepStatus).toBe(3);
    });

    it('3.4 Vendedor combina com estafeta externo por chamada e marca o pedido "Em trânsito"', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderExternalDeliveryId}/intransit`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({});

      expect(res.status).toBe(200);

      const order = await Order.findById(orderExternalDeliveryId);
      expect(order.status).toBe('Em trânsito');
      expect(order.isInTransit).toBe(true);
      expect(order.stepStatus).toBe(4);
    });

    it('3.5 Cliente recebe a encomenda do estafeta externo e confirma recepção', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderExternalDeliveryId}/deliver`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({});

      expect(res.status).toBe(200);

      const order = await Order.findById(orderExternalDeliveryId);
      expect(order.status).toBe('Entregue');
      expect(order.isDelivered).toBe(true);
      expect(order.stepStatus).toBe(5);
    });
  });
});
