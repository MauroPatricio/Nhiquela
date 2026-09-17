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

router.route('/').get(getProviderTypes).post(async (req, res, next) => {
  await createProviderType(req, res, next);
  const io = req.app.get('io');
  if (io) {
    io.emit('catalogUpdated');
  }
});
router
  .route('/:id')
  .get(getProviderTypeById)
  .put(async (req, res, next) => {
    await updateProviderType(req, res, next);
    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated');
    }
  })
  .delete(async (req, res, next) => {
    await deleteProviderType(req, res, next);
    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated');
    }
  });

export default router;
