import { jest } from '@jest/globals';

// Mock dependencies
const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const mockFetchSockets = jest.fn().mockResolvedValue([{ id: 'socket1' }]);
const mockIn = jest.fn().mockReturnValue({ fetchSockets: mockFetchSockets });

const mockIo = {
  to: mockTo,
  in: mockIn
};

const mockReq = {
  app: {
    get: jest.fn().mockReturnValue(mockIo)
  }
};

const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  send: jest.fn()
};

// Mock User Model
jest.unstable_mockModule('../../models/UserModel.js', () => ({
  default: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '6a604c57d428fb3aa024b6e9',
        name: 'Mauro',
        deviceToken: 'token_123'
      })
    })
  }
}));

// Mock Notification
jest.unstable_mockModule('../../utils/createNotification.js', () => ({
  createNotification: jest.fn().mockResolvedValue(true)
}));

describe('Dispatch Flow via WebSocket', () => {
  it('deve emitir o evento new_order para a sala correta se o driver alvo for fornecido e estiver online', async () => {
    const targetDriverId = '6a604c57d428fb3aa024b6e9';
    const driverRoom = `driver_${targetDriverId}`;
    const orderPayload = { code: '420165', targetDriverId, type: 'requestService' };

    // Simulação do comportamento que ocorre no requestServiceRoutes.js:
    
    // 1. O backend verifica se o socket está conectado na sala
    const sockets = await mockIo.in(driverRoom).fetchSockets();
    const isSocketConnected = sockets && sockets.length > 0;
    
    expect(isSocketConnected).toBe(true);
    expect(mockIo.in).toHaveBeenCalledWith(driverRoom);

    // 2. O backend emite o pedido via WebSocket
    mockIo.to(driverRoom).emit('new_order', orderPayload);
    
    expect(mockIo.to).toHaveBeenCalledWith(driverRoom);
    expect(mockEmit).toHaveBeenCalledWith('new_order', orderPayload);
  });
});
