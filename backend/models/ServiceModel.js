import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    description: { type: String },
    pricingModel: { type: String, enum: ['distance', 'fixed', 'hourly'], required: true, default: 'distance' },
    basePrice: { type: Number, default: 0 }, // fallback or fixed price
    active: { type: Boolean, default: true },
    icon: { type: String }, // icon name
    image: { type: String }, // image url
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', serviceSchema);
export default Service;
