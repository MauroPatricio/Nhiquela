import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from './models/UserModel.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.updateOne(
    { name: 'Teste' },
    { $set: { 
        geoPosition: { type: 'Point', coordinates: [32.589, -25.969] }, 
        latitude: '-25.969', 
        longitude: '32.589' 
    } }
  );
  console.log('Driver location injected!');
  process.exit(0);
}

run().catch(console.error);
