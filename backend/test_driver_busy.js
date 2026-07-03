import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const users = await mongoose.connection.collection('users').find({ isDeliveryMan: true }).toArray();
  console.log('Total drivers:', users.length);
  
  const activeDrivers = users.filter(d => d.availability === 'active');
  console.log('Active drivers:', activeDrivers.length);
  
  if (activeDrivers.length > 0) {
    const d = activeDrivers[0];
    console.log('Sample active driver ID:', d._id);
    console.log('Name:', d.name);
    console.log('deliveryman.providedServices:', JSON.stringify(d.deliveryman?.providedServices, null, 2));
    console.log('deliveryman.transport_type:', d.deliveryman?.transport_type);
    
    // Check busy logic
    const RequestDeliv = mongoose.connection.collection('requestdelivers');
    const activeOrders = await RequestDeliv.find({
       status: { $nin: ['Finalizado', 'Cancelado'] }
    }).toArray();
    
    const busyIds = new Set();
    activeOrders.forEach(o => {
      if (o.deliveryman && o.deliveryman.id) busyIds.add(o.deliveryman.id.toString());
      if (o.targetDriverId) busyIds.add(o.targetDriverId.toString());
    });
    
    console.log('Is sample driver busy?', busyIds.has(d._id.toString()));
    console.log('Busy IDs count:', busyIds.size);
    
    // Find what orders are making them busy
    const busyOrders = activeOrders.filter(o => {
      let isTarget = o.targetDriverId === d._id.toString();
      let isDeliv = o.deliveryman && o.deliveryman.id && o.deliveryman.id.toString() === d._id.toString();
      return isTarget || isDeliv;
    });
    console.log('Orders making driver busy:', busyOrders.map(o => ({ id: o._id, status: o.status, target: o.targetDriverId })));
  }
  
  process.exit(0);
});
