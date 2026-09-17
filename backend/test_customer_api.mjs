import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testCustomerAPI() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const Province = (await import('./models/ProvinceModel.js')).default;
  const Category = (await import('./models/CategoryModel.js')).default;
  const User = (await import('./models/UserModel.js')).default;
  const Product = (await import('./models/ProductModel.js')).default;
  const Provider = (await import('./models/ProviderModel.js')).default;
  const ProviderSubCategory = (await import('./models/ProviderSubCategoryModel.js')).default;

  // 1. Sellers Query (/api/users/sellers)
  const sellersQuery = {
    isSeller: true,
    isDeleted: { $ne: true },
    isApproved: true,
    isBanned: false,
    'seller.tipoEstabelecimento': { $exists: true, $ne: null }
  };
  const sellers = await User.find(sellersQuery)
    .populate('seller.province')
    .populate('seller.tipoEstabelecimento');

  console.log(`\n=== 🏪 /api/users/sellers count: ${sellers.length} ===`);
  sellers.forEach(s => {
    console.log(`Seller ID: ${s._id}, Name: ${s.name}, StoreName: ${s.seller?.name}, openstore: ${s.seller?.openstore}, storeStatus: ${s.seller?.storeStatus}, tipo: ${s.seller?.tipoEstabelecimento?.name}`);
  });

  // 2. Products Query (/api/products)
  const products = await Product.find({})
    .populate('category');

  console.log(`\n=== 📦 All Products count: ${products.length} ===`);
  products.forEach(p => {
    console.log(`Product ID: ${p._id}, Name: ${p.name}, Price: ${p.price}, isSellerOpen: ${p.isSellerOpen}, Seller ID: ${p.seller}`);
  });

  await mongoose.disconnect();
}

testCustomerAPI();
