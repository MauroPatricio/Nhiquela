import mongoose from "mongoose";

const importRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner" }, // Optional
    productName: { type: String, required: true },
    description: { type: String, required: true },
    productUrl: { type: String },
    productImage: { type: String, default: '' },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'un' },
    preferredOriginCountry: { type: String },
    shippingMethod: { type: String, enum: ['AIR', 'SEA'], default: 'AIR' },
    targetBudget: { type: Number },
    notes: { type: String },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'UNDER_REVIEW',
        'SOURCING',
        'QUOTATION_READY',
        'QUOTATION_SENT',
        'ACCEPTED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_PENDING',
        'PAID',
        'REJECTED',
        'CANCELLED',
        'PURCHASED',
        'PROCESSING',
        'SHIPPED',
        'ARRIVED_AT_CUSTOMS',
        'CUSTOMS_CLEARED',
        'READY_FOR_DELIVERY',
        'DELIVERED'
      ],
      default: 'REQUESTED'
    }
  },
  {
    timestamps: true,
  }
);

const ImportRequest = mongoose.model("ImportRequest", importRequestSchema);

export default ImportRequest;
