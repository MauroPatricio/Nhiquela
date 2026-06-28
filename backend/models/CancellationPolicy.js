import mongoose from 'mongoose';

const CancellationPolicySchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['pre_processing', 'post_processing', 'post_validation'],
    required: true,
  },
  chargeProcessingFee: { type: Boolean, default: true },
  message: { type: String },
});

export default mongoose.model('CancellationPolicy', CancellationPolicySchema);
