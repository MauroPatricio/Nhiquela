import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import axios from 'axios';
import Settings from '../models/SettingsModel.js';

const osrmRouter = express.Router();

/**
 * Helper to calculate ETA using OSRM or fallback Haversine.
 */
export const calculateETA = async (origin, destination) => {
  try {
    const osrmBaseUrl = process.env.OSRM_URL || 'http://localhost:5000';
    const osrmUrl = `${osrmBaseUrl}/route/v1/driving/${origin};${destination}?overview=false`;
    const response = await axios.get(osrmUrl);
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distanceKm: (route.distance / 1000).toFixed(2),
        durationMin: (route.duration / 60).toFixed(0),
      };
    }
  } catch (error) {
    console.error('OSRM error, falling back to Haversine:', error.message);
  }
  // Fallback Haversine implementation
  const [olng, olat] = origin.split(',').map(Number);
  const [dlng, dlat] = destination.split(',').map(Number);
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(dlat - olat);
  const dLng = toRad(dlng - olng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(olat)) * Math.cos(toRad(dlat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  const avgSpeed = 40; // km/h assumed
  return {
    distanceKm: distance.toFixed(2),
    durationMin: Math.round((distance / avgSpeed) * 60).toString(),
  };
};

/**
 * @desc    Obter distância, tempo estimado de chegada (ETA) e PREÇO através do OSRM
 * @route   GET /api/osrm/route?origin=lng,lat&destination=lng,lat
 * @access  Public
 */
osrmRouter.get(
  '/route',
  expressAsyncHandler(async (req, res) => {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).send({ message: 'Origem e destino são obrigatórios' });
    }

    let distanceKm;
    let durationMin;
    let isFallback = false;

    try {
      // Faz o proxy para o servidor OSRM local rodando via Docker (porta 5000)
      const osrmBaseUrl = process.env.OSRM_URL || 'http://localhost:5000';
      const osrmUrl = `${osrmBaseUrl}/route/v1/driving/${origin};${destination}?overview=false`;
      const response = await axios.get(osrmUrl);

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        distanceKm = parseFloat((route.distance / 1000).toFixed(2));
        durationMin = parseFloat((route.duration / 60).toFixed(0));
      } else {
        throw new Error('Rota não encontrada pelo OSRM');
      }
    } catch (error) {
      console.error('Erro ao acessar OSRM local:', error.message);
      // Fallback em caso do container OSRM estar em baixo (Calculo Matemático Simples Haversine)
      const fallback = await calculateETA(origin, destination);
      distanceKm = parseFloat(fallback.distanceKm);
      durationMin = parseFloat(fallback.durationMin);
      isFallback = true;
    }

    // Buscar configurações de Preços do Administrador
    const settingsRecords = await Settings.find({
      key: { $in: ['delivery_pricing_model', 'delivery_base_fee', 'delivery_price_per_km', 'delivery_service_fee'] }
    });

    // Defaults recomendados para Nhiquela (Maputo)
    const config = {
      model: 'steps', // steps | formula
      baseFee: 50,
      pricePerKm: 15,
      serviceFee: 20
    };

    settingsRecords.forEach(setting => {
      if (setting.key === 'delivery_pricing_model') config.model = setting.value;
      if (setting.key === 'delivery_base_fee') config.baseFee = Number(setting.value);
      if (setting.key === 'delivery_price_per_km') config.pricePerKm = Number(setting.value);
      if (setting.key === 'delivery_service_fee') config.serviceFee = Number(setting.value);
    });

    // Calcular o preço
    let price = 0;

    if (config.model === 'formula') {
      // Fórmula Simples: Taxa Base + (Km × Valor/Km) + Taxa Serviço
      price = config.baseFee + (distanceKm * config.pricePerKm) + config.serviceFee;
    } else {
      // Estratégia Maputo (Escalões baseados nos KM)
      if (distanceKm <= 3) {
        price = 80;
      } else if (distanceKm > 3 && distanceKm <= 7) {
        price = 120;
      } else if (distanceKm > 7 && distanceKm <= 12) {
        price = 180;
      } else if (distanceKm > 12 && distanceKm <= 20) {
        price = 250;
      } else {
        price = 250 + ((distanceKm - 20) * config.pricePerKm);
      }
      // Se tiver Taxa de Serviço, podemos somar adicionalmente
      // Mas o modelo steps do utilizador não fala em somar a taxa de serviço na tarifa "step", 
      // embora no modelo mais rentável sim. Por omissão, no step model as tranches absorvem o serviço.
    }

    // Arredondar preço (opcional) para ficar bonito
    price = Math.ceil(price);

    res.send({
      distanceKm: distanceKm.toFixed(2),
      durationMin: durationMin.toFixed(0),
      price: price,
      pricingModelUsed: config.model,
      isFallback
    });
  })
);

export default osrmRouter;
