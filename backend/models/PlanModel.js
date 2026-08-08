import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    maxProducts: { type: Number, default: 0 }, // 0 = Ilimitado
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: ['gratuito', 'profissional', 'premium'], default: 'gratuito' }
  },
  {
    timestamps: true,
  }
);

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
