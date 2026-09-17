import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentOrder from '../models/DocumentOrder.js';
import User from '../models/UserModel.js';
import ProcessingFee from '../models/ProcessingFee.js';
import reputationTracker from '../utils/reputationTracker.js';
import { isAuth, isSellerOrAdmin } from '../utils.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ 
  dest: path.join(__dirname, '../../uploads/document-orders'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit para documentos
});

// 1. Submit new Document Order (Customer)
router.post('/submit', isAuth, upload.single('file'), expressAsyncHandler(async (req, res) => {
  const { preferredEstablishment, serviceType, autoAssignEstablishment } = req.body;
  if (!req.file) return res.status(400).json({ message: 'Document file is required' });

  // Calculate generic processing fee (dummy logic for now, should use feeCalculator)
  let feeAmount = 0;
  const feeConfig = await ProcessingFee.findOne({ serviceType, isActive: true });
  if (feeConfig) {
      feeAmount = feeConfig.amount;
  }

  const order = new DocumentOrder({
    user: req.user._id,
    preferredEstablishment: preferredEstablishment || null,
    autoAssignEstablishment: autoAssignEstablishment === 'true',
    serviceType,
    documentPath: req.file.path,
    status: 'Pendente de Valida��o',
    processingFee: feeAmount,
    totalAmount: feeAmount // initially just the fee
  });

  const createdOrder = await order.save();
  await reputationTracker.recordOrderCreated(req.user._id);

  // Note: Actual fee deduction from wallet/m-pesa should happen here or before saving

  res.status(201).json(createdOrder);
}));

// 2. Validate Document Order (Admin/Operator)
router.put('/:id/validate', isAuth, isSellerOrAdmin, expressAsyncHandler(async (req, res) => {
  const { validationItems } = req.body;
  const order = await DocumentOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  order.validationItems = validationItems;
  
  // Calculate new totals
  const itemsTotal = validationItems.reduce((acc, item) => acc + ((item.unitPrice || 0) * (item.quantity || 1)), 0);
  order.serviceFee = itemsTotal * 0.05; // Dummy 5% service fee
  order.deliveryFee = 150; // Dummy delivery fee
  order.totalAmount = itemsTotal + order.serviceFee + order.deliveryFee + order.processingFee;
  
  order.status = 'Aguardando Aprova��o do Cliente';
  order.operator = req.user._id;

  const updatedOrder = await order.save();
  res.json(updatedOrder);
}));

// 3. Client Approves & Pays
router.post('/:id/approve-and-pay', isAuth, expressAsyncHandler(async (req, res) => {
  const order = await DocumentOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  
  if (order.status !== 'Aguardando Aprova��o do Cliente') {
      return res.status(400).json({ message: 'Order is not waiting for approval' });
  }

  // Handle Payment logic here (e.g., deduct from Wallet)
  // For now, simulate payment success
  order.status = 'Pagamento Confirmado';
  
  // Auto-Assign Shopper (Find an active shopper who has this establishment in assignedEstablishments)
  if (order.preferredEstablishment) {
      const availableShopper = await User.findOne({
          isShopper: true,
          availability: 'active',
          assignedEstablishments: order.preferredEstablishment
      });
      if (availableShopper) {
          order.shopperAssigned = availableShopper._id;
          order.status = 'Em Compras'; // Transitions directly if shopper assigned
      }
  }

  const updatedOrder = await order.save();
  res.json(updatedOrder);
}));

// 4. Shopper completes purchase
router.post('/:id/shopper-complete', isAuth, upload.single('receipt'), expressAsyncHandler(async (req, res) => {
    const order = await DocumentOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (order.shopperAssigned.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You are not assigned to this order' });
    }

    if (!req.file) return res.status(400).json({ message: 'Receipt is required' });

    order.receiptUrl = req.file.path;
    // Client can update validation items (e.g., mark shopperFound: false)
    if (req.body.validationItems) {
        order.validationItems = JSON.parse(req.body.validationItems);
    }
    
    order.status = 'Pronto para Entrega';
    const updatedOrder = await order.save();
    res.json(updatedOrder);
}));

// Update Status Generic
router.put('/:id/status', isAuth, expressAsyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await DocumentOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    if (status === 'Conclu�do') await reputationTracker.recordOrderCompleted(order.user);
    if (status === 'Cancelado') await reputationTracker.recordOrderCancelled(order.user);

    const updatedOrder = await order.save();
    res.json(updatedOrder);
}));

// Get order details
router.get('/:id', isAuth, expressAsyncHandler(async (req, res) => {
    const order = await DocumentOrder.findById(req.params.id)
        .populate('user preferredEstablishment operator shopperAssigned');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
}));

// List Orders
router.get('/', isAuth, expressAsyncHandler(async (req, res) => {
    let filter = {};
    if (!req.user.isAdmin && !req.user.isSeller && !req.user.isShopper) {
        filter.user = req.user._id; // customer sees their own
    } else if (req.user.isShopper) {
        filter.shopperAssigned = req.user._id; // shopper sees their assigned
    }
    const orders = await DocumentOrder.find(filter).sort({ createdAt: -1 });
    res.json(orders);
}));

export default router;
