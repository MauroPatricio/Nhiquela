const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index'); // Assuming index.js exports the express app
const User = require('../models/UserModel');
const DeliverymanUpdateRequest = require('../models/DeliverymanUpdateRequestModel');
const { setupDB, teardownDB, clearDB } = require('./setup'); // Assuming setup helpers exist

beforeAll(async () => {
  await setupDB();
});

afterAll(async () => {
  await teardownDB();
});

afterEach(async () => {
  await clearDB();
});

describe('Deliveryman Profile Update', () => {
  let driverToken;
  let driverId;
  let adminToken;

  beforeEach(async () => {
    // Create driver
    const driver = new User({
      name: 'Driver Test',
      email: 'driver@test.com',
      password: 'password123',
      isDeliveryMan: true,
      deliveryman: {
        transport_type: '60d21b4667d0d8992e610c85', // dummy ID
        assigned_base_fee: 100,
        docUpdateStatus: 'Nenhum'
      }
    });
    await driver.save();
    driverId = driver._id;

    // Create admin
    const admin = new User({
      name: 'Admin Test',
      email: 'admin@test.com',
      password: 'password123',
      isAdmin: true,
    });
    await admin.save();

    // Authenticate driver (Assuming a token generation mechanism or login endpoint)
    // For unit testing routes with isAuth, usually we mock the token or login
    const driverLogin = await request(app)
      .post('/api/users/signin')
      .send({ email: 'driver@test.com', password: 'password123' });
    driverToken = driverLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/users/signin')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.token;
  });

  it('should create a pending request when transport_type changes', async () => {
    const res = await request(app)
      .post('/api/users/deliveryman/update-request')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        transport_type: '60d21b4667d0d8992e610c86', // New ID
        assigned_base_fee: 200,
      });

    expect(res.statusCode).toEqual(200);

    const updateRequest = await DeliverymanUpdateRequest.findOne({ deliverymanId: driverId });
    expect(updateRequest).toBeDefined();
    expect(updateRequest.status).toBe('PENDING');
    expect(updateRequest.type).toBe('profile_update');
    
    // Check that driver's transport_type was NOT updated immediately
    const driver = await User.findById(driverId);
    expect(driver.deliveryman.transport_type.toString()).toBe('60d21b4667d0d8992e610c85');
  });

  it('should apply changes immediately when transport_type does NOT change', async () => {
    const res = await request(app)
      .post('/api/users/deliveryman/update-request')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        transport_registration: 'NEW-REG-123',
      });

    expect(res.statusCode).toEqual(200);

    const updateRequest = await DeliverymanUpdateRequest.findOne({ deliverymanId: driverId });
    expect(updateRequest.status).toBe('APPROVED'); // Directly approved
    
    const driver = await User.findById(driverId);
    expect(driver.deliveryman.transport_registration).toBe('NEW-REG-123');
  });

  it('admin should be able to approve the pending profile update request', async () => {
    // 1. Driver requests change
    await request(app)
      .post('/api/users/deliveryman/update-request')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        transport_type: '60d21b4667d0d8992e610c86',
        assigned_base_fee: 300,
      });

    const pendingReq = await DeliverymanUpdateRequest.findOne({ deliverymanId: driverId, status: 'PENDING' });

    // 2. Admin approves
    const approveRes = await request(app)
      .put(`/api/drivers/doc-update-requests/${pendingReq._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED' });

    expect(approveRes.statusCode).toEqual(200);

    const updatedReq = await DeliverymanUpdateRequest.findById(pendingReq._id);
    expect(updatedReq.status).toBe('APPROVED');

    // 3. Driver should now have the new transport_type
    const driver = await User.findById(driverId);
    expect(driver.deliveryman.transport_type.toString()).toBe('60d21b4667d0d8992e610c86');
    expect(driver.deliveryman.assigned_base_fee).toBe(300);
  });
});
