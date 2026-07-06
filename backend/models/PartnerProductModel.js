// models/PartnerProductModel.js
import mongoose from 'mongoose';

const partnerProductSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // price set by partner
    stock: { type: Number, default: 0 },
    description: { type: String },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    // Additional fields such as commissionRate could be added per partner product
  },
  { timestamps: true }
);

export default mongoose.model('PartnerProduct', partnerProductSchema);
