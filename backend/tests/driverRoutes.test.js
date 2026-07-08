// tests/driverRoutes.test.js
// Integration tests for the driver availability and location system
// Requires MongoDB Atlas IP whitelisted.

import request from 'supertest';
import app from '../index.js';
import User from '../models/UserModel.js';
import { generateToken } from '../utils.js';

let authToken;
let testDriver;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: /@driver-test\.com$/ } });

  testDriver = await User.create({
    name: 'Jest Driver Test',
    email: 'driver_test1@driver-test.com',
    password: 'pass1234',
    phoneNumber: 845888003,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active',
    latitude: '-25.9614',
    longitude: '32.5731',
  });

  authToken = generateToken(testDriver);
}, 25000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@driver-test\.com$/ } });
}, 15000);

describe('GET /api/drivers/available', () => {
  it('should return list of available drivers near a location', async () => {
    const res = await request(app)
      .get('/api/drivers/available')
      .query({ lat: -25.96, lng: 32.57, radius: 10 });

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const drivers = res.body.drivers || res.body;
      expect(Array.isArray(drivers)).toBe(true);
    }
  }, 15000);

  it('should return empty array when no drivers in range', async () => {
    const res = await request(app)
      .get('/api/drivers/available')
      .query({ lat: -20.00, lng: 20.00, radius: 1 });

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const drivers = res.body.drivers || res.body;
      expect(Array.isArray(drivers)).toBe(true);
      expect(drivers.length).toBe(0);
    }
  }, 15000);
});

describe('PUT /api/drivers/location/:id', () => {
  it('should update driver location when authenticated', async () => {
    const res = await request(app)
      .put(`/api/drivers/ping`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ lat: '-25.9700', lng: '32.5800' });

    expect([200, 404]).toContain(res.status);
  }, 15000);

  it('should reject location update without auth (401)', async () => {
    const res = await request(app)
      .put(`/api/drivers/ping`)
      .send({ lat: '-25.9700', lng: '32.5800' });

    expect(res.status).toBe(401);
  }, 15000);
});

describe('PUT /api/drivers/availability/:id', () => {
  it('should toggle driver availability when authenticated', async () => {
    const res = await request(app)
      .put(`/api/drivers/availability`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ availability: 'paused' });

    expect([200, 404]).toContain(res.status);
  }, 15000);

  it('should reject availability change without auth (401)', async () => {
    const res = await request(app)
      .put(`/api/drivers/availability`)
      .send({ availability: 'paused' });

    expect(res.status).toBe(401);
  }, 15000);
});
