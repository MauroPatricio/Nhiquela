const fetch = require('node-fetch'); // wait, node 18 has fetch built in
const User = require('./models/UserModel.js');
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find "Teste" driver
  const driver = await (await import('./models/UserModel.js')).default.findOne({ name: /Teste/i });
  if (!driver) return console.log('Driver not found');
  
  const token = (await import('./utils.js')).generateToken(driver); // Assuming you have generateToken
  // Actually I can just construct a JWT or hit the DB directly.
  console.log('Driver ID:', driver._id);
}
testApi().catch(console.error);
