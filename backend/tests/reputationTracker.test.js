import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import reputationTracker from '../utils/reputationTracker.js';
import User from '../models/UserModel.js';
import DocumentOrder from '../models/DocumentOrder.js';

/**
 * Unit tests for the reputation tracker utilities.
 * Uses an in‑memory MongoDB instance to isolate tests.
 */
let mongoServer;

jest.setTimeout(60000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await DocumentOrder.deleteMany({});
});

test('recordOrderCreated increments totalOrders', async () => {
  const user = await User.create({ name: 'Tester' });
  await reputationTracker.recordOrderCreated(user._id);
  const updated = await User.findById(user._id);
  expect(updated.totalOrders).toBe(1);
});

test('recordOrderCompleted increments completedOrders and updates rating', async () => {
  const user = await User.create({ name: 'Tester' });
  await reputationTracker.recordOrderCompleted(user._id);
  const updated = await User.findById(user._id);
  expect(updated.completedOrders).toBe(1);
  expect(updated.rating).toBe('Excelente'); // No cancellations yet
});

test('recordOrderCancelled increments cancelledOrders and updates rating accordingly', async () => {
  const user = await User.create({ name: 'Tester' });
  // First cancel one order
  await reputationTracker.recordOrderCancelled(user._id);
  const afterFirst = await User.findById(user._id);
  expect(afterFirst.cancelledOrders).toBe(1);
  expect(afterFirst.rating).toBe('Regular');

  // Then complete one order (now cancelled < completed)
  await reputationTracker.recordOrderCompleted(user._id);
  const afterSecond = await User.findById(user._id);
  expect(afterSecond.completedOrders).toBe(1);
  expect(afterSecond.rating).toBe('Bom');
});

test('getMetrics returns correct aggregation values', async () => {
  const user = await User.create({ name: 'Tester' });
  // Create orders with different statuses
  await DocumentOrder.create({ user: user._id, status: 'paid' });
  await DocumentOrder.create({ user: user._id, status: 'cancelled' });
  await DocumentOrder.create({ user: user._id, status: 'paid' });

  const metrics = await reputationTracker.getMetrics(user._id);
  expect(metrics.totalOrders).toBe(3);
  expect(metrics.completedOrders).toBe(2);
  expect(metrics.cancelledOrders).toBe(1);
  expect(metrics.completionRate).toBeCloseTo(66, 0); // approx 66%
  expect(metrics.cancellationRate).toBeCloseTo(33, 0); // approx 33%
});
