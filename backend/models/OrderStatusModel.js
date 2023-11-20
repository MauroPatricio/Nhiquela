import mongoose from 'mongoose';

const orderStatusSchema = new mongoose.Schema(
  {
    step: { type: Number, require: true },
    description: { type: String, require: true },
    descricao: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const DocumentType = mongoose.model('OrderStatus', orderStatusSchema);

export default DocumentType;
