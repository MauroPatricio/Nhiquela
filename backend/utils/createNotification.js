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
    let finalPushToken = pushToken;
    
    // Auto-lookup token if not provided
    if (!finalPushToken && receiver_id) {
      const NotificationToken = (await import('../models/NotificationToken.js')).default;
      // Busca o último token registado (mais recente) para este utilizador
      const tokenRecord = await NotificationToken.findOne({ user: receiver_id }).sort({ createdAt: -1 });
      if (tokenRecord && tokenRecord.deviceToken) {
        finalPushToken = tokenRecord.deviceToken;
      }
    }

    // Se continuar sem token, definir como 'none' para evitar erro de validação (tokenID is required)
    if (!finalPushToken) {
      finalPushToken = 'none';
    }

    // Create notification in database
    const NotificationModel = (await import('../models/NotificationModel.js')).default;
    const notification = new NotificationModel({
      user: receiver_id,
      tokenID: finalPushToken,
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
    if (finalPushToken && finalPushToken !== 'null' && finalPushToken !== 'none') {
      const { sendNotification } = await import('./sendNotification.js');
      await sendNotification(finalPushToken, title, message, {
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
