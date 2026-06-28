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
    if (!service) return res.status(404).send({ message: 'Serviço não encontrado' });

    let estimatedPrice = service.basePrice || 0;

    // Calculate price dynamically if it's distance based
    if (service.pricingModel === 'distance' && origin && destination) {
      const eta = await calculateETA(`${origin.lng},${origin.lat}`, `${destination.lng},${destination.lat}`);
      
      // Basic distance pricing logic (should ideally pull from settings, using hardcoded maputo logic for now)
      const distanceKm = parseFloat(eta.distanceKm);
      const pricePerKm = 15;
      
      if (distanceKm <= 3) estimatedPrice += 80;
      else if (distanceKm <= 7) estimatedPrice += 120;
      else if (distanceKm <= 12) estimatedPrice += 180;
      else if (distanceKm <= 20) estimatedPrice += 250;
      else estimatedPrice += 250 + ((distanceKm - 20) * pricePerKm);
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
