import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    nome: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Size = mongoose.model('Size', sizeSchema);

export default Size;
