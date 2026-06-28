import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Promotion from '../models/PromotionModel.js';
import { isAuth, isAdmin } from '../utils.js';

const promotionRouter = express.Router();

// Get all promotions
promotionRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const promotions = await Promotion.find({ isActive: true }).populate('products');
    res.send(promotions);
  })
);

// Get promotion by ID
promotionRouter.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const promotion = await Promotion.findById(req.params.id).populate('products');
    if (promotion) {
      res.send(promotion);
    } else {
      res.status(404).send({ message: 'Promoção não encontrada' });
    }
  })
);

// Create a new promotion
promotionRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const promotion = new Promotion({
      title: req.body.title,
      description: req.body.description,
      discountPercentage: req.body.discountPercentage,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      products: req.body.products || [],
      createdBy: req.user._id,
    });
    const createdPromotion = await promotion.save();
    res.status(201).send({ message: 'Promoção criada com sucesso', promotion: createdPromotion });
  })
);

// Update promotion
promotionRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const promotion = await Promotion.findById(req.params.id);
    if (promotion) {
      promotion.title = req.body.title || promotion.title;
      promotion.description = req.body.description || promotion.description;
      promotion.discountPercentage = req.body.discountPercentage || promotion.discountPercentage;
      promotion.startDate = req.body.startDate || promotion.startDate;
      promotion.endDate = req.body.endDate || promotion.endDate;
      promotion.products = req.body.products || promotion.products;
      promotion.isActive = req.body.isActive !== undefined ? req.body.isActive : promotion.isActive;

      const updatedPromotion = await promotion.save();
      res.send({ message: 'Promoção atualizada com sucesso', promotion: updatedPromotion });
    } else {
      res.status(404).send({ message: 'Promoção não encontrada' });
    }
  })
);

// Delete promotion (soft delete)
promotionRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const promotion = await Promotion.findById(req.params.id);
    if (promotion) {
      promotion.isActive = false;
      await promotion.save();
      res.send({ message: 'Promoção removida com sucesso' });
    } else {
      res.status(404).send({ message: 'Promoção não encontrada' });
    }
  })
);

export default promotionRouter;
