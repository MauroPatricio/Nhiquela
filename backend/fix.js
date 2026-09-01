import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/UserModel.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.updateMany({ isDeliveryMan: true }, { $set: { completedOrders: 0, status: 'Disponível' } });
  console.log('Fixed completedOrders to 0 and status to Disponível');
  process.exit(0);
}
run();
