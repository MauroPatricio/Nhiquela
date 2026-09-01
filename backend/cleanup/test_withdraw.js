import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './models/UserModel.js';
import { generateToken } from './utils.js';
import axios from 'axios';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const admin = await User.findOne({ isAdmin: true });
  const token = generateToken(admin);
  
  try {
    const res = await axios.post('http://localhost:5000/api/wallet/withdraw', {
      amount: 1000,
      reason: 'Test reason'
    }, {
      headers: { authorization: `Bearer ${token}` }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
  process.exit();
}).catch(console.error);
