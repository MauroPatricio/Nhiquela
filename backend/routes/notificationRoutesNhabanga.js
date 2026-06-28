import express from 'express';
import { createNotification } from '../controllers/notificationControllerNhabanga.js';
const router = express.Router();

router.post('/', createNotification);

export default router;