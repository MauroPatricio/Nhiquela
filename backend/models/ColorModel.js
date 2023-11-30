import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    nome: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Color = mongoose.model('Color', colorSchema);

export default Color;
