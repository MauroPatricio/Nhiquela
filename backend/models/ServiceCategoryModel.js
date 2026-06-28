import mongoose from 'mongoose';

const serviceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String }, // React Native vector icon name or Cloudinary image
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  }
);

const ServiceCategory = mongoose.model('ServiceCategory', serviceCategorySchema);
export default ServiceCategory;
