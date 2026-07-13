import request from 'supertest';
import app from '../index.js';
import mongoose from 'mongoose';
import User from '../models/UserModel.js';

describe('Preferred Payment Methods and Transfer Preferences', () => {
  let userToken;
  let driverToken;
  let userId;
  let driverId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 6000));

    // We assume mongoose connection is handled by index.js and setup.js
    // Let's create a regular user
    const userRes = await request(app).post('/api/users/signup').send({
      name: 'Client Test',
      email: 'client@test.com',
      password: 'password123',
      phoneNumber: '840000001',
      isSeller: false,
      isDeliveryMan: false
    });
    userToken = userRes.body.token;
    userId = userRes.body._id;

    // Create a driver
    const driverRes = await request(app).post('/api/users/signup').send({
      name: 'Driver Test',
      email: 'driver@test.com',
      password: 'password123',
      phoneNumber: '840000002',
      isDeliveryMan: true,
      photo: 'photo.jpg',
      transport_type: new mongoose.Types.ObjectId().toString(),
      transport_color: 'Red',
      transport_registration: 'ABC-123',
      vihicle_picture: 'pic.jpg',
      vihicle_picture_front: 'pic_front.jpg',
      vihicle_picture_back: 'pic_back.jpg',
      vihicle_inspection: 'insp.jpg',
      vihicle_Insurance: 'ins.jpg',
      vihicle_logbook: 'log.jpg',
      license_front: 'lic.jpg',
      license_back: 'lic_back.jpg',
      document_front: 'doc.jpg',
      document_back: 'doc_back.jpg',
      Proof_of_Address: 'proof.jpg',
      mPesaNumber: '841111111',
      eMolaNumber: '862222222'
    });
    driverToken = driverRes.body.token;
    driverId = driverRes.body._id;
    if (!driverToken) console.log('Driver Register Failed:', driverRes.body);
    if (!userToken) console.log('User Register Failed:', userRes.body);
  });

  afterAll(async () => {
    // Delete the users created
    if(userId) await User.findByIdAndDelete(userId);
    if(driverId) await User.findByIdAndDelete(driverId);
    await disconnectTestDB();
  });

  it('should save transfer preferences during driver registration', async () => {
    const driver = await User.findById(driverId);
    expect(driver.deliveryman.transferPreferences).toBeDefined();
    expect(driver.deliveryman.transferPreferences.mPesaNumber).toBe('841111111');
    expect(driver.deliveryman.transferPreferences.eMolaNumber).toBe('862222222');
  });

  it('should update transfer preferences for a driver', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        mPesaNumber: '843333333',
        eMolaNumber: '864444444',
        isSeller: false
      });

    expect(res.status).toBe(200);
    expect(res.body.deliveryman.transferPreferences.mPesaNumber).toBe('843333333');
    expect(res.body.deliveryman.transferPreferences.eMolaNumber).toBe('864444444');
    
    const driver = await User.findById(driverId);
    expect(driver.deliveryman.transferPreferences.mPesaNumber).toBe('843333333');
    expect(driver.deliveryman.transferPreferences.eMolaNumber).toBe('864444444');
  });

  it('should update preferred payment method for a client', async () => {
    const paymentMethodId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        preferredPaymentMethod: paymentMethodId,
        isSeller: false
      });

    expect(res.status).toBe(200);
    expect(res.body.preferredPaymentMethod.toString()).toBe(paymentMethodId);

    const user = await User.findById(userId);
    expect(user.preferredPaymentMethod.toString()).toBe(paymentMethodId);
  });
});
