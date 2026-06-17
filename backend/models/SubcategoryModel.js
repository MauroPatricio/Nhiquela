import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    status: { type: String, default: 'Ativo' },
  },
  {
    timestamps: true,
  }
);

const Subcategory = mongoose.model('Subcategory', subcategorySchema);
export default Subcategory;
