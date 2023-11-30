import mongoose from 'mongoose';

const provinceSchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    nome: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Province = mongoose.model('Province', provinceSchema);

export default Province;
