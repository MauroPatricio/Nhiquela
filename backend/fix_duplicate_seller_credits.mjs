import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function fixDuplicateCredits() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const transactionsCol = db.collection('transactions');
  const walletsCol = db.collection('wallets');

  // Find all transactions with description containing "Pagamento da venda - Pedido #"
  // which were the duplicate manual entries from orderRoutes.js
  const dupTxs = await transactionsCol.find({
    description: { $regex: /^Pagamento da venda - Pedido #/i }
  }).toArray();

  console.log(`🔍 Found ${dupTxs.length} manual duplicate transactions.`);

  let totalDeducted = 0;

  for (const tx of dupTxs) {
    const amount = tx.amount || 0;
    const walletId = tx.walletId;

    if (amount > 0 && walletId) {
      // Find wallet
      const wallet = await walletsCol.findOne({ _id: walletId });
      if (wallet) {
        const newBalance = Math.max(0, Math.round((wallet.balance - amount) * 100) / 100);
        console.log(`🛠 Adjusting wallet ${wallet._id}: ${wallet.balance} MT -> ${newBalance} MT (Deducting ${amount} MT)`);
        await walletsCol.updateOne({ _id: wallet._id }, { $set: { balance: newBalance } });
        totalDeducted += amount;
      }
      // Remove duplicate transaction
      await transactionsCol.deleteOne({ _id: tx._id });
      console.log(`🗑 Removed duplicate transaction ${tx._id} (${tx.description})`);
    }
  }

  console.log(`✅ Cleanup complete. Total duplicate balance corrected: -${totalDeducted} MT`);
  await mongoose.disconnect();
  console.log('Done.');
}

fixDuplicateCredits().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
