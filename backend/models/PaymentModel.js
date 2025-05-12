import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(

  {
    senderNumber: { type: String, require: true },
    amount: { type: String, require: true },
    code: { type: String, require: true },
    description: { type: String, require: true },
    transation: { type: String, require: true },
    conversationId: { type: String, require: true },
    reference: { type: String, require: true },
    paid: { type: Boolean, require: true },
    receiverNumber: { type: String, require: true },
    descriptionOfPayment: { type: String},

  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
