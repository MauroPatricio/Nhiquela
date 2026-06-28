// shopperRoutes.js – management and order endpoints for personal shoppers
import express from 'express';
import User from '../models/UserModel.js';
import DocumentOrder from '../models/DocumentOrder.js';
import authMiddleware from '../middleware/authMiddleware.js'; // assume exists for JWT auth

const router = express.Router();

// Middleware to ensure the user is a shopper
const ensureShopper = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isShopper) return res.status(403).json({ message: 'Not a shopper' });
    req.shopper = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get all orders assigned to this shopper
router.get('/:id/orders', authMiddleware, ensureShopper, async (req, res) => {
  try {
    const orders = await DocumentOrder.find({ operator: req.params.id })
      .populate('establishment')
      .populate('user');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Update shopper availability status
router.post('/:id/status', authMiddleware, ensureShopper, async (req, res) => {
  const { availability } = req.body; // expected: active, paused, inactive
  if (!['active', 'paused', 'inactive'].includes(availability)) {
    return res.status(400).json({ message: 'Invalid availability value' });
  }
  try {
    req.shopper.availability = availability;
    await req.shopper.save();
    res.json({ availability: req.shopper.availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
