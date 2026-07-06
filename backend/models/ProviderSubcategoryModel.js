import mongoose from 'mongoose';
const { Schema } = mongoose;

const ProviderSubcategorySchema = new Schema({
  name: { type: String, required: true },
  providerTypeId: { type: Schema.Types.ObjectId, ref: 'ProviderType', required: true },
  description: { type: String },
  iconUrl: { type: String },
  isActive: { type: Boolean, default: true },
  motives: [{ type: String }],
  originFloors: [{ type: String }],
  loadingHelpOptions: [{ type: String }],
  requiresPhotos: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed },

  // ==========================================
  // PRICING ENGINE CONFIGURATION
  // ==========================================
  pricingMode: { type: String, enum: ['AUTO', 'PROVIDER_DEFINED'], default: 'AUTO' }, // 'AUTO' (calculated by engine) or 'PROVIDER_DEFINED' (set by provider)
  minProviderPrice: { type: Number, default: 0 }, // Minimum price allowed if PROVIDER_DEFINED
  maxProviderPrice: { type: Number, default: 0 }, // Maximum price allowed if PROVIDER_DEFINED
  hourlyRateEnabled: { type: Boolean, default: false }, // If true, supports hourly pricing
  materialFeeEnabled: { type: Boolean, default: false }, // If true, supports material cost addition
  baseFare: { type: Number, default: 0 },
  pricePerKm: { type: Number, default: 0 },
  commission: { type: Number, default: 0 }, // % of commission for the platform
  serviceFee: { type: Number, default: 0 }, // Fixed fee for this service type
  percentageFee: { type: Number, default: 0 }, // Extra percentage fee applied
  requiresVehicleType: { type: Boolean, default: false }, // If true, requires user or system to select vehicle
  supportsHelpers: { type: Boolean, default: false }, // For 'Mudança' etc.
  vehicleTypes: [{ type: Schema.Types.ObjectId, ref: 'VehicleType' }], // Join com Tipos de Viatura
}, { timestamps: true });

export default mongoose.model('ProviderSubcategory', ProviderSubcategorySchema);
