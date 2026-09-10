// tests/paymentRoutes.test.js
// Integration tests for M-Pesa and E-Mola webhooks
// These routes must respond to external callbacks - server must NOT crash.

import request from 'supertest';
import app from '../index.js';

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
}, 20000);

describe('POST /api/payments/mpesa/webhook', () => {
  it('should accept a valid M-Pesa callback payload and not crash (< 500)', async () => {
    const payload = {
      TransactionType: 'Pay Bill',
      TransID: 'MPE_JEST_001',
      TransAmount: '150.00',
      BusinessShortCode: '123456',
      BillRefNumber: 'ORDER_JEST_001',
      MSISDN: '258845888001',
      FirstName: 'Jest',
      LastName: 'Test',
      TransTime: '20260629120000',
    };
    const res = await request(app)
      .post('/api/payments/mpesa/webhook')
      .send(payload);

    expect(res.status).toBeLessThan(500);
  }, 15000);

  it('should handle empty M-Pesa payload gracefully (no crash)', async () => {
    const res = await request(app)
      .post('/api/payments/mpesa/webhook')
      .send({});
    expect(res.status).toBeLessThan(500);
  }, 15000);

  it('should handle malformed M-Pesa payload without crash', async () => {
    const res = await request(app)
      .post('/api/payments/mpesa/webhook')
      .send({ garbage: true, unknown: 'field' });
    expect(res.status).toBeLessThan(500);
  }, 15000);
});

describe('POST /api/payments/emola/webhook', () => {
  it('should accept a valid E-Mola callback payload and not crash (< 500)', async () => {
    const payload = {
      transaction_id: 'EMOLA_JEST_001',
      amount: '200.00',
      reference: 'ORDER_JEST_002',
      status: 'SUCCESS',
      msisdn: '258845888002',
    };
    const res = await request(app)
      .post('/api/payments/emola/webhook')
      .send(payload);

    expect(res.status).toBeLessThan(500);
  }, 15000);

  it('should handle empty E-Mola payload gracefully (no crash)', async () => {
    const res = await request(app)
      .post('/api/payments/emola/webhook')
      .send({});
    expect(res.status).toBeLessThan(500);
  }, 15000);
});
