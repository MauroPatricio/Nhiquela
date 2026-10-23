import mongoose from 'mongoose';

const importSimulationLeadSchema = new mongoose.Schema(
  {
    simulationCode: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    productDescription: {
      type: String,
      trim: true,
      default: ''
    },
    productLink: {
      type: String,
      trim: true,
      default: ''
    },
    quantity: {
      type: Number,
      default: 1
    },
    currency: {
      type: String,
      default: 'USD'
    },
    unitPrice: {
      type: Number,
      default: 0
    },
    freightOption: {
      type: String,
      enum: ['HAS_QUOTE', 'HAS_ESTIMATE', 'NEED_NHIQUELA'],
      default: 'NEED_NHIQUELA'
    },
    freightKnownValue: {
      type: Number,
      default: 0
    },
    insuranceOption: {
      type: String,
      enum: ['HAS_QUOTE', 'NEED_NHIQUELA'],
      default: 'NEED_NHIQUELA'
    },
    destinationCity: {
      type: String,
      default: 'Maputo'
    },
    originCountry: {
      type: String,
      default: 'China'
    },
    transportType: {
      type: String,
      enum: ['SEA', 'AIR', 'ROAD'],
      default: 'SEA'
    },
    estimatedValueUsd: {
      type: Number,
      default: 0
    },
    importerType: {
      type: String,
      enum: ['company', 'individual'],
      default: 'company'
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    contactName: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    estimatedRange: {
      minMzn: { type: Number, default: 0 },
      maxMzn: { type: Number, default: 0 },
      exchangeRate: { type: Number, default: 75.0 }
    },
    status: {
      type: String,
      enum: ['INICIADA', 'SIMULACAO_REALIZADA', 'CONTACTO_REGISTADO', 'COTACAO_SOLICITADA', 'CONVERTIDA', 'ARQUIVADA'],
      default: 'INICIADA',
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportRequest',
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const ImportSimulationLead = mongoose.model('ImportSimulationLead', importSimulationLeadSchema);

export default ImportSimulationLead;
