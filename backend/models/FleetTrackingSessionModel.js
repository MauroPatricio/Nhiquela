import mongoose from 'mongoose';

const fleetTrackingSessionSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetVehicle', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    startLatitude: { type: Number, required: true },
    startLongitude: { type: Number, required: true },
    endLatitude: { type: Number, default: null },
    endLongitude: { type: Number, default: null },
    totalDistanceKm: { type: Number, default: 0 },
    movingDurationSeconds: { type: Number, default: 0 },
    idleDurationSeconds: { type: Number, default: 0 },
    totalDurationSeconds: { type: Number, default: 0 },
    averageSpeedKmh: { type: Number, default: 0 },
    maxSpeedKmh: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

fleetTrackingSessionSchema.index({ driver: 1, startedAt: -1 });
fleetTrackingSessionSchema.index({ vehicle: 1, startedAt: -1 });
fleetTrackingSessionSchema.index({ partner: 1, startedAt: -1 });
fleetTrackingSessionSchema.index({ status: 1 });

const FleetTrackingSession = mongoose.model('FleetTrackingSession', fleetTrackingSessionSchema);
export default FleetTrackingSession;
