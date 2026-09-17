import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testTransactionsList() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const userId = '6a961368bdc1063337ad622c';
  const walletsCol = db.collection('wallets');
  const transactionsCol = db.collection('transactions');
  const providersCol = db.collection('providers');
  const ordersCol = db.collection('orders');

  const wallet = await walletsCol.findOne({ ownerId: new mongoose.Types.ObjectId(userId) });
  let transactions = wallet ? await transactionsCol.find({ walletId: wallet._id }).toArray() : [];

  const provider = await providersCol.findOne({ userId: new mongoose.Types.ObjectId(userId) });

  if (provider) {
    const sellerOrders = await ordersCol.find({
      seller: provider._id,
      isDelivered: true,
      deleted: { $ne: true }
    }).toArray();

    const existingRefIds = new Set(
      transactions.map(t => (t.referenceId || t.reference_id || '').toString()).filter(Boolean)
    );

    const salesMovements = sellerOrders.map(order => {
      const amount = order.itemsPrice ?? order.orderItems?.reduce((acc, item) => acc + ((item.price || item.priceFromSeller || 0) * (item.quantity || 1)), 0) ?? order.itemsPriceForSeller ?? 0;
      return {
        _id: `sale_${order._id}`,
        type: 'credit',
        transaction_type: 'PAYMENT',
        amount: amount,
        method: order.paymentMethod || 'venda',
        description: `Receita da venda #${order.code}`,
        status: 'confirmado',
        createdAt: order.deliveredAt || order.createdAt,
        date: order.deliveredAt || order.createdAt,
        referenceId: order._id
      };
    }).filter(s => !existingRefIds.has(s.referenceId.toString()));

    transactions = [...transactions, ...salesMovements];
    transactions.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }

  console.log(`📋 Total Movements for seller Jo (${transactions.length}):`);
  transactions.forEach(t => {
    console.log(`- [${t.type.toUpperCase()}] ${t.description} -> ${t.type === 'credit' ? '+' : '-'}${t.amount} MT (${t.status})`);
  });

  await mongoose.disconnect();
}

testTransactionsList();
