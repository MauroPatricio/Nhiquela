import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';
import Order from '../models/OrderModel.js';
import { isAuth } from '../utils.js';

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

// Rota ultra-rápida (Ping) para os Motoristas atualizarem a sua localização (10 em 10 segs)
router.put(
  '/ping',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).send({ message: 'Coordenadas (lat, lng) são obrigatórias' });
    }

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          geoPosition: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)] // Padrão GeoJSON [longitude, latitude]
          },
          lastPingAt: new Date(),
        }
      }
    );

    res.send({ message: 'Ping recebido' });
  })
);

// Estatísticas do Motorista
router.get(
  '/stats/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Conta as viagens concluídas pelo motorista autenticado
    const totalTrips = await Order.countDocuments({
      'deliveryman.id': req.user._id,
      isDelivered: true
    });

    // Rating fixo para já (4.8), no futuro virá da média das avaliações das ordens
    res.send({
      totalTrips: totalTrips || 0,
      rating: 4.8
    });
  })
);

export default router;
