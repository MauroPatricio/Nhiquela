import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function checkAndOpenStore() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const usersCol = db.collection('users');
  const providersCol = db.collection('providers');
  const productsCol = db.collection('products');

  const userId = new mongoose.Types.ObjectId('6a961368bdc1063337ad622c');
  
  const user = await usersCol.findOne({ _id: userId });
  console.log('User seller status before:', {
    openstore: user?.seller?.openstore,
    storeStatus: user?.seller?.storeStatus
  });

  const provider = await providersCol.findOne({ userId: userId });
  console.log('Provider found:', provider ? { id: provider._id, name: provider.name } : null);

  const sellerId = provider ? provider._id : userId;

  // Open store and set storeStatus = 'OPEN'
  await usersCol.updateOne(
    { _id: userId },
    { $set: { 'seller.openstore': true, 'seller.storeStatus': 'OPEN' } }
  );

  // Update products to isSellerOpen: true
  const prodRes = await productsCol.updateMany(
    { seller: sellerId },
    { $set: { isSellerOpen: true } }
  );

  console.log(`✅ Store opened! Updated products count: ${prodRes.modifiedCount}`);

  // Re-verify products
  const products = await productsCol.find({ seller: sellerId }).toArray();
  console.log('Products for seller:', products.map(p => ({ id: p._id, name: p.name, isSellerOpen: p.isSellerOpen })));

  await mongoose.disconnect();
}

checkAndOpenStore();
