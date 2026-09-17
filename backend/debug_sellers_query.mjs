import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function debugSellersQuery() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const usersCol = db.collection('users');
  const userId = new mongoose.Types.ObjectId('6a961368bdc1063337ad622c');

  const joUser = await usersCol.findOne({ _id: userId });
  console.log('Jo User Query Fields:', {
    _id: joUser?._id,
    isSeller: joUser?.isSeller,
    isApproved: joUser?.isApproved,
    isBanned: joUser?.isBanned,
    isDeleted: joUser?.isDeleted,
    sellerTipoEstabelecimento: joUser?.seller?.tipoEstabelecimento
  });

  const query = {
    isSeller: true,
    isDeleted: { $ne: true },
    isApproved: true,
    isBanned: false,
    'seller.tipoEstabelecimento': { $exists: true, $ne: null }
  };

  const matchingSellers = await usersCol.find(query).toArray();
  console.log(`Matching sellers count: ${matchingSellers.length}`);
  matchingSellers.forEach(s => console.log(`- ${s._id}: ${s.name} (${s.seller?.name})`));

  await mongoose.disconnect();
}

debugSellersQuery();
