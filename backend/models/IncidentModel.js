import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['Pendente', 'Em Análise', 'Resolvido', 'Fechado'], default: 'Pendente' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    resolutionNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

const Incident = mongoose.model('Incident', incidentSchema);
export default Incident;
