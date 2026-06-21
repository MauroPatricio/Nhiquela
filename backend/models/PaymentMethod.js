import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema(

  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    status: { type: String, enum: ['Ativo', 'Inativo'], default: 'Ativo' },
    order: { type: Number, default: 0 },
    type: { type: String, required: true }
  },
  {
    timestamps: true,
  }
);

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;
