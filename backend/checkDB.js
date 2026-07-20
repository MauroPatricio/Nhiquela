import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const driver = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6a5b20e6bb96398ea443563a') });
  console.log('Driver Info:');
  if(driver) {
    console.log('Name:', driver.name);
    console.log('Status:', driver.status);
    console.log('Availability:', driver.availability);
    console.log('DeviceToken:', driver.deviceToken);
    console.log('IsDeliveryMan:', driver.isDeliveryMan);
    console.log('TransportType:', driver.deliveryman?.transport_type);
  } else {
    console.log('Driver 6a5b20e6bb96398ea443563a NOT FOUND!');
  }
  
  const token = await db.collection('notificationtokens').findOne({ user: new mongoose.Types.ObjectId('6a5b20e6bb96398ea443563a') });
  console.log('NotificationToken:', token ? token.deviceToken : null);
  
  process.exit(0);
});
