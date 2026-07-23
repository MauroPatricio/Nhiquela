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
    const customers = await User.aggregate([
      {
        $match: {
          isAdmin: { $ne: true },
          isSeller: { $ne: true },
          isDeliveryMan: { $ne: true },
          isDeleted: { $ne: true }
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'regularOrders'
        }
      },
      {
        $lookup: {
          from: 'servicerequests',
          localField: '_id',
          foreignField: 'user',
          as: 'serviceOrders'
        }
      },
      {
        $addFields: {
          totalOrders: { $add: [{ $size: '$regularOrders' }, { $size: '$serviceOrders' }] }
        }
      },
      {
        $project: {
          regularOrders: 0,
          serviceOrders: 0
        }
      }
    ]);
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
      customer.isDeleted = true;
      customer.isBanned = true;
      customer.isApproved = false;
      
      // Release credentials for future registration
      const ts = Date.now();
      customer.email = `deleted_${ts}_${customer.email}`;
      if (customer.phoneNumber) {
        // phoneNumber in UserModel is Number, so we use Date.now() 
        // to free up the original number and prevent unique constraint errors
        customer.phoneNumber = ts;
      }
      await customer.save();
      res.send({ message: 'Cliente removido com sucesso' });
    } else {
      res.status(404).send({ message: 'Cliente não encontrado' });
    }
  })
);

export default router;
