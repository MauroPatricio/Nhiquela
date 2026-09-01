import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nome: { type: String, required: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Size = mongoose.model('Size', sizeSchema);

export default Size;
