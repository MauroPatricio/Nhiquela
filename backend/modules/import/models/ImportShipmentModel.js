import mongoose from "mongoose";

const importShipmentSchema = new mongoose.Schema(
  {
    shipmentCode: { type: String, required: true, unique: true },
    originCountry: { type: String },
    originCity: { type: String },
    destinationCountry: { type: String, default: 'Moçambique' },
    destinationCity: { type: String },
    carrier: { type: String },
    trackingNumber: { type: String },
    shippingMethod: { type: String, enum: ['AIR', 'SEA', 'LAND', 'OTHER'] },
    departureDate: { type: Date },
    estimatedArrivalDate: { type: Date },
    actualArrivalDate: { type: Date },
    weight: { type: Number },
    volume: { type: Number },
    status: {
      type: String,
      enum: ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'ARRIVED', 'CUSTOMS', 'RELEASED', 'CLOSED'],
      default: 'PREPARING'
    },
    notes: { type: String },
    // A shipment can contain multiple import orders
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "ImportOrder" }]
  },
  {
    timestamps: true,
  }
);

const ImportShipment = mongoose.model("ImportShipment", importShipmentSchema);

export default ImportShipment;
