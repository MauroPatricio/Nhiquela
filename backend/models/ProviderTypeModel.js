import mongoose from 'mongoose';

const providerTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    classificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderClassification', required: true },
    description: { type: String },
    iconUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('ProviderType', providerTypeSchema);
