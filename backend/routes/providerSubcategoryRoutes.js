import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { isAuth, isAdmin } from '../utils.js';
import ProviderSubcategoryController from '../controllers/providerSubcategoryController.js';

const router = express.Router();

// List all provider subcategories
router.get(
  '/',
  expressAsyncHandler(ProviderSubcategoryController.list)
);

// Get subcategory by ID
router.get(
  '/:id',
  expressAsyncHandler(ProviderSubcategoryController.getById)
);

// Create new subcategory
router.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(ProviderSubcategoryController.create)
);

// Update subcategory
router.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(ProviderSubcategoryController.update)
);

// Delete subcategory (soft delete)
router.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(ProviderSubcategoryController.remove)
);

export default router;
