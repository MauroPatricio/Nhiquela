import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function verifySellersEndpointFixed() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const Province = (await import('./models/ProvinceModel.js')).default;
  const ProviderSubCategory = (await import('./models/ProviderSubCategoryModel.js')).default;
  const User = (await import('./models/UserModel.js')).default;
  const Provider = (await import('./models/ProviderModel.js')).default;
  const Wallet = (await import('./models/WalletModel.js')).default;

  const query = {
    isSeller: true,
    isDeleted: { $ne: true },
    isApproved: true,
    isBanned: false,
    'seller.tipoEstabelecimento': { $exists: true, $ne: null }
  };

  const sellers = await User.find(query)
    .sort({ createdAt: -1 })
    .populate('seller.province')
    .populate('seller.tipoEstabelecimento');

  const uniqueSellersMap = new Map();
  sellers.forEach(seller => {
    if (!uniqueSellersMap.has(String(seller._id))) {
      uniqueSellersMap.set(String(seller._id), seller);
    }
  });
  const uniqueSellers = Array.from(uniqueSellersMap.values());

  const sellerUserIds = uniqueSellers.map(s => s._id);

  const providers = await Provider.find({ userId: { $in: sellerUserIds } }, '_id userId');
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

  const visibleSellers = uniqueSellers.filter(s => {
    if (!s.seller?.hasUsedFreeSale) return true;
    const wallet = walletMap.get(s._id.toString());
    if (!wallet || wallet.balance < 50) {
      return false;
    }
    return true;
  });

  console.log(`\n🎉 Visible Sellers Count in GET /sellers: ${visibleSellers.length}`);
  visibleSellers.forEach(s => {
    console.log(`- Seller ID: ${s._id}, Name: ${s.name}, StoreName: ${s.seller?.name}, OpenStore: ${s.seller?.openstore}`);
  });

  await mongoose.disconnect();
}

verifySellersEndpointFixed();
