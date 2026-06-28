import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import PaymentMethod from '../models/PaymentMethod.js';
import { isAuth, isSellerOrAdmin } from '../utils.js';

const router = express.Router();

// GET all payment methods
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const paymentMethods = await PaymentMethod.find({}).sort({ order: 1 });
    res.json(paymentMethods);
  })
);

// GET single payment method
router.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const pm = await PaymentMethod.findById(req.params.id);
    if (pm) {
      res.json(pm);
    } else {
      res.status(404).json({ message: 'Método de pagamento não encontrado' });
    }
  })
);

// POST create new payment method
router.post(
  '/',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { name, description, icon, type, status, order } = req.body;
    const newPm = new PaymentMethod({
      name,
      description,
      icon,
      type,
      status,
      order,
    });
    const createdPm = await newPm.save();
    res.status(201).json(createdPm);
  })
);

// PUT update payment method
router.put(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const pm = await PaymentMethod.findById(req.params.id);
    if (pm) {
      pm.name = req.body.name || pm.name;
      pm.description = req.body.description !== undefined ? req.body.description : pm.description;
      pm.icon = req.body.icon !== undefined ? req.body.icon : pm.icon;
      pm.type = req.body.type || pm.type;
      pm.status = req.body.status || pm.status;
      pm.order = req.body.order !== undefined ? req.body.order : pm.order;

      const updatedPm = await pm.save();
      res.json(updatedPm);
    } else {
      res.status(404).json({ message: 'Método de pagamento não encontrado' });
    }
  })
);

// DELETE payment method
router.delete(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const pm = await PaymentMethod.findById(req.params.id);
    if (pm) {
      await pm.deleteOne();
      res.json({ message: 'Método de pagamento removido' });
    } else {
      res.status(404).json({ message: 'Método de pagamento não encontrado' });
    }
  })
);

export default router;
