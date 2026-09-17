import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import axios from 'axios';
import Settings from '../models/SettingsModel.js';
import PricingEngine from '../models/PricingEngineModel.js';

const osrmRouter = express.Router();

/**
 * Helper to calculate dynamic traffic multiplier based on time, day, and weather
 */
export const getTrafficMultiplier = (isRaining = false) => {
  const now = new Date();
  const hour = now.getHours() + (now.getMinutes() / 60);
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  let multiplier = 1.0;
  let status = 'Trânsito Fluido 🟢';
  let badgeColor = '#10B981';

  const isWeekend = day === 0 || day === 6;

  if (!isWeekend) {
    if ((hour >= 7.0 && hour <= 9.25) || (hour >= 16.5 && hour <= 19.25)) {
      multiplier = 1.38;
      status = 'Trânsito Intenso 🔴';
      badgeColor = '#EF4444';
    } else if ((hour >= 11.5 && hour <= 14.0) || (hour >= 16.0 && hour <= 16.5)) {
      multiplier = 1.18;
      status = 'Trânsito Moderado 🟡';
      badgeColor = '#F59E0B';
    }
  } else if (day === 6 && hour >= 10.0 && hour <= 14.0) {
    multiplier = 1.15;
    status = 'Trânsito Moderado 🟡';
    badgeColor = '#F59E0B';
  }

  if (isRaining) {
    multiplier *= 1.25;
    status = 'Chuva & Trânsito Intenso 🌧️';
    badgeColor = '#3B82F6';
  }

  return { multiplier, status, badgeColor };
};

/**
 * Helper to calculate ETA using OSRM or fallback Haversine with dynamic traffic multiplier.
 */
