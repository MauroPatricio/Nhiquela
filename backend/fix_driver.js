import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/UserModel.js';
import Wallet from './models/WalletModel.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/nhiquela');
  
  const drivers = await User.find({ "deliveryman.register_conformance": "INCONFORMANCE" });
  console.log(`Found ${drivers.length} drivers with INCONFORMANCE`);
  
  for (let driver of drivers) {
    console.log(`Driver: ${driver.name}, Email: ${driver.email}`);
    
    // Check wallet
    const wallet = await Wallet.findOne({ ownerId: driver._id });
    console.log(`Wallet Balance: ${wallet ? wallet.balance : 'No wallet'}`);
    
    // Fix driver
    driver.status = 'Disponível';
    driver.deliveryman.register_conformance = 'CONFORMANCE';
    await driver.save();
    
    // Refund 75 to wallet (optional, let's just see first or do it now)
    if (wallet) {
      wallet.balance += 75;
      await wallet.save();
      console.log(`Refunded 75 to wallet. New Balance: ${wallet.balance}`);
    }
  }
  
  mongoose.disconnect();
};

run().catch(console.error);
