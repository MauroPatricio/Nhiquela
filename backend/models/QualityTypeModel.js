import mongoose from 'mongoose';

const qualitySchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    nome: { type: String, require: true },

    description: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const QualityType = mongoose.model('QualityType', qualitySchema);

export default QualityType;
