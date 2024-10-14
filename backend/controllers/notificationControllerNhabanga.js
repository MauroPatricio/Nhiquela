import User from '../models/UserModel'; // Modelo de usuário onde está salvo o pushToken
import { Expo } from 'expo-server-sdk';
import NotificationNhabanga from '../models/NotificationModelNhabanga'; // Corrigido o nome para consistência

const expo = new Expo();

export const createNotification = async (req, res) => {
  try {
    const { message, receiver_id, sender_id } = req.body;

    if (!message || !receiver_id || !sender_id) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const newNotification = new NotificationNhabanga({
      message,
      receiver_id,
      sender_id,
      send_status: false, 
    });
    await newNotification.save();

    const receiver = await User.findById(receiver_id);
    if (!receiver || !receiver.pushToken) {
      return res.status(400).json({ error: 'Push token do receptor não encontrado' });
    }

    const sentSuccessfully = await sendPushNotification(receiver.pushToken, message);
    
    if (sentSuccessfully) {
      newNotification.send_status = true;
      await newNotification.save();
    }

    return res.status(201).json({ message: 'Notificação criada e enviada com sucesso', notification: newNotification });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return res.status(500).json({ error: 'Erro ao criar notificação', details: error.message });
  }
};

async function sendPushNotification(pushToken, message) {

  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('Push token inválido:', pushToken);
    return false; 
  }

  const notifications = [{
    to: pushToken,
    sound: 'default',
    title: 'Solicitação efectuada',
    body: message,
    data: { extraData: 'qualquer dado adicional' },
  }];

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync(notifications);
    console.log('Notificação enviada com sucesso:', ticketChunk);
    return true;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return false;
  }
}
