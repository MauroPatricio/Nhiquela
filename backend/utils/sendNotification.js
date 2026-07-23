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
        channelId: 'driver_alerts',
        sound: 'calldriver',
        priority: 'max',
        defaultVibrateTimings: true,
      }
    },
    data: stringifiedData,
    token: deviceToken,
  };

  try {
    console.log(`[FCM-SEND-START] 🚀 A tentar comunicar com os servidores da Google Firebase...`);
    const response = await admin.messaging().send(message);
    console.log(`[FCM-SEND-SUCCESS] ✅ Notificação enviada com sucesso para a Google! Resposta:`, response);
    return { success: true, tickets: [response] };
  } catch (error) {
    console.error(`[FCM-SEND-ERROR] ❌ O Firebase REJEITOU a notificação. Motivo:`, error.message);
    if (error.code) {
       console.error(`[FCM-SEND-ERROR] ❌ Código de Erro Firebase:`, error.code);
    }
    return { success: false, error: error.message };
  }
}

export default sendNotification;