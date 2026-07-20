import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const user = await mongoose.connection.db.collection('users').findOne({_id: new mongoose.Types.ObjectId('6a5e01ead01ee0c3a00faafe')}); 
  console.log('Driver user ID:', user ? user.name : 'Not found', 'deviceToken:', user?.deviceToken); 
  process.exit(0);
});
