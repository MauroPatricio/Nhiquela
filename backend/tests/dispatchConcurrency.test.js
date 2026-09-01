import mongoose from 'mongoose';
import { connectTestDB, disconnectTestDB, clearCollections } from './setup.js';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearCollections();
});

describe('Anti-Fraud: Concurrency when accepting a ride', () => {
  it('Should prevent two drivers from accepting the same ride simultaneously using Transactions', async () => {
    // 1. Setup Mock User (Client)
    const client = new User({
      name: 'Client A',
      email: 'clienta@test.com',
      password: 'password123',
      role: 'user',
      phoneNumber: '840000000'
    });
    await client.save();

    // 2. Setup Mock Drivers
    const driver1 = new User({
      name: 'Driver 1',
      email: 'driver1@test.com',
      password: 'password123',
      isDeliveryMan: true,
      phoneNumber: '840000001'
    });
    await driver1.save();

    const driver2 = new User({
      name: 'Driver 2',
      email: 'driver2@test.com',
      password: 'password123',
      isDeliveryMan: true,
      phoneNumber: '840000002'
    });
    await driver2.save();

    // 3. Create a Pending Order
    const order = new RequestService({
      user: client._id,
      status: 'Pendente',
      code: 'TRIP-12345',
      deliveryPrice: 500,
      destination: 'Maputo',
      origin: 'Matola',
      deliverCity: 'Maputo',
      transportType: 'Ligeiro',
      goodType: 'Passageiro',
      phoneNumber: '840000000',
      name: 'Client A'
    });
    await order.save();

    // 4. Simulate simultaneous acceptance logic identical to the route handler
    // We wrap the logic in a function so we can run them concurrently
    const acceptOrder = async (driverId) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const foundOrder = await RequestService.findOne({ _id: order._id, status: 'Pendente' }).session(session);
        
        if (!foundOrder) {
          await session.abortTransaction();
          session.endSession();
          return { success: false, reason: 'Already accepted' };
        }

        // Simulate successful acceptance
        foundOrder.status = 'Aceite';
        foundOrder.targetDriverId = driverId;
        await foundOrder.save({ session });
        
        await session.commitTransaction();
        session.endSession();
        return { success: true, driverId };
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        // Mongoose WriteConflict error falls here
        return { success: false, reason: 'WriteConflict' };
      }
    };

    // Run both functions exactly at the same time
    const results = await Promise.all([
      acceptOrder(driver1._id),
      acceptOrder(driver2._id)
    ]);

    // 5. Verification
    // Only one should succeed, the other should fail (either "Already accepted" or "WriteConflict")
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);

    // Verify DB state
    const finalOrder = await RequestService.findById(order._id);
    expect(finalOrder.status).toBe('Aceite');
    
    // The driver who won the race should be the targetDriverId
    const winningDriverId = results.find(r => r.success).driverId;
    expect(finalOrder.targetDriverId.toString()).toBe(winningDriverId.toString());
  });
});
