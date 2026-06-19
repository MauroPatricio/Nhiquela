import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, min: 0, max: 5, required: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    image: { type: String },
    images: [String],
    brand: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },
    province: { type: mongoose.Schema.Types.ObjectId, ref: "Province" },
    description: { type: String, required: true },
    countInStock: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    onSale: { type: Boolean, default: false },
    onSalePercentage: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    sellerEarningsAfterDiscount: { type: Number, default: 0 },
    priceFromSeller: { type: Number, required: true },
    comissionPercentage: { type: Number, required: true },
    priceComission: { type: Number, required: true },
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isGuaranteed: { type: Boolean, default: false },
    guaranteedPeriod: { type: String },
    isOrdered: { type: Boolean, default: false },
    orderPeriod: { type: String },
    color: [{ type: mongoose.Schema.Types.ObjectId, ref: "Color" }],
    size: [{ type: mongoose.Schema.Types.ObjectId, ref: "Size" }],
    qualityType: { type: mongoose.Schema.Types.ObjectId, ref: "QualityType" },
    conditionStatus: { type: mongoose.Schema.Types.ObjectId, ref: "ConditionStatus" },
    reviews: [reviewSchema],
    isSellerOpen: { type: Boolean, default: false },
    sellerPriceWithDeliver: { type: Number },
    promotion: { type: mongoose.Schema.Types.ObjectId, ref: "Promotion" },
    variants: [
  {
    color: { type: mongoose.Schema.Types.ObjectId, ref: "Color" },
    size: { type: mongoose.Schema.Types.ObjectId, ref: "Size" },
    stock: { type: Number, default: 0 },
    price: { type: Number },
  }
],

  },
  {
    timestamps: true,
  }
);

// ------------------------- ÍNDICES -------------------------
// Essenciais para filtragem e paginação rápida
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ province: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ onSale: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
