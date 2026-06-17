import mongoose from 'mongoose';

const deliverymanUpdateRequestSchema = new mongoose.Schema({
  deliverymanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedFields: { type: Object },
  status: { type: String, default: 'PENDING' },
  requestType: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reason: { type: String },
  requestedAt: { type: Date, default: Date.now }
});

const DeliverymanUpdateRequest = mongoose.model('DeliverymanUpdateRequest', deliverymanUpdateRequestSchema);
export default DeliverymanUpdateRequest;
