import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';

// Mock das notificações
const mockCreateNotification = jest.fn().mockResolvedValue({});
jest.unstable_mockModule('../utils/createNotification.js', () => ({
  default: mockCreateNotification,
  createNotification: mockCreateNotification
}));

describe('Teste de Estado da Aplicação (Aberta vs Fechada)', () => {
  let driver;
  let order;
  let DispatchService;
  let io;
  let serverSocket;
  let clientSocket;
  let httpServer;

  beforeAll(async () => {
    dotenv.config();
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);

    // Setup Socket.io Server for Testing
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
    });

    // Lógica do onLogin que nós corrigimos no index.js
    io.on('connection', (socket) => {
      serverSocket = socket;
      socket.on('onLogin', async (user) => {
        const userId = user._id || user.id; // <-- A CORRECÇÃO QUE FIZEMOS
        if (userId) {
          const dbUser = await User.findById(userId).select('isDeliveryMan');
          if (dbUser && dbUser.isDeliveryMan) {
            socket.join(`driver_${userId}`);
          }
        }
      });
    });

    const module = await import('../services/dispatchService.js');
    DispatchService = module.default;
  });

  afterAll(async () => {
    if (driver) await User.deleteOne({ _id: driver._id });
    if (order) await RequestService.deleteOne({ _id: order._id });
    await mongoose.connection.close();
    io.close();
    clientSocket.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Verificar Recepção de Pedido: App Aberta (WebSocket) & App Fechada (Push Notification)', async () => {
    // 1. Criar motorista
    driver = new User({
      name: 'Motorista App State Test',
      email: `driver_state_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true,
      availability: 'active',
      status: 'Disponível',
      deviceToken: 'FCM_TOKEN_123', 
    });
    await driver.save();

    // 2. Criar pedido
    order = new RequestService({
      origin: 'Maputo',
      destination: 'Matola',
      user: new mongoose.Types.ObjectId(),
      status: 'Pendente',
      targetDriverId: driver._id,
      transportType: 'Carro',
      phoneNumber: 841234567,
      name: 'Cliente Teste'
    });
    await order.save();

    // 3. Simular a APP ABERTA enviando o payload errado (com .id em vez de ._id)
    await new Promise((resolve) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('onLogin', { id: driver._id.toString() });
        setTimeout(resolve, 500); // Dar tempo para o join(`driver_${userId}`) acontecer
      });
    });

    // 4. Escutar no cliente pelo evento 'new_order' (App Aberta)
    const newOrderPromise = new Promise((resolve) => {
      clientSocket.on('new_order', (data) => {
        resolve(data);
      });
    });

    // 5. Executar o Dispatch
    // _pingDriversSequentially vai emitir no io e chamar createNotification
    DispatchService._pingDriversSequentially(order, [driver], io);

    // 6. VERIFICAÇÃO 1: App Aberta (WebSocket recebeu o evento instantaneamente?)
    const receivedOrder = await Promise.race([
      newOrderPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de WebSocket')), 2000))
    ]);

    expect(receivedOrder).toBeDefined();
    expect(receivedOrder._id.toString()).toBe(order._id.toString());
    
    // 7. VERIFICAÇÃO 2: App Fechada (Push Notification foi enviada corretamente?)
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const pushPayload = mockCreateNotification.mock.calls[0][0];
    
    expect(pushPayload.pushToken).toBe('FCM_TOKEN_123');
    expect(pushPayload.receiver_id.toString()).toBe(driver._id.toString());
  });
});
