import express from 'express';
import { getOrderChat, sendMessage } from '../controllers/orderChatController.js';
import { isAuth } from '../utils.js';

const router = express.Router();

router.route('/:orderId').get(isAuth, getOrderChat);
router.route('/:orderId/messages').post(isAuth, sendMessage);

export default router;
