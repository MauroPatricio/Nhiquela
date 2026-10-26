import mongoose from "mongoose";

const importRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner" }, // Optional
    productName: { type: String, required: true },
    description: { type: String, required: true },
    pautaCategory: { type: String, default: '' },
    pautaShCode: { type: String, default: '' },
    productUrl: { type: String },
    productImage: { type: String, default: '' },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'un' },
    preferredOriginCountry: { type: String },
    originCountry: { type: String, default: 'China' },
    destinationCity: { type: String, default: 'Maputo' },
    shippingMethod: { type: String, enum: ['AIR', 'SEA'], default: 'AIR' },
    targetBudget: { type: Number },
    notes: { type: String },
    
    // Dados da Simulação e Cálculos Preliminares
    simulationLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportSimulationLead' },
    simulationCode: { type: String, default: '' },
    unitPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    exchangeRate: { type: Number, default: 75.0 },
    productCostMzn: { type: Number, default: 0 },
    freight: { type: Number, default: 0 },
    freightMzn: { type: Number, default: 0 },
    insuranceCurrency: { type: Number, default: 0 },
    insuranceMzn: { type: Number, default: 0 },
    customsValueCurrency: { type: Number, default: 0 },
    customsValue: { type: Number, default: 0 },
    customsDutyRate: { type: Number, default: 5 },
    customsEstimated: { type: Number, default: 0 },
    ivaRate: { type: Number, default: 16 },
    iceRate: { type: Number, default: 0 },
    nhiquelaCommissionRate: { type: Number, default: 30 },
    nhiquelaServiceFee: { type: Number, default: 0 },
    finalEstimatedPrice: { type: Number, default: 0 },
    simulationData: { type: mongoose.Schema.Types.Mixed, default: null },
    importerContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      company: { type: String, default: '' }
    },
    isViewed: { type: Boolean, default: false },
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
