import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const schema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', schema, 'users');

async function check() {
  const drivers = await User.find({ isDeliveryMan: true }).select('name deliveryman').limit(5);
  console.log(JSON.stringify(drivers, null, 2));
  process.exit();
}

check();
