import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    code: {type: String},
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
    sellers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming there's a Seller model in your database
        // required: true
      }
    ],
    orderItems: [
      {
        slug: {type: String},
        quantity: { type: String},
        seller: {type: String},
        image: {type: String},
        images: [String],
        brand: {type: String},
        category: {type: String},
        province: {type: String},
        description: {type: String},
        price: {type: Number},
        priceWithComission: {type: Number},
        countInStock: {type: Number,  
          default: 0, // Valor padrão caso nenhum seja enviado
          min: [0, 'countInStock deve ser um valor positivo']},
        rating: {type: Number},
        numReviews: {type: Number},
        onSale: { type: Boolean },
        onSalePercentage: {type: Number},
        isActive:  { type: Boolean},
        discount: {type: Number},
        color:  {type: String}, // vermelho, preto, castanho, azul
        size:  {type: String}, // S, M, L, XL, XXL or 20,21,22,23,24, [...] 40,41,42,43
        qualityType: {type: String}, // Original, primeira linha,Replica
        conditionStatus: {type: String}, // Novo, usado
        isGuaranteed:  { type: Boolean, default: false },
        guaranteedPeriod:  { type: String },
        isOrdered: { type: Boolean, default: false },
        orderPeriod: { type: String },
        priceComission: {type: Number},
        comissionPercentage: {type: Number},
        priceFromSeller: {type: Number},
        nome: {type: String},
        name: {type: String},
        phoneNumber: {type: String},
        goodType: {type: String},
        transportType: {type: String},
        deliverCity: {type: String},
        origin: {type: String},
        destination: {type: String},
    
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
      id:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
      photo: { type: String },
      name: { type: String},
      phoneNumber: {type: Number},
      transport_type: {type: String},
      transport_color: {type: String},
      transport_registration: {type: String},
      pricetopay: { type: Number },
    },
    paymentMethod: { type: String, require: true },
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
    ivaTax:{ type: Number, require: false },
    siteTax: { type: Number, require: false },
    seller: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isCanceled:{ type: Boolean, default: false },
    isAccepted:{ type: Boolean, default: false },
    isAvailableToDeliver:{ type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    isInTransit: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    status:{type: String},
    stepStatus:{type: Number},
    deleted: { type: Boolean, default: false },
    canceledReason: { type: String},
    isDeletedBySeller: { type: Boolean, default: false },
    isDeletedByDeliverman: { type: Boolean, default: false },
    isDeletedByAdmin: { type: Boolean, default: false },
    isDeletedByRequester: { type: Boolean, default: false },
    isSupplierPaid: { type: Boolean, default: false },
    isDeliverPaid: { type: Boolean, default: false },
    isUserWantDelivery: { type: Boolean, default: false },

    // customerId: {type: String, required: true}
//
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
