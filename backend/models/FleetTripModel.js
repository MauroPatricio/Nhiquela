import mongoose from 'mongoose';

const fleetTripSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetTrackingSession', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetVehicle', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    startLatitude: { type: Number, required: true },
    startLongitude: { type: Number, required: true },
    endLatitude: { type: Number, default: null },
    endLongitude: { type: Number, default: null },
    distanceKm: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    averageSpeedKmh: { type: Number, default: 0 },
    maxSpeedKmh: { type: Number, default: 0 },
    status: { type: String, enum: ['MOVING', 'COMPLETED'], default: 'MOVING' },
  },
  {
    timestamps: true,
  }
);

fleetTripSchema.index({ sessionId: 1, startedAt: -1 });
fleetTripSchema.index({ driver: 1, startedAt: -1 });
fleetTripSchema.index({ vehicle: 1, startedAt: -1 });

const FleetTrip = mongoose.model('FleetTrip', fleetTripSchema);
export default FleetTrip;
