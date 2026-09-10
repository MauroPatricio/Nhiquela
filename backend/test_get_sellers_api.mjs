import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testGetSellersAPI() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const Province = (await import('./models/ProvinceModel.js')).default;
  const ProviderSubCategory = (await import('./models/ProviderSubCategoryModel.js')).default;
  const User = (await import('./models/UserModel.js')).default;

  const query = {
    isSeller: true,
    isDeleted: { $ne: true },
    isApproved: true,
    isBanned: false,
    'seller.tipoEstabelecimento': { $exists: true, $ne: null }
  };

  const sellers = await User.find(query)
    .sort({ createdAt: -1 })
    .populate('seller.province')
    .populate('seller.tipoEstabelecimento');

  console.log('Sellers returned:', sellers.length);
  sellers.forEach(s => {
    console.log(`- Seller ID: ${s._id}, Name: ${s.name}, StoreName: ${s.seller?.name}, openstore: ${s.seller?.openstore}, storeStatus: ${s.seller?.storeStatus}`);
  });

  await mongoose.disconnect();
}

testGetSellersAPI();
