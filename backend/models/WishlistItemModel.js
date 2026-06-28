import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    slug: { type: String },
    image: { type: String },
    price: { type: Number },
    category: { type: String },
    subcategory: { type: String },
    conditionStatus: { type: String }, // Novo, Usado
    size: { type: String },
    color: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);


const Wishlist = mongoose.model("Wishlist", wishlistItemSchema);

export default Wishlist;