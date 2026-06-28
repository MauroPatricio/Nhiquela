// models/TipoEstabelecimento.js
import mongoose from 'mongoose';

const tipoEstabelecimentoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  img: { type: String, required: true, unique: true },
  // Average preparation time in minutes for orders of this type
  averagePreparationTime: { type: Number, required: true, default: 0 },
  // Whether the system should automatically assign a driver after order acceptance
  autoAssignDriver: { type: Boolean, required: true, default: false },
  isActive: { type: Boolean, default: true },
  paymentMethods: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' }],
  criadoEm: { type: Date, default: Date.now },
});

const TipoEstabelecimento = mongoose.model('TipoEstabelecimento', tipoEstabelecimentoSchema);

export default TipoEstabelecimento; // Here we ensure default export
