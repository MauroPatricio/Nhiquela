import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Support from '../models/SupportModel.js';
import { isAuth, isAdmin } from '../utils.js';

const supportRouter = express.Router();

// Get all support tickets (Admin)
supportRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const tickets = await Support.find().populate('user assignedTo');
    res.send(tickets);
  })
);

// Create a new support ticket
supportRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const ticket = new Support({
      user: req.user._id,
      subject: req.body.subject,
      message: req.body.message,
    });
    const createdTicket = await ticket.save();
    res.status(201).send({ message: 'Ticket criado com sucesso', ticket: createdTicket });
  })
);

// Get ticket by ID
supportRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const ticket = await Support.findById(req.params.id).populate('user assignedTo replies.user');
    if (ticket) {
      res.send(ticket);
    } else {
      res.status(404).send({ message: 'Ticket não encontrado' });
    }
  })
);

// Reply to a ticket
supportRouter.post(
  '/:id/reply',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const ticket = await Support.findById(req.params.id);
    if (ticket) {
      ticket.replies.push({
        user: req.user._id,
        message: req.body.message,
      });
      const updatedTicket = await ticket.save();
      res.send({ message: 'Resposta adicionada', ticket: updatedTicket });
    } else {
      res.status(404).send({ message: 'Ticket não encontrado' });
    }
  })
);

// Update ticket status
supportRouter.put(
  '/:id/status',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const ticket = await Support.findById(req.params.id);
    if (ticket) {
      ticket.status = req.body.status || ticket.status;
      const updatedTicket = await ticket.save();
      res.send({ message: 'Status atualizado', ticket: updatedTicket });
    } else {
      res.status(404).send({ message: 'Ticket não encontrado' });
    }
  })
);

// Delete ticket (soft delete)
supportRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const ticket = await Support.findById(req.params.id);
    if (ticket) {
      await ticket.deleteOne();
      res.send({ message: 'Ticket removido com sucesso' });
    } else {
      res.status(404).send({ message: 'Ticket não encontrado' });
    }
  })
);

export default supportRouter;
