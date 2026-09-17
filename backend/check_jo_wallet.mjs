import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function checkJoWallet() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const userId = new mongoose.Types.ObjectId('6a961368bdc1063337ad622c');
  const walletsCol = db.collection('wallets');

  const walletWithOwnerTypeSeller = await walletsCol.findOne({ ownerId: userId, ownerType: 'seller' });
  const walletAny = await walletsCol.find({ $or: [{ ownerId: userId }, { userId: userId }] }).toArray();

  console.log('Wallet with ownerType=seller:', walletWithOwnerTypeSeller);
  console.log('All wallets for user 6a961368bdc1063337ad622c:', walletAny);

  await mongoose.disconnect();
}

checkJoWallet();
