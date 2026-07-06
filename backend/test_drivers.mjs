import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from './models/UserModel.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const drivers = await User.find({ isDeliveryMan: true, availability: 'active' }).lean();
  console.log('Active drivers:', JSON.stringify(drivers.map(d => ({
    name: d.name,
    lat: d.latitude,
    lng: d.longitude,
    transport: d.deliveryman?.transport_type,
    providedServices: d.deliveryman?.providedServices,
    updatedAt: d.updatedAt
  })), null, 2));
  process.exit(0);
}

run().catch(console.error);
