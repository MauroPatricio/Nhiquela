import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check RequestService collection
    const RequestService = (await import('./models/RequestServiceModel.js')).default;
    const orders = await RequestService.find().sort({ createdAt: -1 }).limit(3);
    
    console.log(JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
})();
