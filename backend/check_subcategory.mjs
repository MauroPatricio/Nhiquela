import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function checkSubcategory() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const subcatsCol = db.collection('providersubcategories');
  const subcat = await subcatsCol.findOne({ _id: new mongoose.Types.ObjectId('6a5375eec55cef36ed5510c3') });
  console.log('Subcategory 6a5375eec55cef36ed5510c3:', subcat);

  const allSubcats = await subcatsCol.find({}).toArray();
  console.log('All ProviderSubcategories:', allSubcats.map(s => ({ id: s._id, name: s.name })));

  await mongoose.disconnect();
}

checkSubcategory();
