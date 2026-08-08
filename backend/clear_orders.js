import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const RequestService = mongoose.connection.collection('requestdelivers');
  const activeOrders = await RequestService.find({
       status: { $nin: ['Finalizado', 'Cancelado', 'Entregue'] }
  }).toArray();
  
  console.log('Orders to cancel:', activeOrders.length);
  for (let order of activeOrders) {
     await RequestService.updateOne({ _id: order._id }, { $set: { status: 'Cancelado', targetDriverId: null, 'deliveryman.id': null }});
     console.log('Canceled order:', order._id);
  }
  
  // also check normal orders
  const Orders = mongoose.connection.collection('orders');
  const activeStandardOrders = await Orders.find({
      isDelivered: false,
      status: { $nin: ['Cancelado'] },
      'deliveryman.id': { $exists: true, $ne: null }
  }).toArray();
  
  console.log('Standard orders to cancel:', activeStandardOrders.length);
  for (let order of activeStandardOrders) {
     await Orders.updateOne({ _id: order._id }, { $set: { status: 'Cancelado', 'deliveryman.id': null }});
     console.log('Canceled standard order:', order._id);
  }

  process.exit(0);
});
