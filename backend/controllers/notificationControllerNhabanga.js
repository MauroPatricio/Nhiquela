import User from '../models/UserModel.js'; // Modelo de usuário onde está salvo o pushToken
import { Expo } from 'expo-server-sdk';
import NotificationNhabanga from '../models/NotificationModelNhabanga.js'; // Corrigido o nome para consistência

const expo = new Expo();

// export const createNotification = async (req, res) => {
//   try {
//     const { message, receiver_id, sender_id, orderID } = req.body;

//     if (!message || !receiver_id || !sender_id || !orderID) {
//       return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
//     }

//     const newNotification = new NotificationNhabanga({
//       message,
//       receiver_id,
//       sender_id,
//       send_status: false, 
//       orderID
//     });
//     await newNotification.save();

//     const receiver = await User.findById(receiver_id);
//     if (!receiver || !receiver.pushToken) {
//       return res.status(503).json({ error: 'Push token do receptor não encontrado' });
//     }

//     const sentSuccessfully = await sendPushNotification(receiver.pushToken, message, orderID);
    
//     if (sentSuccessfully) {
//       newNotification.send_status = true;
//       await newNotification.save();
//     }

//     return res.status(201).json({ message: 'Notificação criada e enviada com sucesso', notification: newNotification });
//   } catch (error) {
//     console.error('Erro ao criar notificação:', error);
//     return res.status(500).json({ error: 'Erro ao criar notificação', details: error.message });
//   }
// };

export const createNotification = async ({ message, receiver_id, sender_id, orderID, pushToken }) => {


  try {
    if (!message || !receiver_id || !sender_id || !pushToken) {
      throw new Error('Todos os campos são obrigatórios');
    }

    const newNotification = new NotificationNhabanga({
      message,
      receiver_id,
      sender_id,
      send_status: false,
      orderID,
      pushToken
    });
    await newNotification.save();

    
    if (!pushToken) {
      throw new Error('Push token do receptor não encontrado');
    }

    const sentSuccessfully = await sendPushNotification(pushToken, message, orderID);

    if (sentSuccessfully) {
      console.log("Receptor recebeu mensagem")
      newNotification.send_status = true;
      await newNotification.save();
    }else{
      console.log("Ocorreu um erro e receptor nao recebeu mensagem!")
    }

    console.log('Notificação criada e enviada com sucesso:', newNotification);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw new Error('Erro ao criar notificação');
  }
};

async function sendPushNotification(pushToken, message, messageID) {

  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('Push token inválido:', pushToken);
    return false; 
  }

  const notifications = [{
    to: pushToken,
    sound: 'default',
    title: 'Solicitação efectuada',
    body: message,
    data: { extraData: messageID },
  }];

  try {
    console.log('seller Pushtoken: ', pushToken)
    if(pushToken.length == 0){
      console.error('Push token inválido ou nulo');
    }else{
      const ticketChunk = await expo.sendPushNotificationsAsync(notifications);
      console.log('Notificação enviada com sucesso:', ticketChunk);
      return true;
    }
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return false;
  }
}
