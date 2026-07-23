import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import dotenv from 'dotenv';

// Mocks do utils/createNotification.js e utils/sendNotification.js
const mockCreateNotification = jest.fn().mockResolvedValue({});
jest.unstable_mockModule('../utils/createNotification.js', () => ({
  default: mockCreateNotification,
  createNotification: mockCreateNotification
}));

describe('Integração de Notificações no DispatchService', () => {
  let driver;
  let order;
  let DispatchService;

  beforeAll(async () => {
    dotenv.config();
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);

    // Importar dinamicamente DEPOIS de fazer o mock
    const module = await import('../services/dispatchService.js');
    DispatchService = module.default;
  });

  afterAll(async () => {
    if (driver) await User.deleteOne({ _id: driver._id });
    if (order) await RequestService.deleteOne({ _id: order._id });
    await mongoose.connection.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. O DispatchService DEVE chamar createNotification passando o deviceToken do motorista', async () => {
    // 1. Criar um motorista
    driver = new User({
      name: 'Motorista Push Teste',
      email: `driver_push_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true,
      availability: 'active',
      status: 'Disponível',
      'deliveryman.hasActiveService': false,
      deviceToken: 'ExponentPushToken[12345]', // O Token verdadeiro que vem do App.js
      locationGeo: {
        type: 'Point',
        coordinates: [32.5732, -25.9692]
      }
    });
    await driver.save();

    // 2. Criar um pedido falso
    order = new RequestService({
      origin: 'Maputo Shopping',
      destination: 'Baixa',
      originDetails: { lat: -25.9600, lng: 32.5700, address: 'Maputo Shopping' },
      destinationDetails: { lat: -25.9700, lng: 32.5800, address: 'Baixa' },
      user: new mongoose.Types.ObjectId(),
      status: 'Pendente',
      deliveryman: { hasActiveService: false },
      deliverCity: 'Maputo',
      transportType: 'Carro',
      goodType: 'Documentos',
      phoneNumber: 841234567,
      name: 'Cliente Teste'
    });
    await order.save();

    // 3. Mock do Socket.io
    const ioMock = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: {
            get: jest.fn().mockReturnValue(new Set(['fake-socket-id']))
          }
        }
      }
    };

    // 4. Executar uma chamada interna parcial do dispatch
    // O DispatchService normal procuraria na BD. Para testar só a notificação:
    await DispatchService._pingDriversSequentially(order, [driver], ioMock);

    // 5. Verificar se createNotification foi chamado!
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    
    const notificationPayload = mockCreateNotification.mock.calls[0][0];
    
    // O FIX DEFINITIVO: O token tem de ser passado do driver.deviceToken
    expect(notificationPayload.pushToken).toBe('ExponentPushToken[12345]');
    expect(notificationPayload.receiver_id.toString()).toBe(driver._id.toString());
    expect(notificationPayload.message).toContain('Nova viagem');
  });
});
