import mongoose from 'mongoose';

const orderChatSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      senderType: { type: String, enum: ['client', 'seller', 'admin'], required: true },
      message: { type: String, required: false, default: '' },
      fileUrl: { type: String, required: false },
      fileType: { type: String, enum: ['image', 'document', 'audio'], required: false },
      status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const OrderChat = mongoose.model('OrderChat', orderChatSchema);
export default OrderChat;
