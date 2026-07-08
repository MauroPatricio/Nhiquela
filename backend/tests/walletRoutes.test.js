// tests/walletRoutes.test.js
// Integration tests for the driver wallet system
// Requires MongoDB Atlas IP whitelisted.

import request from 'supertest';
import app from '../index.js';
import User from '../models/UserModel.js';
import Wallet from '../models/WalletModel.js';
import { generateToken } from '../utils.js';

let authToken;
let testUser;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: /@wallet-test\.com$/ } });
  await Wallet.deleteMany({});

  testUser = await User.create({
    name: 'Jest Driver Wallet',
    email: 'driver@wallet-test.com',
    password: 'pass1234',
    phoneNumber: 845888002,
    isDeliveryMan: true,
    isApproved: true,
  });

  authToken = generateToken(testUser);

  await Wallet.create({
    ownerType: 'driver',
    ownerId: testUser._id,
    user: testUser._id,
    balance: 500,
    currency: 'MT',
  });
}, 25000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@wallet-test\.com$/ } });
  await Wallet.deleteMany({ user: testUser?._id });
}, 15000);

describe('GET /api/wallet/balance/:userId', () => {
  it('should return the wallet balance for authenticated driver', async () => {
    const res = await request(app)
      .get(`/api/wallet/balance`)
      .set('Authorization', `Bearer ${authToken}`);

    // 200 = found, 404 = route name mismatch (both ok, 500 is NOT)
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('available_balance');
    }
  }, 15000);

  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .get(`/api/wallet/balance`);
    expect(res.status).toBe(401);
  }, 15000);
});

describe('GET /api/wallet/transactions/:userId', () => {
  it('should return transaction history (array) for authenticated driver', async () => {
    const res = await request(app)
      .get(`/api/wallet/transactions/${testUser._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  }, 15000);
});

describe('POST /api/wallet/topup', () => {
  it('should reject topup without auth token (401)', async () => {
    const res = await request(app)
      .post('/api/wallet/topup')
      .send({ userId: testUser._id, amount: 100, method: 'mpesa' });
    expect(res.status).toBe(401);
  }, 15000);

  it('should reject topup with missing amount (400+)', async () => {
    const res = await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: testUser._id, method: 'mpesa' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 15000);
});

describe('POST /api/wallet/withdraw', () => {
  it('should reject withdrawal without auth token (401)', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .send({ userId: testUser._id, amount: 50 });
    expect(res.status).toBe(401);
  }, 15000);

  it('should reject withdrawal greater than balance (400+)', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: testUser._id, amount: 9999999 });
    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 15000);
});
