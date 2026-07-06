import express from 'express';
import { getRoute } from '../services/routingService.js';

const router = express.Router();

// GET /api/routing/route?originLat=x&originLng=y&destLat=x&destLng=y
router.get('/route', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ message: 'Parâmetros de origem e destino são obrigatórios' });
    }

    const routeData = await getRoute(
      parseFloat(originLat),
      parseFloat(originLng),
      parseFloat(destLat),
      parseFloat(destLng)
    );

    res.json(routeData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
