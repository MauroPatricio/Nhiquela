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
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'O valor da transação deve ser maior que zero']
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
