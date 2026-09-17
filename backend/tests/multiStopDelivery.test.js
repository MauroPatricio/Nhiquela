import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import { jest } from '@jest/globals';
import deliveryOrderRouter from '../routes/deliveryOrderRoutes.js';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';

import { generateToken } from '../utils.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'somethingsecret';

// Setup Express app for testing
const app = express();
app.use(express.json());

const testUser = {
  _id: new mongoose.Types.ObjectId().toString(),
  name: 'Test Admin',
  email: 'admin@nhiquela.mz',
  isAdmin: true,
  isDriver: true,
  isPartner: true
};

const token = generateToken(testUser);

// Mock Mongoose model methods for fast unit/integration testing
const mockTripId = new mongoose.Types.ObjectId().toString();
const mockStop1Id = new mongoose.Types.ObjectId().toString();
const mockStop2Id = new mongoose.Types.ObjectId().toString();
const mockUserDriverId = new mongoose.Types.ObjectId().toString();

jest.spyOn(RequestService.prototype, 'save').mockImplementation(function () {
  this._id = this._id || mockTripId;
  if (this.deliveryStops) {
    this.deliveryStops = this.deliveryStops.map((s, idx) => ({
      ...s,
      _id: idx === 0 ? mockStop1Id : mockStop2Id,
      proofOfDelivery: s.proofOfDelivery || { otp: '4821', otpVerified: false }
    }));
  }
  return Promise.resolve(this);
});

jest.spyOn(RequestService, 'findById').mockImplementation((id) => {
  const mockDoc = {
    _id: id || mockTripId,
    multiStopStatus: 'IN_PROGRESS',
    auditTrail: [],
    deliveryStops: [
      {
        _id: mockStop1Id,
        sequence: 1,
        address: 'Costa do Sol',
        recipientName: 'João',
        packages: 3,
        status: 'PENDING',
        proofOfDelivery: { otp: '4821', otpVerified: false }
      },
      {
        _id: mockStop2Id,
        sequence: 2,
        address: 'Matola Gare',
        recipientName: 'Carlos',
        packages: 5,
        status: 'PENDING',
        proofOfDelivery: { otp: '9912', otpVerified: false }
      }
    ],
    save: function() { return Promise.resolve(this); }
  };
  return Promise.resolve(mockDoc);
});

app.use('/api/delivery-orders', deliveryOrderRouter);

