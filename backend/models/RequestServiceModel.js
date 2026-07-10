import mongoose from 'mongoose';

const requestServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    goodType: { type: String, required: true },
    transportType: { type: String, required: true },
    deliverCity:{ type: String, required: true },
    reason: { type: String, required: false }, // Motivo do servico, ex: Pneu furado, Acidente, etc.
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    originDetails: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    },
    destinationDetails: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    },
    stops: [{
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    }],
    paymentOption: { type: String, require: true },
    description: { type: String, require: true },
    paymentMethod: { type: String, require: true },
    deliveryPrice: { type: Number, require: true },
    latitude: { type: Number},
    longitude: { type: Number},

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isCanceled:{ type: Boolean, default: false },
    isAccepted:{ type: Boolean, default: false },
    isAvailableToDeliver:{ type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    isInTransit: { type: Boolean, default: false },
    acceptedAt: { type: Date },
    arrivedAtPickup: { type: Date },
    pickupStartedAt: { type: Date },
    deliveredAt: { type: Date },
    status:{type: String},
    stepStatus:{type: Number},
    code: {type: String},
    deleted: { type: Boolean, default: false },
    canceledReason: { type: String},
    targetDriverId: { type: String},
    isDeletedBySeller: { type: Boolean, default: false },
    isDeletedByDeliverman: { type: Boolean, default: false },
    isDeletedByAdmin: { type: Boolean, default: false },

    // Intelligent Dispatch Fields
    isSearching: { type: Boolean, default: false },
    searchRadius: { type: Number, default: 3000 }, // Inicialmente 3km (3000 metros)
    contactedDrivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastDispatchTime: { type: Date },
    priorityLevel: { type: String, enum: ['normal', 'alta'], default: 'normal' },

    deliveryman: {
      id:{type: mongoose.Schema.Types.ObjectId, ref: 'Provider'},
      photo: { type: String },
      name: { type: String},
      phoneNumber: {type: Number},
      transport_type: {type: String},
      transport_color: {type: String},
      transport_registration: {type: String},
      pricetopay: { type: Number },
    },

    // ==========================================
    // PRICING SNAPSHOT (calculado server-side no momento da criação — IMUTÁVEL)
    // ==========================================
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderSubcategory' },
    pricing: {
      distanceKm:    { type: Number },          // Distância calculada via OSRM
      costDeslocacao: { type: Number },          // Custo de deslocação (km × tarifa)
      costServico:   { type: Number },           // Custo base do serviço / tarifa mínima
      totalPrice:    { type: Number },           // Preço final (fonte de verdade)
      calculatedAt:  { type: Date },             // Momento exato do cálculo
      breakdown:     { type: mongoose.Schema.Types.Mixed }, // Detalhes: multiplicadores, etc.
    },
  },
  {
    timestamps: true,
  }
);
// Otimizações de Performance: Índices compostos e simples
requestServiceSchema.index({ user: 1, deleted: 1, status: 1 });
requestServiceSchema.index({ targetDriverId: 1, status: 1 });
requestServiceSchema.index({ deleted: 1, createdAt: -1 });
requestServiceSchema.index({ seller: 1, deleted: 1, createdAt: -1 });

const RequestService = mongoose.models.RequestService || mongoose.model('RequestService', requestServiceSchema);

export default RequestService;
