import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import ServiceCategory from '../models/ServiceCategoryModel.js';
import Service from '../models/ServiceModel.js';
import { isAuth, isAdmin } from '../utils.js';

const catalogRouter = express.Router();

/**
 * @desc Get complete dynamic catalog for the Mobile App
 * @route GET /api/catalog
 */
catalogRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const categories = await ServiceCategory.find({ active: true }).sort({ sortOrder: 1 }).lean();
    
    // Fetch all active services
    const services = await Service.find({ active: true }).sort({ sortOrder: 1 }).lean();
    
    // Nest services into their categories
    const catalog = categories.map(cat => {
      cat.services = services.filter(s => s.categoryId.toString() === cat._id.toString());
      return cat;
    });

    res.send(catalog);
  })
);

// --- Admin CRUD for Categories ---

catalogRouter.get(
  '/categories',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const categories = await ServiceCategory.find({}).sort({ sortOrder: 1 });
    res.send(categories);
  })
);

catalogRouter.post(
  '/categories',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newCategory = new ServiceCategory(req.body);
    const saved = await newCategory.save();
    res.status(201).send({ message: 'Categoria criada', category: saved });
  })
);

catalogRouter.put(
  '/categories/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const category = await ServiceCategory.findById(req.params.id);
    if (category) {
      category.name = req.body.name || category.name;
      category.icon = req.body.icon || category.icon;
      category.active = req.body.active !== undefined ? req.body.active : category.active;
      category.sortOrder = req.body.sortOrder || category.sortOrder;
      const updated = await category.save();
      res.send({ message: 'Categoria atualizada', category: updated });
    } else {
      res.status(404).send({ message: 'Categoria não encontrada' });
    }
  })
);

// --- Admin CRUD for Services ---

catalogRouter.get(
  '/services',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const services = await Service.find({}).sort({ sortOrder: 1 });
    res.send(services);
  })
);

catalogRouter.post(
  '/services',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newService = new Service(req.body);
    const saved = await newService.save();
    res.status(201).send({ message: 'Serviço criado', service: saved });
  })
);

catalogRouter.put(
  '/services/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);
    if (service) {
      service.name = req.body.name || service.name;
      service.categoryId = req.body.categoryId || service.categoryId;
      service.description = req.body.description || service.description;
      service.pricingModel = req.body.pricingModel || service.pricingModel;
      service.basePrice = req.body.basePrice !== undefined ? req.body.basePrice : service.basePrice;
      service.active = req.body.active !== undefined ? req.body.active : service.active;
      service.icon = req.body.icon || service.icon;
      service.image = req.body.image || service.image;
      service.sortOrder = req.body.sortOrder || service.sortOrder;
      
      const updated = await service.save();
      res.send({ message: 'Serviço atualizado', service: updated });
    } else {
      res.status(404).send({ message: 'Serviço não encontrado' });
    }
  })
);

export default catalogRouter;
