import mongoose from 'mongoose';

const conditionSchema = new mongoose.Schema(
  {
    nome: { type: String, require: true },
    name: { type: String, require: true },
    description: { type: String, require: true },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const ConditionStatus = mongoose.model('ConditionStatus', conditionSchema);

export default ConditionStatus;
