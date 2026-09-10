import mongoose from 'mongoose';

const deliverymanUpdateRequestSchema = new mongoose.Schema({
  deliverymanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Tipo de pedido: 'profile_update' (padrão) ou 'price_change'
  type: {
    type: String,
    enum: ['profile_update', 'price_change'],
    default: 'profile_update'
  },
  // Para pedidos de alteração de preço
  previousPrice: { type: Number, default: null },
  requestedPrice: { type: Number, default: null },
  // Para pedidos de atualização de perfil
  updatedFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
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