export const calculateETA = async (origin, destination, isRaining = false) => {
  const traffic = getTrafficMultiplier(isRaining);
  let distanceKm = 0;
  let rawDurationMin = 0;

  try {
    const osrmBaseUrl = process.env.OSRM_BASE_URL || process.env.OSRM_URL || 'http://localhost:5000';
    const osrmUrl = `${osrmBaseUrl}/route/v1/driving/${origin};${destination}?overview=false`;
    const response = await axios.get(osrmUrl);
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      distanceKm = parseFloat((route.distance / 1000).toFixed(2));
      rawDurationMin = parseFloat((route.duration / 60).toFixed(0));
    }
  } catch (error) {
    console.error('OSRM error, falling back to Haversine:', error.message);
    const [olng, olat] = origin.split(',').map(Number);
    const [dlng, dlat] = destination.split(',').map(Number);
    const toRad = v => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(dlat - olat);
    const dLng = toRad(dlng - olng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(olat)) * Math.cos(toRad(dlat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    const avgSpeed = 35; // km/h assumed
    distanceKm = parseFloat(distance.toFixed(2));
    rawDurationMin = Math.round((distance / avgSpeed) * 60);
  }

  const durationMin = Math.max(1, Math.round(rawDurationMin * traffic.multiplier));
  const arrivalDate = new Date(Date.now() + durationMin * 60 * 1000);
  const etaFormattedTime = arrivalDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return {
    distanceKm: distanceKm.toFixed(2),
    durationMin: durationMin.toString(),
    trafficStatus: traffic.status,
    trafficBadgeColor: traffic.badgeColor,
    etaFormattedTime,
    etaMessage: `Entrega prevista às ${etaFormattedTime} (~${durationMin} min)`
  };
};

/**
 * @desc    Obter dist�ncia, tempo estimado de chegada (ETA) e PRE�O atrav�s do OSRM
 * @route   GET /api/osrm/route?origin=lng,lat&destination=lng,lat
 * @access  Public
 */
osrmRouter.get(
  '/route',
  expressAsyncHandler(async (req, res) => {
    const { origin, destination } = req.query;
    const isRaining = req.query.isRaining === 'true'; // Permitir simular chuva via query params

    if (!origin || !destination) {
      return res.status(400).send({ message: 'Origem e destino s�o obrigat�rios' });
    }

    let distanceKm;
    let durationMin;
    let isFallback = false;

    try {
      // Faz o proxy para o servidor OSRM local rodando via Docker (porta 5000)
      const osrmBaseUrl = process.env.OSRM_BASE_URL || process.env.OSRM_URL || 'http://localhost:5000';
      const osrmUrl = `${osrmBaseUrl}/route/v1/driving/${origin};${destination}?overview=false`;
      const response = await axios.get(osrmUrl);

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        distanceKm = parseFloat((route.distance / 1000).toFixed(2));
        durationMin = parseFloat((route.duration / 60).toFixed(0));
      } else {
        throw new Error('Rota n�o encontrada pelo OSRM');
      }
    } catch (error) {
      console.error('Erro ao acessar OSRM local:', error.message);
      // Fallback em caso do container OSRM estar em baixo (Calculo Matem�tico Simples Haversine)
      // Fallback em caso do container OSRM estar em baixo (Calculo Matemtico Simples Haversine)
      const fallback = await calculateETA(origin, destination);
      distanceKm = parseFloat(fallback.distanceKm);
      durationMin = parseFloat(fallback.durationMin);
      isFallback = true;
    }

    // Buscar configuraes de Preos do Administrador
    const settingsRecords = await Settings.find({
      key: { $in: [
        'delivery_pricing_model', 'delivery_base_fee', 'delivery_price_per_km', 'delivery_service_fee',
        'delivery_step_1_km', 'delivery_step_1_price',
        'delivery_step_2_km', 'delivery_step_2_price',
        'delivery_step_3_km', 'delivery_step_3_price',
        'delivery_step_4_km', 'delivery_step_4_price'
      ]}
    });

    // Defaults recomendados para Nhiquela (Maputo)
    const config = {
      model: 'steps', // steps | formula
      baseFee: 50,
      pricePerKm: 15,
      serviceFee: 20,
      s1k: 3, s1p: 80,
      s2k: 7, s2p: 120,
      s3k: 12, s3p: 180,
      s4k: 20, s4p: 250
    };

    settingsRecords.forEach(setting => {
      if (setting.key === 'delivery_pricing_model') config.model = setting.value;
      if (setting.key === 'delivery_base_fee') config.baseFee = Number(setting.value);
      if (setting.key === 'delivery_price_per_km') config.pricePerKm = Number(setting.value);
      if (setting.key === 'delivery_service_fee') config.serviceFee = Number(setting.value);
      if (setting.key === 'delivery_step_1_km') config.s1k = Number(setting.value);
      if (setting.key === 'delivery_step_1_price') config.s1p = Number(setting.value);
      if (setting.key === 'delivery_step_2_km') config.s2k = Number(setting.value);
      if (setting.key === 'delivery_step_2_price') config.s2p = Number(setting.value);
      if (setting.key === 'delivery_step_3_km') config.s3k = Number(setting.value);
      if (setting.key === 'delivery_step_3_price') config.s3p = Number(setting.value);
      if (setting.key === 'delivery_step_4_km') config.s4k = Number(setting.value);
      if (setting.key === 'delivery_step_4_price') config.s4p = Number(setting.value);
    });

    // Calcular o preo
    let price = 0;

    if (config.model === 'formula') {
      // Frmula Simples: Taxa Base + (Km  Valor/Km) + Taxa Servio
      price = config.baseFee + (distanceKm * config.pricePerKm) + config.serviceFee;
    } else {
      // Estratgia Dinâmica (Escales baseados nos KM)
      if (distanceKm <= config.s1k) {
        price = config.s1p;
      } else if (distanceKm > config.s1k && distanceKm <= config.s2k) {
        price = config.s2p;
      } else if (distanceKm > config.s2k && distanceKm <= config.s3k) {
        price = config.s3p;
      } else if (distanceKm > config.s3k && distanceKm <= config.s4k) {
        price = config.s4p;
      } else {
        price = config.s4p + ((distanceKm - config.s4k) * config.pricePerKm);
      }
    }

    // Integração Surge Pricing (Multiplicadores Dinâmicos)
    let engineConfig = await PricingEngine.findOne();
    if (engineConfig) {
      // Tempo e Dia
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      let timeMult = engineConfig.timeMultipliers.day;
      if (hour >= 20 || hour < 2) timeMult = engineConfig.timeMultipliers.night;
      else if (hour >= 2 && hour < 6) timeMult = engineConfig.timeMultipliers.latenight;

      let dayMult = engineConfig.dayMultipliers.weekday;
      if (day === 6) dayMult = engineConfig.dayMultipliers.saturday;
      else if (day === 0) dayMult = engineConfig.dayMultipliers.sunday;

      // Clima
      let weatherMult = engineConfig.weatherMultipliers.clear;
      if (isRaining) {
        weatherMult = engineConfig.weatherMultipliers.storm; // Aplicamos storm como fallback forte
      }

      // Preço final inflacionado
      price = price * timeMult * dayMult * weatherMult;
    }

    // Arredondar preço (opcional) para ficar bonito
    price = Math.ceil(price);

    const trafficInfo = getTrafficMultiplier(isRaining);
    const adjustedDurationMin = Math.max(1, Math.round(durationMin * trafficInfo.multiplier));
    const arrivalDate = new Date(Date.now() + adjustedDurationMin * 60 * 1000);
    const etaFormattedTime = arrivalDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    res.send({
      distanceKm: distanceKm.toFixed(2),
      durationMin: adjustedDurationMin.toFixed(0),
      rawDurationMin: durationMin.toFixed(0),
      trafficStatus: trafficInfo.status,
      trafficBadgeColor: trafficInfo.badgeColor,
      trafficMultiplier: trafficInfo.multiplier,
      etaFormattedTime,
      etaMessage: `Entrega prevista às ${etaFormattedTime} (~${adjustedDurationMin} min)`,
      price: price,
      pricingModelUsed: config.model,
      isFallback
    });
  })
);

export default osrmRouter;
