import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const req = await mongoose.connection.db.collection('requestservices').find().sort({_id:-1}).limit(1).toArray();
  console.log('Ultimo Pedido:', req.map(r=>({id:r._id, status:r.status, driver:r.targetDriverId})));
  const notif = await mongoose.connection.db.collection('notifications').find({}).sort({_id:-1}).limit(1).toArray();
  console.log('Ultima Notificacao:', notif);
  
  const tokens = await mongoose.connection.db.collection('notificationtokens').find({}).sort({_id:-1}).limit(2).toArray();
  console.log('Ultimos Tokens:', tokens);
  
  process.exit(0);
});
