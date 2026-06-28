import mongoose from 'mongoose';

const vehicleColorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    hexCode: { type: String, required: true, unique: true },
    rgbCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const VehicleColor = mongoose.model('VehicleColor', vehicleColorSchema);
export default VehicleColor;
