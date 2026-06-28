import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import feeCalculator from '../utils/feeCalculator.js';
import ProcessingFee from '../models/ProcessingFee.js';

/**
 * Unit tests for the processing fee calculator.
 * Uses an in‑memory MongoDB instance to avoid touching the real DB.
 */
let mongoServer;

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
  await ProcessingFee.deleteMany({});
});

test('returns base fee when no establishment override', async () => {
  await ProcessingFee.create({ serviceType: 'document', establishment: null, amount: 5 });
  const order = { serviceType: 'document', establishment: null };
  const fee = await feeCalculator.calculateProcessingFee(order);
  expect(fee).toBe(5);
});

test('uses establishment‑specific fee over base fee', async () => {
  const estId = new mongoose.Types.ObjectId();
  await ProcessingFee.create({ serviceType: 'document', establishment: null, amount: 5 });
  await ProcessingFee.create({ serviceType: 'document', establishment: estId, amount: 8 });
  const order = { serviceType: 'document', establishment: estId };
  const fee = await feeCalculator.calculateProcessingFee(order);
  expect(fee).toBe(8);
});

test('calculates percentage fee when amount not set', async () => {
  await ProcessingFee.create({ serviceType: 'document', establishment: null, percentage: 10 });
  const order = { serviceType: 'document', cartTotal: 100 };
  const fee = await feeCalculator.calculateProcessingFee(order);
  expect(fee).toBe(10);
});

test('returns 0 for exempt fee', async () => {
  await ProcessingFee.create({ serviceType: 'document', establishment: null, exempt: true, amount: 20 });
  const order = { serviceType: 'document' };
  const fee = await feeCalculator.calculateProcessingFee(order);
  expect(fee).toBe(0);
});
