import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function fix() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const productsCol = db.collection('products');
  const sellersCol = db.collection('sellers');
  const usersCol = db.collection('users');

  // Find all products where isSellerOpen is not true
  const products = await productsCol.find({ isSellerOpen: { $ne: true } }).toArray();
  console.log(`📦 Products with isSellerOpen != true: ${products.length}`);

  let fixed = 0;
  let skipped = 0;

  for (const p of products) {
    if (!p.seller) {
      // No seller ref — set to true (open by default)
      await productsCol.updateOne({ _id: p._id }, { $set: { isSellerOpen: true } });
      fixed++;
      continue;
    }

    // Find the Seller document
    const sellerDoc = await sellersCol.findOne({ _id: p.seller });
    if (!sellerDoc) {
      await productsCol.updateOne({ _id: p._id }, { $set: { isSellerOpen: true } });
      fixed++;
      continue;
    }

    // Find the User
    const user = await usersCol.findOne({ _id: sellerDoc.userId });
    if (!user) { skipped++; continue; }

    // If user.seller.openstore is not explicitly false, mark product as open
    const isExplicitlyClosed = user.seller?.openstore === false;
    if (!isExplicitlyClosed) {
      await productsCol.updateOne({ _id: p._id }, { $set: { isSellerOpen: true } });
      fixed++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Fixed: ${fixed} products`);
  console.log(`⏭  Skipped (legitimately closed): ${skipped} products`);
  await mongoose.disconnect();
  console.log('Done.');
}

fix().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
