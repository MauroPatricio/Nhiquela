// tests/setup.js
// Sets up a real MongoDB connection (Atlas test DB) before running tests.
// Each test file handles its own cleanup via afterEach.

import mongoose from 'mongoose';

// Disable TLS verification for tests to prevent "unable to get local issuer certificate" 
// when the backend asynchronously calls external APIs (like USendIt for SMS).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';

dotenv.config();

// Use the real Atlas but point to a separate "nhiquela_test" database
const MONGO_URI = process.env.MONGODB_URI || '';
const TEST_MONGO_URI = MONGO_URI.includes('nhiquela.7pafgjv.mongodb.net/')
  ? MONGO_URI.replace('nhiquela.7pafgjv.mongodb.net/', 'nhiquela.7pafgjv.mongodb.net/nhiquela_test')
  : MONGO_URI;

export async function connectTestDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
}

export async function disconnectTestDB() {
  await mongoose.disconnect();
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
