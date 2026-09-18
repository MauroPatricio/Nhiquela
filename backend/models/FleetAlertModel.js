import mongoose from 'mongoose';

const fleetAlertSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetVehicle', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'MAINTENANCE_DUE_SOON_KM',
        'MAINTENANCE_DUE_SOON_DATE',
        'MAINTENANCE_OVERDUE',
        'ODOMETER_INCONSISTENT',
        'FUEL_CAPACITY_EXCEEDED',
        'FUEL_HIGH_CONSUMPTION',
        'FUEL_DUPLICATE_SUSPECT',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'PENDING',
    },
    metadata: { type: Object, default: {} },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

fleetAlertSchema.index({ partner: 1, status: 1 });
fleetAlertSchema.index({ vehicle: 1 });

const FleetAlert = mongoose.model('FleetAlert', fleetAlertSchema);
export default FleetAlert;
