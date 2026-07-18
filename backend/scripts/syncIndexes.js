import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.production') });

// Import Models
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';

const syncDatabaseIndexes = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }

    console.log(`⏳ Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    console.log('⏳ Syncing User indexes (including locationGeo 2dsphere)...');
    await User.syncIndexes();
    console.log('✅ User indexes synchronized successfully.');

    console.log('⏳ Syncing RequestService indexes...');
    await RequestService.syncIndexes();
    console.log('✅ RequestService indexes synchronized successfully.');

    // We can list current indexes to verify
    const userIndexes = await User.collection.indexes();
    console.log('📋 Current User Collection Indexes:', JSON.stringify(userIndexes, null, 2));

    console.log('🎉 Index synchronization completed! Your MongoDB is now optimized for Geospatial queries.');

  } catch (error) {
    console.error('❌ Error synchronizing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
};

syncDatabaseIndexes();
