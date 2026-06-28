import mongoose from 'mongoose';

const expoTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ExpoToken', expoTokenSchema);
