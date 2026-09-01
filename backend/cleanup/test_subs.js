import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ProviderSubcategory = (await import('./models/ProviderSubcategoryModel.js')).default;
  const subs = await ProviderSubcategory.find();
  console.log(JSON.stringify(subs, null, 2));
  process.exit(0);
});
