import NotificationModel from '../models/NotificationModel.js';
import sendNotification from './sendNotification.js';

/**
 * Creates a notification in the database and sends a push notification
 * @param {Object} params - Notification parameters
 * @param {string} params.message - Notification message/body
 * @param {string} params.receiver_id - User ID receiving the notification
 * @param {string} params.sender_id - User ID sending the notification
 * @param {string} params.orderID - Order ID related to the notification
 * @param {string} params.pushToken - Push notification token
 * @param {string} [params.title] - Optional notification title
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification({
  message,
  receiver_id,
  sender_id,
  orderID,
  pushToken,
  title = 'Nhiquela',
}) {
  try {
    // Create notification in database
    const notification = new NotificationModel({
      user: receiver_id,
      tokenID: pushToken,
      title: title,
      body: message,
      data: {
        orderId: orderID,
        senderId: sender_id,
      },
      isRead: false,
    });

    await notification.save();

    // Send push notification if token is valid
    if (pushToken && pushToken !== 'null' && pushToken !== null) {
      await sendNotification(pushToken, title, message, {
        orderId: orderID,
        senderId: sender_id,
      });
    }

    return notification;
  } catch (error) {
    console.error('Erro ao criar notificação:', error.message);
    // Don't throw error to prevent order processing from failing
    return null;
  }
}

export default createNotification;
