const mongoose = require('mongoose');
async function patch() {
  await mongoose.connect('mongodb+srv://nhiquelabd:root123@nhiquela.7pafgjv.mongodb.net/?retryWrites=true&w=majority');
  const User = mongoose.connection.collection('users');
  const Service = mongoose.connection.collection('services');
  const Subcats = mongoose.connection.collection('providersubcategories');
  
  const services = await Service.find({}).toArray();
  const subcats = await Subcats.find({}).toArray();
  
  const sids = [...services, ...subcats].map(s => ({ serviceId: s._id, isAvailable: true }));
  
  await User.updateOne(
    { name: 'Jota', isDeliveryMan: true },
    { $set: { 
      'deliveryman.providedServices': sids, 
      latitude: '-25.969248', 
      longitude: '32.573174', 
      'locationGeo.coordinates': [32.573174, -25.969248] 
    }}
  );
  console.log('Patched Jota successfully');
  process.exit(0);
}
patch().catch(console.error);
