import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { isAuth } from '../utils.js';
import Tracking from '../models/TrackingModel.js';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import { calculateETA } from './osrmRoutes.js';

const router = express.Router();

// Driver starts a new tracking session
router.post('/start', isAuth, expressAsyncHandler(async (req, res) => {
  const { orderId, latitude, longitude } = req.body;
  const driverId = req.user._id;
  await Tracking.create({ orderId, driverId, latitude, longitude });
  res.send({ message: 'Tracking started' });
}));

const updateTrackingHandler = expressAsyncHandler(async (req, res) => {
  const { orderId, latitude, longitude, speed, heading } = req.body;
  const driverId = req.user._id;
  await Tracking.findOneAndUpdate(
    { orderId, driverId },
    { latitude, longitude, speed: Number(speed) || 0, heading: Number(heading) || 0, timestamp: Date.now() },
    { upsert: true }
  );

  await User.updateOne(
    { _id: driverId },
    {
      $set: {
        locationGeo: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)]
        },
        latitude: String(latitude),
        longitude: String(longitude),
        speed: Number(speed) || 0,
        heading: Number(heading) || 0,
        lastPingAt: new Date()
      }
    }
  );

  const io = req.app.get('io');
  io.to(`order_${orderId}`).emit('driverLocation', { 
    lat: latitude, 
    lng: longitude, 
    speed: Number(speed) || 0, 
    heading: Number(heading) || 0 
  });
  
  // Calculate and emit ETA
  try {
    const order = await Order.findById(orderId) || await RequestService.findById(orderId);
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
});

// Driver updates position (Supports both POST and PUT methods)
router.post('/update', isAuth, updateTrackingHandler);
router.put('/update', isAuth, updateTrackingHandler);

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

// Consumer asks for driver's current position for a given order (with fallback)
router.get('/:orderId', isAuth, expressAsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  // 1. Try to find the latest update in Tracking collection
  const tracking = await Tracking.findOne({ orderId }).sort({ timestamp: -1 });
  if (tracking) {
    return res.send({
      latitude: tracking.latitude,
      longitude: tracking.longitude,
      speed: tracking.speed || 0,
      heading: tracking.heading || 0,
      timestamp: tracking.timestamp
    });
  }

  // 2. Fallback: retrieve the order and check the driver's current profile position
  const order = await RequestService.findById(orderId);
  if (order && (order.targetDriverId || order.deliveryman?.id)) {
    const driverId = order.targetDriverId || order.deliveryman.id;
    const driver = await User.findById(driverId);
    if (driver && driver.latitude && driver.longitude) {
      return res.send({
        latitude: Number(driver.latitude),
        longitude: Number(driver.longitude),
        speed: Number(driver.speed) || 0,
        heading: Number(driver.heading) || 0,
        timestamp: driver.lastPingAt || new Date()
      });
    }
  }

  res.status(404).send({ message: 'Localização do motorista não encontrada' });
}));

export default router;
