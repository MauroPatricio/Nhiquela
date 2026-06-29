import admin from '../firebase.js';

/**
 * Envia notificação nativa para um único token Firebase (FCM)
 */
export async function sendNotification(deviceToken, title, body, data = {}) {
  if (!deviceToken || deviceToken === 'null') {
    return { success: false, error: 'Token inválido' };
  }

  // O Firebase apenas aceita strings dentro do objeto "data"
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
