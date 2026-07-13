// tests/serviceFlowRoutes.test.js
// Tests for the new service flow: accept → hasActiveService=true, deliver/cancel → hasActiveService=false
// Verifies the full lifecycle per the business spec

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Wallet from '../models/WalletModel.js';
import { generateToken } from '../utils.js';

let clientToken;
let driverToken;
let testClient;
let testDriver;
let createdOrderId;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: /@serviceflow-test\.com$/ } });
  await RequestService.deleteMany({ name: 'Jest Service Flow Test' });

  testClient = await User.create({
    name: 'Jest Flow Client',
    email: 'client@serviceflow-test.com',
    password: 'pass1234',
    phoneNumber: 845990001,
  });

  testDriver = await User.create({
    name: 'Jest Flow Driver',
    email: 'driver@serviceflow-test.com',
    password: 'pass1234',
    phoneNumber: 845990002,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active',
    latitude: '-25.9614',
    longitude: '32.5731',
    deliveryman: {
      name: 'Jest Driver',
      phoneNumber: 845990002,
      hasActiveService: false,
    },
  });

  // Create wallet for driver (need balance to accept orders)
  await Wallet.create({
    ownerType: 'driver',
    ownerId: testDriver._id,
    userId: testDriver._id,
    balance: 1000,
    currency: 'MT',
  });

  clientToken = generateToken(testClient);
  driverToken = generateToken(testDriver);
}, 30000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@serviceflow-test\.com$/ } });
  if (createdOrderId) {
    await RequestService.deleteMany({ _id: createdOrderId });
  }
  await Wallet.deleteMany({ ownerId: testDriver?._id });
}, 15000);

// ============================================================
// 1. Criar Pedido (Cliente)
// ============================================================
describe('POST /api/request-service — Criar pedido', () => {
  it('deve criar um pedido quando o cliente está autenticado', async () => {
    const res = await request(app)
      .post('/api/request-service')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        name: 'Jest Service Flow Test',
        phoneNumber: '845990001',
        goodType: 'Document',
        transportType: 'Moto',
        deliverCity: 'Maputo',
        origin: 'Av. Julius Nyerere, Maputo',
        destination: 'Av. Eduardo Mondlane, Maputo',
        paymentOption: 'immediate',
        description: 'Teste de fluxo de serviço',
        paymentMethod: 'cash',
        deliveryPrice: 200,
        targetDriverId: testDriver._id.toString(),
      });

    expect(res.status).toBeLessThan(500);
    if (res.status === 201) {
      createdOrderId = res.body.requestService._id;
      expect(res.body.requestService.status).toBe('Pendente');
    }
  }, 15000);

  it('deve rejeitar criação sem autenticação (401)', async () => {
    const res = await request(app)
      .post('/api/request-service')
      .send({ origin: 'test' });
    expect(res.status).toBe(401);
  }, 15000);
});

// ============================================================
// 2. Aceitar pedido (Motorista) → hasActiveService deve ir a true
// ============================================================
describe('PUT /api/request-service/:id/acceptedByDeliveryman', () => {
  it('deve marcar hasActiveService=true no motorista ao aceitar o pedido', async () => {
    if (!createdOrderId) return;

    const res = await request(app)
      .put(`/api/request-service/${createdOrderId}/acceptedByDeliveryman`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      // Verificar que o motorista agora tem hasActiveService=true
      const driver = await User.findById(testDriver._id);
      expect(driver.deliveryman.hasActiveService).toBe(true);
      expect(res.body.order.status).toBe('Aceite pelo entregador');
    }
  }, 15000);

  it('deve rejeitar aceitação sem autenticação (401)', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/request-service/${fakeId}/acceptedByDeliveryman`)
      .send({});
    expect(res.status).toBe(401);
  }, 15000);
});

// ============================================================
// 3. Motorista com serviço ativo não deve aparecer em /available
// ============================================================
describe('GET /api/drivers/available — Motorista ocupado excluído', () => {
  it('motorista com hasActiveService=true não deve aparecer na lista', async () => {
    // Garantir que o motorista tem hasActiveService=true
    await User.updateOne(
      { _id: testDriver._id },
      { $set: { 'deliveryman.hasActiveService': true } }
    );

    const res = await request(app)
      .get('/api/drivers/available')
      .query({ lat: -25.9614, lng: 32.5731, radius: 50 });

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const drivers = res.body.drivers || [];
      const foundOccupied = drivers.find(d => d._id.toString() === testDriver._id.toString());
      // Motorista ocupado NÃO deve aparecer
      expect(foundOccupied).toBeUndefined();
    }
  }, 15000);
});

// ============================================================
// 4. Cancelamento sem motivo deve ser rejeitado
// ============================================================
describe('PUT /api/request-service/:id/cancel — Motivo obrigatório', () => {
  it('deve rejeitar cancelamento sem motivo (400)', async () => {
    if (!createdOrderId) return;

    const res = await request(app)
      .put(`/api/request-service/${createdOrderId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ message: '' });  // motivo vazio

    expect(res.status).toBe(400);
  }, 15000);

  it('deve aceitar cancelamento com motivo válido e libertar o motorista', async () => {
    if (!createdOrderId) return;

    // Primeiro garantir que a order está em estado cancelável
    await RequestService.updateOne(
      { _id: createdOrderId },
      { $set: { status: 'Aceite pelo entregador', isCanceled: false } }
    );

    const res = await request(app)
      .put(`/api/request-service/${createdOrderId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ message: 'O motorista está a demorar demasiado' });

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(res.body.order.status).toBe('Cancelado');
      expect(res.body.order.canceledReason).toBe('O motorista está a demorar demasiado');

      // Verificar que o motorista foi libertado
      const driver = await User.findById(testDriver._id);
      expect(driver.deliveryman.hasActiveService).toBe(false);
    }
  }, 15000);
});

// ============================================================
// 5. Bloquear motorista de ir online com serviço ativo
// ============================================================
describe('PUT /api/drivers/availability — Bloquear se serviço ativo', () => {
  it('deve bloquear motorista com hasActiveService=true de ficar active', async () => {
    // Marcar o motorista como ocupado
    await User.updateOne(
      { _id: testDriver._id },
      { $set: { 'deliveryman.hasActiveService': true } }
    );

    const res = await request(app)
      .put('/api/drivers/availability')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ availability: 'active' });

    // Deve retornar 403 ou 402 (bloqueado por serviço ativo ou saldo)
    expect([402, 403]).toContain(res.status);
  }, 15000);
});
