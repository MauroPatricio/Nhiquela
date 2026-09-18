import mongoose from 'mongoose';

const fleetVehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    type: { type: String, default: 'Ligeiro' }, // e.g., 'Ligeiro', 'Pesado', 'Motociclo', 'Van'
    vehicleTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' }, // Referência opcional ao catálogo
    capacityKg: { type: Number, default: 0 },
    fuelType: { type: String, enum: ['Gasolina', 'Gasóleo', 'Elétrico', 'Híbrido'], default: 'Gasóleo' },
    fuelTankCapacityLiters: { type: Number, default: 60 },
    targetConsumptionL100km: { type: Number, default: 10.0 }, // Consumo padrão configurado
    currentOdometer: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Operacional', 'Em Manutenção', 'Inativo'],
      default: 'Operacional',
    },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Empresa parceira proprietária
    notes: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

fleetVehicleSchema.index({ partner: 1, plateNumber: 1 });
fleetVehicleSchema.index({ assignedDriver: 1 });

const FleetVehicle = mongoose.model('FleetVehicle', fleetVehicleSchema);
export default FleetVehicle;
