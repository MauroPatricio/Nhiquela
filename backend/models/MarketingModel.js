import mongoose from 'mongoose';

const marketingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['banner', 'destaque_semanal', 'destaque_mensal'], required: true },
    imageUrl: { type: String, required: true },
    link: { type: String },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Marketing = mongoose.model('Marketing', marketingSchema);
export default Marketing;
