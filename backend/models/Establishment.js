import mongoose from 'mongoose';

const EstablishmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['pharmacy', 'supermarket'], required: true },
  active: { type: Boolean, default: true },
  // Optional fields for future use (address, contact, etc.)
});

export default mongoose.model('Establishment', EstablishmentSchema);
