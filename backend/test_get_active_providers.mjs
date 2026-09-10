import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testGetActiveProviders() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const User = (await import('./models/UserModel.js')).default;
  const Provider = (await import('./models/ProviderModel.js')).default;
  const Wallet = (await import('./models/WalletModel.js')).default;

  const sellers = await User.find({ 
    isSeller: true, 
    isApproved: true,
    isBanned: { $ne: true },
    isDeleted: { $ne: true }
  }, '_id seller.hasUsedFreeSale');
  const sellerUserIds = sellers.map(s => s._id);

  const providers = await Provider.find({ 
    userId: { $in: sellerUserIds },
    status: { $nin: ['inactive', 'suspended', 'deleted'] }
  }, '_id userId');
  const providerIds = providers.map(p => p._id);

  const wallets = await Wallet.find({
    $or: [
      { ownerId: { $in: [...sellerUserIds, ...providerIds] } },
      { userId: { $in: sellerUserIds } }
    ]
  });

  const walletMap = new Map();
  wallets.forEach(w => {
    if (w.userId) walletMap.set(w.userId.toString(), w);
    if (w.ownerId) walletMap.set(w.ownerId.toString(), w);
  });

  const activeProviders = providers.filter(p => {
    const userObj = sellers.find(s => s._id.toString() === p.userId.toString());
    if (userObj && !userObj.seller?.hasUsedFreeSale) return true;

    const wallet = walletMap.get(p.userId.toString()) || walletMap.get(p._id.toString());
    if (!wallet || wallet.balance < 50) return false;
    return true;
  });

  const activeIds = activeProviders.map(p => p._id);
  console.log('✅ Active Provider IDs:', activeIds);

  await mongoose.disconnect();
}

testGetActiveProviders();
