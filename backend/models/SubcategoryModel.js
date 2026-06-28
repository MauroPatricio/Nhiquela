import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },

    description: { type: String },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },

    image: { type: String }, // opcional (ícone ou foto ilustrativa)
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Subcategory = mongoose.model('Subcategory', subcategorySchema);
export default Subcategory;
