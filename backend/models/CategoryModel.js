import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    icon: { type: String },
    name: { type: String, required: true },
    nome: { type: String, required: true },
    shortName: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    img: { type: String },
    image: { type: String }
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
