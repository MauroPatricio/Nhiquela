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
    if (!req.user.isAdmin && trip.userId?.toString() !== req.user._id.toString() && trip.driverId?.toString() !== req.user._id.toString()) {
       return res.status(403).send({ message: 'Acesso negado ao chat desta viagem' });
    }

    let chat = await TripChat.findOne({ tripId }).populate('messages.senderId', 'name');
    
    if (!chat) {
      chat = new TripChat({ tripId, messages: [] });
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
    const { message } = req.body;
    
    if (!message) {
       return res.status(400).send({ message: 'A mensagem não pode estar vazia' });
    }

    const trip = await RequestService.findById(tripId);
    if (!trip) {
      return res.status(404).send({ message: 'Viagem não encontrada' });
    }
    
    // Verify authorization
    let senderType = 'admin';
    if (!req.user.isAdmin) {
       if (trip.userId?.toString() === req.user._id.toString()) {
         senderType = 'client';
       } else if (trip.driverId?.toString() === req.user._id.toString()) {
         senderType = 'driver';
       } else {
         return res.status(403).send({ message: 'Acesso negado' });
       }
    }

    let chat = await TripChat.findOne({ tripId });
    if (!chat) {
      chat = new TripChat({ tripId, messages: [] });
    }
    
    const newMessage = {
      senderId: req.user._id,
      senderType,
      message,
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
