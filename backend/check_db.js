import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://mauropatriciomp:UoM8Wv23YhF3cT4L@nhiquelacluster.1k9twns.mongodb.net/Nhiquela?retryWrites=true&w=majority';

async function checkDrivers() {
  await mongoose.connect(uri);
  const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}), 'users');
  const drivers = await User.find({ isDeliveryMan: true });
  console.log(JSON.stringify(drivers.map(d => ({
    name: d.name,
    availability: d.availability,
    status: d.status,
    locationGeo: d.locationGeo,
    hasActiveService: d.deliveryman?.hasActiveService,
    providedServices: d.deliveryman?.providedServices
  })), null, 2));
  
  // also check how many are returned by the exact query
  const available = await User.find({
    isDeliveryMan: true,
    availability: 'active',
    status: 'Active'
  });
  console.log('Available count:', available.length);
  
  process.exit();
}

checkDrivers();
