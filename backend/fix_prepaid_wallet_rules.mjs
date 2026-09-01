import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function fixPrepaidWalletRules() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const transactionsCol = db.collection('transactions');
  const walletsCol = db.collection('wallets');

  // Find all PAYMENT credit transactions created for seller sales (e.g. "Receita líquida da venda #...")
  const paymentSalesTxs = await transactionsCol.find({
    type: 'credit',
    transaction_type: 'PAYMENT',
    description: { $regex: /^Receita líquida da venda #/i }
  }).toArray();

  console.log(`🔍 Found ${paymentSalesTxs.length} sale payment credit transactions to clean up.`);

  for (const tx of paymentSalesTxs) {
    const amount = tx.amount || 0;
    const walletId = tx.walletId;

    if (amount > 0 && walletId) {
      const wallet = await walletsCol.findOne({ _id: walletId });
      if (wallet) {
        const newBalance = Math.max(0, Math.round((wallet.balance - amount) * 100) / 100);
        console.log(`🛠 Adjusting wallet ${wallet._id}: ${wallet.balance} MT -> ${newBalance} MT (Deducting sale credit ${amount} MT)`);
        await walletsCol.updateOne({ _id: wallet._id }, { $set: { balance: newBalance } });
      }
      await transactionsCol.deleteOne({ _id: tx._id });
      console.log(`🗑 Removed transaction ${tx._id} (${tx.description})`);
    }
  }

  console.log('✅ Wallet prepaid rule cleanup completed.');
  await mongoose.disconnect();
  console.log('Done.');
}

fixPrepaidWalletRules().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
