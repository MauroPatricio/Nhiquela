import mongoose from 'mongoose';

const paymentAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },        // Ex: "M-Pesa", "Millennium BIM", "BCI"
    type: { 
      type: String, 
      enum: ['MPESA', 'EMOLA', 'MKESH', 'BANK', 'OTHER'], 
      required: true 
    },
    accountNumber: { type: String, required: true }, // número da conta ou telemóvel
    accountName: { type: String },                   // nome do titular
    bankName: { type: String },                      // nome do banco (só para tipo BANK)
    iban: { type: String },                          // IBAN (opcional)
    isActive: { type: Boolean, default: true },
    notes: { type: String },                         // instruções adicionais
    icon: { type: String },                          // emoji ou nome do ícone
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const PaymentAccount = mongoose.model('PaymentAccount', paymentAccountSchema);
export default PaymentAccount;
