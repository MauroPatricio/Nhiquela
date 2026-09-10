import mongoose from 'mongoose';
import NotificationModel from './models/NotificationModel.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela').then(async () => {
  const notifs = await NotificationModel.find({}).sort({ createdAt: -1 }).limit(10);
  console.log(JSON.stringify(notifs, null, 2));
  process.exit(0);
}).catch(console.error);
