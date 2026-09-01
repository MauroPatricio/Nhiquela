import api from '../hooks/createConnectionApi';

export const sendOrderNotificationToUser = async ({
  userId,
  orderId,
  orderCode,
  title,
  body,
  status,
}) => {
  if (!userId || !orderId || !title || !body) {
    console.warn('Dados insuficientes para enviar notificação');
    return;
  }

  try {
    await api.post('/notifications/send-to-user', {
      userId,
      title,
      body,
      data: {
        orderId,
        type: 'order',
        status,
      },
    });

    console.log(`✅ Notificação enviada: ${title}`);
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error?.message);
  }
};
