import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { isAuth } from '../utils.js';
import Tracking from '../models/TrackingModel.js';
import Order from '../models/OrderModel.js';
import { calculateETA } from './osrmRoutes.js';

const router = express.Router();

// Driver starts a new tracking session
router.post('/start', isAuth, expressAsyncHandler(async (req, res) => {
  const { orderId, latitude, longitude } = req.body;
  const driverId = req.user._id;
  await Tracking.create({ orderId, driverId, latitude, longitude });
  res.send({ message: 'Tracking started' });
}));

// Driver updates position
router.post('/update', isAuth, expressAsyncHandler(async (req, res) => {
  const { orderId, latitude, longitude } = req.body;
  const driverId = req.user._id;
  await Tracking.findOneAndUpdate(
    { orderId, driverId },
    { latitude, longitude, timestamp: Date.now() },
    { upsert: true }
  );
  const io = req.app.get('io');
  io.to(`order_${orderId}`).emit('driverLocation', { lat: latitude, lng: longitude });
  
  // Calculate and emit ETA
  try {
    const order = await Order.findById(orderId);
    if (order && order.deliveryAddress) {
      const origin = `${longitude},${latitude}`;
      const destination = `${order.deliveryAddress.longitude},${order.deliveryAddress.latitude}`;
      const eta = await calculateETA(origin, destination);
      if (eta) {
        io.to(`order_${orderId}`).emit('etaUpdate', { eta });
      }
    }
  } catch (error) {
    console.error('ETA Calculation Error:', error.message);
  }

  res.send({ message: 'Location updated' });
}));

// Consumer asks for ETA
router.get('/eta', isAuth, expressAsyncHandler(async (req, res) => {
  const { orderId } = req.query;
  const tracking = await Tracking.findOne({ orderId }).sort({ timestamp: -1 });
  const order = await Order.findById(orderId);
  if (!tracking || !order) return res.status(404).send({ message: 'Tracking not found' });
  const origin = `${tracking.longitude},${tracking.latitude}`;
  const destination = `${order.deliveryLocation.lng},${order.deliveryLocation.lat}`;
  const eta = await calculateETA(origin, destination);
  res.send({ eta });
}));

export default router;
