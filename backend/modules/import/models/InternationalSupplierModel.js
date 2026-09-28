import mongoose from "mongoose";

const internationalSupplierSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    country: { type: String, required: true },
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    platform: { 
      type: String,
      enum: ['Alibaba', '1688', 'Made-in-China', 'Global Sources', 'Fornecedor directo', 'Outro'],
      default: 'Outro'
    },
    website: { type: String },
    address: { type: String },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    notes: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  {
    timestamps: true,
  }
);

const InternationalSupplier = mongoose.model("InternationalSupplier", internationalSupplierSchema);

export default InternationalSupplier;
