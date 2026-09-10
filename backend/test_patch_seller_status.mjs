import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testPatchSellerStatus() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const { getWallet } = await import('./services/walletService.js');
  const userId = new mongoose.Types.ObjectId('6a961368bdc1063337ad622c');

  const wallet = await getWallet(userId, 'seller');
  console.log('Wallet found for user 6a961368bdc1063337ad622c:', {
    balance: wallet ? wallet.balance : 0
  });

  const Settings = mongoose.model('Settings');
  const minBalSetting = await Settings.findOne({ key: 'minimum_recommended_balance' });
  const minBalance = minBalSetting ? Number(minBalSetting.value) : 50;

  if (!wallet || wallet.balance < minBalance) {
    console.log('❌ Would reject with 400!');
  } else {
    console.log('✅ Balance check passed successfully! Allowed to open store!');
  }

  await mongoose.disconnect();
}

testPatchSellerStatus();
