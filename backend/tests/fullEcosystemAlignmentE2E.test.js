import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock utils before importing routes
const JWT_SECRET = process.env.JWT_SECRET || 'somethingsecret';

const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      isSeller: user.isSeller || false,
      isDeliveryman: user.isDeliveryman || false,
      role: user.role || 'CUSTOMER',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

describe('Ecosystem Alignment E2E Simulation (Compra Online + Solicitação de Serviço)', () => {
  let app;
  let clientUser, clientToken;
  let sellerUser, sellerToken, sellerProvider;
  let driverUser, driverToken;
  let createdProductId;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_align';

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Dynamic imports after mongoose connection
    const User = (await import('../models/UserModel.js')).default;
    const Product = (await import('../models/ProductModel.js')).default;
    const Provider = (await import('../models/ProviderModel.js')).default;

    // Clean test DB collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Provider.deleteMany({});

    // Create Test Users
    clientUser = await User.create({
      name: 'Cliente Teste Web',
      email: 'cliente.web@test.com',
      password: 'password123',
      role: 'CUSTOMER',
      phoneNumber: '841112233'
    });
    clientToken = generateToken(clientUser);

    sellerUser = await User.create({
      name: 'Vendedor Teste Marketplace',
      email: 'vendedor.web@test.com',
      password: 'password123',
      isSeller: true,
      role: 'SELLER',
      phoneNumber: '842223344',
      seller: { name: 'Loja Eletrónicos Nhiquela', rating: 5 }
    });
    sellerToken = generateToken(sellerUser);

    sellerProvider = await Provider.create({
      userId: sellerUser._id,
      name: 'Loja Eletrónicos Nhiquela',
      providerType: 'SELLER',
      status: 'active'
    });

    driverUser = await User.create({
      name: 'Motorista Teste nhiqueladriver',
      email: 'driver.app@test.com',
      password: 'password123',
      isDeliveryman: true,
      role: 'DELIVERYMAN',
      phoneNumber: '843334455',
      deliveryman: { isOnline: true }
    });
    driverToken = generateToken(driverUser);

    const testProduct = await Product.create({
      name: 'Smartphone Nhiquela Pro',
      slug: 'smartphone-nhiquela-pro-' + Date.now(),
      price: 15000,
      seller: sellerProvider._id,
      countInStock: 10,
      category: new mongoose.Types.ObjectId()
    });
    createdProductId = testProduct._id;

    // Initialize express app with routes
    const expressApp = express();
    expressApp.use(express.json());

    const orderRoutes = (await import('../routes/orderRoutes.js')).default;
    const requestServiceRoutes = (await import('../routes/requestServiceRoutes.js')).default;

    expressApp.use('/api/orders', orderRoutes);
    expressApp.use('/api/request-service', requestServiceRoutes);

    app = expressApp;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('1. Compra Online no Web Marketplace (Cliente -> Vendedor -> Motorista)', async () => {
    // A. Cliente cria pedido online
    const orderPayload = {
      orderItems: [
        {
          name: 'Smartphone Nhiquela Pro',
          qty: 1,
          price: 15000,
          product: createdProductId,
          seller: sellerProvider._id
        }
      ],
      shippingAddress: {
        fullName: 'Cliente Teste',
        address: 'Av. 24 de Julho, Maputo',
        city: 'Maputo',
        phoneNumber: '841112233'
      },
      paymentMethod: 'M-Pesa',
      itemsPrice: 15000,
      shippingPrice: 300,
      totalPrice: 15300,
      isUserWantDelivery: true
    };

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(orderPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.order).toBeDefined();
    const orderId = createRes.body.order._id;
    expect(createRes.body.order.status).toBe('Pendente');

    // B. Vendedor visualiza e aceita o pedido no painel seller
    const acceptRes = await request(app)
      .put(`/api/orders/${orderId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ action: 'accept' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.order.status).toBe('Pedido aceite');

    // C. Vendedor solicita entrega/pesquisa de motorista
    const dispatchRes = await request(app)
      .put(`/api/orders/${orderId}/dispatch`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ action: 'search' });

    expect(dispatchRes.status).toBe(200);
  });

  test('2. Solicitação de Serviço com Origem e Destino (Cliente Web -> Celular do Prestador nhiqueladriver)', async () => {
    // A. Cliente solicita Serviço de Origem (Maputo) a Destino (Beira) no Web Marketplace
    const servicePayload = {
      name: 'Cliente Teste Web',
      phoneNumber: '841112233',
      goodType: 'Contentores & Mercadoria Portuária',
      transportType: 'Freightliner Heavy Truck',
      deliverCity: 'Maputo',
      reason: 'Frete Interprovincial de Contentores',
      origin: 'Porto de Maputo - Terminal de Contentores',
      destination: 'Porto da Beira - Cais 4',
      originDetails: { address: 'Porto de Maputo', lat: -25.9692, lng: 32.5732 },
      destinationDetails: { address: 'Porto da Beira', lat: -19.8436, lng: 34.8389 },
      deliveryPrice: 45000,
      paymentMethod: 'M-Pesa',
      isNegotiationAllowed: true
    };

    const serviceRes = await request(app)
      .post('/api/request-service')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(servicePayload);

    expect(serviceRes.status).toBe(201);
    expect(serviceRes.body.order).toBeDefined();
    const serviceOrderId = serviceRes.body.order._id;
    expect(serviceRes.body.order.origin).toBe('Porto de Maputo - Terminal de Contentores');
    expect(serviceRes.body.order.destination).toBe('Porto da Beira - Cais 4');
    expect(serviceRes.body.order.status).toBe('Pendente');

    // B. Prestador de Serviço/Motorista aceita a solicitação no celular (nhiqueladriver)
    const acceptServiceRes = await request(app)
      .post(`/api/request-service/${serviceOrderId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(acceptServiceRes.status).toBe(200);
    expect(acceptServiceRes.body.order.status).toBe('Pedido aceite');
    expect(acceptServiceRes.body.order.deliveryman.toString()).toBe(driverUser._id.toString());
  });
});
