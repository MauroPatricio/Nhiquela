import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // Ex: CUPOM10
    description: { type: String },

    discountType: {
      type: String,
      enum: ['percentage', 'fixed'], // Tipo de desconto
      required: true,
    },
    discountValue: { type: Number, required: true }, // Ex: 10% ou 100 MZN

    minPurchase: { type: Number, default: 0 }, // Valor mínimo para aplicar
    maxDiscount: { type: Number }, // Ex: máximo de 500 MZN de desconto

    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    usageLimit: { type: Number, default: 0 }, // Quantas vezes pode ser usado
    usedCount: { type: Number, default: 0 }, // Quantas vezes já foi usado

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Promotion = mongoose.model('Promotion', promotionSchema);
export default Promotion;
