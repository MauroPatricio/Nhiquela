import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DeliverymanUpdateRequest from './models/DeliverymanUpdateRequestModel.js';
import User from './models/UserModel.js';

dotenv.config();
console.log('MONGODB_URI:', process.env.MONGODB_URI);

mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to DB');
    try {
      const filter = { type: 'profile_update' };
      const requests = await DeliverymanUpdateRequest.find(filter)
        .populate('deliverymanId', 'name email deliveryman')
        .populate('reviewedBy', 'name')
        .sort({ requestedAt: -1 });
      console.log('Success, found:', requests.length);
    } catch (e) {
      console.error('Error during query:', e);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting:', err);
    process.exit(1);
  });
