// routes/kpiRoutes.js
// Provides KPI endpoints for sellers (partners).

import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { isAuth } from '../utils.js';
import sellerKpiService from '../services/sellerKpiService.js';

const router = express.Router();

// GET /api/seller/:sellerId/kpi?limit=10
router.get(
  '/:sellerId/kpi',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { sellerId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await sellerKpiService.getTopSellingProducts(sellerId, limit);
    res.send(data);
  })
);

export default router;
