import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' },
    basePrice: { type: Number, required: true },
    status: { type: String, required: true, default: 'Ativo' },
    icon: { type: String },
    color: { type: String },
    description: { type: String },
    order: { type: Number, default: 0 },
    image: { type: String },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', serviceSchema);
export default Service;
