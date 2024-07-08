import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    icon: { type: String, require: true },
    name: { type: String, require: true },
    nome: { type: String, require: true },
    shortName: { type: String},
    description: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
    img:  { type: String}
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
