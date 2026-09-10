import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function invalidateAndVerify() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const { getActiveProviderIds, invalidateActiveProviderCache } = await import('./routes/productRoutes.js');
  invalidateActiveProviderCache();

  const activeIds = await getActiveProviderIds();
  console.log('✅ Active Provider IDs from productRoutes:', activeIds);

  const Product = (await import('./models/ProductModel.js')).default;
  const activeProducts = await Product.find({
    seller: { $in: activeIds },
    isSellerOpen: true
  });

  console.log(`✅ Active Products count on customer side: ${activeProducts.length}`);
  activeProducts.forEach(p => {
    console.log(`- Product: ${p.name} (${p._id}), Price: ${p.price} MT, Seller: ${p.seller}`);
  });

  await mongoose.disconnect();
}

invalidateAndVerify();
