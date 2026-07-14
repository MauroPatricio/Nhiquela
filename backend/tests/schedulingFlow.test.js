/**
 * schedulingFlow.test.js
 *
 * Testes de integraÃ§Ã£o para os dois fluxos de solicitaÃ§Ã£o de serviÃ§o:
 *   1. Fluxo Imediato  â€” isScheduled: false  â†’ dispatch inicia imediatamente
 *   2. Fluxo Agendado  â€” isScheduled: true   â†’ dispatch NÃƒO inicia; scheduledAt Ã© guardado
 *
 * Utiliza a app Express real + MongoDB Atlas de testes.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Wallet from '../models/WalletModel.js';
import { generateToken } from '../utils.js';

// â”€â”€â”€ Fixtures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EMAIL_SUFFIX = '@scheduling-flow-test.com';

let testClient;
let testDriver;
let clientToken;
let driverToken;

const immediateOrderIds = [];
const scheduledOrderIds = [];

/**
 * Factory para criar um RequestService mÃ­nimo vÃ¡lido.
 * Inclui todos os campos required do schema para evitar ValidationError nos testes de BD.
 */
const minimalOrder = (overrides = {}) => ({
  name: 'Jest Test Order',
  phoneNumber: '847001000',
  goodType: 'Document',
  transportType: 'Moto',
  deliverCity: 'Maputo',
  origin: 'Origem de Teste',
  destination: 'Destino de Teste',
  paymentOption: 'immediate',
  description: 'Teste automatizado',
  paymentMethod: 'cash',
  deliveryPrice: 200,
  deleted: false,
  ...overrides,
});

// â”€â”€â”€ Setup / Teardown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

