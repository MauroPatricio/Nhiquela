const mongoose = require('mongoose');

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
});

const NotificationNhabanga = mongoose.model('NotificationNhabanga', notificationSchema);

module.exports = NotificationNhabanga;
