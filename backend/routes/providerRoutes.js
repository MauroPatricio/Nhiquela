import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Provider from '../models/ProviderModel.js';
import { isAuth, isAdmin } from '../utils.js';

const providerRouter = express.Router();

// GET all providers (with optional filtering by type)
providerRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    try {
      const { type, categoryId, status } = req.query;
      const query = {};

      if (type) {
        query.providerType = { $regex: new RegExp(`^${type}$`, 'i') };
      }
      if (categoryId) query.categoryId = categoryId;
      if (status) query.status = status; // e.g., 'active'

      const providers = await Provider.find(query)
        .populate('userId', 'name email phoneNumber')
        .populate('categoryId', 'name')
        .populate('location.province', 'name')
        .sort({ createdAt: -1 });

      res.send({ providers, count: providers.length });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Erro ao buscar providers' });
    }
  })
);

// GET near providers (Basic location query if lat/lng are provided)
providerRouter.get(
  '/nearby',
  expressAsyncHandler(async (req, res) => {
    try {
      const { lat, lng, type, radius = 50 } = req.query;
      const query = { status: 'active' };
      if (type) query.providerType = type;

      // Simplistic nearby logic (for real geo queries, use MongoDB 2dsphere index)
      const providers = await Provider.find(query)
        .populate('categoryId', 'name');

      res.send({ providers });
    } catch (error) {
      res.status(500).send({ message: 'Erro ao buscar providers pr�ximos' });
    }
  })
);

// GET my provider profiles (for a logged-in user)
providerRouter.get(
  '/my',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const providers = await Provider.find({ userId: req.user._id });
      res.send({ providers });
    } catch (error) {
      res.status(500).send({ message: 'Erro ao buscar os seus perfis de provider' });
    }
  })
);

// GET provider by ID
providerRouter.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    try {
      const provider = await Provider.findById(req.params.id)
        .populate('userId', 'name email phoneNumber')
        .populate('categoryId', 'name')
        .populate('location.province', 'name');
      
      if (provider) {
        res.send({ provider });
      } else {
        res.status(404).send({ message: 'Provider n�o encontrado' });
      }
    } catch (error) {
      res.status(500).send({ message: 'Erro interno ao buscar provider' });
    }
  })
);

// POST create a new provider
providerRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const { name, provider_type_id, categoryId, location, businessData, serviceData } = req.body;

      // Import inside or ensure ProviderType is imported at top
      // Wait, we need to import ProviderType. I'll add an import at the top of the file separately, or use dynamic import.
      const ProviderTypeModel = (await import('../models/ProviderTypeModel.js')).default;
      const typeDoc = await ProviderTypeModel.findById(provider_type_id).populate('classificationId');

      if (!typeDoc) {
        return res.status(404).send({ message: 'Tipo de prestador n�o encontrado' });
      }

      const providerType = typeDoc.classificationId ? typeDoc.classificationId.name : 'UNKNOWN';

      const provider = new Provider({
        name,
        providerType,
        provider_type_id,
        categoryId,
        userId: req.user._id,
        location,
        status: 'pending', // Requires admin approval, or set to active if auto-approved
        verificationStatus: 'pending'
      });

      const createdProvider = await provider.save();
      res.status(201).send({ message: 'Provider criado com sucesso', provider: createdProvider });
    } catch (error) {
      res.status(500).send({ message: 'Erro ao criar provider', error: error.message });
    }
  })
);

// PUT update provider
providerRouter.put(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const provider = await Provider.findById(req.params.id);

      if (provider) {
        // Ensure user owns the provider or is admin
        if (provider.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
          return res.status(403).send({ message: 'Acesso negado' });
        }

        if (req.body.provider_type_id && req.body.provider_type_id !== provider.provider_type_id?.toString()) {
            const ProviderTypeModel = (await import('../models/ProviderTypeModel.js')).default;
            const typeDoc = await ProviderTypeModel.findById(req.body.provider_type_id).populate('classificationId');
            if (typeDoc) {
                provider.provider_type_id = req.body.provider_type_id;
                provider.providerType = typeDoc.classificationId ? typeDoc.classificationId.name : 'UNKNOWN';
            }
        }

        provider.name = req.body.name || provider.name;
        provider.categoryId = req.body.categoryId || provider.categoryId;
        provider.location = req.body.location || provider.location;
        provider.status = req.body.status || provider.status;
        
        if (req.body.metadata) {
            provider.metadata = { ...provider.metadata, ...req.body.metadata };
        }

        const updatedProvider = await provider.save();
        res.send({ message: 'Provider atualizado com sucesso', provider: updatedProvider });
      } else {
        res.status(404).send({ message: 'Provider n�o encontrado' });
      }
    } catch (error) {
      res.status(500).send({ message: 'Erro ao atualizar provider', error: error.message });
    }
  })
);

export default providerRouter;
