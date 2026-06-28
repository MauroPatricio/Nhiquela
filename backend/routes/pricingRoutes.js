import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import PricingService from '../services/PricingService.js';
import { isAuth } from '../utils.js';

const pricingRouter = express.Router();

pricingRouter.post(
  '/calculate',
  expressAsyncHandler(async (req, res) => {
    const { serviceId, originLoc, destLoc, weightKg, vehicleTypeId, hasHelper, isRaining } = req.body;
    
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
      isRaining
    });

    res.send(result);
  })
);

export default pricingRouter;
