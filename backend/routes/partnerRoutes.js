// routes/partnerRoutes.js
import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Partner from '../models/PartnerModel.js';
import PartnerProduct from '../models/PartnerProductModel.js';
import { isAuth, isAdmin, isPartner } from '../utils.js';
import partnerService from '../services/partnerService.js';

const router = express.Router();

// Create a new partner (admin only)
router.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const partner = await partnerService.createPartner(req.body);
    res.status(201).send({ message: 'Partner created', partner });
  })
);

// List partners (admin can see all, partner can see self)
router.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const partners = await partnerService.listPartners(req.user);
    res.send(partners);
  })
);

// Get partner details
router.get(
  '/:partnerId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const partner = await partnerService.getPartner(req.params.partnerId);
    if (partner) res.send(partner);
    else res.status(404).send({ message: 'Partner not found' });
  })
);

// Update partner (admin or self)
router.put(
  '/:partnerId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const updated = await partnerService.updatePartner(req.params.partnerId, req.body, req.user);
    if (updated) res.send({ message: 'Partner updated', partner: updated });
    else res.status(404).send({ message: 'Partner not found or unauthorized' });
  })
);

// Delete (deactivate) partner (admin only)
router.delete(
  '/:partnerId',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    await partnerService.deletePartner(req.params.partnerId);
    res.send({ message: 'Partner deactivated' });
  })
);

// Add a product to a partner catalog
router.post(
  '/:partnerId/products',
  isAuth,
  isPartner,
  expressAsyncHandler(async (req, res) => {
    const pp = await partnerService.addPartnerProduct(req.params.partnerId, req.body);
    res.status(201).send({ message: 'Partner product added', partnerProduct: pp });
  })
);

// List partner products with optional filters
router.get(
  '/:partnerId/products',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const products = await partnerService.searchPartnerProducts(req.params.partnerId, req.query);
    res.send(products);
  })
);

// Update a partner product (price, stock, etc.)
router.put(
  '/:partnerId/products/:productId',
  isAuth,
  isPartner,
  expressAsyncHandler(async (req, res) => {
    const updated = await partnerService.updatePartnerProduct(req.params.partnerId, req.params.productId, req.body);
    res.send({ message: 'Partner product updated', partnerProduct: updated });
  })
);

// Remove a partner product
router.delete(
  '/:partnerId/products/:productId',
  isAuth,
  isPartner,
  expressAsyncHandler(async (req, res) => {
    await partnerService.removePartnerProduct(req.params.partnerId, req.params.productId);
    res.send({ message: 'Partner product removed' });
  })
);

export default router;
