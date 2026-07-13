import mongoose from 'mongoose';
import VehicleType from './models/VehicleTypeModel.js';
mongoose.connect('mongodb+srv://nhiquelabd:root123@nhiquela.7pafgjv.mongodb.net/?retryWrites=true&w=majority').then(async () => {
  const vTypes = await VehicleType.find({});
  console.log(JSON.stringify(vTypes, null, 2));
  process.exit();
}).catch(console.error);
