import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Envia notificação para um único token Expo
 */
export async function sendNotification(deviceToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(deviceToken)) {
    return { success: false, error: 'Token inválido do Expo' };
  }

  const messages = [
    {
      to: deviceToken,
      sound: 'default',
      title,
      body,
      data,
    },
  ];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    return { success: true, tickets };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default sendNotification ;
