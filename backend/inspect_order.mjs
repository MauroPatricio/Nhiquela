import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function inspectOrder() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const ordersCol = db.collection('orders');

  const order = await ordersCol.findOne({ code: '359415' });
  console.log('Order #359415 fields:', JSON.stringify({
    _id: order?._id,
    code: order?.code,
    totalPrice: order?.totalPrice,
    itemsPrice: order?.itemsPrice,
    itemsPriceForSeller: order?.itemsPriceForSeller,
    sellerEarningsAfterDiscount: order?.sellerEarningsAfterDiscount,
    deliveryPrice: order?.deliveryPrice,
    orderItems: order?.orderItems,
  }, null, 2));

  await mongoose.disconnect();
}

inspectOrder();
