import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { hasSufficientBalance } from './services/walletService.js';
import User from './models/UserModel.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  // Find the driver from the screenshot. Name is "Teste!", vehicle is "Reboque - prata - AGT330MC"
  const driver = await User.findOne({ name: /Teste/i, 'deliveryman.transport_type': /Reboque/i });
  if (!driver) {
    console.log('Driver not found');
    process.exit(0);
  }
  
  console.log('Driver ID:', driver._id);
  console.log('Driver status:', driver.status);
  console.log('Transport type:', driver.deliveryman.transport_type);
  
  const canGoOnline = await hasSufficientBalance(driver._id);
  console.log('hasSufficientBalance result:', canGoOnline);
  
  process.exit(0);
}

test().catch(console.error);
