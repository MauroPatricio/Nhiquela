// models/WalletModel.js
import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ownerType' },
  ownerType: { type: String, enum: ['driver', 'partner', 'admin', 'User'], required: true },
  balance: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Wallet', walletSchema);