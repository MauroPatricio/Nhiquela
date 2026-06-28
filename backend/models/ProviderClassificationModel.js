import mongoose from 'mongoose';

const providerClassificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. 'BUSINESS', 'SERVICE', 'FREELANCER'
    description: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('ProviderClassification', providerClassificationSchema);
