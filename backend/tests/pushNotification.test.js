import { jest } from '@jest/globals';

// Mocks do Firebase Admin
const sendMock = jest.fn().mockResolvedValue({ messageId: '12345' });
const messagingMock = jest.fn(() => ({
  send: sendMock,
}));

jest.unstable_mockModule('../firebase.js', () => ({
  default: {
    messaging: messagingMock,
  },
}));

describe('Verificação de Notificações Push (Rise em Background)', () => {
  let sendNotification;

  beforeAll(async () => {
    // Importa dinamicamente DEPOIS de fazer o mock do firebase.js
    const module = await import('../utils/sendNotification.js');
    sendNotification = module.default;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Deve enviar uma notificação com Prioridade Alta (High) para acordar o telemóvel', async () => {
    const deviceToken = 'test-token-123';
    const title = 'Nova Solicitação de Viagem';
    const body = 'Tem um novo pedido! Verifique agora.';
    const data = { orderId: 'ord_123' };

    const result = await sendNotification(deviceToken, title, body, data);

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);

    // O payload enviado à Firebase
    const payloadSent = sendMock.mock.calls[0][0];

    // Verifica se os campos básicos existem
    expect(payloadSent.token).toBe(deviceToken);
    expect(payloadSent.notification.title).toBe(title);
    expect(payloadSent.notification.body).toBe(body);
    expect(payloadSent.data.orderId).toBe('ord_123'); // Foi convertido para string

    // VERIFICAÇÃO CRÍTICA DO FIX DEFINITIVO (RISE EM SEGUNDO PLANO)
    // O payload deve ter a configuração específica de Android para acordar o ecrã
    expect(payloadSent.android).toBeDefined();
    expect(payloadSent.android.priority).toBe('high');
    expect(payloadSent.android.notification.channelId).toBe('default');
    expect(payloadSent.android.notification.priority).toBe('max');
    expect(payloadSent.android.notification.defaultVibrateTimings).toBe(true);
  });

  it('2. Não deve falhar se os dados (data) vierem undefined ou vazios', async () => {
    const deviceToken = 'test-token-123';
    const title = 'Nova Solicitação de Viagem';
    const body = 'Tem um novo pedido! Verifique agora.';

    const result = await sendNotification(deviceToken, title, body);

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    
    const payloadSent = sendMock.mock.calls[0][0];
    expect(payloadSent.data).toEqual({});
  });

  it('3. Deve rejeitar se o token for "null" (em formato string)', async () => {
    const result = await sendNotification('null', 'Title', 'Body');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Token invalido');
    expect(sendMock).not.toHaveBeenCalled();
  });
});
