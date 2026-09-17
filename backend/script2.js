import mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1:27017/nhiquela').then(async () => {
  const ProviderSchema = new mongoose.Schema({ verificationStatus: String, subcategoryId: mongoose.Schema.Types.ObjectId, categoryId: mongoose.Schema.Types.ObjectId }, { strict: false });
  const Provider = mongoose.model('TestProvider3', ProviderSchema, 'providers');
  await Provider.updateMany({}, { $set: { verificationStatus: 'approved' } });
  const docs = await Provider.find().limit(2).lean();
  console.log(JSON.stringify(docs, null, 2));
  process.exit();
}).catch(console.error);
