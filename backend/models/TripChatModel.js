import mongoose from 'mongoose';

const tripChatSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestService', required: true, unique: true },
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      senderType: { type: String, enum: ['client', 'driver', 'admin'], required: true },
      message: { type: String, required: false, default: '' },
      fileUrl: { type: String, required: false },
      fileType: { type: String, enum: ['image', 'document', 'audio'], required: false },
      status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const TripChat = mongoose.model('TripChat', tripChatSchema);
export default TripChat;
