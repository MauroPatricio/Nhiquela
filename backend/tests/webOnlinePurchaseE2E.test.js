import 'dotenv/config';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';

import User from '../models/UserModel.js';
import Product from '../models/ProductModel.js';
import Category from '../models/CategoryModel.js';
import Order from '../models/OrderModel.js';
import Provider from '../models/ProviderModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import ProviderType from '../models/ProviderTypeModel.js';
import ProviderClassification from '../models/ProviderClassificationModel.js';
import Wallet from '../models/WalletModel.js';
import Settings from '../models/SettingsModel.js';

import orderRouter from '../routes/orderRoutes.js';
import requestServiceRouter from '../routes/requestServiceRoutes.js';
import productRouter from '../routes/productRoutes.js';

let app;

// Tokens e IDs de teste
let clientToken;
let clientId;
let sellerToken;
let sellerId;
let sellerUserId;
let driverToken;
let driverId;
let transportTypeId;
let productId;

const generateTestToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      isSeller: user.isSeller || false,
      isDeliveryMan: user.isDeliveryMan || false,
    },
    process.env.JWT_SECRET || 'somethingsecret',
    { expiresIn: '30d' }
  );
};

const TS = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'somethingsecret';
  
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  app = express();
  app.use(express.json());

  // Mock Socket.IO no app de forma compatível com ESM
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

  app.use('/api/orders', orderRouter);
  app.use('/api/request-services', requestServiceRouter);
  app.use('/api/products', productRouter);

  // Configuração inicial de taxa de comissão
  await Settings.findOneAndUpdate(
    { key: 'platform_commission_rate' },
    { key: 'platform_commission_rate', value: '10' },
    { upsert: true }
  );

  // 1. Classificação, Tipo e Subcategoria de Transporte
  let serviceCls = await ProviderClassification.findOne({ name: 'SERVICE' });
  if (!serviceCls) {
    serviceCls = await ProviderClassification.create({ name: 'SERVICE' });
  }
  let serviceProvType = await ProviderType.findOne({ classificationId: serviceCls._id });
  if (!serviceProvType) {
    serviceProvType = await ProviderType.create({ name: `Transporte Web ${TS}`, classificationId: serviceCls._id });
  }

  const subcategory = await ProviderSubcategory.create({
    name: `Mota Web Delivery ${TS}`,
    providerTypeId: serviceProvType._id,
    basePrice: 50,
    pricePerKm: 10,
    minDistance: 3,
    percentageFee: 10,
    serviceCommission: 10,
  });
  transportTypeId = subcategory._id.toString();

  // 2. Criar Vendedor (já com isenção utilizada para testar cobrança normal de comissão)
  const sellerUserDoc = await User.create({
    name: `Vendedor Web E2E ${TS}`,
    email: `vendedorweb_${TS}@test.com`,
    password: 'password123',
    phoneNumber: `+25884000${TS.toString().slice(-4)}`,
    isSeller: true,
    seller: {
      hasUsedFreeSale: true,
    },
  });
  sellerUserId = sellerUserDoc._id.toString();

  const providerDoc = await Provider.create({
    name: `Loja Eletrónicos Web E2E ${TS}`,
    providerType: 'Loja',
    userId: sellerUserDoc._id,
    ownerId: sellerUserDoc._id,
    subcategoryId: subcategory._id,
    location: { lat: -25.9692, lng: 32.5732 },
  });
  sellerId = providerDoc._id.toString();
  sellerToken = generateTestToken(sellerUserDoc);

  // Saldo inicial do vendedor
  await Wallet.create({
    ownerId: sellerUserDoc._id,
    ownerType: 'seller',
    userId: sellerUserDoc._id,
    balance: 5000,
  });

  // 3. Criar Motorista
  const driverUserDoc = await User.create({
    name: `Motorista Web E2E ${TS}`,
    email: `motoristaweb_${TS}@test.com`,
    password: 'password123',
    phoneNumber: `+25885000${TS.toString().slice(-4)}`,
    isDeliveryMan: true,
    deliveryman: {
      transport_type: 'Mota',
      registration: 'WEB-123-MP',
    },
  });
  driverId = driverUserDoc._id.toString();
  driverToken = generateTestToken(driverUserDoc);

  await Wallet.create({
    ownerId: driverUserDoc._id,
    ownerType: 'driver',
    userId: driverUserDoc._id,
    balance: 1000,
  });

  // 4. Criar Cliente Web
  const clientUserDoc = await User.create({
    name: `Cliente Web E2E ${TS}`,
    email: `clienteweb_${TS}@test.com`,
    password: 'password123',
    phoneNumber: `+25886000${TS.toString().slice(-4)}`,
  });
  clientId = clientUserDoc._id.toString();
  clientToken = generateTestToken(clientUserDoc);

  await Wallet.create({
    ownerId: clientUserDoc._id,
    ownerType: 'User',
    userId: clientUserDoc._id,
    balance: 2000,
  });

  // 5. Categoria & Produto no Catálogo
  let categoryDoc = await Category.findOne({ slug: 'eletronicos-web' });
  if (!categoryDoc) {
    categoryDoc = await Category.create({
      name: 'Eletrónicos Web',
      nome: 'Eletrónicos Web',
      slug: 'eletronicos-web'
    });
  }

  const productDoc = await Product.create({
    name: `Smartphone Nhiquela Pro ${TS}`,
    nome: `Smartphone Nhiquela Pro ${TS}`,
    slug: `smartphone-nhiquela-pro-${TS}`,
    category: categoryDoc._id,
    image: '/images/products/phone.jpg',
    price: 15000,
    priceFromSeller: 13500,
    comissionPercentage: 10,
    priceComission: 1500,
    countInStock: 20,
    seller: providerDoc._id,
    vendor: `Loja Eletrónicos Web E2E ${TS}`,
    brand: 'Nhiquela Tech',
    description: 'Smartphone topo de gama para compra online web',
    sellerEarningsAfterDiscount: 13500,
  });
  productId = productDoc._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('E2E Test: Compra Online Web COM e SEM Delivery', () => {

  // =========================================================================
  // CENÁRIO 1: COMPRA ONLINE WEB COM DELIVERY (isUserWantDelivery: true)
  // =========================================================================
  describe('Cenário 1: Compra Online Web COM Delivery (isUserWantDelivery: true)', () => {
    let orderId;
    let requestServiceId;

    it('1.1 Cliente navega no catálogo e faz checkout web com entrega ao domicílio', async () => {
      const orderPayload = {
        orderItems: [
          {
            _id: productId,
            product: productId,
            name: 'Smartphone Nhiquela Pro',
            quantity: 1,
            price: 15000,
            image: '/images/products/phone.jpg',
            seller: sellerId,
            priceFromSeller: 13500,
            sellerEarningsAfterDiscount: 13500,
          },
        ],
        address: 'Av. Julius Nyerere, nº 1500, Polana, Maputo',
        deliveryAddress: {
          fullName: 'Cliente Web E2E',
          address: 'Av. Julius Nyerere, nº 1500, Polana, Maputo',
          phoneNumber: '+258860000000',
          alternativePhoneNumber: '',
        },
        seller: sellerId,
        isUserWantDelivery: true,
        paymentMethod: 'M-Pesa',
        itemsPrice: 15000,
        deliveryPrice: 350,
        taxPrice: 0,
        totalPrice: 15350,
        itemsPriceForSeller: 15000,
        stepStatus: 1,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.isUserWantDelivery).toBe(true);
      expect(res.body.order.status).toBe('Pendente');
      expect(res.body.order.stepStatus).toBe(1);
      expect(res.body.order.deliveryAddress.fullName).toBe('Cliente Web E2E');
      orderId = res.body.order._id;
    });

    it('1.2 Fornecedor visualiza o pedido no app/web e aceita (debitando comissão)', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/respond`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Aceite');
      expect(res.body.order.stepStatus).toBe(2);
      expect(res.body.order.isAccepted).toBe(true);
      expect(res.body.order.isCommissionProcessed).toBe(true);

      // Verificar que a comissão (10% de 15000 = 1500 MT) foi debitada da carteira do vendedor (5000 - 1500 = 3500 MT)
      const sellerWallet = await Wallet.findOne({ ownerId: sellerUserId });
      expect(sellerWallet.balance).toBe(3500);
    });

    it('1.3 Fornecedor disponibiliza o pedido para entrega e pesquisa motorista', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/toDeliv`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ transportTypeId, targetDriverId: driverId });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Disponível para entrega');
      expect(res.body.order.stepStatus).toBe(3);
      expect(res.body.order.requestServiceId).toBeDefined();
      requestServiceId = res.body.order.requestServiceId;
    });

    it('1.4 Motorista aceita a entrega no app nhiqueladriver', async () => {
      const res = await request(app)
        .put(`/api/request-services/${requestServiceId}/acceptedByDeliveryman`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});

      expect(res.status).toBe(200);

      const updatedOrder = await Order.findById(orderId);
      expect(updatedOrder.deliveryman).toBeDefined();
    });

    it('1.5 Pedido é colocado em trânsito', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/intransit`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Em trânsito');
      expect(res.body.order.stepStatus).toBe(4);
    });

    it('1.6 Cliente Web confirma a recepção do pedido online', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Entregue');
      expect(res.body.order.stepStatus).toBe(5);
      expect(res.body.order.isDelivered).toBe(true);

      // Verificar que o fornecedor foi creditado pelo valor líquido do pedido
      const sellerWallet = await Wallet.findOne({ ownerId: sellerUserId });
      expect(sellerWallet.balance).toBeGreaterThan(3500);
    });
  });

  // =========================================================================
  // CENÁRIO 2: COMPRA ONLINE WEB SEM DELIVERY / LEVANTAMENTO (isUserWantDelivery: false)
  // =========================================================================
  describe('Cenário 2: Compra Online Web SEM Delivery / Levantamento (isUserWantDelivery: false)', () => {
    let orderId;

    it('2.1 Cliente faz checkout web optando por Levantamento no Estabelecimento', async () => {
      const orderPayload = {
        orderItems: [
          {
            _id: productId,
            product: productId,
            name: 'Smartphone Nhiquela Pro',
            quantity: 1,
            price: 15000,
            image: '/images/products/phone.jpg',
            seller: sellerId,
            priceFromSeller: 13500,
            sellerEarningsAfterDiscount: 13500,
          },
        ],
        address: 'Levantamento no Estabelecimento',
        deliveryAddress: {
          fullName: 'Cliente Web E2E',
          address: 'Levantamento no Estabelecimento',
          phoneNumber: '+258860000000',
          alternativePhoneNumber: '',
        },
        seller: sellerId,
        isUserWantDelivery: false,
        paymentMethod: 'e-Mola',
        itemsPrice: 15000,
        deliveryPrice: 0,
        taxPrice: 0,
        totalPrice: 15000,
        itemsPriceForSeller: 15000,
        stepStatus: 1,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.isUserWantDelivery).toBe(false);
      expect(res.body.order.deliveryPrice).toBe(0);
      expect(res.body.order.status).toBe('Pendente');
      expect(res.body.order.stepStatus).toBe(1);
      orderId = res.body.order._id;
    });

    it('2.2 Fornecedor aceita o pedido sem entrega (debitando comissão)', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/respond`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Aceite');
      expect(res.body.order.stepStatus).toBe(2);
      expect(res.body.order.isCommissionProcessed).toBe(true);
    });

    it('2.3 Fornecedor marca o pedido como pronto e sem necessidade de transporte', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/toDeliv`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ noTransport: true });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Em trânsito');
      expect(res.body.order.stepStatus).toBe(4);
    });

    it('2.4 Cliente (ou Fornecedor) confirma o levantamento dos produtos na loja', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Entregue');
      expect(res.body.order.stepStatus).toBe(5);
      expect(res.body.order.isDelivered).toBe(true);
    });
  });
});
