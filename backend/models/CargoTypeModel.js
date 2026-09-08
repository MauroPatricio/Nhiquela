import mongoose from 'mongoose';

const cargoTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    icon: {
      type: String,
      default: '📦'
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Ativo', 'Inativo'],
      default: 'Ativo'
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const CargoType = mongoose.model('CargoType', cargoTypeSchema);
export default CargoType;
