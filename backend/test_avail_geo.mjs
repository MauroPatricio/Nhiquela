import mongoose from 'mongoose';
import User from './models/UserModel.js';

const MONGODB_URI = "mongodb+srv://mauropatricio:C1e2l3s4o5M@nhiquelacluster.1k29eif.mongodb.net/nhiquela?retryWrites=true&w=majority&appName=NhiquelaCluster";

async function run() {
  await mongoose.connect(MONGODB_URI);
  
  const drivers = await User.find({ isDeliveryMan: true }).lean();
  console.log(`Found ${drivers.length} drivers total.`);
  
  const available = drivers.filter(d => d.availability === 'active');
  console.log(`Found ${available.length} active drivers.`);
  
  available.forEach(d => {
    console.log(`Driver: ${d.name} | Phone: ${d.phoneNumber} | Lat: ${d.latitude} | Lng: ${d.longitude}`);
    if (d.geoPosition && d.geoPosition.coordinates) {
      console.log(`  geoPosition: ${JSON.stringify(d.geoPosition.coordinates)}`);
    }
    const services = d.deliveryman?.providedServices || [];
    console.log(`  Services: ${services.length}`);
  });
  
  process.exit(0);
}

run().catch(console.error);
