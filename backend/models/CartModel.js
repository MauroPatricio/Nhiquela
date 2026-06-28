import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    userId: { type: String, require: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
    products: [{
      cartItem: {
        type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          require: true,
      },
      quantity: {
        type: Number,
        default: 1
      }
    }],
    description: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
    img:  { type: String}
  },
  {
    timestamps: true,
  }
);

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
