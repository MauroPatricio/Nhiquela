import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';

const router = express.Router();

// Get all drivers (delivery men)
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const drivers = await User.find({ isDeliveryMan: true });
    // Return array directly to avoid frontend .map issues
    res.send(drivers);
  })
);

export default router;
