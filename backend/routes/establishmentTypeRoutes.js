import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import EstablishmentType from '../models/EstablishmentType.js';
import { isAuth, isSellerOrAdmin } from '../utils.js';

const router = express.Router();

// GET all
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const establishmentTypes = await EstablishmentType.find({}).lean();
    res.send({ tipoestabelecimentos: establishmentTypes });
  })
);

// GET by ID
router.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const establishmentType = await EstablishmentType.findById(req.params.id);
    if (establishmentType) {
      res.send(establishmentType);
    } else {
      res.status(404).send({ message: 'Tipo n�o encontrado' });
    }
  })
);

// POST new
router.post(
  '/',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { name, description, icon, averagePreparationTime, autoAssignDriver, paymentMethods } = req.body;
    const newType = new EstablishmentType({ name, description, icon, averagePreparationTime, autoAssignDriver, paymentMethods });
    await newType.save();
    res.status(201).json(newType);
  })
);

// PUT update
router.put(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const type = await EstablishmentType.findById(req.params.id);
    if (type) {
      if (req.body.name !== undefined) type.name = req.body.name;
      if (req.body.description !== undefined) type.description = req.body.description;
      if (req.body.icon !== undefined) type.icon = req.body.icon;
      if (req.body.averagePreparationTime !== undefined) type.averagePreparationTime = req.body.averagePreparationTime;
      if (req.body.autoAssignDriver !== undefined) type.autoAssignDriver = req.body.autoAssignDriver;
      if (req.body.paymentMethods !== undefined) type.paymentMethods = req.body.paymentMethods;
      
      await type.save();
      res.send({ message: 'Tipo atualizado com sucesso', type });
    } else {
      res.status(404).send({ message: 'Tipo n�o encontrado' });
    }
  })
);

// DELETE
router.delete(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const type = await EstablishmentType.findById(req.params.id);
    if (type) {
      await type.deleteOne();
      res.send({ message: 'Tipo removido' });
    } else {
      res.status(404).send({ message: 'Tipo n�o encontrado' });
    }
  })
);

export default router;
