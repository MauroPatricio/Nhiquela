import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nome: { type: String, required: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Color = mongoose.model('Color', colorSchema);

export default Color;
