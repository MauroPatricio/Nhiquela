import admin from '../firebase.js';

export async function sendNotification(deviceToken, title, body, data = {}, type = 'default') {
  if (!deviceToken || deviceToken === 'null') {
    return { success: false, error: 'Token invalido' };
  }

  const stringifiedData = {};
  for (const key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      stringifiedData[key] = String(data[key]);
    }
  }

  let channelId = 'default';
  let sound = 'default';
  
  if (type === 'new_order') {
     channelId = 'driver_alerts_urgent';
     sound = 'calldriver';
  }

  if (type === 'new_order') {
     stringifiedData.categoryId = 'new_order';
  }

  if (deviceToken.startsWith('ExponentPushToken') || deviceToken.startsWith('ExpoPushToken')) {
     console.log(`[EXPO-PUSH-START] 🚀 A usar a Expo Push API para o token ${deviceToken}...`);
     try {
       const response = await fetch('https://exp.host/--/api/v2/push/send', {
         method: 'POST',
         headers: {
           'Accept': 'application/json',
           'Accept-encoding': 'gzip, deflate',
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           to: deviceToken,
           title: title,
           body: body,
           data: stringifiedData,
           sound: sound === 'default' ? 'default' : undefined,
           categoryId: stringifiedData.categoryId,
           channelId: channelId
         }),
       });
       
       const responseData = await response.json();
       console.log(`[EXPO-PUSH-SUCCESS] ✅ Notificação enviada via Expo!`);
       return { success: true, tickets: [responseData] };
     } catch (error) {
       console.error(`[EXPO-PUSH-ERROR] ❌ Erro ao enviar via Expo:`, error);
       return { success: false, error: error.message };
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
        channelId: channelId,
        sound: sound,
        priority: 'max',
        defaultVibrateTimings: true,
        visibility: 'public', // Ajuda a mostrar no lock screen
      }
    },
    data: stringifiedData,
    token: deviceToken,
  };

  try {
    console.log(`[FCM-SEND-START] 🚀 A tentar comunicar com os servidores da Google Firebase (FCM)...`);
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