import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  tokenID: {
    type: String,
    required: true,
  },
  notifications: {
    type: [Object],
  },
  data: {
    type: Object,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);