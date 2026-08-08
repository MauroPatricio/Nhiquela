// models/WalletModel.js
import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ownerType' },
  ownerType: { type: String, enum: ['driver', 'partner', 'admin', 'User'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Legacy field to satisfy MongoDB unique index
  balance: { type: Number, default: 0 },
  negativeSince: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Wallet', walletSchema);
