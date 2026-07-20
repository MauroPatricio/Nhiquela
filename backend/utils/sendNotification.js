import admin from '../firebase.js';

export async function sendNotification(deviceToken, title, body, data = {}) {
  if (!deviceToken || deviceToken === 'null') {
    return { success: false, error: 'Token invalido' };
  }

  const stringifiedData = {};
  for (const key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      stringifiedData[key] = String(data[key]);
    }
  }

  const message = {
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
        priority: 'max',
        defaultVibrateTimings: true,
      }
    },
    data: stringifiedData,
    token: deviceToken,
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, tickets: [response] };
  } catch (error) {
    console.error('Erro ao enviar pelo Firebase:', error);
    return { success: false, error: error.message };
  }
}

export default sendNotification;