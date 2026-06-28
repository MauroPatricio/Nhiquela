import mongoose from 'mongoose';

const supportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // opcional

    category: {
      type: String,
      enum: ['payment', 'delivery', 'product', 'account', 'other'],
      default: 'other',
    },

    subject: { type: String, required: true },
    message: { type: String, required: true },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Suporte/Admin
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    resolutionNotes: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

const Support = mongoose.model('Support', supportSchema);
export default Support;
