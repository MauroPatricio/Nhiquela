import mongoose from "mongoose";

const importProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    originCountry: { type: String, required: true },
    sourceUrl: { type: String },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "InternationalSupplier" },
    supplierProductCode: { type: String },
    unitPrice: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    minimumOrderQuantity: { type: Number, default: 1 },
    estimatedWeight: { type: Number },
    estimatedVolume: { type: Number },
    image: { type: String },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const ImportProduct = mongoose.model("ImportProduct", importProductSchema);

export default ImportProduct;
