import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';

import { isAuth, isAdmin } from '../utils.js';

const router = express.Router();

// Get all customers (users who aren't admins, sellers, or deliverymen)
router.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const customers = await User.find({ 
      isAdmin: { $ne: true }, 
      isSeller: { $ne: true }, 
      isDeliveryMan: { $ne: true } 
    });
    // Return array directly to avoid frontend .map issues
    res.send(customers);
  })
);

// Delete customer
router.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const customer = await User.findById(req.params.id);
    if (customer) {
      await customer.deleteOne();
      res.send({ message: 'Cliente removido com sucesso' });
    } else {
      res.status(404).send({ message: 'Cliente não encontrado' });
    }
  })
);

export default router;
