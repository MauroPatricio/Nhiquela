import mongoose from 'mongoose';

const requestServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    goodType: { type: String, required: true },
    transportType: { type: String, required: true }, // Guarda sempre como string (nome OU ObjectId em string)
    transportTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType', required: false }, // Referência ao VehicleType (se disponível)

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
    deliveryStops: [{
      sequence: { type: Number, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, required: true },
      recipientName: { type: String, required: true },
      recipientPhone: { type: String, required: true },
      packages: { type: Number, default: 1 },
      description: { type: String },
      notes: { type: String },
      status: {
        type: String,
        enum: ['PENDING', 'ARRIVING', 'ARRIVED', 'IN_DELIVERY', 'DELIVERED', 'FAILED', 'SKIPPED', 'CANCELLED'],
        default: 'PENDING'
      },
      estimatedArrival: { type: Date },
      actualArrival: { type: Date },
      deliveredAt: { type: Date },
      failureReason: { type: String },
      failureNotes: { type: String },
      proofOfDelivery: {
        otp: { type: String },
        otpVerified: { type: Boolean, default: false },
        photo: { type: String },
        signature: { type: String },
        latitude: { type: Number },
        longitude: { type: Number },
        timestamp: { type: Date }
      }
    }],
    multiStopStatus: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_PROGRESS', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING'
    },
    auditTrail: [{
      action: { type: String },
      oldState: { type: mongoose.Schema.Types.Mixed },
      newState: { type: mongoose.Schema.Types.Mixed },
      performedBy: { type: String },
      reason: { type: String },
      timestamp: { type: Date, default: Date.now }
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
    arrivedAtDestination: { type: Date },
    arrivalLatitude: { type: Number },
    arrivalLongitude: { type: Number },
    deliveredAt: { type: Date },
    status:{type: String},
    stepStatus:{type: Number},
    code: {type: String},
    deleted: { type: Boolean, default: false },
    canceledReason: { type: String},
    targetDriverId: { type: String},
    isDeletedBySeller: { type: Boolean, default: false },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    isDeletedByDeliverman: { type: Boolean, default: false },
    isDeletedByAdmin: { type: Boolean, default: false },

    // Intelligent Dispatch Fields
    isSearching: { type: Boolean, default: false },
    searchRadius: { type: Number, default: 3000 }, // Inicialmente 3km (3000 metros)
    contactedDrivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastDispatchTime: { type: Date },
    priorityLevel: { type: String, enum: ['normal', 'alta'], default: 'normal' },

    // ==========================================
    // AGENDAMENTO INTELIGENTE
    // ==========================================
    isScheduled: { type: Boolean, default: false }, // true = pedido agendado para data futura
    scheduledAt: { type: Date, default: null },      // data/hora definida pelo cliente
    searchWindowStart: { type: Date, default: null }, // Momento calculado pelo motor preditivo para iniciar procura
    driverAssignedAt: { type: Date, default: null },  // Quando o motorista confirmou o agendamento
    confidenceScore: { type: Number, default: 100 },  // Índice de segurança (0-100)
    scheduledNotified: { type: Boolean, default: false }, // true quando a notificação de 45min/30min foi enviada

    deliveryman: {
      id: { type: mongoose.Schema.Types.Mixed },
      photo: { type: String },
      name: { type: String },
      phoneNumber: { type: mongoose.Schema.Types.Mixed },
      transport_type: { type: String },
      transport_color: { type: String },
      transport_registration: { type: String },
      pricetopay: { type: Number },
    },

    // ==========================================
    // FOTOS DO VEÍCULO E NEGOCIAÇÃO DE VALOR
    // ==========================================
    vehiclePhotos: {
      front: { type: String },
      rear: { type: String },
      leftSide: { type: String },
      rightSide: { type: String }
    },

    basePrice: { type: Number },
    finalAgreedPrice: { type: Number },
    negotiationState: {
      type: String,
      enum: ['NONE', 'NEGOTIATING', 'PENDING_CUSTOMER', 'PENDING_PROVIDER', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
      default: 'NONE'
    },
    negotiationRoundCount: { type: Number, default: 0 },
    maxNegotiationRounds: { type: Number, default: 3 },
    negotiationHistory: [
      {
        proposedBy: { type: String, enum: ['PROVIDER', 'CUSTOMER'] },
        amount: { type: Number, required: true },
        note: { type: String },
        status: { type: String, enum: ['PROPOSED', 'ACCEPTED', 'REJECTED'] },
        timestamp: { type: Date, default: Date.now }
      }
    ],

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
