// backend/tests/negotiationAndPhotos.test.js
import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import ProviderType from '../models/ProviderTypeModel.js';
import ProviderClassification from '../models/ProviderClassificationModel.js';
import Wallet from '../models/WalletModel.js';
import { generateToken } from '../utils.js';
import { calculateDynamicCommission } from '../services/walletService.js';

let clientToken;
let providerToken;
let testClient;
let testProviderUser;
let testSubcategory;
let createdOrderId;

beforeAll(async () => {
  // Aguardar conexão ativa do Mongoose inicializada em index.js
  let attempts = 0;
  while (mongoose.connection.readyState !== 1 && attempts < 15) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  await User.deleteMany({ email: { $regex: /@neg-test\.com$/ } });
  await RequestService.deleteMany({ name: 'Jest Vehicle Test' });

  testClient = await User.create({
    name: 'Jest Neg Client',
    email: 'client@neg-test.com',
    password: 'pass1234',
    phoneNumber: 845991001,
  });

  testProviderUser = await User.create({
    name: 'Jest Neg Provider',
    email: 'provider@neg-test.com',
    password: 'pass1234',
    phoneNumber: 845991002,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active',
  });

  await Wallet.create({
    ownerType: 'driver',
    ownerId: testProviderUser._id,
    userId: testProviderUser._id,
    balance: 5000,
    currency: 'MT',
  });

  clientToken = generateToken(testClient);
  providerToken = generateToken(testProviderUser);

  // Classification & Type setup
  let classification = await ProviderClassification.findOne({ name: 'Service' });
  if (!classification) {
    classification = await ProviderClassification.create({ name: 'Service', code: 'SERVICE' });
  }

  let providerType = await ProviderType.findOne({ name: 'Motorista Towing Test' });
  if (!providerType) {
    providerType = await ProviderType.create({
      name: 'Motorista Towing Test',
      classificationId: classification._id,
      description: 'Test Type'
    });
  }

  testSubcategory = await ProviderSubcategory.create({
    name: 'Reboque Teste Negociação',
    providerTypeId: providerType._id,
    requiresPhotos: true,
    allowNegotiation: true,
    maxNegotiationRounds: 3,
    serviceCommission: 10,
    baseFare: 1000,
  });
}, 30000);

afterAll(async () => {
  try {
    if (testSubcategory) await ProviderSubcategory.deleteOne({ _id: testSubcategory._id });
    if (createdOrderId) await RequestService.deleteOne({ _id: createdOrderId });
    await User.deleteMany({ email: { $regex: /@neg-test\.com$/ } });
  } catch (e) {}
}, 30000);

describe('1. Validação de Fotos Obrigatórias do Veículo', () => {
  it('Rejeita criação de pedido sem as 4 fotos quando a subcategoria exige fotos', async () => {
    const res = await request(app)
      .post('/api/request-service')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        name: 'Jest Vehicle Test',
        phoneNumber: '845991001',
        goodType: 'Veículo Avariado',
        transportType: testSubcategory._id.toString(),
        deliverCity: 'Maputo',
        origin: 'Avenida Guerra Popular, Maputo',
        destination: 'Avenida Eduardo Mondlane, Maputo',
        deliveryPrice: 1500,
        serviceId: testSubcategory._id.toString(),
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('obrigatorio fornecer as 4 fotografias');
  });

  it('Cria pedido com sucesso quando todas as 4 fotos do veículo são enviadas', async () => {
    const res = await request(app)
      .post('/api/request-service')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        name: 'Jest Vehicle Test',
        phoneNumber: '845991001',
        goodType: 'Veículo Avariado',
        transportType: testSubcategory._id.toString(),
        deliverCity: 'Maputo',
        origin: 'Avenida Guerra Popular, Maputo',
        destination: 'Avenida Eduardo Mondlane, Maputo',
        deliveryPrice: 1500,
        serviceId: testSubcategory._id.toString(),
        vehiclePhotos: {
          front: 'https://example.com/front.jpg',
          rear: 'https://example.com/rear.jpg',
          leftSide: 'https://example.com/left.jpg',
          rightSide: 'https://example.com/right.jpg'
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.vehiclePhotos).toBeDefined();
    expect(res.body.vehiclePhotos.front).toBe('https://example.com/front.jpg');
    expect(res.body.basePrice).toBe(1500);

    createdOrderId = res.body._id;
  });
});

  it('Bloqueia propostas que contenham números de telefone nas notas', async () => {
    const res = await request(app)
      .post(`/api/request-service/${createdOrderId}/negotiate/propose`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        amount: 2000,
        note: 'Liga para mim no 841234567 para combinar'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Não é permitido incluir números de telefone');
  });

  it('Permite ao fornecedor enviar uma nova proposta de preço (Ronda 1)', async () => {
    const res = await request(app)
      .post(`/api/request-service/${createdOrderId}/negotiate/propose`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        amount: 2000,
        note: 'Distância maior devido ao trânsito'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.negotiationState).toBe('PENDING_CUSTOMER');
    expect(res.body.order.negotiationRoundCount).toBe(1);
    expect(res.body.order.negotiationHistory.length).toBe(1);
    expect(res.body.order.negotiationHistory[0].amount).toBe(2000);
  });

  it('Permite ao cliente enviar uma contra-proposta (Ronda 2)', async () => {
    const res = await request(app)
      .post(`/api/request-service/${createdOrderId}/negotiate/propose`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        amount: 1800,
        note: 'Aceito pagar 1800 MT'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.negotiationState).toBe('PENDING_PROVIDER');
    expect(res.body.order.negotiationRoundCount).toBe(2);
    expect(res.body.order.negotiationHistory.length).toBe(2);
    expect(res.body.order.negotiationHistory[1].amount).toBe(1800);
  });

  it('Permite ao fornecedor aceitar a proposta do cliente', async () => {
    const res = await request(app)
      .post(`/api/request-service/${createdOrderId}/negotiate/accept`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.order.negotiationState).toBe('ACCEPTED');
    expect(res.body.order.finalAgreedPrice).toBe(1800);
    expect(res.body.order.deliveryPrice).toBe(1800);
  });

  it('Calcula a comissão da Nhiquela estritamente com base no finalAgreedPrice', async () => {
    const order = await RequestService.findById(createdOrderId);
    order.deliveryman = { id: testProviderUser._id };
    
    testProviderUser.completedOrders = 5;
    await testProviderUser.save();

    const commission = await calculateDynamicCommission(order);
    expect(commission).toBe(180);
  });
});
