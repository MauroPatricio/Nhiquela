import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    providerType: { type: String, required: true }, // Can be dynamic from classification
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderSubcategory' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number },
      province: { type: mongoose.Schema.Types.ObjectId, ref: 'Province' }
    },
    rating: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

export default mongoose.model('Provider', providerSchema);
