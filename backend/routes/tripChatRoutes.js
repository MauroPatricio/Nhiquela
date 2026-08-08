import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import TripChat from '../models/TripChatModel.js';
import RequestService from '../models/RequestServiceModel.js';
import { isAuth } from '../utils.js';

const tripChatRouter = express.Router();

/**
 * Get or Create Chat for a Trip
 */
tripChatRouter.get(
  '/:tripId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { tripId } = req.params;
    
    // Check if trip exists and user is related to it
    const trip = await RequestService.findById(tripId);
    if (!trip) {
      return res.status(404).send({ message: 'Viagem não encontrada' });
    }
    
    // Verify authorization: must be the client, driver or admin
    const isClient = trip.user?.toString() === req.user._id.toString();
    const isDriver = trip.targetDriverId === req.user._id.toString() || trip.deliveryman?.id?.toString() === req.user._id.toString();
    
    if (!req.user.isAdmin && !isClient && !isDriver) {
       return res.status(403).send({ message: 'Acesso negado ao chat desta viagem' });
    }

    const isSearching = !trip.deliveryman?.id || ['Aguardando confirmação', 'Procurando motorista'].includes(trip.status);
    if (isSearching) {
       return res.status(403).send({ message: 'O chat apenas está disponível quando a viagem for aceite pelo motorista.' });
    }

    let chat = await TripChat.findOne({ tripId }).populate('messages.senderId', 'name');
    
    const isFinished = ['Finalizada', 'Cancelada', 'Recusada', 'Expirada'].includes(trip.status) || trip.stepStatus >= 6;

    if (!chat) {
      chat = new TripChat({ tripId, messages: [], isActive: !isFinished });
      await chat.save();
    } else if (isFinished && chat.isActive) {
      chat.isActive = false;
      await chat.save();
    }
    
    res.send(chat);
  })
);

/**
 * Send a message to a Trip Chat
 */
tripChatRouter.post(
  '/:tripId/message',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { message, fileUrl, fileType } = req.body;
    
    if (!message && !fileUrl) {
       return res.status(400).send({ message: 'A mensagem ou anexo não pode estar vazio' });
    }

    const trip = await RequestService.findById(tripId);
    if (!trip) {
      return res.status(404).send({ message: 'Viagem não encontrada' });
    }
    
    // Verify authorization
    let senderType = 'admin';
    const isClient = trip.user?.toString() === req.user._id.toString();
    const isDriver = trip.targetDriverId === req.user._id.toString() || trip.deliveryman?.id?.toString() === req.user._id.toString();
    
    if (!req.user.isAdmin) {
       if (isClient) {
         senderType = 'client';
       } else if (isDriver) {
         senderType = 'driver';
       } else {
         return res.status(403).send({ message: 'Acesso negado' });
       }
    }

    let chat = await TripChat.findOne({ tripId });
    if (!chat) {
      chat = new TripChat({ tripId, messages: [] });
    }
    
    if (chat.isActive === false) {
       return res.status(403).send({ message: 'Este chat foi encerrado.' });
    }
    
    const newMessage = {
      senderId: req.user._id,
      senderType,
      message: message || '',
      fileUrl,
      fileType,
      createdAt: new Date()
    };
    
    chat.messages.push(newMessage);
    await chat.save();
    
    // Emit through Socket.IO if app instance is available in request
    if (req.app.get('io')) {
       req.app.get('io').to(`trip_${tripId}`).emit('receive_trip_message', newMessage);
    }
    
    res.status(201).send(chat);
  })
);

export default tripChatRouter;
