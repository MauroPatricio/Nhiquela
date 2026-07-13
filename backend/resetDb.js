import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';

async function resetDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  console.log('Clearing all collections...');
  const collections = Object.keys(mongoose.connection.collections);
  for (const name of collections) {
    try {
      await mongoose.connection.collections[name].deleteMany({});
      console.log(`Cleared collection: ${name}`);
    } catch (e) {
      console.error(`Error clearing ${name}:`, e.message);
    }
  }

  console.log('Calling /api/seed...');
  try {
    const res = await axios.default.get('http://localhost:5000/api/seed');
    console.log(res.data.message);
    if(res.data.logs) {
      res.data.logs.forEach(l => console.log(' - ' + l));
    }
  } catch (err) {
    console.error('Error calling seed:', err.response?.data || err.message);
  }

  await mongoose.disconnect();
}

resetDB();
