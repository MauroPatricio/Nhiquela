import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from './models/UserModel.js';
import ProviderSubcategory from './models/ProviderSubcategoryModel.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const reboque = await ProviderSubcategory.findOne({ name: /reboque/i });
  if (reboque) {
    await User.updateOne(
      { name: 'Teste' },
      { $push: { 
          'deliveryman.providedServices': {
            serviceId: reboque._id.toString(),
            isAvailable: true
          }
      } }
    );
    console.log('Driver service injected!');
  } else {
    console.log('Reboque not found');
  }
  process.exit(0);
}

run().catch(console.error);
