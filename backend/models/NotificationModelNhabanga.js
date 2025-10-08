import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  receiver_id: {
    type: String,
    required: true,
  },
  sender_id: {
    type: String,
    required: true,
  },
  send_status: {
    type: Boolean,
    default: false,
  },
  orderID: {
    type: String,
    required: true,
  },
  pushToken: {
    type: String,
    required: true
  }
});

const NotificationNhabanga = mongoose.model('NotificationNhabanga', notificationSchema);

export default NotificationNhabanga;