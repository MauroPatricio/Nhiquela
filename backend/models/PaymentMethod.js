import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema(

  {

    shortName: { type: String, required: true },
    fullName: { type: String, required: true },
    description: { type: String },
    accountNumber: { type: Number, required: true },
    accountNumberAlternative: { type: Number },
    shortCode: { type: Number },
    NIB: { type: Number },
    NUIB: { type: Number },
    NUIT: { type: Number },
    logo: { type: String },
    isActive:  { type: Boolean, default: true },

    },
  {
    timestamps: true,
  }
);

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;
