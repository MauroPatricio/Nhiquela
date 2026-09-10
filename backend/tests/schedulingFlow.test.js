import mongoose from 'mongoose';
import { connectTestDB, disconnectTestDB } from './setup.js';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import { startSchedulingEngine } from '../workers/schedulingEngine.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { jest } from '@jest/globals';

dotenv.config();

// Mocks
jest.spyOn(cron, 'schedule').mockImplementation(() => ({ start: jest.fn(), stop: jest.fn() }));

describe('Fluxo de Pedidos Agendados (Cliente -> Motorista)', () => {
  let mockIo;
  let mockEmit;
  let testClient;
  let testScheduledRequest;
  let cronCallback;

  beforeAll(async () => {
    await connectTestDB();

    mockEmit = jest.fn();
    mockIo = {
      emit: mockEmit,
      to: jest.fn().mockReturnThis(),
    };

    // Criar cliente de teste
    testClient = await User.create({
      name: 'Cliente Teste Agendamento',
      email: 'agendamento@test.com',
      phoneNumber: '+258840001111',
      password: 'password123',
    });
  });

  afterAll(async () => {
    await RequestService.deleteMany({ 'user._id': testClient._id });
    await User.findByIdAndDelete(testClient._id);
    await disconnectTestDB();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Cliente guarda o pedido na base de dados (Status: SCHEDULED)', async () => {
    // Agendamento para daqui a 2 dias (48 horas)
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 48);

    testScheduledRequest = await RequestService.create({
      goodType: 'Transporte Padrão',
      description: 'Teste de Agendamento',
      isScheduled: true,
      scheduledAt: futureDate,
      status: 'SCHEDULED',
      user: {
        _id: testClient._id,
        name: testClient.name,
        phoneNumber: testClient.phoneNumber,
      },
      origin: 'Ponto A',
      destination: 'Ponto B',
      deliverCity: 'Maputo',
      transportType: 'Carro',
      name: testClient.name,
      phoneNumber: testClient.phoneNumber,
      pickupAddress: { address: 'Ponto A', lat: -25.969, lng: 32.573 },
      deliveryAddress: { address: 'Ponto B', lat: -25.970, lng: 32.574 },
    });

    expect(testScheduledRequest).toBeDefined();
    expect(testScheduledRequest.isScheduled).toBe(true);
    expect(testScheduledRequest.status).toBe('SCHEDULED');
    expect(testScheduledRequest.searchWindowStart).toBeNull();
  });

  it('2. Scheduling Engine calcula a janela de procura (Faltando 45 minutos)', async () => {
    // Inicializar o worker (ele vai registar a função no cron)
    startSchedulingEngine(mockIo, []);

    // Apanhar a callback que foi passada para o cron.schedule
    cronCallback = cron.schedule.mock.calls[0][1];
    
    // Correr a lógica da cron 1 vez (como se passasse um minuto)
    await cronCallback();

    // Buscar o pedido atualizado
    const updatedReq = await RequestService.findById(testScheduledRequest._id);
    
    expect(updatedReq.searchWindowStart).toBeDefined();
    
    // A janela deve ser exatos 45 minutos antes da data agendada
    const timeDiffMinutes = (updatedReq.scheduledAt.getTime() - updatedReq.searchWindowStart.getTime()) / 60000;
    expect(timeDiffMinutes).toBe(45);
    
    // O status continua a ser 'SCHEDULED' (porque ainda faltam 48 horas e não 45 min)
    expect(updatedReq.status).toBe('SCHEDULED');
  });

  it('3. Quando o tempo atinge os 45 minutos antes, o pedido muda para SEARCHING e notifica motoristas', async () => {
    // Simular que o tempo atual agora é exatamente a searchWindowStart + 1 segundo
    const updatedReq = await RequestService.findById(testScheduledRequest._id);
    const mockNow = new Date(updatedReq.searchWindowStart.getTime() + 1000);
    
    // Substituir a Date momentaneamente para simular viagem no tempo
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(args) {
        if (args) return new RealDate(args);
        return new RealDate(mockNow.getTime());
      }
    };
    global.Date.now = () => mockNow.getTime();

    // Executar a callback gravada anteriormente
    await cronCallback();

    // Restaurar Data
    global.Date = RealDate;

    // Verificar se o status mudou na base de dados
    const searchingReq = await RequestService.findById(testScheduledRequest._id);
    
    expect(searchingReq.status).toBe('SEARCHING');
    expect(searchingReq.isSearching).toBe(true);
    
    // Verificar se a plataforma emitiu a notificação via websockets para os motoristas!
    expect(mockEmit).toHaveBeenCalledWith('newServiceRequest', expect.objectContaining({
      _id: testScheduledRequest._id
    }));
    expect(mockEmit).toHaveBeenCalledWith('updateRequestState', expect.objectContaining({
      _id: testScheduledRequest._id
    }));
  });
});
