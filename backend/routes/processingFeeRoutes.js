import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import ProcessingFee from '../models/ProcessingFee.js';
import { isAuth, isSellerOrAdmin, isAdmin } from '../utils.js';

const router = express.Router();

// GET all processing fees
router.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const fees = await ProcessingFee.find({}).populate('establishment');
    res.json(fees);
  })
);

// GET specific processing fee by serviceType
router.get(
  '/service/:serviceType',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Priority: try to find one specific to establishment if passed in query, else generic
    let filter = { serviceType: req.params.serviceType, isActive: true };
    if (req.query.establishment) {
      const specificFee = await ProcessingFee.findOne({ ...filter, establishment: req.query.establishment });
      if (specificFee) return res.json(specificFee);
    }
    
    const genericFee = await ProcessingFee.findOne({ ...filter, establishment: { $exists: false } });
    if (genericFee) {
      res.json(genericFee);
    } else {
      res.status(404).json({ message: 'Taxa de processamento não encontrada para este serviço' });
    }
  })
);

// POST create processing fee
router.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { serviceType, amount, percentage, exemptForPremium, establishment } = req.body;
    
    // Check if one already exists for this exact combo
    const query = { serviceType, establishment: establishment || null };
    const existing = await ProcessingFee.findOne(query);
    if (existing) {
      return res.status(400).json({ message: 'Já existe uma taxa configurada para este serviço e estabelecimento.' });
    }

    const fee = new ProcessingFee({
      serviceType,
      amount: Number(amount) || 0,
      percentage: Number(percentage) || 0,
      exemptForPremium: Boolean(exemptForPremium),
      establishment: establishment || undefined
    });

    const createdFee = await fee.save();
    res.status(201).json(createdFee);
  })
);

// PUT update processing fee
router.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const fee = await ProcessingFee.findById(req.params.id);
    if (fee) {
      fee.serviceType = req.body.serviceType || fee.serviceType;
      fee.amount = req.body.amount !== undefined ? Number(req.body.amount) : fee.amount;
      fee.percentage = req.body.percentage !== undefined ? Number(req.body.percentage) : fee.percentage;
      fee.exemptForPremium = req.body.exemptForPremium !== undefined ? Boolean(req.body.exemptForPremium) : fee.exemptForPremium;
      fee.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : fee.isActive;
      
      if (req.body.establishment !== undefined) {
          fee.establishment = req.body.establishment || undefined;
      }

      const updatedFee = await fee.save();
      res.json(updatedFee);
    } else {
      res.status(404).json({ message: 'Taxa de processamento não encontrada' });
    }
  })
);

// DELETE processing fee
router.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const fee = await ProcessingFee.findById(req.params.id);
    if (fee) {
      await fee.deleteOne();
      res.json({ message: 'Taxa de processamento removida' });
    } else {
      res.status(404).json({ message: 'Taxa de processamento não encontrada' });
    }
  })
);

export default router;
