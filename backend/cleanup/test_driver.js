import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = (await import('./models/UserModel.js')).default;
  const driver = await User.findOne({ isDeliveryMan: true, status: 'Ativo' }).populate('deliveryman.vehicle_type_id');
  console.log("Driver vehicle_type_id:", driver?.deliveryman?.vehicle_type_id);
  console.log("Driver transport_type:", driver?.deliveryman?.transport_type);
  console.log("Driver providedServices:", JSON.stringify(driver?.providedServices, null, 2));
  process.exit(0);
});
