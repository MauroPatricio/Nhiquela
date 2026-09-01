import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true // facilita buscar transações por carteira
    },
    type: {
      type: String,
      enum: ['credit', 'debit'], // garante tipos válidos
      required: true
    },
    transaction_type: {
      type: String,
      enum: ['TOPUP', 'WITHDRAWAL', 'COMMISSION', 'REFUND', 'REVERSAL', 'ADJUSTMENT', 'PAYMENT'],
      required: false
    },
    balance_before: {
      type: Number,
      required: false
    },
    balance_after: {
      type: Number,
      required: false
    },
    reference_type: {
      type: String,
      required: false
    },
    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'O valor da transação não pode ser negativo']
    },
    method: {
      type: String,
      trim: true // ex: 'wallet', 'mpesa', 'visa'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255
    },
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'falhado'],
      default: 'confirmado',
      index: true // facilita relatórios ou auditorias
    },
    receiptImage: {
      type: String
    }
  },
  {
    timestamps: true // adiciona createdAt e updatedAt automaticamente
  }
);

// índices adicionais para relatórios/consultas rápidas
transactionSchema.index({ walletId: 1, createdAt: -1 }); 
transactionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
