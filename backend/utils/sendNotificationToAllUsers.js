import axios from 'axios';

const sendNotificationToAllUsers
 = async ({ title, body, product }) => {
  try {
    await axios.post(`${process.env.BASE_URL}/api/notifications/broadcast`, {
      title,
      body,
      data: product,
      options: {
        badge: 1,
        sticky: false,
        autoDismiss: true,
        sound: 'default',
        channelId: 'product',
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

export default sendNotificationToAllUsers
;
