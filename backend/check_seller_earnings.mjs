import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function checkSellerEarnings() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const ordersCol = db.collection('orders');

  const orders = await ordersCol.find({ isDelivered: true }).toArray();
  console.log(`Total delivered orders: ${orders.length}`);
  
  orders.forEach(order => {
    const orderAmount = order.itemsPrice ?? order.orderItems?.reduce((acc, item) => acc + ((item.price || item.priceFromSeller || 0) * (item.quantity || 1)), 0) ?? order.itemsPriceForSeller ?? 0;
    console.log(`Order #${order.code}: orderAmount = ${orderAmount} MT (totalPrice: ${order.totalPrice}, deliveryPrice: ${order.deliveryPrice})`);
  });

  await mongoose.disconnect();
}

checkSellerEarnings();
