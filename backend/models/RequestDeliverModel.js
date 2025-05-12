import mongoose from 'mongoose';

const requestDeliverSchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    phoneNumber: { type: String, require: true },
    goodType: { type: String, require: true },
    transportType: { type: String, require: true },
    deliverCity:{ type: String, require: true },
    origin: { type: String, require: true },
    destination: { type: String, require: true },
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
    deliveredAt: { type: Date },
    status:{type: String},
    stepStatus:{type: Number},
    code: {type: String},
    deleted: { type: Boolean, default: false },
    canceledReason: { type: String},
    isDeletedBySeller: { type: Boolean, default: false },
    isDeletedByDeliverman: { type: Boolean, default: false },
    isDeletedByAdmin: { type: Boolean, default: false },

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
  },
  {
    timestamps: true,
  }
);

const ResquestDeliver = mongoose.model('RequestDeliver', requestDeliverSchema);

export default ResquestDeliver;
