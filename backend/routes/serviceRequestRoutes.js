import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import ServiceRequest from '../models/ServiceRequestModel.js';
import Service from '../models/ServiceModel.js';
import { isAuth } from '../utils.js';
import { calculateETA } from './osrmRoutes.js';

const requestRouter = express.Router();

requestRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { serviceId, origin, destination, vehicleTypeId, details, recipientName, recipientPhone } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).send({ message: 'Servi�o n�o encontrado' });

    let estimatedPrice = service.basePrice || 0;

    // Calculate price dynamically if it's distance based
    if (service.pricingModel === 'distance' && origin && destination) {
      const eta = await calculateETA(`${origin.lng},${origin.lat}`, `${destination.lng},${destination.lat}`);
      const distanceKm = parseFloat(eta.distanceKm);
      
      // Pull dynamic settings
      const Settings = (await import('../models/SettingsModel.js')).default;
      const settingsRecords = await Settings.find({
        key: { $in: [
          'delivery_pricing_model', 'delivery_base_fee', 'delivery_price_per_km', 'delivery_service_fee',
          'delivery_step_1_km', 'delivery_step_1_price',
          'delivery_step_2_km', 'delivery_step_2_price',
          'delivery_step_3_km', 'delivery_step_3_price',
          'delivery_step_4_km', 'delivery_step_4_price'
        ]}
      });
      
      let pricePerKm = 15;
      let model = 'steps';
      let s1k = 3, s1p = 80;
      let s2k = 7, s2p = 120;
      let s3k = 12, s3p = 180;
      let s4k = 20, s4p = 250;
      let serviceFee = 20;

      settingsRecords.forEach(setting => {
        if (setting.key === 'delivery_pricing_model') model = setting.value;
        if (setting.key === 'delivery_price_per_km') pricePerKm = Number(setting.value);
        if (setting.key === 'delivery_service_fee') serviceFee = Number(setting.value);
        if (setting.key === 'delivery_step_1_km') s1k = Number(setting.value);
        if (setting.key === 'delivery_step_1_price') s1p = Number(setting.value);
        if (setting.key === 'delivery_step_2_km') s2k = Number(setting.value);
        if (setting.key === 'delivery_step_2_price') s2p = Number(setting.value);
        if (setting.key === 'delivery_step_3_km') s3k = Number(setting.value);
        if (setting.key === 'delivery_step_3_price') s3p = Number(setting.value);
        if (setting.key === 'delivery_step_4_km') s4k = Number(setting.value);
        if (setting.key === 'delivery_step_4_price') s4p = Number(setting.value);
      });

      if (model === 'steps') {
        if (distanceKm <= s1k) estimatedPrice += s1p;
        else if (distanceKm <= s2k) estimatedPrice += s2p;
        else if (distanceKm <= s3k) estimatedPrice += s3p;
        else if (distanceKm <= s4k) estimatedPrice += s4p;
        else estimatedPrice += s4p + ((distanceKm - s4k) * pricePerKm);
      } else {
        // Formula
        estimatedPrice += (distanceKm * pricePerKm) + serviceFee;
      }
    }

    const newRequest = new ServiceRequest({
      clientId: req.user._id,
      serviceId,
      origin,
      destination,
      vehicleTypeId,
      estimatedPrice,
      details,
      recipientName,
      recipientPhone
    });

    const saved = await newRequest.save();
    res.status(201).send({ message: 'Pedido criado com sucesso', request: saved });
  })
);

// Get my requests (Client)
requestRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const requests = await ServiceRequest.find({ clientId: req.user._id })
      .populate('serviceId', 'name icon')
      .populate('providerId', 'name phoneNumber')
      .sort({ createdAt: -1 });
    res.send(requests);
  })
);

// Get available requests (Provider/Driver)
requestRouter.get(
  '/available',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // A provider can only see requests for services they provide
    const userServices = req.user.deliveryman?.providedServices || [];
    const activeServiceIds = userServices.filter(s => s.isAvailable).map(s => s.serviceId);

    const requests = await ServiceRequest.find({ 
      status: 'pending',
      serviceId: { $in: activeServiceIds }
    })
      .populate('serviceId', 'name icon pricingModel')
      .populate('clientId', 'name')
      .sort({ createdAt: -1 });
      
    res.send(requests);
  })
);

export default requestRouter;