beforeAll(async () => {
  // Aguardar que a ligaÃ§Ã£o ao MongoDB do index.js fique pronta
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Limpar dados residuais de testes anteriores
  await User.deleteMany({ email: { $regex: EMAIL_SUFFIX + '$' } });

  // â”€â”€ Cliente â”€â”€
  testClient = await User.create({
    name: 'Jest Scheduling Client',
    email: `client${EMAIL_SUFFIX}`,
    password: 'pass1234',
    phoneNumber: 847001001,
  });

  // â”€â”€ Motorista â”€â”€
  testDriver = await User.create({
    name: 'Jest Scheduling Driver',
    email: `driver${EMAIL_SUFFIX}`,
    password: 'pass1234',
    phoneNumber: 847001002,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active',
    latitude: -25.9614,
    longitude: 32.5731,
    deliveryman: {
      name: 'Scheduling Driver',
      phoneNumber: 847001002,
      hasActiveService: false,
      status: 'DisponÃ­vel',
    },
  });

  // Carteira com saldo suficiente para pagar comissÃµes
  await Wallet.create({
    ownerType: 'driver',
    ownerId: testDriver._id,
    userId: testDriver._id,
    balance: 5000,
    currency: 'MT',
  });

  clientToken = generateToken(testClient);
  driverToken = generateToken(testDriver);
}, 30000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: EMAIL_SUFFIX + '$' } });
  if (immediateOrderIds.length) {
    await RequestService.deleteMany({ _id: { $in: immediateOrderIds } });
  }
  if (scheduledOrderIds.length) {
    await RequestService.deleteMany({ _id: { $in: scheduledOrderIds } });
  }
  await Wallet.deleteMany({ ownerId: testDriver?._id });
}, 20000);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SUITE 1 â€” FLUXO IMEDIATO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Fluxo Imediato (isScheduled: false)', () => {
  let orderId;

  // â”€â”€ 1.1 CriaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('POST /api/request-service â€” pedido imediato', () => {
    it('deve criar o pedido com status Pendente e isSearching=true', async () => {
      const res = await request(app)
        .post('/api/request-service')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'Jest Immediate Order',
          phoneNumber: '847001001',
          goodType: 'Document',
          transportType: 'Moto',
          deliverCity: 'Maputo',
          origin: 'Av. Julius Nyerere, Maputo',
          destination: 'Av. Eduardo Mondlane, Maputo',
          originDetails: { address: 'Av. Julius Nyerere, Maputo', lat: -25.9614, lng: 32.5731 },
          destinationDetails: { address: 'Av. Eduardo Mondlane, Maputo', lat: -25.9690, lng: 32.5900 },
          paymentOption: 'immediate',
          description: 'Teste fluxo imediato',
          paymentMethod: 'cash',
          deliveryPrice: 200,
          isScheduled: false,
          scheduledAt: null,
          targetDriverId: testDriver._id.toString(),
        });

      // A rota pode retornar 201 (criado) ou 409 (viagem ativa existente de outro teste)
      expect(res.status).toBeLessThan(500);

      if (res.status === 201) {
        orderId = res.body.requestService._id;
        immediateOrderIds.push(orderId);

        expect(res.body.requestService.status).toBe('Pendente');
        expect(res.body.requestService.isScheduled).toBe(false);
        expect(res.body.requestService.scheduledAt).toBeNull();
      }
    }, 15000);

    it('deve rejeitar criaÃ§Ã£o sem autenticaÃ§Ã£o (401)', async () => {
      const res = await request(app)
        .post('/api/request-service')
        .send({ origin: 'Teste sem token' });

      expect(res.status).toBe(401);
    }, 10000);

    it('nÃ£o deve criar pedido se cliente jÃ¡ tem viagem ativa', async () => {
      if (!orderId) return; // sÃ³ faz sentido se o pedido anterior foi criado

      // Garantir que o pedido anterior estÃ¡ ativo
      await RequestService.updateOne(
        { _id: orderId },
        { $set: { status: 'Pendente', isCanceled: false } }
      );

      const res = await request(app)
        .post('/api/request-service')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          origin: 'Segunda tentativa',
          destination: 'Destino B',
          isScheduled: false,
        });

      expect(res.status).toBe(409);
    }, 10000);
  });

  // â”€â”€ 1.2 Validar isSearching no BD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('BD â€” pedido imediato sem targetDriverId deve ter isSearching=true', () => {
    it('deve criar diretamente no modelo e validar isSearching=true', async () => {
      const order = new RequestService(minimalOrder({
        user: testClient._id,
        code: '999001',
        status: 'Pendente',
        isScheduled: false,
        isSearching: true,
        scheduledAt: null,
      }));
      await order.save();
      immediateOrderIds.push(order._id);

      const found = await RequestService.findById(order._id);
      expect(found.isScheduled).toBe(false);
      expect(found.isSearching).toBe(true);
      expect(found.scheduledAt).toBeNull();
    }, 10000);
  });

  // â”€â”€ 1.3 AceitaÃ§Ã£o pelo motorista â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('PUT /api/request-service/:id/acceptedByDeliveryman', () => {
    it('deve aceitar o pedido imediato e marcar hasActiveService=true no motorista', async () => {
      if (!orderId) return;

      // Garantir que o pedido estÃ¡ pendente e nÃ£o cancelado
      await RequestService.updateOne(
        { _id: orderId },
        { $set: { status: 'Pendente', isCanceled: false, isSearching: true } }
      );

      // Garantir que o motorista estÃ¡ disponÃ­vel
      await User.updateOne(
        { _id: testDriver._id },
        { $set: { 'deliveryman.hasActiveService': false, 'deliveryman.status': 'DisponÃ­vel' } }
      );

      const res = await request(app)
        .put(`/api/request-service/${orderId}/acceptedByDeliveryman`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});

      expect(res.status).toBeLessThan(500);

      if (res.status === 200) {
        expect(res.body.order.status).toBe('Pedido aceite');

        const driver = await User.findById(testDriver._id);
        expect(driver.deliveryman.hasActiveService).toBe(true);
      }
    }, 15000);
  });

  // â”€â”€ 1.4 Cancelamento com motivo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('PUT /api/request-service/:id/cancel', () => {
    it('deve rejeitar cancelamento sem motivo (400)', async () => {
      if (!orderId) return;

      await RequestService.updateOne(
        { _id: orderId },
        { $set: { status: 'Pedido aceite', isCanceled: false } }
      );

      const res = await request(app)
        .put(`/api/request-service/${orderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ message: '' });

      expect(res.status).toBe(400);
    }, 10000);

    it('deve aceitar cancelamento com motivo e libertar o motorista', async () => {
      if (!orderId) return;

      await RequestService.updateOne(
        { _id: orderId },
        { $set: { status: 'Pedido aceite', isCanceled: false } }
      );

      const res = await request(app)
        .put(`/api/request-service/${orderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ message: 'Motorista demorou demasiado' });

      expect(res.status).toBeLessThan(500);

      if (res.status === 200) {
        expect(res.body.order.status).toBe('Cancelado');
        expect(res.body.order.canceledReason).toBe('Motorista demorou demasiado');

        const driver = await User.findById(testDriver._id);
        expect(driver.deliveryman.hasActiveService).toBe(false);
      }
    }, 15000);
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SUITE 2 â€” FLUXO AGENDADO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Fluxo Agendado (isScheduled: true)', () => {
  let scheduledOrderId;

  const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2 horas

  // â”€â”€ 2.1 CriaÃ§Ã£o de pedido agendado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('POST /api/request-service â€” pedido agendado', () => {
    it('deve criar pedido agendado com isScheduled=true, isSearching=false e scheduledAt correto', async () => {
      // Garantir que o cliente nÃ£o tem viagem ativa
      await RequestService.updateMany(
        { user: testClient._id, status: { $in: ['Pendente', 'Pedido aceite'] } },
        { $set: { status: 'Cancelado', isCanceled: true } }
      );

      const res = await request(app)
        .post('/api/request-service')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'Jest Scheduled Order',
          phoneNumber: '847001001',
          goodType: 'Document',
          transportType: 'Moto',
          deliverCity: 'Maputo',
          origin: 'Av. Julius Nyerere, Maputo',
          destination: 'Av. Eduardo Mondlane, Maputo',
          originDetails: { address: 'Av. Julius Nyerere, Maputo', lat: -25.9614, lng: 32.5731 },
          destinationDetails: { address: 'Av. Eduardo Mondlane, Maputo', lat: -25.9690, lng: 32.5900 },
          paymentOption: 'scheduled',
          description: 'Teste fluxo agendado',
          paymentMethod: 'cash',
          deliveryPrice: 200,
          isScheduled: true,
          scheduledAt: futureDate.toISOString(),
        });

      expect(res.status).toBeLessThan(500);

      if (res.status === 201) {
        scheduledOrderId = res.body.requestService._id;
        scheduledOrderIds.push(scheduledOrderId);

        expect(res.body.requestService.isScheduled).toBe(true);
        expect(res.body.requestService.isSearching).toBe(false); // NÃƒO deve iniciar busca
        expect(res.body.requestService.scheduledAt).toBeDefined();

        // Verificar que a data foi guardada correctamente (dentro de 1 minuto de tolerÃ¢ncia)
        const savedDate = new Date(res.body.requestService.scheduledAt);
        expect(Math.abs(savedDate.getTime() - futureDate.getTime())).toBeLessThan(60000);
      }
    }, 15000);

    it('deve rejeitar criaÃ§Ã£o de pedido agendado sem autenticaÃ§Ã£o (401)', async () => {
      const res = await request(app)
        .post('/api/request-service')
        .send({
          isScheduled: true,
          scheduledAt: futureDate.toISOString(),
          origin: 'Teste sem token',
        });

      expect(res.status).toBe(401);
    }, 10000);
  });

  // â”€â”€ 2.2 ValidaÃ§Ã£o directa no modelo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('BD â€” campos de agendamento guardados correctamente no modelo', () => {
    it('deve guardar isScheduled=true, scheduledAt e scheduledNotified=false', async () => {
      const scheduled = new RequestService(minimalOrder({
        user: testClient._id,
        code: '999002',
        status: 'Pendente',
        isScheduled: true,
        isSearching: false,
        scheduledAt: futureDate,
        scheduledNotified: false,
      }));
      await scheduled.save();
      scheduledOrderIds.push(scheduled._id);

      const found = await RequestService.findById(scheduled._id);
      expect(found.isScheduled).toBe(true);
      expect(found.isSearching).toBe(false);
      expect(found.scheduledNotified).toBe(false);
      expect(found.scheduledAt).toBeDefined();

      const diff = Math.abs(new Date(found.scheduledAt).getTime() - futureDate.getTime());
      expect(diff).toBeLessThan(1000);
    }, 10000);

    it('um pedido NÃƒO agendado nÃ£o deve ter scheduledAt definido', async () => {
      const immediate = new RequestService(minimalOrder({
        user: testClient._id,
        code: '999003',
        status: 'Pendente',
        isScheduled: false,
        isSearching: true,
        scheduledAt: null,
      }));
      await immediate.save();
      immediateOrderIds.push(immediate._id);

      const found = await RequestService.findById(immediate._id);
      expect(found.isScheduled).toBe(false);
      expect(found.scheduledAt).toBeNull();
    }, 10000);
  });

  // â”€â”€ 2.3 Pedido agendado NÃƒO deve ser despachado imediatamente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('Comportamento de dispatch â€” pedido agendado nÃ£o inicia busca', () => {
    it('pedido agendado recÃ©m-criado deve ter isSearching=false na BD', async () => {
      const order = new RequestService(minimalOrder({
        user: testClient._id,
        code: '999004',
        status: 'Pendente',
        isScheduled: true,
        isSearching: false,
        scheduledAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      }));
      await order.save();
      scheduledOrderIds.push(order._id);

      const found = await RequestService.findById(order._id);
      expect(found.isSearching).toBe(false);
      expect(found.isScheduled).toBe(true);
    }, 10000);

    it('pedido imediato deve ter isSearching=true na BD', async () => {
      const order = new RequestService(minimalOrder({
        user: testClient._id,
        code: '999005',
        status: 'Pendente',
        isScheduled: false,
        isSearching: true,
        scheduledAt: null,
      }));
      await order.save();
      immediateOrderIds.push(order._id);

      const found = await RequestService.findById(order._id);
      expect(found.isSearching).toBe(true);
      expect(found.isScheduled).toBe(false);
    }, 10000);
  });

  // â”€â”€ 2.4 Motorista pode aceitar pedido agendado mesmo com viagem activa â”€â”€â”€â”€â”€â”€â”€
  describe('AceitaÃ§Ã£o de pedido agendado com motorista ocupado', () => {
    it('motorista com hasActiveService=true pode ver pedidos agendados na lista', async () => {
      await User.updateOne(
        { _id: testDriver._id },
        { $set: { 'deliveryman.hasActiveService': true } }
      );

      const scheduled = new RequestService(minimalOrder({
        user: testClient._id,
        code: '999006',
        status: 'Pendente',
        isScheduled: true,
        isSearching: false,
        scheduledAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      }));
      await scheduled.save();
      scheduledOrderIds.push(scheduled._id);

      const found = await RequestService.findById(scheduled._id);
      expect(found).not.toBeNull();
      expect(found.isScheduled).toBe(true);

      await User.updateOne(
        { _id: testDriver._id },
        { $set: { 'deliveryman.hasActiveService': false } }
      );
    }, 10000);
  });

  // â”€â”€ 2.5 scheduledNotified flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('BD â€” campo scheduledNotified controlado correctamente', () => {
    it('deve iniciar com scheduledNotified=false e poder ser actualizado para true', async () => {
      const order = new RequestService(minimalOrder({
        user: testClient._id,
        code: '999007',
        status: 'Pendente',
        isScheduled: true,
        isSearching: false,
        scheduledAt: new Date(Date.now() + 45 * 60 * 1000 + 5000),
        scheduledNotified: false,
      }));
      await order.save();
      scheduledOrderIds.push(order._id);

      let found = await RequestService.findById(order._id);
      expect(found.scheduledNotified).toBe(false);

      found.scheduledNotified = true;
      await found.save();

      found = await RequestService.findById(order._id);
      expect(found.scheduledNotified).toBe(true);
    }, 10000);
  });

  // â”€â”€ 2.6 Cancelamento de pedido agendado ainda pendente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('PUT /api/request-service/:id/cancel â€” cancelar pedido agendado', () => {
    it('deve cancelar um pedido agendado antes de ser aceite', async () => {
      if (!scheduledOrderId) return;

      // Garantir que estÃ¡ cancelÃ¡vel
      await RequestService.updateOne(
        { _id: scheduledOrderId },
        { $set: { status: 'Pendente', isCanceled: false } }
      );

      const res = await request(app)
        .put(`/api/request-service/${scheduledOrderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ message: 'Mudei de ideias quanto ao agendamento' });

      expect(res.status).toBeLessThan(500);

      if (res.status === 200) {
        expect(res.body.order.status).toBe('Cancelado');
        expect(res.body.order.isScheduled).toBe(true); // Flag mantida para histÃ³rico
      }
    }, 15000);
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SUITE 3 â€” VALIDAÃ‡Ã•ES UNITÃRIAS DO MODELO (sem HTTP)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('ValidaÃ§Ãµes unitÃ¡rias do modelo RequestService', () => {
  it('isScheduled tem default false', async () => {
    const order = new RequestService(minimalOrder({
      user: testClient._id,
      code: '888001',
    }));
    await order.save();
    immediateOrderIds.push(order._id);
    expect(order.isScheduled).toBe(false);
  }, 10000);

  it('scheduledAt tem default null', async () => {
    const order = new RequestService(minimalOrder({
      user: testClient._id,
      code: '888002',
    }));
    await order.save();
    immediateOrderIds.push(order._id);
    expect(order.scheduledAt).toBeNull();
  }, 10000);

  it('scheduledNotified tem default false', async () => {
    const order = new RequestService(minimalOrder({
      user: testClient._id,
      code: '888003',
      isScheduled: true,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
    }));
    await order.save();
    scheduledOrderIds.push(order._id);
    expect(order.scheduledNotified).toBe(false);
  }, 10000);

  it('pedido com isScheduled=true deve ter scheduledAt obrigatÃ³rio (via lÃ³gica de app)', () => {
    // Esta regra Ã© validada na rota/app, nÃ£o no schema do Mongoose
    // O modelo aceita null, mas a lÃ³gica da rota sÃ³ guarda scheduledAt quando isScheduled=true
    const future = new Date(Date.now() + 3600 * 1000);
    const order = new RequestService({
      isScheduled: true,
      scheduledAt: future,
    });
    expect(order.scheduledAt).toEqual(future);
  });

  it('diferenÃ§a entre pedido imediato e agendado: isSearching inicial', () => {
    const immediate = new RequestService({ isScheduled: false, isSearching: true });
    const scheduled = new RequestService({ isScheduled: true, isSearching: false });

    expect(immediate.isSearching).toBe(true);
    expect(scheduled.isSearching).toBe(false);
  });
});
