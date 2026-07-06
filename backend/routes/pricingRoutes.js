import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import PricingService from '../services/PricingService.js';
import { isAuth } from '../utils.js';

import PricingEngine from '../models/PricingEngineModel.js';

const pricingRouter = express.Router();

// ADMIN: GET GLOBAL CONFIG
pricingRouter.get(
  '/config',
  expressAsyncHandler(async (req, res) => {
    let engineConfig = await PricingEngine.findOne();
    if (!engineConfig) {
      engineConfig = new PricingEngine();
      await engineConfig.save();
    }
    res.send(engineConfig);
  })
);

// ADMIN: UPDATE GLOBAL CONFIG
pricingRouter.put(
  '/config',
  expressAsyncHandler(async (req, res) => {
    let engineConfig = await PricingEngine.findOne();
    if (!engineConfig) {
      engineConfig = new PricingEngine();
    }
    
    // Update fields from body
    if (req.body.weatherMultipliers) engineConfig.weatherMultipliers = req.body.weatherMultipliers;
    if (req.body.trafficMultipliers) engineConfig.trafficMultipliers = req.body.trafficMultipliers;
    if (req.body.demandMultipliers) engineConfig.demandMultipliers = req.body.demandMultipliers;
    if (req.body.timeMultipliers) engineConfig.timeMultipliers = req.body.timeMultipliers;
    if (req.body.dayMultipliers) engineConfig.dayMultipliers = req.body.dayMultipliers;
    if (req.body.ratingMultipliers) engineConfig.ratingMultipliers = req.body.ratingMultipliers;
    if (req.body.minFareDelivery !== undefined) engineConfig.minFareDelivery = req.body.minFareDelivery;
    if (req.body.minFareService !== undefined) engineConfig.minFareService = req.body.minFareService;
    if (req.body.financialEngine) engineConfig.financialEngine = req.body.financialEngine;

    await engineConfig.save();
    res.send({ message: 'Pricing Engine atualizado com sucesso!', config: engineConfig });
  })
);

pricingRouter.post(
  '/calculate',
  expressAsyncHandler(async (req, res) => {
    const { serviceId, originLoc, destLoc, weightKg, vehicleTypeId, hasHelper, isRaining, trafficCondition, demandLevel, providerId } = req.body;
    
    if (!serviceId) {
      return res.status(400).send({ message: 'serviceId é obrigatório' });
    }

    const result = await PricingService.calculatePrice({
      serviceId,
      originLoc,
      destLoc,
      weightKg,
      vehicleTypeId,
      hasHelper,
      isRaining,
      trafficCondition,
      demandLevel,
      providerId
    });

    res.send(result);
  })
);

export default pricingRouter;
