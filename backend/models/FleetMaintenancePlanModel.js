import mongoose from 'mongoose';

const fleetMaintenancePlanSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetVehicle', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceType: {
      type: String,
      set: (v) => (typeof v === 'string' ? v.toLowerCase().replace('inspecao', 'inspeccao') : v),
      enum: [
        'troca_oleo', 'filtros', 'pneus', 'travoes', 'bateria', 'revisao', 'inspeccao', 'inspecao', 'seguro', 'outros',
        'TROCA_OLEO', 'FILTROS', 'PNEUS', 'TRAVOES', 'BATERIA', 'REVISAO', 'INSPECCAO', 'INSPECAO', 'SEGURO', 'OUTROS',
      ],
      required: true,
    },
    customTitle: { type: String, default: '' },
    intervalKm: { type: Number, default: 10000 },
    intervalDays: { type: Number, default: 180 },
    lastMaintenanceKm: { type: Number, default: 0 },
    lastMaintenanceDate: { type: Date, default: Date.now },
    nextMaintenanceKm: { type: Number, default: 10000 },
    nextMaintenanceDate: { type: Date },
    advanceNoticeKm: { type: Number, default: 500 },
    advanceNoticeDays: { type: Number, default: 7 },
    status: {
      type: String,
      enum: ['EM_DIA', 'PROXIMA', 'VENCIDA', 'EM_EXECUCAO'],
      default: 'EM_DIA',
    },
    costMzn: { type: Number, default: 0 },
    serviceProvider: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

fleetMaintenancePlanSchema.index({ vehicle: 1, partner: 1 });
fleetMaintenancePlanSchema.index({ status: 1 });

const FleetMaintenancePlan = mongoose.model('FleetMaintenancePlan', fleetMaintenancePlanSchema);
export default FleetMaintenancePlan;
