import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const tokens = await mongoose.connection.db.collection('notificationtokens').find({user: new mongoose.Types.ObjectId('6a5de54b8ae7f2fc22513554')}).toArray(); 
  console.log('Tokens Mz:', tokens); 
  const mz = await mongoose.connection.db.collection('users').findOne({_id: new mongoose.Types.ObjectId('6a5de54b8ae7f2fc22513554')}); 
  console.log('Mz object deviceToken:', mz.deviceToken); 
  
  process.exit(0);
});
