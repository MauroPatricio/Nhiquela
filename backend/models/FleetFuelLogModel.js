import mongoose from 'mongoose';

const fleetFuelLogSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetVehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    gasStation: { type: String, default: 'Posto Não Especificado' },
    odometer: { type: Number, required: true },
    liters: { type: Number, required: true, min: 0.1 },
    pricePerLiter: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    receiptUrl: { type: String, default: '' },
    calculatedKmDriven: { type: Number, default: 0 },
    calculatedKmL: { type: Number, default: 0 },
    calculatedL100km: { type: Number, default: 0 },
    calculatedCostPerKm: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

fleetFuelLogSchema.index({ vehicle: 1, date: -1 });
fleetFuelLogSchema.index({ partner: 1 });

const FleetFuelLog = mongoose.model('FleetFuelLog', fleetFuelLogSchema);
export default FleetFuelLog;
