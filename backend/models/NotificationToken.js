import mongoose from 'mongoose';

const notificationTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // pode ser opcional se você quiser permitir tokens anônimos
    },
    deviceToken: {
      type: String,
      required: true,
        sparse: true

      // unique: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android',
    },
  },
  {
    timestamps: true,
  }
);

const NotificationToken = mongoose.model('NotificationToken', notificationTokenSchema);

export default NotificationToken;
