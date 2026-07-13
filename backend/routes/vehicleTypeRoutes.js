import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import VehicleType from '../models/VehicleTypeModel.js';
import { isAuth, isAdmin } from '../utils.js';

const vehicleTypeRouter = express.Router();

vehicleTypeRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const types = await VehicleType.find();
    res.send(types);
  })
);

vehicleTypeRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newType = new VehicleType({
      name: req.body.name,
      icon: req.body.icon,
      category: req.body.category,
      capacityKg: req.body.capacityKg,
      basePrice: req.body.basePrice,
      pricePerKm: req.body.pricePerKm,
      minVisibilityFee: req.body.minVisibilityFee || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    });
    const createdType = await newType.save();
    res.status(201).send({ message: 'Tipo de Veículo criado', vehicleType: createdType });
  })
);

vehicleTypeRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const type = await VehicleType.findById(req.params.id);
    if (type) {
      type.name = req.body.name || type.name;
      type.icon = req.body.icon || type.icon;
      type.category = req.body.category || type.category;
      type.capacityKg = req.body.capacityKg !== undefined ? req.body.capacityKg : type.capacityKg;
      type.basePrice = req.body.basePrice !== undefined ? req.body.basePrice : type.basePrice;
      type.pricePerKm = req.body.pricePerKm !== undefined ? req.body.pricePerKm : type.pricePerKm;
      type.minVisibilityFee = req.body.minVisibilityFee !== undefined ? req.body.minVisibilityFee : type.minVisibilityFee;
      type.isActive = req.body.isActive !== undefined ? req.body.isActive : type.isActive;
      
      const updatedType = await type.save();
      res.send({ message: 'Tipo de Veículo atualizado', vehicleType: updatedType });
    } else {
      res.status(404).send({ message: 'Tipo não encontrado' });
    }
  })
);

vehicleTypeRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const type = await VehicleType.findById(req.params.id);
    if (type) {
      await type.deleteOne();
      res.send({ message: 'Tipo de veículo apagado' });
    } else {
      res.status(404).send({ message: 'Tipo não encontrado' });
    }
  })
);

export default vehicleTypeRouter;
