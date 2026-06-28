import mongoose from 'mongoose';

const validationItemSchema = new mongoose.Schema({
  originalItemName: { type: String, required: true },
  productName: { type: String }, // Populated by operator
  productRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Optional link to actual product
  quantity: { type: Number, required: true },
  unitPrice: { type: Number },
  availability: { type: String, enum: ['available', 'unavailable', 'substituted'], default: 'available' },
  substituteProduct: { type: String },
  notes: { type: String },
  shopperFound: { type: Boolean, default: null } // Used by Shopper during execution
});

const DocumentOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // The specific establishment chosen, or null if "auto"
  preferredEstablishment: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  autoAssignEstablishment: { type: Boolean, default: false },
  
  serviceType: {
    type: String,
    enum: ['prescription', 'shopping_list', 'special_order'],
    required: true,
  },
  status: {
    type: String,
    enum: [
      'Pendente de Validação',
      'Em Validação',
      'Aguardando Aprovação do Cliente',
      'Aguardando Pagamento',
      'Pagamento Confirmado',
      'Em Compras',
      'Pronto para Entrega',
      'Em Entrega',
      'Concluído',
      'Cancelado'
    ],
    default: 'Pendente de Validação',
  },
  
  documentPath: { type: String, required: true }, // stored file path on server
  extractedData: { type: mongoose.Schema.Types.Mixed }, // placeholder for OCR results
  
  validationItems: [validationItemSchema],
  
  // The operator who validated the list in the admin panel
  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // The physical shopper executing the list
  shopperAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  processingFee: { type: Number, default: 0 },
  serviceFee: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  
  receiptUrl: { type: String }, // uploaded by shopper
  
  cancellationReason: { type: String },
  
}, {
  timestamps: true
});

const DocumentOrder = mongoose.model('DocumentOrder', DocumentOrderSchema);
export default DocumentOrder;
