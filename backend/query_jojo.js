import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check User collection for jojo
    const User = (await import('./models/UserModel.js')).default;
    const jojo = await User.findOne({ name: { $regex: /jojo/i } });
    
    console.log(JSON.stringify(jojo, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
})();
