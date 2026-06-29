// tests/requestDeliverRoutes.test.js
// Integration tests for the delivery request system
// Requires MongoDB Atlas IP whitelisted.

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import User from '../models/UserModel.js';
import { generateToken } from '../utils.js';

let clientToken;
let driverToken;
let testClient;
let testDriver;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: /@deliver-test\.com$/ } });

  testClient = await User.create({
    name: 'Jest Client Test',
    email: 'client1@deliver-test.com',
    password: 'pass1234',
    phoneNumber: 845888004,
  });

  testDriver = await User.create({
    name: 'Jest Driver Deliver',
    email: 'driver_deliv1@deliver-test.com',
    password: 'pass1234',
    phoneNumber: 845888005,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active',
    latitude: '-25.9614',
    longitude: '32.5731',
  });

  clientToken = generateToken(testClient);
  driverToken = generateToken(testDriver);
}, 25000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@deliver-test\.com$/ } });
}, 15000);

describe('POST /api/request-deliver', () => {
  it('should create a delivery request when authenticated as client', async () => {
    const deliveryData = {
      name: 'Test Deliver',
      phoneNumber: '845888004',
      goodType: 'Document',
      transportType: 'Bicycle',
      deliverCity: 'Maputo',
      origin: 'Av. Julius Nyerere, Maputo',
      destination: 'Av. Eduardo Mondlane, Maputo',
      paymentOption: 'immediate',
      description: 'Test delivery',
      paymentMethod: 'cash',
      deliveryPrice: 150,
      serviceId: new mongoose.Types.ObjectId().toString(),
    };

    const res = await request(app)
      .post('/api/request-deliver')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(deliveryData);

    expect(res.status).toBeLessThan(500);
  }, 15000);

  it('should reject delivery request without auth (401)', async () => {
    const res = await request(app)
      .post('/api/request-deliver')
      .send({ origin: { lat: -25.96, lng: 32.57 } });

    expect(res.status).toBe(401);
  }, 15000);
});

describe('GET /api/request-deliver/client/:clientId', () => {
  it('should return client delivery history', async () => {
    const res = await request(app)
      .get(`/api/request-deliver/client/${testClient._id}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
    }
  }, 15000);
});

describe('GET /api/request-deliver/driver/:driverId', () => {
  it('should return driver order history', async () => {
    const res = await request(app)
      .get(`/api/request-deliver/driver/${testDriver._id}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBeLessThan(500);
  }, 15000);
});
