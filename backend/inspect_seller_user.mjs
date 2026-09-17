import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function inspectSellerStatusUser() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const usersCol = db.collection('users');
  const providersCol = db.collection('providers');

  const userId = '6a961368bdc1063337ad622c';
  let user = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(userId) }).catch(() => null);
  let provider = await providersCol.findOne({ _id: new mongoose.Types.ObjectId(userId) }).catch(() => null);

  console.log('User found:', user ? { id: user._id, name: user.name, isSeller: user.isSeller, seller: user.seller } : null);
  console.log('Provider found by ID:', provider ? { id: provider._id, userId: provider.userId, name: provider.name } : null);

  if (!user && provider) {
    user = await usersCol.findOne({ _id: provider.userId });
    console.log('User found by provider.userId:', user ? { id: user._id, name: user.name } : null);
  }

  await mongoose.disconnect();
}

inspectSellerStatusUser();
