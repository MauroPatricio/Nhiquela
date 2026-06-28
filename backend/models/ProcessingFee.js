import mongoose from 'mongoose';

const ProcessingFeeSchema = new mongoose.Schema({
  serviceType: {
    type: String,
    enum: ['prescription', 'shopping_list', 'special_order'],
    required: true,
  },
  amount: { type: Number, default: 0 }, // fixed amount (MT)
  percentage: { type: Number, default: 0 }, // percentage of order total
  exemptForPremium: { type: Boolean, default: false }, // if true, excellent rep users don't pay
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // seller reference for specific overrides
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const ProcessingFee = mongoose.model('ProcessingFee', ProcessingFeeSchema);
export default ProcessingFee;
