import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function fixOrderFields() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const ordersCol = db.collection('orders');

  // Fix order #359415 itemsPriceForSeller to 1000
  const res = await ordersCol.updateOne(
    { code: '359415' },
    { $set: { itemsPriceForSeller: 1000 } }
  );

  console.log(`✅ Order #359415 itemsPriceForSeller fixed to 1000 MT (matched: ${res.matchedCount}, modified: ${res.modifiedCount}).`);

  // Fix any other order where itemsPriceForSeller > itemsPrice
  const allOrders = await ordersCol.find({}).toArray();
  let count = 0;
  for (const o of allOrders) {
    if (o.itemsPrice && o.itemsPriceForSeller && o.itemsPriceForSeller > o.itemsPrice) {
      console.log(`🛠 Fixing order #${o.code}: itemsPriceForSeller ${o.itemsPriceForSeller} -> ${o.itemsPrice}`);
      await ordersCol.updateOne({ _id: o._id }, { $set: { itemsPriceForSeller: o.itemsPrice } });
      count++;
    }
  }

  console.log(`✅ Fixed ${count} orders with incorrect itemsPriceForSeller.`);
  await mongoose.disconnect();
}

fixOrderFields().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
