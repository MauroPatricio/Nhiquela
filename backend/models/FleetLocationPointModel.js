import mongoose from 'mongoose';

const fleetLocationPointSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetTrackingSession', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetVehicle', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: 0 },
    speedKmh: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    altitude: { type: Number, default: 0 },
    batteryLevel: { type: Number, default: null },
    provider: { type: String, default: 'gps' },
    capturedAt: { type: Date, required: true, default: Date.now },
    receivedAt: { type: Date, required: true, default: Date.now },
    syncStatus: { type: String, enum: ['SYNCED', 'PENDING'], default: 'SYNCED' },
  },
  {
    timestamps: true,
  }
);

fleetLocationPointSchema.index({ sessionId: 1, capturedAt: 1 });
fleetLocationPointSchema.index({ driver: 1, capturedAt: -1 });
fleetLocationPointSchema.index({ vehicle: 1, capturedAt: -1 });
fleetLocationPointSchema.index({ partner: 1, capturedAt: -1 });

const FleetLocationPoint = mongoose.model('FleetLocationPoint', fleetLocationPointSchema);
export default FleetLocationPoint;
