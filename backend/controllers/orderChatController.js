import OrderChat from '../models/OrderChatModel.js';
import Order from '../models/OrderModel.js';

export const getOrderChat = async (req, res) => {
  try {
    const { orderId } = req.params;
    let chat = await OrderChat.findOne({ orderId }).populate('messages.senderId', 'name profileImage');
    
    if (!chat) {
      chat = await OrderChat.create({ orderId, messages: [] });
    }
    
    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar o chat da encomenda.', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { senderType, message, fileUrl, fileType } = req.body;
    const senderId = req.user._id;

    let chat = await OrderChat.findOne({ orderId });
    if (!chat) {
      chat = new OrderChat({ orderId, messages: [] });
    }

    const newMessage = {
      senderId,
      senderType, // 'client', 'seller', 'admin'
      message,
      fileUrl,
      fileType,
      status: 'sent'
    };

    chat.messages.push(newMessage);
    await chat.save();

    // Populate the newly added message's senderId
    await chat.populate('messages.senderId', 'name profileImage');

    const savedMessage = chat.messages[chat.messages.length - 1];

    // Emit real-time Socket.IO event to the room
    const io = req.app.get('io');
    if (io) {
      io.to(`order_chat_${orderId}`).emit('newOrderMessage', savedMessage);
    }

    // Send push notification asynchronously (so it doesn't block the API response)
    const sendPushNotification = async () => {
      try {
        const User = (await import('../models/UserModel.js')).default;
        const Order = (await import('../models/OrderModel.js')).default;
        const Provider = (await import('../models/ProviderModel.js')).default;
        const { sendNotification } = await import('../utils/sendNotification.js');

        const order = await Order.findById(orderId);
        if (order) {
          let recipientUser = null;
          const senderName = req.user.name || 'Alguém';

          if (senderType === 'client') {
            // Client sent it -> notify Seller (Provider)
            const provider = await Provider.findById(order.seller).populate('userId');
            if (provider && provider.userId) {
              recipientUser = provider.userId;
            }
          } else {
            // Seller/Admin sent it -> notify Client (User)
            recipientUser = await User.findById(order.user);
          }

          if (recipientUser && recipientUser.deviceToken) {
            await sendNotification(
              recipientUser.deviceToken,
              `Nova Mensagem de ${senderName} 💬`,
              message || 'Enviou um anexo.'
            );
          }
        }
      } catch (err) {
        console.error('Erro ao enviar push de mensagem do chat:', err);
      }
    };
    sendPushNotification(); // Call async function

    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao enviar mensagem.', error: error.message });
  }
};
