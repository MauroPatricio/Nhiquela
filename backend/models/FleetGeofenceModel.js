import mongoose from 'mongoose';

const fleetGeofenceSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['BASE', 'CUSTOMER', 'FUEL_STATION', 'WORKSHOP', 'RESTRICTED', 'CUSTOM'],
      default: 'CUSTOM',
    },
    centerLatitude: { type: Number, required: true },
    centerLongitude: { type: Number, required: true },
    radiusMeters: { type: Number, required: true, default: 200 },
    polygon: [
      {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    ],
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

fleetGeofenceSchema.index({ partner: 1, active: 1 });

const FleetGeofence = mongoose.model('FleetGeofence', fleetGeofenceSchema);
export default FleetGeofence;
