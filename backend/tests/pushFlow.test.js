import mongoose from 'mongoose';
import { createNotification } from '../utils/createNotification.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../utils/sendNotification.js', () => {
  return {
    sendNotification: jest.fn().mockImplementation(async (token) => {
      if (token === 'TOKEN_INVALIDO') {
        return { success: false, error: 'messaging/invalid-registration-token' };
      }
      return { success: true, tickets: [{ messageId: '12345' }] };
    })
  };
});

jest.mock('../models/NotificationModel.js', () => {
  return {
    __esModule: true,
    default: function() {
      return {
        save: jest.fn().mockResolvedValue(true)
      };
    }
  };
});

jest.mock('../models/NotificationToken.js', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockImplementation(() => {
          return Promise.resolve({ deviceToken: 'TOKEN_DB_RECUPERADO' });
        })
      })
    }
  };
});

describe('Push Notification Flow Tests', () => {
  const mockReceiverId = new mongoose.Types.ObjectId().toString();
  const mockSenderId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('CT1: Deve usar o token passado explicitamente e retornar sucesso', async () => {
    const { sendNotification } = await import('../utils/sendNotification.js');

    const result = await createNotification({
      message: 'Nova Viagem!',
      receiver_id: mockReceiverId,
      sender_id: mockSenderId,
      orderID: 'order_123',
      pushToken: 'TOKEN_EXPLICITO'
    });

    expect(result).toBeDefined();
    expect(sendNotification).toHaveBeenCalledWith(
      'TOKEN_EXPLICITO',
      'Nhiquela',
      'Nova Viagem!',
      { orderId: 'order_123', senderId: mockSenderId }
    );
  });

  it('CT2: Deve ir buscar o token ao DB se pushToken for omitido', async () => {
    const { sendNotification } = await import('../utils/sendNotification.js');

    const result = await createNotification({
      message: 'Nova Viagem sem token passado!',
      receiver_id: mockReceiverId,
      sender_id: mockSenderId,
      orderID: 'order_123',
      pushToken: null
    });

    expect(result).toBeDefined();
    expect(sendNotification).toHaveBeenCalledWith(
      'TOKEN_DB_RECUPERADO',
      'Nhiquela',
      'Nova Viagem sem token passado!',
      { orderId: 'order_123', senderId: mockSenderId }
    );
  });

  it('CT3: Deve lidar graciosamente com um erro do Firebase (token inválido)', async () => {
    const { sendNotification } = await import('../utils/sendNotification.js');
    
    // sendNotification mocked to return error when 'TOKEN_INVALIDO' is passed
    // the system shouldn't crash, the error is handled in sendNotification
    const result = await createNotification({
      message: 'Nova Viagem!',
      receiver_id: mockReceiverId,
      sender_id: mockSenderId,
      orderID: 'order_123',
      pushToken: 'TOKEN_INVALIDO'
    });

    expect(result).toBeDefined();
    expect(sendNotification).toHaveBeenCalled();
  });
});
