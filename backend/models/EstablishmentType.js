import mongoose from 'mongoose';

const establishmentTypeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ex: "Restaurante"
  description: { type: String, default: '' },
  // Array of PaymentMethod ObjectIds that are allowed for this type
  allowedPayments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' }]
}, { timestamps: true });

export default mongoose.model('EstablishmentType', establishmentTypeSchema);
