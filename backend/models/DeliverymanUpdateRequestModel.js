import mongoose from 'mongoose';

const deliverymanUpdateRequestSchema = new mongoose.Schema({
  deliverymanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: {
    type: String,
    default: ''
  }
});

const DeliverymanUpdateRequest = mongoose.model('DeliverymanUpdateRequest', deliverymanUpdateRequestSchema);
export default DeliverymanUpdateRequest;