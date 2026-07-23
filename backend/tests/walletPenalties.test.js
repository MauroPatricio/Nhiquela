import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import { connectTestDB, disconnectTestDB, clearCollections } from './setup.js';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import Wallet from '../models/WalletModel.js';
import { generateToken } from '../utils.js';

let clientToken, driverToken;
let clientUser, driverUser;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearCollections();
});

describe('Wallet Penalty & Cancellation Tests', () => {
  beforeEach(async () => {
    // 1. Setup Mock Client
    clientUser = new User({
      name: 'Client',
      email: 'client@penalty.com',
      password: 'password123',
      role: 'user',
      phoneNumber: '841000000'
    });
    await clientUser.save();
    clientToken = generateToken(clientUser);

    // 2. Setup Mock Driver
    driverUser = new User({
      name: 'Driver',
      email: 'driver@penalty.com',
      password: 'password123',
      isDeliveryMan: true,
      phoneNumber: '841000001'
    });
    await driverUser.save();
    driverToken = generateToken(driverUser);

    // 3. Setup Wallet for Driver with 100MT
    const driverWallet = new Wallet({
      ownerType: 'driver',
      ownerId: driverUser._id,
      userId: driverUser._id, // Fixed field name
      balance: 100,
      currency: 'MT',
    });
    await driverWallet.save();
  });

  it('Should apply a 50MT penalty to the driver if THEY cancel an accepted ride', async () => {
    // Create an Accepted Order assigned to this driver
    const order = new RequestService({
      user: clientUser._id,
      status: 'Aceite',
      isAccepted: true, // Missing in previous mock!
      code: 'TRIP-PENALTY-1',
      deliveryPrice: 500,
      destination: 'Maputo',
      origin: 'Matola',
      deliverCity: 'Maputo',
      transportType: 'Ligeiro',
      goodType: 'Passageiro',
      phoneNumber: '841000000',
      name: 'Client',
      targetDriverId: driverUser._id,
      deliveryman: { id: driverUser._id, name: 'Driver' }
    });
    await order.save();

    // Driver Cancels the Order
    const res = await request(app)
      .put(`/api/request-service/${order._id}/cancel`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ message: 'Pneu furado', role: 'driver' }); // Fixed field name to 'message'

    expect(res.status).toBeLessThan(400); // Verify it actually succeeded

    // Verify Wallet Balance
    const updatedWallet = await Wallet.findOne({ ownerId: driverUser._id });
    expect(updatedWallet.balance).toBe(50); // 100MT - 50MT penalty = 50MT
  });

  it('Should NOT apply a penalty to the driver if the CLIENT cancels the ride', async () => {
    // Create an Accepted Order assigned to this driver
    const order = new RequestService({
      user: clientUser._id,
      status: 'Aceite',
      isAccepted: true,
      code: 'TRIP-PENALTY-2',
      deliveryPrice: 500,
      destination: 'Maputo',
      origin: 'Matola',
      deliverCity: 'Maputo',
      transportType: 'Ligeiro',
      goodType: 'Passageiro',
      phoneNumber: '841000000',
      name: 'Client',
      targetDriverId: driverUser._id,
      deliveryman: { id: driverUser._id, name: 'Driver' }
    });
    await order.save();

    // Client Cancels the Order
    const res = await request(app)
      .put(`/api/request-service/${order._id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ message: 'Desisti', role: 'user' });

    expect(res.status).toBeLessThan(400);

    // Verify Wallet Balance (Should remain 100MT)
    const updatedWallet = await Wallet.findOne({ ownerId: driverUser._id });
    expect(updatedWallet.balance).toBe(100);
  });
});
