import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getWallet } from './services/walletService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testToggleStore() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const userId = new mongoose.Types.ObjectId('6a961368bdc1063337ad622c');
  const wallet = await getWallet(userId, 'seller');

  console.log('Wallet retrieved by getWallet:', {
    id: wallet._id,
    ownerId: wallet.ownerId,
    userId: wallet.userId,
    balance: wallet.balance
  });

  const Settings = mongoose.model('Settings');
  const minBalSetting = await Settings.findOne({ key: 'minimum_recommended_balance' });
  const minBalance = minBalSetting ? Number(minBalSetting.value) : 50;

  console.log(`Min balance requirement: ${minBalance} MT. User balance: ${wallet.balance} MT.`);
  console.log(`Is balance sufficient? ${wallet.balance >= minBalance ? 'YES ✅' : 'NO ❌'}`);

  await mongoose.disconnect();
}

testToggleStore();
