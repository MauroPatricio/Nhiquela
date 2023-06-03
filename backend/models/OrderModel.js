import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderItems: [
      {
        slug: { type: String, require: true },
        name: { type: String, require: true },
        quantity: { type: String, require: true },
        image: { type: String, require: true },
        price: { type: String, require: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          require: true,
        },
      },
    ],
    deliveryAddress: {
      fullName: { type: String, require: true },
      city: { type: String, require: true },
      address: { type: String, require: true },
      referenceAddress: { type: String, require: true },
    },
    paymentMethod: { type: String, require: true },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
      phoneNumer: Number,
    },
    itemsPrice: { type: Number, require: true },
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
    seller: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    isCanceled:{ type: Boolean, default: false },
    isAccepted:{ type: Boolean, default: false },
    deliveredAt: { type: Date },
    status:{type: String},
    code: {type: String},
    deleted: { type: Boolean, default: false },
    canceledReason: { type: String}
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
