import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Marketing from '../models/MarketingModel.js';
import { isAuth, isAdmin } from '../utils.js';

const marketingRouter = express.Router();

marketingRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const campaigns = await Marketing.find().populate('supplier', 'name email');
    res.send(campaigns);
  })
);

marketingRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newMarketing = new Marketing({
      title: req.body.title,
      type: req.body.type,
      imageUrl: req.body.imageUrl,
      link: req.body.link,
      supplier: req.body.supplier || null,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      priority: req.body.priority || 0,
    });
    const createdMarketing = await newMarketing.save();
    res.status(201).send({ message: 'Campanha criada', marketing: createdMarketing });
  })
);

marketingRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const campaign = await Marketing.findById(req.params.id);
    if (campaign) {
      campaign.title = req.body.title || campaign.title;
      campaign.type = req.body.type || campaign.type;
      campaign.imageUrl = req.body.imageUrl || campaign.imageUrl;
      campaign.link = req.body.link || campaign.link;
      campaign.supplier = req.body.supplier || campaign.supplier;
      campaign.isActive = req.body.isActive !== undefined ? req.body.isActive : campaign.isActive;
      campaign.priority = req.body.priority !== undefined ? req.body.priority : campaign.priority;
      const updatedCampaign = await campaign.save();
      res.send({ message: 'Campanha atualizada', marketing: updatedCampaign });
    } else {
      res.status(404).send({ message: 'Campanha não encontrada' });
    }
  })
);

marketingRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const campaign = await Marketing.findById(req.params.id);
    if (campaign) {
      await campaign.deleteOne();
      res.send({ message: 'Campanha apagada' });
    } else {
      res.status(404).send({ message: 'Campanha não encontrada' });
    }
  })
);

export default marketingRouter;
