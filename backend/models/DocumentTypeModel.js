import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    nome: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const DocumentType = mongoose.model('DocumentType', documentSchema);

export default DocumentType;
