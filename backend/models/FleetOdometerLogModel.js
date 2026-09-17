import mongoose from 'mongoose';

const fleetOdometerLogSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetVehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    odometer: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestService', default: null },
    source: {
      type: String,
      enum: ['MANUAL_DRIVER', 'MANUAL_MANAGER', 'FUEL_LOG', 'TRIP_COMPLETED'],
      default: 'MANUAL_MANAGER',
    },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

fleetOdometerLogSchema.index({ vehicle: 1, date: -1 });

const FleetOdometerLog = mongoose.model('FleetOdometerLog', fleetOdometerLogSchema);
export default FleetOdometerLog;
