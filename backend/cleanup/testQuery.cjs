const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://nhiquelabd:root123@nhiquela.7pafgjv.mongodb.net/?retryWrites=true&w=majority').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({
    isDeliveryMan: Boolean,
    availability: String,
    isDeleted: Boolean,
    deliveryman: Object,
    locationGeo: Object,
    latitude: String,
    longitude: String
  }, { strict: false }));
  
  const filter = {
    isDeliveryMan: true,
    availability: 'active',
    isDeleted: { $ne: true },
    $or: [
      {
        'deliveryman.providedServices': {
          $elemMatch: {
            serviceId: '6a3bcfc904793044524a994e',
            isAvailable: true
          }
        }
      }
    ]
  };
  const drivers = await User.find(filter).lean();
  console.log('Matched drivers with String ID:', drivers.length);

  const filterObjectId = { ...filter, $or: [
    {
      'deliveryman.providedServices': {
        $elemMatch: {
          serviceId: new mongoose.Types.ObjectId('6a3bcfc904793044524a994e'),
          isAvailable: true
        }
      }
    }
  ]};
  const driversObj = await User.find(filterObjectId).lean();
  console.log('Matched drivers with ObjectId:', driversObj.length);

  process.exit(0);
});
