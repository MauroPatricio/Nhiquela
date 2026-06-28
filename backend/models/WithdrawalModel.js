// models/withdrawalModel.js
import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 10, // mínimo opcional
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin que aprovou ou rejeitou
  },
  reviewedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Withdrawal', withdrawalSchema);
