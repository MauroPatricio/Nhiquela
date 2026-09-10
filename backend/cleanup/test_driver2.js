import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = (await import('./models/UserModel.js')).default;
  const drivers = await User.find({ isDeliveryMan: true });
  for (const driver of drivers) {
    console.log("Driver ID:", driver._id, "Name:", driver.name);
    console.log("deliveryman:", JSON.stringify(driver.deliveryman, null, 2));
    console.log("providedServices:", JSON.stringify(driver.providedServices, null, 2));
  }
  process.exit(0);
});
