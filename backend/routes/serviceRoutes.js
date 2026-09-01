import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Service from '../models/ServiceModel.js';

const serviceRouter = express.Router();

// GET all services
serviceRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const services = await Service.find({}).sort({ order: 1 });
    res.send(services);
  })
);

// POST new service
serviceRouter.post(
  '/',
  expressAsyncHandler(async (req, res) => {
    const newService = new Service({
      name: req.body.name,
      categoryId: req.body.categoryId,
      subcategoryId: req.body.subcategoryId || null,
      basePrice: req.body.basePrice,
      status: req.body.status || 'Ativo',
      icon: req.body.icon || '',
      color: req.body.color || '',
      description: req.body.description || '',
      order: req.body.order || 0,
      image: req.body.image || '',
    });
    const service = await newService.save();
    res.status(201).send(service);
  })
);

// PUT update service
serviceRouter.put(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);
    if (service) {
      service.name = req.body.name || service.name;
      service.categoryId = req.body.categoryId || service.categoryId;
      service.subcategoryId = req.body.subcategoryId !== undefined ? req.body.subcategoryId : service.subcategoryId;
      service.basePrice = req.body.basePrice || service.basePrice;
      service.status = req.body.status || service.status;
      service.icon = req.body.icon !== undefined ? req.body.icon : service.icon;
      service.color = req.body.color !== undefined ? req.body.color : service.color;
      service.description = req.body.description !== undefined ? req.body.description : service.description;
      service.order = req.body.order !== undefined ? req.body.order : service.order;
      service.image = req.body.image !== undefined ? req.body.image : service.image;

      const updatedService = await service.save();
      res.send(updatedService);
    } else {
      res.status(404).send({ message: 'Service Not Found' });
    }
  })
);

// DELETE service
serviceRouter.delete(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);
    if (service) {
      await service.deleteOne();
      res.send({ message: 'Service Deleted' });
    } else {
      res.status(404).send({ message: 'Service Not Found' });
    }
  })
);

export default serviceRouter;
