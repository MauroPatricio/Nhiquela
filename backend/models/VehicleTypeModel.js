import mongoose from 'mongoose';

const vehicleTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String },
    category: { type: String, enum: ['leve', 'ligeiro', 'pesado'], default: 'ligeiro' },
    capacityKg: { type: Number },
    isActive: { type: Boolean, default: true },

    // ==========================================
    // PRICING ENGINE CONFIGURATION
    // ==========================================
    baseFare: { type: Number, default: 0 },
    pricePerKm: { type: Number, default: 0 },
    pricePerMinute: { type: Number, default: 0 },
    minFare: { type: Number, default: 0 },
    maxDistanceKm: { type: Number, default: 0 },
    maxWeightKg: { type: Number, default: 0 },
    freeWaitMinutes: { type: Number, default: 0 },
    waitingPricePerMinute: { type: Number, default: 0 },
    includesLoading: { type: Boolean, default: false },
    loadingFee: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const VehicleType = mongoose.model('VehicleType', vehicleTypeSchema);
export default VehicleType;
