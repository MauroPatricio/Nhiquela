/**
 * tripLifecycleTracking.test.js
 *
 * Testa o rastreio e as mudanças de estado durante todo o ciclo de vida de uma viagem:
 * 1. Pendente
 * 2. Pedido aceite (A Caminho da Origem)
 * 3. Em trânsito (A Caminho do Destino)
 * 4. No destino indicado
 * 5. Concluído
 *
 * O teste verifica as alterações na BD e se os eventos Socket.IO de atualização (order_updated)
 * são devidamente despoletados.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import app from '../index.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Wallet from '../models/WalletModel.js';
import { generateToken } from '../utils.js';

const EMAIL_SUFFIX = '@lifecycle-tracking-test.com';

let testClient;
let testDriver;
let clientToken;
let driverToken;
let orderId;
let ioMock;
let toMock;
let emitMock;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: EMAIL_SUFFIX + '$' } });

  testClient = await User.create({
    name: 'Jest Lifecycle Client',
    email: `client${EMAIL_SUFFIX}`,
    password: 'pass1234',
    phoneNumber: 846001001,
  });

  testDriver = await User.create({
    name: 'Jest Lifecycle Driver',
    email: `driver${EMAIL_SUFFIX}`,
    password: 'pass1234',
    phoneNumber: 846001002,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active',
    latitude: -25.9614,
    longitude: 32.5731,
    deliveryman: {
      name: 'Lifecycle Driver',
      phoneNumber: 846001002,
      hasActiveService: false,
      status: 'Disponível',
    },
  });

  await Wallet.create({
    ownerType: 'driver',
    ownerId: testDriver._id,
    userId: testDriver._id,
    balance: 5000,
    currency: 'MT',
  });

  clientToken = generateToken(testClient);
  driverToken = generateToken(testDriver);
  
  // Mock do Socket.IO globalmente no app Express
  emitMock = jest.fn();
  toMock = jest.fn().mockReturnValue({ emit: emitMock });
  ioMock = {
    to: toMock,
    emit: emitMock
  };
  app.set('io', ioMock);

}, 30000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: EMAIL_SUFFIX + '$' } });
  if (orderId) {
    await RequestService.deleteOne({ _id: orderId });
  }
  await Wallet.deleteMany({ ownerId: testDriver?._id });
}, 20000);

afterEach(() => {
  jest.clearAllMocks();
});

describe('Fluxo Completo de Viagem com Notificações de Rastreio (Socket.IO)', () => {
  
  it('1. Criar pedido (stepStatus = Pendente)', async () => {
    const res = await request(app)
      .post('/api/request-service')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        name: 'Viagem de Rastreio',
        phoneNumber: '846001001',
        goodType: 'Person',
        transportType: 'Carro',
        deliverCity: 'Maputo',
        origin: 'Ponto A',
        destination: 'Ponto B',
        originDetails: { address: 'Ponto A', lat: -25.96, lng: 32.57 },
        destinationDetails: { address: 'Ponto B', lat: -25.97, lng: 32.58 },
        paymentOption: 'immediate',
        description: 'Teste fluxo completo',
        paymentMethod: 'cash',
        deliveryPrice: 150,
        isScheduled: false,
        targetDriverId: testDriver._id.toString()
      });

    expect(res.status).toBe(201);
    orderId = res.body.requestService._id;
    expect(res.body.requestService.status).toBe('Pendente');
  }, 10000);

  it('2. Motorista Aceita (stepStatus = 4 -> Pedido aceite)', async () => {
    const res = await request(app)
      .put(`/api/request-service/${orderId}/acceptedByDeliveryman`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('Pedido aceite');
    expect(res.body.order.stepStatus).toBe(4);

    // Verifica se os eventos do socket foram emitidos para os canais corretos (cliente e condutor)
    expect(toMock).toHaveBeenCalledWith(`order_${orderId}`);
    expect(emitMock).toHaveBeenCalledWith('order_updated', expect.objectContaining({ status: 'Pedido aceite' }));
  }, 10000);

  it('3. Motorista arranca com o cliente/encomenda (stepStatus = 5 -> Em trânsito)', async () => {
    const res = await request(app)
      .put(`/api/request-service/${orderId}/intransit`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(200);

    const checkOrder = await RequestService.findById(orderId);
    expect(checkOrder.status).toBe('Em trânsito');
    expect(checkOrder.stepStatus).toBe(5);
    expect(checkOrder.isInTransit).toBe(true);

    expect(toMock).toHaveBeenCalledWith(`order_${orderId}`);
    expect(emitMock).toHaveBeenCalledWith('order_updated', expect.objectContaining({ status: 'Em trânsito' }));
  }, 10000);

  it('4. Motorista chega ao destino (stepStatus = 5 -> No destino indicado)', async () => {
    const res = await request(app)
      .put(`/api/request-service/${orderId}/confirmDestination`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        latitude: -25.9701,
        longitude: 32.5801
      });

    expect(res.status).toBe(200);

    const checkOrder = await RequestService.findById(orderId);
    expect(checkOrder.status).toBe('No destino indicado');
    expect(checkOrder.stepStatus).toBe(5);
    
    // Confirma que a última localização de chegada foi registada
    expect(checkOrder.arrivalLatitude).toBe(-25.9701);

    expect(toMock).toHaveBeenCalledWith(`order_${orderId}`);
    expect(emitMock).toHaveBeenCalledWith('order_updated', expect.objectContaining({ status: 'No destino indicado' }));
  }, 10000);

  it('5. Cliente finaliza/confirma receção (stepStatus = 6 -> Concluído)', async () => {
    const res = await request(app)
      .put(`/api/request-service/${orderId}/deliver`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({});

    expect(res.status).toBe(200);

    const checkOrder = await RequestService.findById(orderId);
    expect(checkOrder.status).toBe('Concluído');
    expect(checkOrder.stepStatus).toBe(6);
    expect(checkOrder.isDelivered).toBe(true);

    expect(toMock).toHaveBeenCalledWith(`order_${orderId}`);
    expect(emitMock).toHaveBeenCalledWith('order_updated', expect.objectContaining({ status: 'Concluído' }));
  }, 10000);

});
