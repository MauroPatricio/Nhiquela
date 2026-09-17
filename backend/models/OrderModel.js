import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    code: { type: String },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
    partnerProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerProduct' },
    partnerPrice: { type: Number },
    partnerStockStatus: { type: String },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
    sellers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider', 
      }
    ],
    orderItems: [
      {
        slug: { type: String },
        quantity: { type: String },
        seller: { type: String },
        image: { type: String },
        images: [String],
        brand: { type: String },
        category: { type: String },
        province: { type: String },
        description: { type: String },
        price: { type: Number },
        priceWithComission: { type: Number },
        countInStock: {
          type: Number,
          default: 0, // Valor padrão caso nenhum seja enviado
          min: [0, 'countInStock deve ser um valor positivo']
        },
        rating: { type: Number },
        numReviews: { type: Number },
        onSale: { type: Boolean },
        onSalePercentage: { type: Number },
        isActive: { type: Boolean },
        discount: { type: Number },
        color: { type: String }, // vermelho, preto, castanho, azul
        size: { type: String }, // S, M, L, XL, XXL or 20,21,22,23,24, [...] 40,41,42,43
        qualityType: { type: String }, // Original, primeira linha,Replica
        conditionStatus: { type: String }, // Novo, usado
        isGuaranteed: { type: Boolean, default: false },
        guaranteedPeriod: { type: String },
        isOrdered: { type: Boolean, default: false },
        orderPeriod: { type: String },
        priceComission: { type: Number },
        comissionPercentage: { type: Number },
        priceFromSeller: { type: Number },
        nome: { type: String },
        name: { type: String },
        phoneNumber: { type: String },
        goodType: { type: String },
        transportType: { type: String },
        deliverCity: { type: String },
        origin: { type: String },
        destination: { type: String },

        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          require: true,
        },
      },
    ],
    deliveryAddress: {
      fullName: { type: String, require: false },
      city: { type: String, require: false },
      address: { type: String, require: false },
      referenceAddress: { type: String, require: false },
      phoneNumber: { type: String },
      alternativePhoneNumber: { type: String }
    },
    deliveryman: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
      photo: { type: String },
      name: { type: String },
      phoneNumber: { type: Number },
      transport_type: { type: String },
      transport_color: { type: String },
      transport_registration: { type: String },
      pricetopay: { type: Number },

      // 🔥 NOVOS CAMPOS PARA LOCALIZAÇÃO
      currentLocation: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        speed: Number,
        heading: Number,
        lastUpdated: Date
      },

      locationHistory: [{
        latitude: Number,
        longitude: Number,
        timestamp: Date,
        _id: false
      }]
    },

    // 🔥 ADICIONE ESTES NOVOS CAMPOS PARA LOCALIZAÇÃO AQUI:
    lastKnownLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      updatedAt: { type: Date }
    },
    deliverymanLocationHistory: [{
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      speed: { type: Number },
      heading: { type: Number },
      timestamp: { type: Date },
      _id: false // Importante para evitar criação automática de _id
    }],
    arrivedAtDestination: { type: Date },
    arrivalLatitude: { type: Number },
    arrivalLongitude: { type: Number },
    paymentMethod: { type: String, require: true },
    paymentProof: { type: String },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
      phoneNumer: Number,
    },
    itemsPrice: { type: Number, require: false },
    itemsPriceForSeller: { type: Number, require: false },
    deliveryPrice: { type: Number, require: false },
    addressPrice: { type: Number, require: false },
    totalPrice: { type: Number, require: false },
    ivaTax: { type: Number, require: false },
    siteTax: { type: Number, require: false },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isCanceled: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isAvailableToDeliver: { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    isInTransit: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    status: { type: String },
    stepStatus: { type: Number },
    deleted: { type: Boolean, default: false },
    canceledReason: { type: String },
    isDeletedBySeller: { type: Boolean, default: false },
    isDeletedByDeliverman: { type: Boolean, default: false },
    isDeletedByAdmin: { type: Boolean, default: false },
    isDeletedByRequester: { type: Boolean, default: false },
    isSupplierPaid: { type: Boolean, default: false },
    isDeliverPaid: { type: Boolean, default: false },
    isCommissionProcessed: { type: Boolean, default: false },
    isUserWantDelivery: { type: Boolean, default: false },
    isExternalDelivery: { type: Boolean, default: false },

    // 🔥 CAMPOS PARA PEDIDOS DIGITAIS
    isDigitalOrder: { type: Boolean, default: false },
    digitalRecipientEmail: { type: String, default: '' },
    digitalRecipientPhone: { type: String, default: '' },
    digitalDeliveredItems: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String },
        key: { type: String },
        digitalInstructions: { type: String },
        deliveredAt: { type: Date, default: Date.now }
      }
    ],

    // Intelligent Dispatch Fields
    isSearching: { type: Boolean, default: false },
    searchRadius: { type: Number, default: 3000 },
    contactedDrivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastDispatchTime: { type: Date },
    priorityLevel: { type: String, enum: ['normal', 'alta'], default: 'normal' },

    // Transporte & Dispatch Inteligente
    transportType: { type: String },
    transportTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' },
    requestServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestService' }, // Referência à viagem do motorista

    // Trajeto do pedido (origem = loja, destino = cliente)
    origin: { type: String },
    destination: { type: String },
    originDetails: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    destinationDetails: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },

    // Fotos do veículo
    vehiclePhotos: {
      front: { type: String },
      rear: { type: String },
      leftSide: { type: String },
      rightSide: { type: String }
    },

    // Negociação de Valor
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
  },
  {
    timestamps: true,
  }
);

orderSchema.post('save', async function(doc) {
  const isCanceled = ['Cancelado', 'Rejeitado'].includes(doc.status) || doc.isCanceled === true;
  const isCompleted = ['Entregue', 'Finalizado'].includes(doc.status) || doc.isDelivered;

  if (isCanceled && doc.isCommissionProcessed) {
    try {
      const { reverseSellerOrderFinancials } = await import('../services/walletService.js');
      reverseSellerOrderFinancials(doc._id).catch(err => {
        console.error('[Mongoose Hook] Erro ao estornar financeiro do fornecedor:', err.message);
      });
    } catch (err) {
      console.error('[Mongoose Hook] Erro ao carregar walletService para estorno:', err.message);
    }
  } else if (isCompleted && !doc.isCommissionProcessed) {
    try {
      const { processSellerOrderFinancials } = await import('../services/walletService.js');
      processSellerOrderFinancials(doc._id).catch(err => {
        console.error('[Mongoose Hook] Erro ao processar financeiro do fornecedor:', err.message);
      });
    } catch (err) {
      console.error('[Mongoose Hook] Erro ao carregar walletService:', err.message);
    }
  }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
