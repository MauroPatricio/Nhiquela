import mongoose from 'mongoose';

const vehicleTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String },
    capacityKg: { type: Number },
    basePrice: { type: Number, default: 0 },
    pricePerKm: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const VehicleType = mongoose.model('VehicleType', vehicleTypeSchema);
export default VehicleType;
