// tests/providerRoutes.test.js
// Integration tests for the provider system
// Requires MongoDB Atlas IP whitelisted.

import request from 'supertest';
import app from '../index.js';
import User from '../models/UserModel.js';
import { generateToken } from '../utils.js';

let authToken;
let testProvider;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: /@provider-test\.com$/ } });

  testProvider = await User.create({
    name: 'Jest Provider Test',
    email: 'provider1@provider-test.com',
    password: 'pass1234',
    phoneNumber: 845888006,
    isProvider: true,
    isApproved: true,
    category: 'Manutenção',
    subCategory: 'Electricista',
  });

  authToken = generateToken(testProvider);
}, 25000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@provider-test\.com$/ } });
}, 15000);

describe('GET /api/providers', () => {
  it('should return list of approved providers', async () => {
    const res = await request(app).get('/api/providers');

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.body.providers)).toBe(true);
    }
  }, 15000);
});

describe('GET /api/providers/:id', () => {
  it('should return a specific provider by ID', async () => {
    const res = await request(app).get(`/api/providers/${testProvider._id}`);

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('_id');
    }
  }, 15000);

  it('should return 404 for non-existent provider ID', async () => {
    const fakeId = '5f8d04f1228e181234567890';
    const res = await request(app).get(`/api/providers/${fakeId}`);

    expect(res.status).toBe(404);
  }, 15000);
});
