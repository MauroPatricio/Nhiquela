import express from 'express';
const router = express.Router();
import {
  getProviderTypes,
  getProviderTypeById,
  createProviderType,
  updateProviderType,
  deleteProviderType,
} from '../controllers/providerTypeController.js';
// import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/').get(getProviderTypes).post(createProviderType);
router
  .route('/:id')
  .get(getProviderTypeById)
  .put(updateProviderType)
  .delete(deleteProviderType);

export default router;
