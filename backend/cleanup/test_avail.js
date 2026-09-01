import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/UserModel.js';
import Wallet from './models/WalletModel.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  
  // Find driver Teste
  const driver = await User.findOne({ name: /Teste/i, isDeliveryMan: true });
  console.log('Driver found:', driver?._id, 'name:', driver?.name);
  console.log('Driver status:', driver?.status);
  console.log('Driver availability:', driver?.availability);
  
  if (!driver) {
    process.exit(0);
  }
  
  // Check wallet
  const wallet = await Wallet.findOne({ $or: [{ ownerId: driver._id }, { userId: driver._id }] });
  console.log('Wallet:', wallet?.balance, wallet?.ownerId, wallet?.userId);
  
  // Try to change availability directly
  driver.availability = 'active';
  try {
    await driver.save();
    console.log('availability changed to active OK!');
  } catch(e) {
    console.error('ERROR saving driver:', e.message);
  }
  
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
