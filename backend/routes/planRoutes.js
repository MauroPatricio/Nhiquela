import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Plan from '../models/PlanModel.js';
import Subscription from '../models/SubscriptionModel.js';
import { isAuth, isAdmin } from '../utils.js';

const planRouter = express.Router();

// -- Planos --
planRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const plans = await Plan.find();
    res.send(plans);
  })
);

planRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newPlan = new Plan({
      name: req.body.name,
      price: req.body.price,
      maxProducts: req.body.maxProducts || 0,
      features: req.body.features || [],
      type: req.body.type || 'gratuito',
      isActive: true,
    });
    const createdPlan = await newPlan.save();
    res.status(201).send({ message: 'Plano criado', plan: createdPlan });
  })
);

planRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const plan = await Plan.findById(req.params.id);
    if (plan) {
      plan.name = req.body.name || plan.name;
      plan.price = req.body.price !== undefined ? req.body.price : plan.price;
      plan.maxProducts = req.body.maxProducts !== undefined ? req.body.maxProducts : plan.maxProducts;
      plan.features = req.body.features || plan.features;
      plan.isActive = req.body.isActive !== undefined ? req.body.isActive : plan.isActive;
      plan.type = req.body.type || plan.type;
      
      const updatedPlan = await plan.save();
      res.send({ message: 'Plano atualizado', plan: updatedPlan });
    } else {
      res.status(404).send({ message: 'Plano não encontrado' });
    }
  })
);

// -- Subscrições --
planRouter.get(
  '/subscriptions',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const subs = await Subscription.find().populate('supplier', 'name email').populate('plan', 'name price');
    res.send(subs);
  })
);

planRouter.post(
  '/subscriptions',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const newSub = new Subscription({
      supplier: req.body.supplier || req.user._id,
      plan: req.body.plan,
      status: 'Pendente',
      paymentReference: req.body.paymentReference || ''
    });
    const createdSub = await newSub.save();
    res.status(201).send({ message: 'Subscrição solicitada', subscription: createdSub });
  })
);

planRouter.put(
  '/subscriptions/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const sub = await Subscription.findById(req.params.id);
    if (sub) {
      sub.status = req.body.status || sub.status;
      if (req.body.endDate) sub.endDate = req.body.endDate;
      const updatedSub = await sub.save();
      res.send({ message: 'Subscrição atualizada', subscription: updatedSub });
    } else {
      res.status(404).send({ message: 'Subscrição não encontrada' });
    }
  })
);

export default planRouter;
