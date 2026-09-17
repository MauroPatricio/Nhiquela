import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'Pgbkw0DQCkiJC3+tSmTaIA==';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://root:root@cluster0.uw5pjuq.mongodb.net/?appName=Cluster0';

const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      isSeller: user.isSeller || false,
      isDeliveryman: user.isDeliveryMan || false,
      role: user.role || 'CLIENT',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

async function runEcosystemVerification() {
  console.log('🚀 Iniciando Simulação E2E do Ecossistema Nhiquela...');
  process.env.JWT_SECRET = JWT_SECRET;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
  console.log('📡 Conectado à Base de Dados MongoDB!');

  const User = (await import('../models/UserModel.js')).default;
  const Product = (await import('../models/ProductModel.js')).default;
  const Provider = (await import('../models/ProviderModel.js')).default;
  const Order = (await import('../models/OrderModel.js')).default;
  const RequestService = (await import('../models/RequestServiceModel.js')).default;

  // 1. Criar Utilizadores de Teste Únicos
  const ts = Date.now();
  const clientUser = await User.create({
    name: `Cliente Simulação ${ts}`,
    email: `cliente.web.${ts}@test.com`,
    password: 'password123',
    role: 'CLIENT',
    phoneNumber: Number(`84${Math.floor(1000000 + Math.random() * 9000000)}`)
  });
  const clientToken = generateToken(clientUser);

  const sellerUser = await User.create({
    name: `Vendedor Simulação ${ts}`,
    email: `vendedor.web.${ts}@test.com`,
    password: 'password123',
    isSeller: true,
    role: 'SELLER',
    phoneNumber: Number(`84${Math.floor(1000000 + Math.random() * 9000000)}`),
    seller: { name: `Loja Simulação ${ts}`, rating: 5 }
  });
  const sellerToken = generateToken(sellerUser);

  const sellerProvider = await Provider.create({
    userId: sellerUser._id,
    name: `Loja Simulação ${ts}`,
    providerType: 'SELLER',
    status: 'active'
  });

  const driverUser = await User.create({
    name: `Motorista Simulação ${ts}`,
    email: `driver.app.${ts}@test.com`,
    password: 'password123',
    isDeliveryMan: true,
    role: 'DRIVER',
    phoneNumber: Number(`84${Math.floor(1000000 + Math.random() * 9000000)}`),
    deliveryman: { isOnline: true }
  });
  const driverToken = generateToken(driverUser);

  const testProduct = await Product.create({
    nome: `Smartphone Nhiquela Pro ${ts}`,
    name: `Smartphone Nhiquela Pro ${ts}`,
    slug: `smartphone-nhiquela-pro-${ts}`,
    brand: 'Nhiquela',
    description: 'Smartphone de alto desempenho para testes do ecossistema',
    priceFromSeller: 12000,
    comissionPercentage: 0.2,
    priceComission: 3000,
    price: 15000,
    seller: sellerProvider._id,
    countInStock: 10,
    category: new mongoose.Types.ObjectId()
  });

  // Inicializar servidor express para os testes HTTP
  const expressApp = express();
  expressApp.use(express.json());

  const orderRoutes = (await import('../routes/orderRoutes.js')).default;
  const requestServiceRoutes = (await import('../routes/requestServiceRoutes.js')).default;

  expressApp.use('/api/orders', orderRoutes);
  expressApp.use('/api/request-service', requestServiceRoutes);

  console.log('\n✅ 1. Testando Compra Online no Web Marketplace (Cliente -> Vendedor -> Motorista)...');
  
  // A. Cliente cria pedido online
  const orderPayload = {
    orderItems: [
      {
        _id: testProduct._id,
        name: testProduct.name,
        qty: 1,
        quantity: 1,
        price: 15000,
        product: testProduct._id,
        seller: sellerProvider._id
      }
    ],
    shippingAddress: {
      fullName: clientUser.name,
      address: 'Av. 24 de Julho, Maputo',
      city: 'Maputo',
      phoneNumber: String(clientUser.phoneNumber)
    },
    paymentMethod: 'M-Pesa',
    itemsPrice: 15000,
    shippingPrice: 300,
    totalPrice: 15300,
    isUserWantDelivery: true
  };

  const createRes = await request(expressApp)
    .post('/api/orders')
    .set('Authorization', `Bearer ${clientToken}`)
    .send(orderPayload);

  if (createRes.status !== 201) {
    throw new Error(`Falha na criação do pedido online: ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }
  const orderId = createRes.body.order._id;
  console.log(`   ✔️ Pedido Online criado com Sucesso! ID: ${orderId} | Status: ${createRes.body.order.status}`);

  // B. Vendedor aceita o pedido
  const acceptRes = await request(expressApp)
    .put(`/api/orders/${orderId}/respond`)
    .set('Authorization', `Bearer ${sellerToken}`)
    .send({ action: 'accept' });

  if (acceptRes.status !== 200) {
    throw new Error(`Falha na aceitação pelo vendedor: ${acceptRes.status} ${JSON.stringify(acceptRes.body)}`);
  }
  console.log(`   ✔️ Vendedor aceitou o pedido no painel nhiquelaseller! Status: ${acceptRes.body.order.status}`);

  console.log('\n✅ 2. Testando Aba de Serviços com Origem e Destino (Cliente Web -> Celular do Prestador nhiqueladriver)...');

  // A. Cliente solicita Serviço de Origem (Maputo) a Destino (Beira) no Web Marketplace
  const servicePayload = {
    name: clientUser.name,
    phoneNumber: String(clientUser.phoneNumber),
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

  const serviceRes = await request(expressApp)
    .post('/api/request-service')
    .set('Authorization', `Bearer ${clientToken}`)
    .send(servicePayload);

  if (serviceRes.status !== 201) {
    throw new Error(`Falha na solicitação de serviço: ${serviceRes.status} ${JSON.stringify(serviceRes.body)}`);
  }
  const createdTrip = serviceRes.body.requestService || serviceRes.body.order || serviceRes.body;
  const serviceOrderId = createdTrip._id || createdTrip.id;
  console.log(`   ✔️ Solicitação de Serviço Criada! ID: ${serviceOrderId}`);
  console.log(`   📍 Origem: ${createdTrip.origin} ➔ Destino: ${createdTrip.destination}`);

  // B. Prestador de Serviço / Motorista aceita a solicitação no telemóvel (nhiqueladriver)
  const acceptServiceRes = await request(expressApp)
    .put(`/api/request-service/${serviceOrderId}/acceptedByDeliveryman`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({});

  if (acceptServiceRes.status !== 200) {
    throw new Error(`Falha na aceitação do serviço pelo prestador: ${acceptServiceRes.status} ${JSON.stringify(acceptServiceRes.body)}`);
  }
  const acceptedTrip = acceptServiceRes.body.order || acceptServiceRes.body;
  console.log(`   ✔️ Prestador no telemóvel (nhiqueladriver) aceitou a solicitação com sucesso!`);
  console.log(`   📱 Motorista Atribuído: ${driverUser.name} | Status: ${acceptedTrip.status || 'Pedido aceite'}`);

  console.log('\n🎉 TODOS OS INTERVENIENTES ESTÃO DEVIDAMENTE ALINHADOS E A ARQUITECTURA FUNCIONA PERFEITAMENTE!');
  await mongoose.connection.close();
  process.exit(0);
}

runEcosystemVerification().catch(err => {
  console.error('❌ Erro na simulação do ecossistema:', err);
  process.exit(1);
});
