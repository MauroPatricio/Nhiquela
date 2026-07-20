import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const driver = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6a5e01ead01ee0c3a00faafe') });
  console.log('Driver Info:');
  console.log('Name:', driver.name);
  console.log('Status:', driver.status);
  console.log('Availability:', driver.availability);
  console.log('DeviceToken:', driver.deviceToken);
  console.log('TransportType:', driver.deliveryman?.transport_type);
  
  const token = await db.collection('notificationtokens').findOne({ user: new mongoose.Types.ObjectId('6a5e01ead01ee0c3a00faafe') });
  console.log('NotificationToken:', token ? token.deviceToken : null);
  
  const wallet = await db.collection('wallets').findOne({ user: new mongoose.Types.ObjectId('6a5e01ead01ee0c3a00faafe') });
  console.log('Wallet balance:', wallet ? wallet.balance : 'No wallet');
  
  process.exit(0);
});
