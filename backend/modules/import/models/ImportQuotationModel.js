import mongoose from "mongoose";

const importQuotationSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportRequest", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productCost: { type: Number, required: true },
    productCurrency: { type: String, required: true },
    internationalShipping: { type: Number, default: 0 },
    insuranceCost: { type: Number, default: 0 },
    customsEstimated: { type: Number, default: 0 },
    handlingCost: { type: Number, default: 0 },
    localTransport: { type: Number, default: 0 },
    nhiquelaServiceFee: { type: Number, default: 0 },
    otherCosts: { type: Number, default: 0 },
    totalCost: { type: Number, required: true },
    currency: { type: String, required: true, default: 'MZN' }, // or USD depending on system defaults
    exchangeRate: { type: Number, default: 1 }, // Used if converting productCurrency to local currency
    estimatedDeliveryDays: { type: String }, // e.g., "20-30 dias"
    estimatedArrivalDate: { type: Date }, // Concrete estimated arrival date
    quotationValidUntil: { type: Date },
    notes: { type: String },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      default: 'DRAFT'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin id
  },
  {
    timestamps: true,
  }
);

const ImportQuotation = mongoose.model("ImportQuotation", importQuotationSchema);

export default ImportQuotation;
