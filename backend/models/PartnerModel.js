// models/PartnerModel.js
import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema(
  {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phoneNumber: { type: String },
      address: { type: String },
      commissionRate: { type: Number, default: 0.1 }, // 10% default, configurable by admin
      isActive: { type: Boolean, default: true },
      // Minimum wallet balance required for the partner to stay active
      // Farmácias: 2 000 MT, Supermercados: 5 000 MT, Grandes parceiros: 10 000 MT+.
      // Default is 2 000 MT which can be overridden per partner.
      minBalance: { type: Number, default: 2000 },
      // Accumulated commission earned by the platform from this partner
      accumulatedCommission: { type: Number, default: 0 },
      // Sales aggregation (used for reporting & UI dashboards)
      salesDay: { type: Number, default: 0 },
      salesMonth: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
      // Additional fields can be added as needed (e.g., taxId, logo, etc.)
  },
  { timestamps: true }
);

export default mongoose.model('Partner', partnerSchema);
