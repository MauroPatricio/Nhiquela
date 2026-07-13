import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }, // Null initially
    
    // For distance-based services like towing/deliveries
    origin: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    destination: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    },
    
    // Optional delivery info
    recipientName: { type: String },
    recipientPhone: { type: String },
    
    vehicleTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' },
    
    // Pricing
    estimatedPrice: { type: Number, required: true },
    finalPrice: { type: Number },
    paymentMethod: { type: String, default: 'Cash' },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    
    // Additional notes or form data collected from client
    details: { type: mongoose.Schema.Types.Mixed }, // e.g. { weight: "50kg", items: "Boxes" }
  },
  {
    timestamps: true,
  }
);

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
export default ServiceRequest;
