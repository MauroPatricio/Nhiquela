const axios = require('axios');

const sendNotificationToSeller = async ({ userId, title, body, data }) => {
  try {
    await axios.post(`${process.env.BASE_URL}/notifications/send-to-user`, {
      userId,
      title,
      body,
      data,
      options: {
        badge: 1,
        sticky: false,
        autoDismiss: true,
        sound: 'default',
        channelId: 'order-updates',
        remoteMessage: {
          from: 'fcm.googleapis.com',
          priority: 'high',
        },
      },
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error?.message || error);
  }
};

export default sendNotificationToSeller;
