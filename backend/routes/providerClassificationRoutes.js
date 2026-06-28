import express from 'express';
const router = express.Router();
import {
  getProviderClassifications,
  getProviderClassificationById,
  createProviderClassification,
  updateProviderClassification,
  deleteProviderClassification,
} from '../controllers/providerClassificationController.js';

router.route('/').get(getProviderClassifications).post(createProviderClassification);
router
  .route('/:id')
  .get(getProviderClassificationById)
  .put(updateProviderClassification)
  .delete(deleteProviderClassification);

export default router;
