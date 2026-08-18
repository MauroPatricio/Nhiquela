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

    res.status(201).json(chat.messages[chat.messages.length - 1]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao enviar mensagem.', error: error.message });
  }
};
