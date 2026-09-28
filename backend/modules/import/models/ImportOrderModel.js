import mongoose from "mongoose";

const importOrderSchema = new mongoose.Schema(
  {
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportQuotation", required: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportRequest" }, // referência directa ao pedido original
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: [
        'PAYMENT_PENDING',
        'PAYMENT_CONFIRMED',
        'PAID',
        'PURCHASE_PENDING',
        'PURCHASED',
        'PREPARING',
        'SHIPPED',
        'IN_TRANSIT',
        'ARRIVED_MOZAMBIQUE',
        'CUSTOMS',
        'RELEASED',
        'READY_FOR_DELIVERY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED'
      ],
      default: 'PAYMENT_PENDING'
    },
    paymentStatus: { type: String, enum: ['PENDING', 'PENDING_VERIFICATION', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    paymentProof: { type: String }, // URL to the payment receipt uploaded by customer
    purchaseStatus: { type: String, enum: ['PENDING', 'PURCHASED'], default: 'PENDING' },
    shippingStatus: { type: String, enum: ['PENDING', 'SHIPPED', 'ARRIVED'], default: 'PENDING' },
    customsStatus: { type: String, enum: ['PENDING', 'IN_PROCESS', 'CLEARED'], default: 'PENDING' },
    deliveryStatus: { type: String, enum: ['PENDING', 'OUT_FOR_DELIVERY', 'DELIVERED'], default: 'PENDING' },
    totalAmount: { type: Number, required: true },
    currency: { type: String, required: true },
    estimatedArrivalDate: { type: Date }, // propagada da cotação
    // Link to local delivery order when dispatch is created
    localDeliveryOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryOrder" }
  },
  {
    timestamps: true,
  }
);

const ImportOrder = mongoose.model("ImportOrder", importOrderSchema);

export default ImportOrder;
