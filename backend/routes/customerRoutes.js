import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';

const router = express.Router();

// Get all customers (users who aren't admins, sellers, or deliverymen)
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const customers = await User.find({ 
      isAdmin: false, 
      isSeller: false, 
      isDeliveryMan: false 
    });
    // Return array directly to avoid frontend .map issues
    res.send(customers);
  })
);

export default router;
