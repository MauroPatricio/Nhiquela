import mongoose from 'mongoose';

const requestDeliverSchema = new mongoose.Schema(
  {
    deliveryAddress: {
      fullName: { type: String, require: true },
      city: { type: String, require: true },
      address: { type: String, require: true },
      referenceAddress: { type: String, require: true },
      phoneNumber: { type: String },
      alternativePhoneNumber: { type: String }
    },
    deliveryman: {
      photo: { type: String },
      name: { type: String},
      phoneNumber: {type: Number},
      transport_type: {type: String},
      transport_color: {type: String},
      transport_registration: {type: String},
    },
    paymentMethod: { type: String, require: true },
    deliveryPrice: { type: Number, require: true },
    addressPrice: { type: Number, require: true },
    totalPrice: { type: Number, require: true },
    ivaTax:{ type: Number, require: true },
    siteTax: { type: Number, require: true },
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
  },
  {
    timestamps: true,
  }
);

const resquestDeliver = mongoose.model('RequestDeliver', requestDeliverSchema);

export default resquestDeliver;
