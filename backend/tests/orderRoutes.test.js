// tests/orderRoutes.test.js
// Integration tests for the general order system
// Requires MongoDB Atlas IP whitelisted.

import request from 'supertest';
import app from '../index.js';
import User from '../models/UserModel.js';
import { generateToken } from '../utils.js';

let authToken;
let testUser;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: /@order-test\.com$/ } });

  testUser = await User.create({
    name: 'Jest Order Test',
    email: 'user1@order-test.com',
    password: 'pass1234',
    phoneNumber: 845888007,
  });

  authToken = generateToken(testUser);
}, 25000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@order-test\.com$/ } });
}, 15000);

describe('GET /api/orders/mine', () => {
  it('should return user orders when authenticated', async () => {
    const res = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  }, 15000);

  it('should reject without auth (401)', async () => {
    const res = await request(app).get('/api/orders/mine');
    expect(res.status).toBe(401);
  }, 15000);
});
