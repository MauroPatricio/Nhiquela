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

const parseSafeNumber = (val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val).replace(/[^\d.]/g, ''));
  return isNaN(parsed) ? undefined : parsed;
};

vehicleTypeRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newType = new VehicleType({
      name: req.body.name,
      icon: req.body.icon,
      category: req.body.category,
      capacityKg: parseSafeNumber(req.body.capacityKg),
      basePrice: parseSafeNumber(req.body.basePrice),
      pricePerKm: parseSafeNumber(req.body.pricePerKm),
      minVisibilityFee: parseSafeNumber(req.body.minVisibilityFee) || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    });
    const createdType = await newType.save();
    
    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated');
    }
    
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
      
      const capacity = parseSafeNumber(req.body.capacityKg);
      const basePrice = parseSafeNumber(req.body.basePrice);
      const pricePerKm = parseSafeNumber(req.body.pricePerKm);
      const minVisibilityFee = parseSafeNumber(req.body.minVisibilityFee);

      type.capacityKg = capacity !== undefined ? capacity : type.capacityKg;
      type.basePrice = basePrice !== undefined ? basePrice : type.basePrice;
      type.pricePerKm = pricePerKm !== undefined ? pricePerKm : type.pricePerKm;
      type.minVisibilityFee = minVisibilityFee !== undefined ? minVisibilityFee : type.minVisibilityFee;
      type.isActive = req.body.isActive !== undefined ? req.body.isActive : type.isActive;
      
      const updatedType = await type.save();
      
      const io = req.app.get('io');
      if (io) {
        io.emit('catalogUpdated');
      }

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
      
      const io = req.app.get('io');
      if (io) {
        io.emit('catalogUpdated');
      }

      res.send({ message: 'Tipo de veículo apagado' });
    } else {
      res.status(404).send({ message: 'Tipo não encontrado' });
    }
  })
);

export default vehicleTypeRouter;