describe('Nhiquela Multi-Destino Functional & Integration Tests', () => {
  let createdTripId;
  let firstStopId;
  let secondStopId;

  // Test 1: Route Optimization (Algoritmo TSP & Cálculo Consolidado)
  test('POST /api/delivery-orders/optimize-route should calculate distance, ETA, and optimal stop sequence', async () => {
    const payload = {
      origin: { address: 'Armazém Maputo', lat: -25.9692, lng: 32.5732 },
      stops: [
        { sequence: 1, address: 'Marracuene', recipientName: 'Ana', packages: 1, lat: -25.7333, lng: 32.6833 },
        { sequence: 2, address: 'Costa do Sol', recipientName: 'João', packages: 3, lat: -25.9380, lng: 32.6150 },
        { sequence: 3, address: 'Baixa de Maputo', recipientName: 'Maria', packages: 2, lat: -25.9720, lng: 32.5700 }
      ]
    };

    const res = await request(app)
      .post('/api/delivery-orders/optimize-route')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('optimizedStops');
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary.totalStops).toBe(3);
    expect(res.body.summary.totalPackages).toBe(6);
    expect(res.body.summary.totalPrice).toBeGreaterThan(0);

    // O primeiro destino na rota otimizada a partir da Baixa deve ser Baixa de Maputo ou Costa do Sol (mais próximos que Marracuene)
    expect(res.body.optimizedStops[0].address).not.toBe('Marracuene');
  });

  // Test 2: Order Creation (Criação de Viagem Multi-Destino)
  test('POST /api/delivery-orders should create a multi-stop delivery trip with generated OTPs', async () => {
    const payload = {
      origin: { address: 'Armazém Central', lat: -25.9692, lng: 32.5732 },
      stops: [
        { sequence: 1, address: 'Costa do Sol', recipientName: 'João Silva', recipientPhone: '841234567', packages: 3, latitude: -25.9380, longitude: 32.6150 },
        { sequence: 2, address: 'Matola Gare', recipientName: 'Carlos Tembe', recipientPhone: '845551234', packages: 5, latitude: -25.9620, longitude: 32.4600 }
      ],
      transportType: 'Mota',
      description: 'Entrega de material informático'
    };

    const res = await request(app)
      .post('/api/delivery-orders')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('order');
    expect(res.body.order.deliveryStops).toHaveLength(2);

    createdTripId = res.body.order._id;
    firstStopId = res.body.order.deliveryStops[0]._id;
    secondStopId = res.body.order.deliveryStops[1]._id;

    // Verificar se o OTP de 4 dígitos foi gerado automaticamente para cada paragem
    expect(res.body.order.deliveryStops[0].proofOfDelivery.otp).toBeDefined();
    expect(res.body.order.deliveryStops[0].proofOfDelivery.otp).toHaveLength(4);
  });

  // Test 3: Arrival at Stop (Notificação de Chegada à Paragem)
  test('POST /api/delivery-orders/:id/stops/:stopId/arrive should mark stop status as ARRIVED', async () => {
    if (!createdTripId || !firstStopId) return;

    const res = await request(app)
      .post(`/api/delivery-orders/${createdTripId}/stops/${firstStopId}/arrive`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stop.status).toBe('ARRIVED');
  });

  // Test 4: Stop Delivery Confirmation (Validação OTP e Entrega da Paragem)
  test('POST /api/delivery-orders/:id/stops/:stopId/deliver should validate OTP and mark stop as DELIVERED', async () => {
    if (!createdTripId || !firstStopId) return;

    const res = await request(app)
      .post(`/api/delivery-orders/${createdTripId}/stops/${firstStopId}/deliver`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        otp: '4821',
        photo: 'http://example.com/photo.jpg',
        signature: 'Assinatura Teste',
        latitude: -25.9380,
        longitude: 32.6150
      });

    expect(res.status).toBe(200);
    expect(res.body.stop.status).toBe('DELIVERED');
    expect(res.body.stop.proofOfDelivery.otpVerified).toBe(true);
  });

  // Test 5: Stop Failure / Occurrence (Registo de Falha/Ocorrência na Paragem)
  test('POST /api/delivery-orders/:id/stops/:stopId/fail should mark stop as FAILED and record occurrence details', async () => {
    if (!createdTripId || !secondStopId) return;

    const res = await request(app)
      .post(`/api/delivery-orders/${createdTripId}/stops/${secondStopId}/fail`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        failureReason: 'Cliente ausente',
        failureNotes: 'Contacto telefónico efetuado sem resposta.'
      });

    expect(res.status).toBe(200);
    expect(res.body.stop.status).toBe('FAILED');
    expect(res.body.stop.failureReason).toBe('Cliente ausente');
  });

  // Test 6: Reordering Stops with Audit Trail (Reordenação de Paragens pelo Admin)
  test('POST /api/delivery-orders/:id/reorder-stops should update sequence and add audit record', async () => {
    if (!createdTripId) return;

    const newSequence = [
      { stopId: secondStopId, sequence: 1 },
      { stopId: firstStopId, sequence: 2 }
    ];

    const res = await request(app)
      .post(`/api/delivery-orders/${createdTripId}/reorder-stops`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newSequence });

    expect(res.status).toBe(200);
    expect(res.body.order.auditTrail).toBeDefined();
    expect(res.body.order.auditTrail.length).toBeGreaterThan(0);
    expect(res.body.order.auditTrail[0].action).toBe('STOPS_REORDERED');
  });

  // Test 7: Multi-stop Driver Commission & Wallet Deduction Calculation
  test('calculateDynamicCommission should calculate accurate commission on multi-stop consolidated fare', async () => {
    const walletService = await import('../services/walletService.js');
    const PricingEngine = (await import('../models/PricingEngineModel.js')).default;
    const Settings = (await import('../models/SettingsModel.js')).default;

    jest.spyOn(PricingEngine, 'findOne').mockResolvedValue({
      financialEngine: {
        driverCommissionRate: 0.15,
        useGeneralCommission: true
      }
    });

    jest.spyOn(Settings, 'findOne').mockResolvedValue(null);

    const mockMultiStopOrder = {
      _id: mockTripId,
      deliveryPrice: 450,
      pricing: { totalPrice: 450 },
      deliveryman: { id: mockUserDriverId },
      deliveryStops: [
        { sequence: 1, address: 'Costa do Sol', status: 'DELIVERED' },
        { sequence: 2, address: 'Matola Gare', status: 'DELIVERED' }
      ]
    };

    // Driver com histórico de viagens (fora da 1ª viagem isenta)
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: mockUserDriverId,
      completedOrders: 5,
      name: 'Driver Test'
    });

    const commission = await walletService.calculateDynamicCommission(mockMultiStopOrder);
    
    // Taxa padrão de 15% sobre 450 MT = 67.5 MT de comissão para a plataforma
    expect(commission).toBe(67.5);
    
    const netDriverEarnings = mockMultiStopOrder.deliveryPrice - commission;
    expect(netDriverEarnings).toBe(382.5);
  });
});
