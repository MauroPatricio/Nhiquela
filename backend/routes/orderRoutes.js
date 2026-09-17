import express from 'express';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin, sendOrderNotificationToSellerEmail, sendDigitalKeyDeliveryEmail } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';
import DispatchService from '../services/dispatchService.js';
import sendNotification from '../utils/sendNotification.js';
import createNotification from '../utils/createNotification.js';
import Partner from '../models/PartnerModel.js';
import partnerService from '../services/partnerService.js';
import reputationTracker from '../utils/reputationTracker.js';
import mongoose from 'mongoose';
import { debitDriverCommissionWithSession, getFinancialConfig, canAffordTripCommission, hasSufficientBalance } from '../services/walletService.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';

const getSellerUser = async (sellerId) => {
  if (!sellerId) return null;
  const Provider = mongoose.model('Provider');
  const provider = await Provider.findById(sellerId).populate('userId');
  return provider?.userId || null;
};

const orderRouter = express.Router();



function generateCode() {
  let code = Math.floor(Math.random() * 900000) + 100000;
  return code.toString();
}

/**
 * Processes digital items delivery for automatic digital products.
 * Assigns available stock keys to digitalDeliveredItems and marks order as Entregue if all items delivered.
 */
export const processDigitalOrderDelivery = async (order) => {
  if (!order || !order.orderItems || order.orderItems.length === 0) return order;

  let hasDigital = false;
  let allDigital = true;
  if (!order.digitalDeliveredItems) {
    order.digitalDeliveredItems = [];
  }

  for (const item of order.orderItems) {
    const productId = item.product || item._id;
    if (!productId) continue;

    const product = await Product.findById(productId);
    if (!product || product.productType !== 'DIGITAL') {
      allDigital = false;
      continue;
    }

    hasDigital = true;

    // Check if key already delivered for this product in this order
    const alreadyDelivered = order.digitalDeliveredItems.some(
      d => d.productId && d.productId.toString() === product._id.toString()
    );
    if (alreadyDelivered) continue;

    if (product.digitalStockKeys && product.digitalStockKeys.length > 0) {
      const availableKeyObj = product.digitalStockKeys.find(k => !k.isUsed);
      if (availableKeyObj) {
        availableKeyObj.isUsed = true;
        availableKeyObj.usedByOrder = order._id;
        availableKeyObj.usedAt = new Date();

        product.countInStock = product.digitalStockKeys.filter(k => !k.isUsed).length;
        await product.save();

        order.digitalDeliveredItems.push({
          productId: product._id,
          productName: product.name || product.nome,
          key: availableKeyObj.key,
          digitalInstructions: product.digitalInstructions || '',
          deliveredAt: new Date()
        });
      }
    }
  }

  order.isDigitalOrder = hasDigital;
  if (allDigital) {
    order.isUserWantDelivery = false;
    order.deliveryPrice = 0;
    if (order.digitalDeliveredItems && order.digitalDeliveredItems.length > 0) {
      order.status = 'Entregue';
      order.isDelivered = true;
      order.deliveredAt = order.deliveredAt || new Date();
    }
  }

  await order.save();

  // Enviar e-mail de entrega dos acessos digitais ao e-mail do destinatário (ou do comprador)
  try {
    const buyerUser = await User.findById(order.user);
    const targetEmail = order.digitalRecipientEmail || (buyerUser && buyerUser.email ? buyerUser.email : null);
    if (targetEmail && order.digitalDeliveredItems && order.digitalDeliveredItems.length > 0) {
      let recipientName = buyerUser ? buyerUser.name : 'Cliente';
      await sendDigitalKeyDeliveryEmail({
        toEmail: targetEmail,
        recipientName,
        orderCode: order.code,
        digitalItems: order.digitalDeliveredItems
      });
    }
  } catch (emailErr) {
    console.error('[Digital Email Dispatch Error]:', emailErr.message);
  }

  return order;
};

// POST /orders/:id/deliver-digital-key (Fornecedor envia/entrega chave ou instruções digitais ao cliente)
orderRouter.post(
  '/:id/deliver-digital-key',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado' });
    }

    const { key, digitalInstructions, productName } = req.body;

    if (!order.digitalDeliveredItems) {
      order.digitalDeliveredItems = [];
    }

    const newItem = {
      productId: req.body.productId || (order.orderItems[0] ? order.orderItems[0]._id : null),
      productName: productName || (order.orderItems[0] ? order.orderItems[0].name : 'Produto Digital'),
      key: key || '',
      digitalInstructions: digitalInstructions || '',
      deliveredAt: new Date()
    };

    order.digitalDeliveredItems.push(newItem);
    order.isDigitalOrder = true;
    order.status = 'Entregue';
    order.isDelivered = true;
    order.deliveredAt = order.deliveredAt || new Date();

    await order.save();

    // Enviar e-mail com as instruções / chave de ativação ao cliente
    let emailSent = false;
    try {
      const buyerUser = await User.findById(order.user);
      const targetEmail = order.digitalRecipientEmail || (buyerUser && buyerUser.email ? buyerUser.email : null);
      if (targetEmail) {
        await sendDigitalKeyDeliveryEmail({
          toEmail: targetEmail,
          recipientName: buyerUser ? buyerUser.name : 'Cliente',
          orderCode: order.code,
          digitalItems: [newItem]
        });
        emailSent = true;
      }
    } catch (emailErr) {
      console.error('[Manual Digital Email Error]:', emailErr.message);
    }

    res.send({
      message: 'Chave / Instruções digitais enviadas com sucesso ao cliente!',
      emailSent,
      order
    });
  })
);

orderRouter.get('/debug/driver/:id', async (req, res) => {
  try {
    const User = (await import('../models/UserModel.js')).default;
    const Wallet = (await import('../models/WalletModel.js')).default;
    const NotificationToken = (await import('../models/NotificationToken.js')).default;
    const driver = await User.findById(req.params.id);
    const wallet = await Wallet.findOne({ $or: [{ ownerId: req.params.id }, { userId: req.params.id }] });
    const token = await NotificationToken.findOne({ user: req.params.id }).sort({ createdAt: -1 });
    res.json({ driver, wallet, token });
  } catch(e) { res.status(500).json({error: e.message}) }
});

// All Orders
orderRouter.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const sellerQuery = req.query.seller || '';
    let seller = sellerQuery;
    if (sellerQuery) {
      try {
        const mongoose = await import('mongoose');
        const provider = await mongoose.default.model('Provider').findOne({ ownerId: sellerQuery });
        if (provider) seller = provider._id;
      } catch (e) {}
    }
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10

    const orders = await Order.find({
      ...sellerFilter,
      deleted: { $eq: false },
    }).populate('user', 'name').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
    });

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, pages });
  })
);

// All Orders sorted by seller
orderRouter.get(
  '/sellersorderstopay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = 10

    const orders = await Order.find({
      isPaid: { $eq: true },
      deleted: { $eq: false },
    }).populate('user', 'name').populate('seller').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      isPaid: { $eq: true },
      deleted: { $eq: false },
    });

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, pages });
  })
);

// All Orders sorted by deliver
orderRouter.get(
  '/deliverorderstopay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = 10

    const orders = await Order.find({
      isPaid: { $eq: true },
      deleted: { $eq: false },
      deliveryman: { $exists: true }
    }).populate('user', 'name').populate('deliveryman.id').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      isPaid: { $eq: true },
      deleted: { $eq: false },
      deliveryman: { $exists: true }
    });

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, pages });
  })
);


orderRouter.get(
  '/sellerview',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const sellerQuery = req.query.seller || '';
    let seller = sellerQuery;
    if (sellerQuery && sellerQuery !== 'undefined') {
      try {
        const mongoose = await import('mongoose');
        if (mongoose.Types.ObjectId.isValid(sellerQuery)) {
          const provider = await mongoose.default.model('Provider').findOne({ 
            $or: [{ ownerId: sellerQuery }, { userId: sellerQuery }] 
          });
          if (provider) seller = provider._id;
        }
      } catch (e) {}
    }
    const sellerFilter = (seller && seller !== 'undefined') ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10

    const orders = await Order.find({
      ...sellerFilter,
      deleted: { $eq: false },
      status: { $ne: 'Finalizado' }
    }).populate('user', 'name phoneNumber profileImage').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
      status: { $ne: 'Finalizado' }
    });

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, pages });
  })
);



orderRouter.get(
  '/sellerordersview',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const sellerQuery = req.query.seller || '';
    let seller = sellerQuery;
    if (sellerQuery && sellerQuery !== 'undefined') {
      try {
        const mongoose = await import('mongoose');
        if (mongoose.Types.ObjectId.isValid(sellerQuery)) {
          const provider = await mongoose.default.model('Provider').findOne({ 
            $or: [{ ownerId: sellerQuery }, { userId: sellerQuery }] 
          });
          if (provider) seller = provider._id;
        }
      } catch (e) {}
    }
    const sellerFilter = (seller && seller !== 'undefined') ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10

    const orders = await Order.find({
      ...sellerFilter,
      deleted: { $eq: false }
    }).populate('user', 'name phoneNumber profileImage').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false }
    });

    const OrderChat = mongoose.model('OrderChat');
    const ordersWithChat = await Promise.all(orders.map(async (order) => {
      const orderObj = order.toObject();
      const chat = await OrderChat.findOne({ orderId: order._id });
      let chatCount = 0;
      let unreadCount = 0;

      if (chat && chat.messages) {
        chatCount = chat.messages.length;
        unreadCount = chat.messages.filter(
          m => m.senderId.toString() !== req.user._id.toString() && m.status !== 'read'
        ).length;
      }

      return {
        ...orderObj,
        chatCount,
        unreadCount
      };
    }));

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders: ordersWithChat, pages });
  })
);

// most required items
orderRouter.get(
  '/popularitems',
  expressAsyncHandler(async (req, res) => {
    const pageSize = 10

    const orders = await Order.aggregate([

      { $unwind: "$orderItems" },

      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "product"
        }

      },
      {
        $match: {
          "product.isActive": true
        }
      },

      // Match orders that have at least one order item
      { $match: { orderItems: { $exists: true, $not: { $size: 0 } } } },

      // Group by the order item properties and calculate the total quantity
      {
        $group: {
          _id: "$orderItems._id",
          slug: { $first: "$orderItems.slug" },
          name: { $first: "$orderItems.name" },
          nome: { $first: "$orderItems.nome" },
          image: { $first: "$orderItems.image" },
          price: { $first: "$orderItems.price" },
          onSale: { $first: "$orderItems.onSale" },
          onSalePercentage: { $first: "$orderItems.onSalePercentage" },
          discount: { $first: "$orderItems.discount" },

          totalQuantity: { $sum: { $toInt: "$orderItems.quantity" } },
        },
      },

      // Sort in descending order based on the total quantity
      { $sort: { totalQuantity: -1 } },

      // Optionally, limit the results to a specific number of items
      { $limit: 10 },
    ]);
    res.send({ orders });
  })
);

// All Orders
orderRouter.get(
  '/deliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const sellerQuery = req.query.seller || '';
    let seller = sellerQuery;
    if (sellerQuery) {
      try {
        const mongoose = await import('mongoose');
        const provider = await mongoose.default.model('Provider').findOne({ ownerId: sellerQuery });
        if (provider) seller = provider._id;
      } catch (e) {}
    }
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10

    const orders = await Order.find({
      ...sellerFilter,
      deleted: { $eq: false },
      isPaid: { $eq: true },
      isAvailableToDeliver: { $eq: true },
      status: { $ne: 'Finalizado' }
    }).populate('user', 'name').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
    });

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, pages });
  })
);



orderRouter.post('/', isAuth, expressAsyncHandler(async (req, res) => {
    // Check for cancellation penalty block
    const currentUser = await User.findById(req.user._id);
    if (currentUser && currentUser.blockedUntil && currentUser.blockedUntil > new Date()) {
      return res.status(403).send({ message: "Conta bloqueada por 30 dias devido a cancelamentos sucessivos sem justificação válida." });
    }

    const priceFromSeller = parseFloat(req.body.itemsPriceForSeller);
    let commissionRate = 0.15; // default 15%
    let priceComission = 0;
    let comissionPercentage = commissionRate * 100;

    // If a partnerId is provided, fetch partner commissionRate
    if (req.body.partnerId) {
      const partner = await Partner.findById(req.body.partnerId);
      if (partner && partner.commissionRate) {
        commissionRate = partner.commissionRate;
        comissionPercentage = commissionRate * 100;
      }
    }
    // Calculate commission using partnerService
    priceComission = partnerService.calculateCommission(commissionRate, priceFromSeller);


    // Create a new order object
    const newOrder = new Order({

      seller: req.body.orderItems[0].seller,
      orderItems: req.body.orderItems.map((x) => ({ ...x, product: x._id })),
      deliveryAddress: req.body.deliveryAddress || { address: req.body.address },
      isUserWantDelivery: req.body.isUserWantDelivery,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice,
      deliveryPrice: req.body.deliveryPrice,
      taxPrice: req.body.taxPrice,
      totalPrice: req.body.totalPrice,
      ivaTax: req.body.ivaTax,
      siteTax: req.body.siteTax,
      addressPrice: req.body.addressPrice,
      itemsPriceForSeller: req.body.itemsPriceForSeller,
      user: req.user ? req.user._id : req.body.user._id,
      code: generateCode(),
      status: 'Pendente',
      isPaid: req.body.isPaid,
      paidAt: req.body.paidAt,
      stepStatus: req.body.stepStatus,
      customerId: req.user ? req.user._id : req.body.user._id,
      priceComission: priceComission,
      comissionPercentage: comissionPercentage,
      priceFromSeller: priceFromSeller,
      sellerPriceWithDeliver: req.body.sellerPriceWithDeliver,

      // Trajeto do pedido
      origin: req.body.origin,
      destination: req.body.destination,
      originDetails: req.body.originDetails,
      destinationDetails: req.body.destinationDetails,

      // Intelligent Dispatch & Transport
      transportType: req.body.transportType,
      transportTypeId: req.body.transportTypeId,
      paymentProof: req.body.paymentProof,

      // Recipient for digital products
      digitalRecipientEmail: req.body.digitalRecipientEmail || req.body.recipientEmail || '',
      digitalRecipientPhone: req.body.digitalRecipientPhone || req.body.alternativePhoneNumber || '',
    });

    try {
      // Update stock levels for each ordered product
      await Promise.all(
        req.body.orderItems.map(async (item) => {
          // Check if the item is defined
          if (!item || !item._id) {
            throw new Error(`Produto invalido: ${JSON.stringify(item)}`);
          }

          // Determine if the item is from a partner
          if (item.partnerProductId) {
            // Use PartnerProduct for stock management
            const PartnerProduct = (await import('../models/PartnerProductModel.js')).default;
            const pp = await PartnerProduct.findById(item.partnerProductId);
            if (!pp) {
              throw new Error(`Partner product not found: ${item.partnerProductId}`);
            }
            if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
              throw new Error(`Invalid quantity for partner product: ${item.name}`);
            }
            const newStock = pp.stock - item.quantity;
            // Previne estoque negativo mas não bloqueia a criação do pedido
            pp.stock = Math.max(0, newStock);
            await pp.save();
            // Assign partner info to order item
            item.partner = pp.partner;
            item.partnerProduct = pp._id;
            item.price = pp.price; // use partner's price
          } else {
            const product = await Product.findById(item._id);
            // Ensure product exists and quantity is valid
            if (!product) {
              throw new Error(`Produto não encontrado: ${item._id}`);
            }
            if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
              throw new Error(`Quantidade Invalida para o produto: ${item.name}`);
            }
            const newCountInStock = product.countInStock - item.quantity;
            // Previne estoque negativo mas não bloqueia a criação do pedido
            product.countInStock = Math.max(0, newCountInStock);
            await product.save();
          }
        })
      );

      // Save the order

      // Calculate commission using partner's rate if applicable
      if (req.body.orderItems && req.body.orderItems.length) {
        const firstPartnerItem = req.body.orderItems.find(i => i.partnerProductId);
        if (firstPartnerItem) {
          const PartnerProduct = (await import('../models/PartnerProductModel.js')).default;
          // Additional partner-specific commission logic can be placed here if needed
        }
      }

      // Save the order
      let savedOrder = await newOrder.save();

      // Process digital order keys & status if contains digital products
      try {
        const { processDigitalOrderDelivery } = await import('./orderRoutes.js');
        savedOrder = await processDigitalOrderDelivery(savedOrder);
      } catch (digitalErr) {
        console.error('[Digital Order Processing Error]:', digitalErr.message);
      }

      const order = await savedOrder.populate('seller');

      // Debit partner commission if this is a marketplace order
      if (req.body.partnerId) {
        const { debitCommissionFromPartner } = await import('../services/walletService.js');
        const partner = await Partner.findById(req.body.partnerId);
        const commissionRate = partner?.commissionRate ?? 0.1;
        await debitCommissionFromPartner(req.body.partnerId, parseFloat(req.body.itemsPriceForSeller), commissionRate);
      }



      // Create a notification after the order is saved
      const mensagemCliente = `Olá! Seu pedido com o código ${order.code} foi criado com sucesso! Agora, aguarde a confirmação do fornecedor. Acompanhe o status do seu pedido diretamente no app. Obrigado por escolher a Nhiquela!`;
      const mensagemVendedor = `Novo Pedido Pendente! Aceda à aba de Pedidos no Nhiquela Seller para aceitar ou rejeitar o pedido nº ${order.code}.`;

       const sellerOfProduct = await getSellerUser(order.seller);
      const clientOfProduct = await User.findById(order.user);

      //toSeller
      if (sellerOfProduct?.deviceToken) {
        createNotification({
          message: mensagemVendedor,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.deviceToken,
        });
      }

      // Enviar e-mail de notificação para o vendedor
      if (sellerOfProduct?.email) {
        sendOrderNotificationToSellerEmail(sellerOfProduct.email, order);
      }
      
      //toOrderClient
      if (clientOfProduct?.deviceToken) {
        createNotification({
          message: mensagemCliente,
          receiver_id: order.user,
          sender_id: order.seller,
          orderID: order._id,
          pushToken: clientOfProduct.deviceToken
        });
      }

      // Populate order details for socket/response payload completeness
      const populatedOrder = await Order.findById(order._id)
        .populate('user', 'name phoneNumber profileImage')
        .populate({
          path: 'seller',
          populate: {
            path: 'userId'
          }
        });

      // Emit realtime socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`seller_${order.seller}`).emit('new_order', { order: populatedOrder || order });
        io.to(`seller_${order.seller}`).emit('new_order_pending', { order: populatedOrder || order });
        if (sellerOfProduct) {
          io.to(`seller_${sellerOfProduct._id}`).emit('new_order_pending', { order: populatedOrder || order });
          io.to(`user_${sellerOfProduct._id}`).emit('new_order_pending', { order: populatedOrder || order });
        }
        io.to(`user_${order.user}`).emit('order_created', { order: populatedOrder || order });
        io.to(`order_${order._id}`).emit('order_created', { order: populatedOrder || order });
      }

      // Respond with success message
      res.status(201).send({ message: 'Pedido criado com sucesso!', order: populatedOrder || order });

    } catch (error) {
      // Handle errors during product update or order save
      res.status(400).send({ message: error.message });
    }
  }));



// get orders by user id
orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id, isDeletedByRequester: false, deleted: { $eq: false } })
      .populate({
        path: 'seller',
        populate: {
          path: 'categoryId',
          model: 'Category',
          select: 'nome name'
        }
      })
      .populate('deliveryman')
      .sort({ createdAt: -1 });
    
    // ?? IMPORTANTE: Incluir também os serviços (RequestService)
    const trips = await RequestService.find({ user: req.user._id, deleted: { $eq: false } }).populate('user deliveryman').sort({ createdAt: -1 });
    
    // Mesclar ambos e ordenar por data
    const all = [...orders, ...trips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const OrderChat = mongoose.model('OrderChat');
    const TripChat = mongoose.model('TripChat');

    const allWithChat = await Promise.all(all.map(async (item) => {
      const itemObj = item.toObject();
      const isOrder = !!itemObj.orderItems;

      let chat = null;
      if (isOrder) {
        chat = await OrderChat.findOne({ orderId: itemObj._id });
      } else {
        chat = await TripChat.findOne({ tripId: itemObj._id });
      }

      let chatCount = 0;
      let unreadCount = 0;

      if (chat && chat.messages) {
        chatCount = chat.messages.length;
        unreadCount = chat.messages.filter(
          m => m.senderId.toString() !== req.user._id.toString() && m.status !== 'read'
        ).length;
      }

      return {
        ...itemObj,
        chatCount,
        unreadCount
      };
    }));

    res.send(allWithChat);
  })
);

// get orders by summary filters
orderRouter.get(
  '/summary',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          numOrders: { $sum: 1 },
          totalSales: { $sum: '$totalPrice' },
        },
      },
    ]);

    const users = await User.aggregate([
      {
        $group: {
          _id: null,
          numUsers: { $sum: 1 },
        },
      },
    ]);

    const deliveryMen = await User.aggregate([
      {
        $group: {
          _id: null,
          numDeliveryMan: {
            $sum: { $cond: [{ $eq: ['$isDeliveryMan', true] }, 1, 0] },
          },
        },
      },
    ]);

    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%d-%m-%Y', date: '$createdAt' } },
          orders: { $sum: 1 },
          sales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const productCategories = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.send({ users, orders, deliveryMen, dailyOrders, productCategories });
  })
);

  // Seller earnings endpoint (daily and weekly)
  orderRouter.get(
    '/seller-earnings',
    isAuth,
    expressAsyncHandler(async (req, res) => {
      const sellerId = req.user && req.user.isSeller ? req.user._id : null;
      if (!sellerId) {
        return res.status(400).send({ message: 'Seller not identified' });
      }
      // Daily earnings for last 30 days
      const daily = await Order.aggregate([
        { $match: { seller: sellerId, isPaid: true, deleted: { $eq: false } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
            total: { $sum: '$totalPrice' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]);
      // Weekly earnings for last 12 weeks
      const weekly = await Order.aggregate([
        { $match: { seller: sellerId, isPaid: true, deleted: { $eq: false } } },
        {
          $group: {
            _id: { $isoWeek: '$paidAt' },
            weekStart: { $min: '$paidAt' },
            total: { $sum: '$totalPrice' },
          },
        },
        { $sort: { weekStart: -1 } },
        { $limit: 12 },
      ]);
      res.send({ daily, weekly });
    })
  );

// Deleted by the user
orderRouter.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.deleted = true;
      order.isActive = false;
      order.status = 'Cancelado';

      if (order.deliveryman && order.deliveryman.id) {
        const User = mongoose.model('User');
        await User.updateOne(
          { _id: order.deliveryman.id },
          { $set: { 'deliveryman.hasActiveService': false } }
        );
      }

      await order.save();

      res.send({ message: `Pedido removido com sucesso` });
    } else {
      const trip = await RequestService.findById(req.params.id);
      if (trip) {
        trip.deleted = true;
        trip.isActive = false;
        trip.status = 'Cancelado';
        
        if (trip.deliveryman && trip.deliveryman.id) {
          const User = mongoose.model('User');
          await User.updateOne(
            { _id: trip.deliveryman.id },
            { $set: { 'deliveryman.hasActiveService': false } }
          );
        }

        await trip.save();
        res.send({ message: `Pedido removido com sucesso` });
      } else {
        res.status(404).send({ message: 'Pedido no encontrado' });
      }
    }
  })
);

// Deleted by the seller
orderRouter.delete(
  '/seller/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDeletedBySeller = true;
      order.deleted = true;
      order.isActive = false;
      order.status = 'Cancelado';

      if (order.deliveryman && order.deliveryman.id) {
        const User = mongoose.model('User');
        await User.updateOne(
          { _id: order.deliveryman.id },
          { $set: { 'deliveryman.hasActiveService': false } }
        );
      }

      await order.save();

      res.send({ message: `Pedido removido com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }
  })
);

orderRouter.delete(
  '/admin/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.deleted = true;
      order.isActive = false;
      order.status = 'Cancelado';
      order.targetDriverId = null;
      if (order.deliveryman && order.deliveryman.id) {
        const User = mongoose.model('User');
        await User.updateOne(
          { _id: order.deliveryman.id },
          { $set: { 'deliveryman.hasActiveService': false } }
        );
        order.deliveryman.id = null;
      }

      await order.save();

      res.send({ message: `Pedido removido com sucesso (Soft Delete)` });
    } else {
      res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }
  })
);

// get order by product id
orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate({
        path: 'seller',
        populate: {
          path: 'userId'
        }
      })
      .populate('user', 'name phoneNumber profileImage');

    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Actualizar o estado do pedido para pago
orderRouter.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }

    order.isPaid = true;
    order.stepStatus = 1;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();

    const sellerOfProduct = await getSellerUser(updatedOrder.seller);
    const clientOfProduct = await User.findById(updatedOrder.user);

    //  Para envio de mensagens
    let message = `Olï¿½! ?? O pagamento referente ao pedido ${updatedOrder.code} no valor de ${updatedOrder.totalPrice} foi confirmado com sucesso! Agora, estamos preparando tudo para vocï¿½. Obrigado por confiar na Nhiquela!`;
    // sendEmailOrderToSeller(req,message, sellerOfProduct, updatedOrder, res);

    if (sellerOfProduct?.deviceToken) {
      //toSeller
      createNotification({
        message: message,
        receiver_id: updatedOrder.seller,
        sender_id: updatedOrder.user,
        orderID: updatedOrder._id,
        pushToken: sellerOfProduct.deviceToken,
      });
    }

    if (clientOfProduct?.deviceToken) {
      //toOrderClient
      createNotification({
        message: message,
        receiver_id: updatedOrder.user,
        sender_id: updatedOrder.seller,
        orderID: updatedOrder._id,
        pushToken: clientOfProduct.deviceToken
      });
    }

    if (sellerOfProduct) {
      //  Para envio de mensagens
      let msgSeller = `Olá, a Nhiquela gostaria de lhe informar que possui um novo pedido com o código ${updatedOrder.code}.`;
      //  sendSMSToSellerUSendIt(sellerOfProduct, msgSeller);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`seller_${updatedOrder.seller}`).emit('order_paid', { order: updatedOrder });
      io.to(`user_${updatedOrder.user}`).emit('order_paid', { order: updatedOrder });
      // update room
      io.to(`order_${updatedOrder._id}`).emit('order_updated', { order: updatedOrder });
    }

    res.send({ message: `Pedido Pago`, order: updatedOrder });
  })
);

// Pedido aceite pelo fornecedor
orderRouter.put(
  '/:id/accept',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }

    const wasAccepted = order.isAccepted;

    order.isAccepted = true;
    order.isCanceled = false;
    order.stepStatus = 2;
    order.status = 'Aceite';

    // Se o método de pagamento for carteira ou transferência (qualquer um diferente de dinheiro), 
    // marcar o pedido como pago ao aceitar, pois significa que o fornecedor confirmou o recebimento/comprovativo.
    if (order.paymentMethod && !order.paymentMethod.toLowerCase().includes('dinheiro')) {
      order.isPaid = true;
      order.paidAt = Date.now();
    }

    if (!wasAccepted) {
      // --- SELLER WALLET DEDUCTION LOGIC ---
      const sellerUser = await getSellerUser(order.seller);
      if (sellerUser && sellerUser.isSeller) {
        if (!sellerUser.seller.hasUsedFreeSale) {
          // First sale is free
          sellerUser.seller.hasUsedFreeSale = true;
          await sellerUser.save();
          console.log(`[accept] Primeira venda do fornecedor ${sellerUser.name} - isenção de comissão ativada.`);
        } else {
          // Calculate and deduct fee
          let feePercentage = 0.15; // Default 15%
          try {
            const Settings = mongoose.model('Settings');
            const commSetting = await Settings.findOne({ key: 'platform_commission_rate' });
            if (commSetting && commSetting.value !== undefined) {
              feePercentage = Number(commSetting.value) / 100;
            }
          } catch (err) {
            console.log('Error fetching platform_commission_rate from settings:', err.message);
          }

          // If provider subcategory has a specific commission rate configured, override
          const Provider = mongoose.model('Provider');
          const provider = await Provider.findById(order.seller);
          const subcategoryRefId = provider?.subcategoryId || sellerUser.seller.tipoEstabelecimento;
          if (subcategoryRefId) {
            const subcategory = await ProviderSubcategory.findById(subcategoryRefId);
            if (subcategory && subcategory.serviceCommission > 0) {
              feePercentage = subcategory.serviceCommission / 100;
            } else if (subcategory && subcategory.percentageFee > 0) {
              feePercentage = subcategory.percentageFee / 100;
            }
          }

          const basePrice = order.itemsPrice || order.totalPrice || 0;
          const feeAmount = basePrice * feePercentage;

          if (feeAmount > 0) {
            let sellerWallet = await Wallet.findOne({ $or: [{ ownerId: order.seller }, { ownerId: sellerUser._id }, { userId: sellerUser._id }] });
            if (!sellerWallet) {
              sellerWallet = new Wallet({
                ownerId: sellerUser._id,
                ownerType: 'seller',
                userId: sellerUser._id,
                balance: 0,
              });
            }
            sellerWallet.balance -= feeAmount;
            sellerWallet.updatedAt = new Date();
            await sellerWallet.save();

            await Transaction.create({
              walletId: sellerWallet._id,
              type: 'debit',
              amount: feeAmount,
              method: 'commission',
              description: `Comissão da venda - Pedido #${order.code}`,
              status: 'confirmado'
            });

            console.log(`[accept] Comissão de ${feeAmount} MT (${(feePercentage * 100).toFixed(0)}%) debitada do fornecedor ${sellerUser.name}. Novo saldo: ${sellerWallet.balance} MT`);

            // Auto-close store if balance is below 50 MT
            if (sellerWallet.balance < 50) {
              sellerUser.seller.openstore = false;
              await sellerUser.save();

              const targetSellerId = provider ? provider._id : sellerUser._id;
              const Product = mongoose.model('Product');
              await Product.updateMany(
                { seller: targetSellerId },
                { isSellerOpen: false }
              );

              console.log(`[accept] ⚠️ Fornecedor ${sellerUser.name} fechado automaticamente devido a saldo baixo (${sellerWallet.balance} MT < 50 MT).`);

              // Emitir evento pelo socket de status alterado
              const io = req.app.get('io');
              if (io) {
                io.emit('storeStatusChanged', {
                  sellerId: targetSellerId,
                  userId: sellerUser._id,
                  sellerName: sellerUser.seller?.name || sellerUser.name,
                  isOpen: false,
                });
              }
            }

            // Emit walletUpdated socket event instantly!
            const io = req.app.get('io');
            if (io) {
              const userId = sellerUser._id.toString();
              io.to(`user_${userId}`).emit('walletUpdated', {
                message: `Dedução de comissão (${(feePercentage * 100).toFixed(0)}%): -${feeAmount.toFixed(2)} MT`
              });
              io.to(`seller_${userId}`).emit('walletUpdated', {
                message: `Dedução de comissão (${(feePercentage * 100).toFixed(0)}%): -${feeAmount.toFixed(2)} MT`
              });
            }
          }
        }
      }
      // --- END SELLER WALLET DEDUCTION LOGIC ---
    }

    await order.save();

    // Buscar o pedido novamente com populate
    const updatedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber profileImage');

    //  Para envio de mensagens
    const message = `Olá, o seu pedido nÂº ${order.code} foi aceite com sucesso pelo fornecedor.`;

    //  sendSMSToUSendIt(req, message);
    const sellerOfProduct = await getSellerUser(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if (sellerOfProduct?.deviceToken) {
      //toSeller
      createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken,
      });
    }

    if (clientOfProduct?.deviceToken) {
      //toOrderClient
      createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.deviceToken
      });
    }

    // sendEmailOrderStatus(req,message, order, res);

    res.send({ order: updatedOrder, message: `Pedido nº ${order.code} aceite com sucesso` });
  })
);

// Resposta do fornecedor: Aceitar ou Rejeitar pedido (com motivo)
orderRouter.put(
  '/:id/respond',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { action, reason } = req.body; // action: 'accept' | 'reject'
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado' });
    }

    if (action === 'accept') {
      order.isAccepted = true;
      order.isCanceled = false;
      order.stepStatus = 2;
      order.status = 'Aceite';
      // --- SELLER WALLET DEDUCTION LOGIC ---
      if (!order.isCommissionProcessed) {
        order.isCommissionProcessed = true;
        const sellerUser = await getSellerUser(order.seller);
        if (sellerUser && sellerUser.isSeller) {
          if (!sellerUser.seller.hasUsedFreeSale) {
            // First sale is free
            sellerUser.seller.hasUsedFreeSale = true;
            await sellerUser.save();
            console.log(`[respond] Primeira venda do fornecedor ${sellerUser.name} - isenção de comissão ativada.`);
          } else {
            // Calculate and deduct fee
            let feePercentage = 0.15; // Default is now 15%
            try {
              const Settings = mongoose.model('Settings');
              const commSetting = await Settings.findOne({ key: 'platform_commission_rate' });
              if (commSetting && commSetting.value !== undefined) {
                feePercentage = Number(commSetting.value) / 100;
              }
            } catch (err) {
              console.log('Error fetching platform_commission_rate from settings:', err.message);
            }

            // If provider subcategory has a specific commission rate configured, override
            const Provider = mongoose.model('Provider');
            const provider = await Provider.findById(order.seller);
            const subcategoryRefId = provider?.subcategoryId || sellerUser.seller.tipoEstabelecimento;
            if (subcategoryRefId) {
              const subcategory = await ProviderSubcategory.findById(subcategoryRefId);
              if (subcategory && subcategory.serviceCommission > 0) {
                feePercentage = subcategory.serviceCommission / 100;
              } else if (subcategory && subcategory.percentageFee > 0) {
                feePercentage = subcategory.percentageFee / 100;
              }
            }

            const basePrice = order.itemsPrice || order.totalPrice || 0;
            const feeAmount = basePrice * feePercentage;

            if (feeAmount > 0) {
              let sellerWallet = await Wallet.findOne({ $or: [{ ownerId: order.seller }, { ownerId: sellerUser._id }, { userId: sellerUser._id }] });
              if (!sellerWallet) {
                sellerWallet = new Wallet({
                  ownerId: sellerUser._id,
                  ownerType: 'seller',
                  userId: sellerUser._id,
                  balance: 0,
                });
              }
              sellerWallet.balance -= feeAmount;
              sellerWallet.updatedAt = new Date();
              await sellerWallet.save();

              await Transaction.create({
                walletId: sellerWallet._id,
                type: 'debit',
                amount: feeAmount,
                method: 'commission',
                description: `Comissão da venda - Pedido #${order.code}`,
                status: 'confirmado'
              });

              console.log(`[respond] Comissão de ${feeAmount} MT (${(feePercentage * 100).toFixed(0)}%) debitada do fornecedor ${sellerUser.name}. Novo saldo: ${sellerWallet.balance} MT`);

              // Auto-close store if balance is below 50 MT
              if (sellerWallet.balance < 50) {
                sellerUser.seller.openstore = false;
                await sellerUser.save();

                const targetSellerId = provider ? provider._id : sellerUser._id;
                const Product = mongoose.model('Product');
                await Product.updateMany(
                  { seller: targetSellerId },
                  { isSellerOpen: false }
                );

                console.log(`[respond] ⚠️ Fornecedor ${sellerUser.name} fechado automaticamente devido a saldo baixo (${sellerWallet.balance} MT < 50 MT).`);

                // Emitir evento pelo socket de status alterado
                const io = req.app.get('io');
                if (io) {
                  io.emit('storeStatusChanged', {
                    sellerId: targetSellerId,
                    userId: sellerUser._id,
                    sellerName: sellerUser.seller?.name || sellerUser.name,
                    isOpen: false,
                  });
                }
              }

              // Emit walletUpdated socket event instantly!
              const io = req.app.get('io');
              if (io) {
                const userId = sellerUser._id.toString();
                io.to(`user_${userId}`).emit('walletUpdated', {
                  message: `Dedução de comissão (${(feePercentage * 100).toFixed(0)}%): -${feeAmount.toFixed(2)} MT`
                });
                io.to(`seller_${userId}`).emit('walletUpdated', {
                  message: `Dedução de comissão (${(feePercentage * 100).toFixed(0)}%): -${feeAmount.toFixed(2)} MT`
                });
              }
            }
          }
        }
      }
      // --- END SELLER WALLET DEDUCTION LOGIC ---

      const savedOrder = await order.save();
      const updatedOrder = await Order.findById(savedOrder._id)
        .populate('user', 'name phoneNumber profileImage')
        .populate('seller');

      const message = `Olá! O seu pedido nº ${order.code} foi aceite com sucesso pelo fornecedor e está em preparação.`;

      const sellerOfProduct = await getSellerUser(order.seller);
      const clientOfProduct = await User.findById(order.user);

      if (clientOfProduct?.deviceToken) {
        createNotification({
          message,
          receiver_id: order.user,
          sender_id: order.seller,
          orderID: order._id,
          pushToken: clientOfProduct.deviceToken,
        });
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${order.user}`).emit('orderAccepted', { orderId: order._id, order: updatedOrder });
        io.to(`user_${order.user}`).emit('orderStatusUpdated', updatedOrder);
        io.to(`order_${order._id}`).emit('orderStatusUpdated', updatedOrder);
        io.to(`order_${order._id}`).emit('order_updated', { order: updatedOrder });
        io.to(`seller_${order.seller}`).emit('order_updated', { order: updatedOrder });
      }

      return res.send({ message: `Pedido nº ${order.code} aceite com sucesso`, order: updatedOrder });
    } else if (action === 'reject') {
      const rejectReason = reason || req.body.message || 'Pedido rejeitado pelo fornecedor';
      order.isAccepted = false;
      order.isCanceled = true;
      order.stepStatus = 8;
      order.status = 'Rejeitado';
      order.canceledReason = rejectReason;

      // Repor stock dos produtos
      if (order.orderItems && order.orderItems.length > 0) {
        await Promise.all(
          order.orderItems.map(async (item) => {
            const prodId = item.product || item._id;
            if (prodId) {
              const prod = await Product.findById(prodId);
              if (prod) {
                prod.countInStock = (prod.countInStock || 0) + parseInt(item.quantity || 1);
                await prod.save();
              }
            }
          })
        );
      }

      const savedOrder = await order.save();
      const updatedOrder = await Order.findById(savedOrder._id)
        .populate('user', 'name phoneNumber profileImage')
        .populate('seller');

      const message = `Olá, informamos que o seu pedido nº ${order.code} não pôde ser aceite pelo fornecedor. Motivo: ${rejectReason}`;

      const clientOfProduct = await User.findById(order.user);
      if (clientOfProduct?.deviceToken) {
        createNotification({
          message,
          receiver_id: order.user,
          sender_id: order.seller,
          orderID: order._id,
          pushToken: clientOfProduct.deviceToken,
        });
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${order.user}`).emit('orderRejected', { orderId: order._id, reason: rejectReason, order: updatedOrder });
        io.to(`user_${order.user}`).emit('orderStatusUpdated', updatedOrder);
        io.to(`order_${order._id}`).emit('orderStatusUpdated', updatedOrder);
        io.to(`order_${order._id}`).emit('order_updated', { order: updatedOrder });
        io.to(`seller_${order.seller}`).emit('order_updated', { order: updatedOrder });
      }

      return res.send({ message: `Pedido nº ${order.code} rejeitado`, order: updatedOrder });
    } else {
      return res.status(400).send({ message: 'Ação inválida. Use action: "accept" ou "reject"' });
    }
  })
);

// a comida esta pronta
orderRouter.put(
  '/:id/availableToDeliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }

    order.isAvailableToDeliver = true;
    order.status = 'Pronto';
    order.stepStatus = 3;
    if (order.addressPrice === 0) {
      order.status = 'Finalizado';
      order.isInTransit = true;
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();

    // Recarrega o pedido com o campo `user` populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber profileImage');

    const message = `Olá, a Nhiquela lhe informa que o pedido nÂº ${order.code} esta pronto e disponivel para ser entregue.`;

    const sellerOfProduct = await getSellerUser(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if (sellerOfProduct?.deviceToken) {
      //toSeller
      createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken,
      });
    }

    if (clientOfProduct?.deviceToken) {
      //toOrderClient
      createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.deviceToken
      });
    }

    sendEmailOrderStatus(req, message, order, res);

    // sendSMSToUSendItAdmin(message);
    res.send({ order: savedOrder, message: `Pedido disponï¿½vel para entrega` });
  })
);




// disponivel para entrega
orderRouter.put(
  '/:id/toDeliv',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isAvailableToDeliver = true;
      
      // Update transport if provided by seller
      if (req.body.transportTypeId) {
        order.transportTypeId = req.body.transportTypeId;
        order.transportType = req.body.transportType;
      }

      if (req.body.isExternalDelivery) {
        order.isExternalDelivery = true;
        order.status = 'Disponível para entrega';
        order.stepStatus = 3;
      } else if (
        req.body.noTransport === true || 
        req.body.isNoTransport === true || 
        (!order.transportType || order.transportType === 'Nenhum' || order.transportType === null) && !order.transportTypeId
      ) {
        // Categoria/Serviço sem transporte: passa diretamente para "Em trânsito"
        order.status = 'Em trânsito';
        order.isInTransit = true;
        order.stepStatus = 4;
      } else {
        order.status = 'Disponível para entrega';
        order.stepStatus = 3;
      }

      if (order.addressPrice === 0 && (order.status !== 'Em trânsito')) {
        order.status = 'Finalizado';
        order.isInTransit = true;
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      } else if (order.status === 'Disponível para entrega' && !order.isExternalDelivery) {
        // Criar ou atualizar RequestService para motoristas (Intelligent Dispatch)
        try {
          const mongoose = await import('mongoose');
          const ProviderModel = mongoose.default.model('Provider');
          const provider = await ProviderModel.findById(order.seller).populate('userId');
          const sellerOfProduct = provider?.userId || null;
          const clientOfProduct = await User.findById(order.user);

          const providerName = provider?.name || sellerOfProduct?.name || 'Fornecedor';
          const providerAddress = provider?.location?.address || sellerOfProduct?.address || 'Local do Fornecedor';
          const providerLat = provider?.location?.lat || sellerOfProduct?.locationGeo?.coordinates[1] || 0;
          const providerLng = provider?.location?.lng || sellerOfProduct?.locationGeo?.coordinates[0] || 0;

          const clientName = order.deliveryAddress?.fullName || clientOfProduct?.name || 'Cliente';
          const clientPhone = order.deliveryAddress?.phoneNumber || clientOfProduct?.phoneNumber || 0;
          const clientAddress = order.deliveryAddress?.address || order.address?.address || order.address || 'Destino não definido';
          const clientLat = order.deliveryAddress?.lat || order.address?.latitude || 0;
          const clientLng = order.deliveryAddress?.lng || order.address?.longitude || 0;

          const calculatedDeliveryFare = order.addressPrice || order.deliveryFee || order.deliveryPrice || (
            (providerLat !== 0 && clientLat !== 0) 
              ? Math.max(100, Math.round(Math.sqrt(Math.pow(clientLat - providerLat, 2) + Math.pow(clientLng - providerLng, 2)) * 111 * 25))
              : 150
          );
          order.addressPrice = calculatedDeliveryFare;
          order.deliveryFee = calculatedDeliveryFare;
          order.deliveryPrice = calculatedDeliveryFare;

          let serviceToDispatch = null;
          if (order.requestServiceId) {
            const existingService = await RequestService.findById(order.requestServiceId);
            if (existingService) {
              existingService.status = 'Pendente';
              existingService.stepStatus = 1;
              existingService.targetDriverId = req.body.targetDriverId || null;
              existingService.deliveryman = null;
              existingService.deliveryPrice = calculatedDeliveryFare;
              existingService.finalAgreedPrice = calculatedDeliveryFare;
              existingService.basePrice = calculatedDeliveryFare;
              if (order.transportTypeId) existingService.transportTypeId = order.transportTypeId;
              if (order.transportType) existingService.transportType = order.transportType;
              existingService.paymentMethod = 'Dinheiro';
              existingService.paymentOption = 'Pagamento na entrega';
              serviceToDispatch = await existingService.save();
            }
          }

          if (!serviceToDispatch) {
            const newRequestService = new RequestService({
              name: clientName,
              phoneNumber: clientPhone,
              goodType: 'Encomenda Nhiquela',
              transportType: order.transportType || 'N/A',
              transportTypeId: order.transportTypeId || null,
              deliverCity: 'Maputo',
              origin: providerAddress,
              destination: clientAddress,
              originDetails: {
                address: providerAddress,
                lat: providerLat,
                lng: providerLng
              },
              destinationDetails: {
                address: clientAddress,
                lat: clientLat,
                lng: clientLng
              },
              description: `Entrega da encomenda ${order.code} da loja ${providerName}`,
              paymentMethod: 'Dinheiro',
              paymentOption: 'Pagamento na entrega',
              deliveryPrice: calculatedDeliveryFare,
              finalAgreedPrice: calculatedDeliveryFare,
              basePrice: calculatedDeliveryFare,
              user: order.user,
              isPaid: false,
              paidAt: null,
              status: 'Pendente',
              stepStatus: 1,
              code: order.code,
              targetDriverId: req.body.targetDriverId || null,
            });

            serviceToDispatch = await newRequestService.save();
            order.requestServiceId = serviceToDispatch._id;
          }

          // Dispatch the drivers!
          const io = req.app.get('io');
          if (io && serviceToDispatch) {
            DispatchService.startDispatch(serviceToDispatch, io);
          }
        } catch (e) {
          console.error('Erro ao criar/re-despachar RequestService a partir de Encomenda:', e);
        }
      }

      const savedOrder = await order.save();

      let message = `Olá, a Nhiquela lhe informa que o pedido nº ${order.code} está pronto e disponível para entrega.`;

      const mongoose = await import('mongoose');
      const ProviderModel = mongoose.default.model('Provider');
      const provider = await ProviderModel.findById(order.seller).populate('userId');
      const sellerOfProduct = provider?.userId || null;
      const clientOfProduct = await User.findById(order.user);

      //toSeller
      createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct?.deviceToken || 'none',
      });
      //toOrderClient
      createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct?.deviceToken || 'none'
      });



      sendEmailOrderStatus(req, message, order, res);

      // sendSMSToUSendItAdmin(message);
      res.send({ order: savedOrder, message: `Pedido disponível para entrega` });
    }
  })
);




// Actualizar quando o fornecedor e pago
orderRouter.put(
  '/:id/updatesupplierpayment',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isSupplierPaid = true;
      const savedOrder = await order.save();

      let message = `Olá, a Nhiquela lhe informa que o pagamento correspondente ao pedido nÂº ${order.code} foi pago com sucesso.`;

      // sendEmailOrderStatus(req,message, order, res);

      const sellerOfProduct = await getSellerUser(order.seller);
      const clientOfProduct = await User.findById(order.user);

      if (sellerOfProduct.deviceToken && clientOfProduct.deviceToken) {

        //toSeller
        createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.deviceToken,

        });
        //toOrderClient
        createNotification({
          message: message,
          receiver_id: order.user,
          sender_id: order.seller,
          orderID: order._id,
          pushToken: clientOfProduct.deviceToken
        });
      }



      // sendSMSToUSendItAdmin(message);
      res.send({ order: savedOrder, message: `Fornecedor pago com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }
  })
);

// Actualizar quando o fornecedor e pago
orderRouter.put(
  '/:id/updatedeliverpayment',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDeliverPaid = true;
      const savedOrder = await order.save();

      let message = `Olá, a Nhiquela lhe informa que o pagamento correspondente ao pedido nÂº ${order.code} foi pago com sucesso.`;

      // sendEmailOrderStatus(req,message, order, res);

      const sellerOfProduct = await getSellerUser(order.seller);
      const clientOfProduct = await User.findById(order.user);

      if (sellerOfProduct.deviceToken && clientOfProduct.deviceToken) {
        //toSeller
        createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.deviceToken,

        });
        //toOrderClient
        createNotification({
          message: message,
          receiver_id: order.user,
          sender_id: order.seller,
          orderID: order._id,
          pushToken: clientOfProduct.deviceToken
        });

      }



      // sendSMSToUSendItAdmin(message);
      res.send({ order: savedOrder, message: `Entregador pago com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Pedido Pedido aceite
orderRouter.put(
  '/:id/acceptedByDeliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user_deliver = await User.findById(req.user._id);

    if (!user_deliver) {
      return res.status(404).send({ message: 'Motorista não encontrado na base de dados.' });
    }

    // ✅ Verificações read-only FORA da transação para reduzir latência
    const orderCheck = await Order.findOne({ _id: req.params.id, status: { $in: ['Pendente', 'Pronto', 'Aceite', 'Disponível para entrega'] } });
    if (!orderCheck) {
      return res.status(409).send({ message: 'Pedido já foi aceite por outro motorista ou não está disponível' });
    }

    // Calcular comissão e verificar saldo fora da transação
    const { calculateDynamicCommission } = await import('../services/walletService.js');
    const commissionAmount = await calculateDynamicCommission(orderCheck);
    const canAfford = await canAffordTripCommission(user_deliver._id, commissionAmount);
    if (!canAfford) {
      return res.status(400).send({ message: 'Saldo insuficiente. Para aceitar este serviço é necessário possuir saldo suficiente na sua carteira digital para cobrir a comissão da Nhiquela. Efetue uma recarga e tente novamente.' });
    }

    let deliverymanData = {};
    if (user_deliver.isDeliveryMan) {
      deliverymanData = {
        id: user_deliver._id,
        photo: user_deliver.deliveryman?.photo || '',
        name: user_deliver.deliveryman?.name || '',
        phoneNumber:  user_deliver.deliveryman?.phoneNumber || user_deliver.phoneNumber || 0,
        transport_type: user_deliver.deliveryman?.transport_type || '',
        transport_color: user_deliver.deliveryman?.transport_color || '',
        transport_registration: user_deliver.deliveryman?.transport_registration || '',
      };
    }

    // ✅ Transação mínima — só a escrita atómica
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Atomic update — impede race conditions
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ['Pendente', 'Pronto', 'Aceite', 'Disponível para entrega'] } },
        {
          $set: {
            status: 'Pedido aceite',
            stepStatus: 4,
            isAccepted: true,
            deliveryman: deliverymanData
          }
        },
        { new: true, session }
      );

      if (!updatedOrder) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).send({ message: 'Pedido já foi aceite por outro motorista ou não está disponível' });
      }

      await session.commitTransaction();
      session.endSession();

      // Side-effects fora da transação (populate, notificações, WebSocket)
      const fullOrder = await Order.findById(updatedOrder._id)
        .populate('user', 'name phoneNumber profileImage')
        .populate('seller', 'name location');

      const clientOfProduct = await User.findById(updatedOrder.user);
      let message = `Olá, a Nhiquela informa que o entregador aceitou o pedido nº ${updatedOrder.code}`;

      if (clientOfProduct && clientOfProduct.deviceToken) {
        createNotification({
          message: message,
          receiver_id: updatedOrder.user,
          sender_id: updatedOrder.seller,
          orderID: updatedOrder._id,
          pushToken: clientOfProduct.deviceToken
        }).catch(err => console.error('[Notification] Falha:', err.message));
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`driver_${user_deliver._id}`).emit('order_assigned', fullOrder || updatedOrder);
        io.to(`order_${updatedOrder._id}`).emit('order_updated', fullOrder || updatedOrder);
        io.emit('order_taken', { orderId: updatedOrder._id.toString(), acceptedBy: user_deliver._id.toString() });
      }

      res.send({ order: fullOrder || updatedOrder, message: `Pedido aceite` });

    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      session.endSession();
      console.error('Erro ao aceitar pedido:', error);
      res.status(500).send({ message: 'Erro ao aceitar o pedido. Tente novamente.' });
    }
  })
);


// Motorista cancela/recusa a viagem de ecommerce
orderRouter.put(
  '/:id/cancelByDeliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(req.params.id).session(session);

      if (order) {
        order.status = 'Pendente';
        order.stepStatus = 1;
        order.isAccepted = false;
        
        // Libertar o motorista
        if (order.deliveryman && order.deliveryman.id) {
          await User.updateOne(
            { _id: order.deliveryman.id },
            { $set: { 'deliveryman.hasActiveService': false } },
            { session }
          );
        }
        
        order.deliveryman = null;

        await order.save({ session });
        await session.commitTransaction();
        session.endSession();

        // Broadcast to all drivers that this order is available again
        const io = req.app.get('io');
        if (io) {
          io.emit('order_updated', order);
          io.to(`driver_${req.user._id}`).emit('service_released', { message: 'Pedido recusado.' });
        }

        res.send({ message: 'Pedido recusado com sucesso', order });
      } else {
        await session.abortTransaction();
        session.endSession();
        res.status(404).send({ message: 'Pedido não encontrado' });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Erro ao cancelar pedido pelo entregador:', error);
      res.status(500).send({ message: 'Erro ao recusar pedido' });
    }
  })
);

// O pedido esta a caminho
orderRouter.put(
  '/:id/intransit',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      //     order.isPaid = true;
      //     order.paidAt= Date.now();
      order.status = 'Em trânsito';
      order.isInTransit = true;
      order.stepStatus = 4;

      // if(user_deliver.isDeliveryMan){

      //   order.deliveryman = {
      //     photo: user_deliver.deliveryman.photo,
      //     name:  user_deliver.deliveryman.name,
      //     phoneNumber:  user_deliver.deliveryman.phoneNumber,
      //     transport_type:  user_deliver.deliveryman.transport_type,
      //     transport_color:  user_deliver.deliveryman.transport_color,
      //     transport_registration:  user_deliver.deliveryman.transport_registration,
      //   }
      // }


      // order.paymentResult = {
      //   id: req.body.id,
      //   status: req.body.status,
      //   update_time: req.body.update_time,
      //   email_address: req.body.email_address,
      // };
      const savedOrder = await order.save();

      //  Para envio de mensagens

      let message = `A Nhiquela lhe informa que o pedido ${order.code} esta a caminho do destino indicado.`;

      //  sendSMSToUSendIt(req,message);

      const sellerOfProduct = await getSellerUser(order.seller);
      const clientOfProduct = await User.findById(order.user);

      //toSeller
      createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        title: 'Pedido em trânsito'
      });
      //toOrderClient
      createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        title: 'Pedido em trânsito'
      });

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        try {
          await savedOrder.populate('user', 'name phoneNumber profileImage');
        } catch (e) {
          console.error("Error populating user:", e);
        }
        
        io.to(`order_${order._id}`).emit('order_updated', savedOrder);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', savedOrder);
        }
      }

      res.send({ order: savedOrder, message: `Pedido em trânsito` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// O entregador Confirma a chegada do destino de entrega
orderRouter.put(
  '/:id/confirmDestination',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = 'No destino indicado';
      order.stepStatus = 6;
      
      order.arrivedAtDestination = Date.now();
      if (req.body.latitude && req.body.longitude) {
        order.arrivalLatitude = req.body.latitude;
        order.arrivalLongitude = req.body.longitude;
      }
      
      const updateOrder = await order.save();


      const clientOfProduct = await User.findById(order.user);

      //  Para envio de mensagens
      let message = `O driver já chegou no destino, vá a aba meus pedidos`;

      //  sendSMSToUSendIt(req,message);

      // sendEmailOrderToSeller(req,message,sellerOfProduct, updateOrder, res);

      //toSeller
      // createNotification({
      //   message: message,
      //   receiver_id: order.seller,
      //   sender_id: order.user,
      //   orderID: order._id,
      //   deviceToken: sellerOfProduct.deviceToken,

      // });
      //toOrderClient
      createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        title: 'Motorista Chegou!',
        type: 'driver_arrived'
      });
      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        try {
          await updateOrder.populate('user', 'name phoneNumber profileImage');
        } catch (e) {
          console.error("Error populating user:", e);
        }
        
        io.to(`order_${order._id}`).emit('order_updated', updateOrder);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', updateOrder);
        }
      }

      res.send({ message: `No destino indicado`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido no encontrado' });
    }
  })
);

// Motorista cancela viagem por "Cliente não compareceu" (após 5 minutos)
orderRouter.put(
  '/:id/driver-no-show',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = 'Cancelado';
      order.stepStatus = 8; // Status de cancelamento/falha
      
      const updateOrder = await order.save();

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        if (updateOrder.deliveryman?.id) {
          io.to(`driver_${updateOrder.deliveryman.id}`).emit('order_updated', updateOrder);
        }
      }

      res.send({ message: `Viagem cancelada por não comparência`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// O cliente finaliza a confirmar a recepcao do pedido
orderRouter.put(
  '/:id/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const MAX_RETRIES = 3;
    let lastError;
    let finalOrder = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let session = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (sessErr) {
        session = null;
      }

      try {
        const orderQuery = Order.findById(req.params.id);
        if (session) orderQuery.session(session);
        const order = await orderQuery;

        if (!order) {
          if (session) {
            await session.abortTransaction().catch(() => {});
            session.endSession();
          }
          return res.status(404).send({ message: 'Pedido não encontrado' });
        }

        order.status = 'Entregue';
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.stepStatus = 5;

        await reputationTracker.recordOrderCompleted(order.user).catch(() => {});

        // Calculate and debit commission if a deliveryman exists
        if (order.deliveryman && order.deliveryman.id) {
          const { calculateDynamicCommission } = await import('../services/walletService.js');
          const commissionAmount = await calculateDynamicCommission(order).catch(() => 0);

          try {
            await debitDriverCommissionWithSession(
              order.deliveryman.id,
              commissionAmount,
              `Comissão de serviço para o pedido ${order.code}`,
              'commission',
              session
            );
            
            const updateData = { 
              $set: { 'deliveryman.hasActiveService': false },
              $inc: { completedOrders: 1 } 
            };
            if (session) {
              await User.updateOne({ _id: order.deliveryman.id }, updateData, { session });
            } else {
              await User.updateOne({ _id: order.deliveryman.id }, updateData);
            }
          } catch (error) {
            if (session) {
              await session.abortTransaction().catch(() => {});
              session.endSession();
            }
            return res.status(400).send({ message: error.message });
          }
        }


        let savedOrder;
        if (session) {
          savedOrder = await order.save({ session });
          await session.commitTransaction();
          session.endSession();
        } else {
          savedOrder = await order.save();
        }
        finalOrder = savedOrder;
        break;

      } catch (error) {
        if (session) {
          await session.abortTransaction().catch(() => {});
          session.endSession();
        }

        lastError = error;
        break;
      }
    }

    if (!finalOrder) {
      console.error('Erro na finalização do pedido:', lastError);
      return res.status(500).send({ message: lastError?.message || 'Erro ao finalizar o pedido.' });
    }

    // ✅ Fora da transação: notificações e WebSocket
    const savedOrder = finalOrder;
    const order = savedOrder;

    const sellerOfProduct = await getSellerUser(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if (sellerOfProduct) {
      createNotification({
        message: `O cliente confirmou a recepção do pedido nº ${order.code}.`,
        title: 'Pedido entregue com sucesso!',
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken || 'none',
      });
    }

    if (clientOfProduct) {
      createNotification({
        message: `Confirmámos a receção do seu pedido nº ${order.code}. Esperamos vê-lo de novo em breve!`,
        title: '🎉 Obrigado pela preferência!',
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.deviceToken || 'none',
      });
    }

    const io = req.app.get('io');

    // Finalizar RequestService vinculado
    if (order.requestServiceId) {
      try {
        const RequestService = mongoose.model('RequestService');
        const updatedRequest = await RequestService.findOneAndUpdate(
          { _id: order.requestServiceId },
          {
            $set: {
              isDelivered: true,
              deliveredAt: Date.now(),
              status: 'Concluído',
              stepStatus: 7
            }
          },
          { new: true }
        );
        if (updatedRequest && io) {
          io.to(`order_${updatedRequest._id}`).emit('order_updated', updatedRequest);
          if (updatedRequest.deliveryman?.id) {
            io.to(`driver_${updatedRequest.deliveryman.id}`).emit('order_updated', updatedRequest);
            io.to(`driver_${updatedRequest.deliveryman.id}`).emit('service_released', { message: 'Pode agora receber novos pedidos.' });
          }
        }
      } catch (err) {
        console.error('Error finalizing linked RequestService:', err.message);
      }
    }

    if (io) {
      io.to(`order_${order._id}`).emit('order_updated', savedOrder);
      if (order.deliveryman?.id) {
        io.to(`driver_${order.deliveryman.id}`).emit('order_updated', savedOrder);
      }
    }

    res.send({ order: savedOrder, message: `Pedido entregue com sucesso` });
  })
);


// Em caso de cancelamento do pedido
orderRouter.put(
  '/:id/cancel',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.orderItems.map(async o => {

        const product = await Product.findById(o);
        product.countInStock = parseInt(product.countInStock) + parseInt(o.quantity)
        await product.save();

      })
      order.isCanceled = true;
      order.isAccepted = false;
      order.status = 'Cancelado';
      order.stepStatus = 8;
      order.canceledReason = req.body.message;

      // Track reputation for cancelled order
      await reputationTracker.recordOrderCancelled(order.user);


      const savedOrder = await order.save();

      //  Para envio de mensagens

      let message = `Olá, a Nhiquela lamenta lhe informar que o seu pedido nÂº ${order.code} foi cancelado. O motivo do cancelamento poderá verificar pesquisando pelo código.`;

      // sendSMSToUSendIt(req,message);    

      const sellerOfProduct = await getSellerUser(order.seller);
      const clientOfProduct = await User.findById(order.user);

      //toSeller
      createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken,

      });
      //toOrderClient
      createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.deviceToken
      });



      sendEmailOrderToSeller(req, message, sellerOfProduct, order, res);

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', savedOrder);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', savedOrder);
        } else {
          io.emit('order_updated', savedOrder); // broadcast to all
        }
      }

      res.send({ message: `Pedido cancelado com sucesso`, order: savedOrder });
    } else {
      res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }

    // Repor o stock de cada produto do pedido
    await Promise.all(
      order.orderItems.map(async (o) => {
        const product = await Product.findById(o._id);
        if (product) {
          product.countInStock = parseInt(product.countInStock) + parseInt(o.quantity);
          await product.save();
        }
      })
    );

    order.isCanceled = true;
    order.isAccepted = false;
    order.status = 'Cancelado';
    order.stepStatus = 7;
    order.canceledReason = req.body.message;

    // Track reputation for cancelled order
    await reputationTracker.recordOrderCancelled(order.user);

    await order.save();

    // Buscar novamente o pedido com o campo user populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber profileImage');

    const message = `Olá, a Nhiquela lamenta lhe informar que o seu pedido nÂº ${order.code} foi cancelado. O motivo do cancelamento poderï¿½ verificar pesquisando pelo cï¿½digo.`;

    const sellerOfProduct = await getSellerUser(order.seller);
    const clientOfProduct = await User.findById(order.user);

    // Notificaï¿½ï¿½es (se quiser ativar):
    /*
    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      createNotification({
        message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        deviceToken: sellerOfProduct.deviceToken,
      });

      createNotification({
        message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        deviceToken: clientOfProduct.deviceToken,
      });
    }
    */

    // sendEmailOrderToSeller(req, message, sellerOfProduct, order, res);

    res.send({ message: `Pedido cancelado com sucesso`, order: savedOrder });
  })
);


// Pedidos disponï¿½veis para entrega (stepStatus = 3)
orderRouter.get('/status/:status', isAuth, async (req, res) => {
  if (req.params.status === 'available') {
    try {
      const orders = await Order.find({ stepStatus: 3, deleted: false })
        .populate({
          path: 'user',
          select: 'name email phoneNumber seller',
        })
        .sort({ createdAt: -1 });

      const simplifiedOrders = orders.map(order => ({
        ...order.toObject(),
        sellerInfo: order.user?.seller
          ? {
            name: order.user.seller.name,
            latitude: order.user.seller.latitude,
            longitude: order.user.seller.longitude,
          }
          : null
      }));

      console.log("?? Orders com seller simplificado:", JSON.stringify(simplifiedOrders, null, 2));
      return res.json(simplifiedOrders);

    } catch (error) {
      console.error("? Erro ao buscar orders:", error);
      return res.status(500).send({ message: "Erro interno" });
    }
  }
  return res.status(404).send({ message: "Invalid status" });
});

orderRouter.get('/id/:id', isAuth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).send({ message: "Order not found" });
  res.json(order);
});

///////////////////// NEW-ENDPOINT /////////////////

// get orders by user id
orderRouter.get(
  '/orderHistory',
  isAuth,
  expressAsyncHandler(async (req, res) => {

    const orders = await Order.find({ user: req.user._id, isDeletedByRequester: false, deleted: { $eq: false } }).populate('deliveryman').sort({ createdAt: -1 });
    res.send(orders);
  })
);

orderRouter.get(
  '/deliveryman/all',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const deliverymanId = req.user._id;

    const driver = await User.findById(deliverymanId);
    if (!driver) {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }

    const isDriverActive = driver.availability === 'active';
    const hasBalance = await hasSufficientBalance(deliverymanId, driver);
    const canAcceptNewTrips = isDriverActive && hasBalance;
    const rawTransportType = driver.deliveryman?.transport_type;

    // Se transport_type for um ObjectId, resolver para o nome (string)
    // Os pedidos guardam transportType como string (ex: "Mota"), não como ObjectId
    let driverTransportTypeName = null;
    if (rawTransportType) {
      const isObjectId = mongoose.Types.ObjectId.isValid(rawTransportType.toString()) &&
                         rawTransportType.toString().length === 24;
      if (isObjectId) {
        try {
          // Tentar como VehicleType
          const VehicleType = (await import('../models/VehicleTypeModel.js')).default;
          const vType = await VehicleType.findById(rawTransportType);
          if (vType) {
            driverTransportTypeName = vType.name;
          } else {
            // Tentar como ProviderSubcategory
            const ProviderSubcategory = (await import('../models/ProviderSubcategoryModel.js')).default;
            const subcat = await ProviderSubcategory.findById(rawTransportType);
            if (subcat) driverTransportTypeName = subcat.name;
          }
        } catch(e) {
          console.error('[deliveryman/all] Erro ao resolver transport_type:', e.message);
        }
      } else {
        // Já é uma string (ex: "Mota")
        driverTransportTypeName = rawTransportType;
      }
    }

    // Buscar Orders normais (APENAS se o fornecedor chamou o entregador / ativou isAvailableToDeliver)
    const orderConditions = [
      { 'deliveryman.id': deliverymanId },
      { 'deliveryman._id': deliverymanId },
      { deliveryman: deliverymanId }
    ];
    if (canAcceptNewTrips) {
      orderConditions.push({ 
        stepStatus: 3,
        isAvailableToDeliver: true,
        noTransport: { $ne: true },
        isNoTransport: { $ne: true },
        transportType: { $ne: 'Nenhum' }
      });
    }

    const ordersPromise = Order.find({
      deleted: false,
      status: { $nin: ['SEM MOTORISTA', 'SEM_MOTORISTA', 'Cancelado', 'CANCELADO', 'Finalizado', 'Entregue'] },
      $or: orderConditions
    })
      .populate('user', 'name phoneNumber profileImage')
      .populate('seller', 'name location latitude longitude address')
      .lean();

    // Buscar RequestServices de serviços (reboque, mota, etc)
    const requestServiceConditions = [
      { 'deliveryman.id': deliverymanId },
      { 'deliveryman._id': deliverymanId },  // compatibilidade
      { targetDriverId: deliverymanId.toString(), stepStatus: 3 } // SEMPRE mostrar pedidos direcionados a este motorista
    ];
    if (canAcceptNewTrips) {
      const availableCondition = {
        stepStatus: 3,
        status: { $nin: ['SEM MOTORISTA', 'SEM_MOTORISTA', 'Cancelado', 'CANCELADO', 'Finalizado', 'Entregue'] },
        $or: [
          { targetDriverId: { $exists: false } },
          { targetDriverId: null },
          { targetDriverId: '' }
        ]
      };

      // COMPARAÇÃO CORRECTA: sempre por ObjectId quando o motorista tem um ID de veículo
      // O pedido guarda transportType como string (pode ser o ObjectId em string ou o nome)
      // O pedido guarda transportTypeId como ObjectId (novo campo)
      if (rawTransportType) {
        const isObjectId = mongoose.Types.ObjectId.isValid(rawTransportType.toString()) &&
                           rawTransportType.toString().length === 24;
        if (isObjectId) {
          // Comparar pelo ID: tanto no campo transportType (string) como no transportTypeId (ObjectId)
          availableCondition.$and = [{
            $or: [
              { transportType: rawTransportType.toString() },      // Valor guardado como string do ObjectId
              { transportTypeId: new mongoose.Types.ObjectId(rawTransportType.toString()) } // Ou como ObjectId ref
            ]
          }];
        } else if (driverTransportTypeName) {
          // Comparar pelo nome (ex: "Mota")
          availableCondition.transportType = driverTransportTypeName;
        }
      }
      requestServiceConditions.push(availableCondition);
    }

    const requestServicesPromise = RequestService.find({
      deleted: false,
      status: { $nin: ['SEM MOTORISTA', 'SEM_MOTORISTA', 'Cancelado', 'CANCELADO', 'Finalizado', 'Entregue'] },
      $or: requestServiceConditions
    })
      .populate('user', 'name phoneNumber profileImage')
      .populate('serviceId', 'name')
      .lean();

    const [ordersResult, requestServicesResult] = await Promise.all([ordersPromise, requestServicesPromise]);

    console.log("============== DEBUG /deliveryman/all ==============");
    console.log("Driver ID:", deliverymanId.toString());
    console.log("canAcceptNewTrips:", canAcceptNewTrips, "| availability:", driver.availability, "| hasBalance:", hasBalance);
    console.log("transport_type (raw):", rawTransportType, "→ resolved name:", driverTransportTypeName || '(sem tipo)');
    console.log("GPS:", driver.locationGeo?.coordinates, "| lat:", driver.latitude, "lng:", driver.longitude);
    console.log("requestServiceConditions:", JSON.stringify(requestServiceConditions, null, 2));
    console.log("Total Orders Found:", ordersResult.length, "| Total RequestServices Found:", requestServicesResult.length);
    console.log("====================================================");

    // Format orders ensuring driver receives delivery fare, not store purchase price
    const formattedOrders = ordersResult.map(o => {
      const fare = o.addressPrice || o.deliveryFee || o.deliveryPrice || 150;
      return {
        ...o,
        type: 'order',
        price: fare,
        deliveryPrice: fare,
        finalAgreedPrice: fare,
        basePrice: fare,
        itemsPrice: undefined,
        totalPrice: fare,
        orderItems: o.orderItems?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: undefined // Ocultar preço de compra de produto ao motorista
        }))
      };
    });
    const formattedRequests = requestServicesResult.map(r => ({ ...r, type: 'requestService' }));

    let combined = [...formattedOrders, ...formattedRequests];
    // Ordenar por data
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ✅ Injetar passengerName/Image em cada pedido para garantir compatibilidade com TripCard
    combined = combined.map(item => {
      const userObj = item.user;
      const name = item.passengerName || (typeof userObj === 'object' ? userObj?.name : null) || 'Cliente';
      const image = item.passengerImage || (typeof userObj === 'object' ? (userObj?.profileImage || userObj?.photo) : null) || null;
      const phone = item.passengerPhone || (typeof userObj === 'object' ? userObj?.phoneNumber : null) || null;
      return { ...item, passengerName: name, passengerImage: image, passengerPhone: phone };
    });

    // 📍 FILTRAR APENAS PEDIDOS VÁLIDOS (EXCLUIR SEM MOTORISTA, CANCELADOS, FINALIZADOS OU SEM GPS)
    combined = combined.filter(item => {
      const statusStr = String(item.status || '').toUpperCase().trim();
      const isInvalidStatus = [
        'SEM MOTORISTA',
        'SEM_MOTORISTA',
        'CANCELADO',
        'CANCELLED',
        'FINALIZADO',
        'COMPLETED'
      ].includes(statusStr);

      if (isInvalidStatus) {
        return false;
      }

      const destLat = Number(
        item.destinationDetails?.lat || 
        item.deliveryAddress?.latitude || 
        item.deliveryAddress?.lat || 
        item.destinationLocation?.latitude ||
        item.seller?.location?.lat ||
        item.sellerInfo?.location?.lat ||
        item.seller?.latitude ||
        item.sellerInfo?.latitude || 
        item.latitude || 0
      );

      const destLng = Number(
        item.destinationDetails?.lng || 
        item.deliveryAddress?.longitude || 
        item.deliveryAddress?.lng || 
        item.destinationLocation?.longitude ||
        item.seller?.location?.lng ||
        item.sellerInfo?.location?.lng ||
        item.seller?.longitude ||
        item.sellerInfo?.longitude || 
        item.longitude || 0
      );

      const origLat = Number(
        item.originDetails?.lat || 
        item.seller?.location?.lat || 
        item.sellerInfo?.location?.lat ||
        item.seller?.location?.coordinates?.[1] ||
        item.seller?.latitude || 
        item.sellerInfo?.latitude || 
        item.originLat ||
        item.latitude || 0
      );

      const origLng = Number(
        item.originDetails?.lng || 
        item.seller?.location?.lng || 
        item.sellerInfo?.location?.lng ||
        item.seller?.location?.coordinates?.[0] ||
        item.seller?.longitude || 
        item.sellerInfo?.longitude || 
        item.originLng ||
        item.longitude || 0
      );

      const hasDestGPS = !isNaN(destLat) && !isNaN(destLng) && destLat !== 0 && destLng !== 0;
      const hasOrigGPS = !isNaN(origLat) && !isNaN(origLng) && origLat !== 0 && origLng !== 0;

      return hasDestGPS || hasOrigGPS;
    });

    // 🔥 DEBUG — Mostrar dados do cliente para diagnóstico
    const pendingForLog = combined.find(o => o.stepStatus === 3);
    if (pendingForLog) {
      const imgLog = pendingForLog.passengerImage
        ? (pendingForLog.passengerImage.startsWith('data:') ? `${pendingForLog.passengerImage.substring(0, 30)}... [Base64]` : pendingForLog.passengerImage)
        : 'null';
      console.log(`[DEBUG /deliveryman/all] Pedido pendente #${pendingForLog.code || pendingForLog._id}: passengerName=${pendingForLog.passengerName}, passengerImage=${imgLog}`);
    }

    res.send({ orders: combined });
  })
);

orderRouter.get(
  '/deliveryman/history/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const deliverymanId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 20;

    const driverIdStr = deliverymanId ? deliverymanId.toString() : '';
    let driverObjId = null;
    try {
      if (mongoose.Types.ObjectId.isValid(driverIdStr)) {
        driverObjId = new mongoose.Types.ObjectId(driverIdStr);
      }
    } catch (e) {}

    const driverMatchConditions = [
      { 'deliveryman.id': driverIdStr },
      { 'deliveryman._id': driverIdStr },
      { targetDriverId: driverIdStr },
      { driverId: driverIdStr },
      { driver: driverIdStr }
    ];

    if (driverObjId) {
      driverMatchConditions.push(
        { 'deliveryman.id': driverObjId },
        { 'deliveryman._id': driverObjId },
        { targetDriverId: driverObjId },
        { driverId: driverObjId },
        { driver: driverObjId }
      );
    }

    const queryFilter = {
      $or: driverMatchConditions,
      deleted: { $ne: true }
    };

    // Buscar Orders normais
    const ordersPromise = Order.find(queryFilter)
      .populate('user', 'name profileImage phoneNumber')
      .populate('sellers', 'name')
      .lean();

    // Buscar RequestServices (Encomendas independentes)
    const requestServicesPromise = RequestService.find(queryFilter)
      .populate('user', 'name profileImage phoneNumber')
      .populate('serviceId', 'name')
      .lean();

    const [ordersResult, requestServicesResult] = await Promise.all([ordersPromise, requestServicesPromise]);

    const formattedOrders = ordersResult.map(o => ({ ...o, type: 'order' }));
    const formattedRequests = requestServicesResult.map(r => ({ ...r, type: 'requestService' }));

    let combined = [...formattedOrders, ...formattedRequests];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = combined.length;
    const pages = Math.ceil(total / pageSize);
    const paginatedOrders = combined.slice(pageSize * (page - 1), pageSize * page);

    res.send({ orders: paginatedOrders, total, pages, currentPage: page });
  })
);

// Upload payment proof for an order
orderRouter.put(
  '/:id/payment-proof',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.paymentProof = req.body.paymentProof;
      const updatedOrder = await order.save();
      res.send({ message: 'Comprovativo de pagamento enviado com sucesso.', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado.' });
    }
  })
);

/**
 * GET /api/orders/:id/receipt
 * Gerar Recibo de Compra Oficial e Fatura Simplificada (PDF/Print)
 */
orderRouter.get(
  '/:id/receipt',
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phoneNumber address')
      .populate('orderItems.product', 'name price image seller');

    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }

    const itemsFare = order.itemsPrice || order.orderItems?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
    const shippingFare = order.addressPrice || order.deliveryFee || order.deliveryPrice || 0;
    const grandTotal = order.totalPrice || (itemsFare + shippingFare);
    const receiptCode = `REC-${order.code || order._id.toString().substring(0, 8).toUpperCase()}`;

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="pt-PT">
      <head>
        <meta charset="UTF-8">
        <title>Recibo de Compra - ${receiptCode}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; background-color: #f9f9f9; }
          .receipt-card { max-width: 750px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6f42c1; padding-bottom: 20px; margin-bottom: 25px; }
          .logo { font-size: 26px; font-weight: bold; color: #6f42c1; }
          .logo span { color: #ff9900; }
          .badge-paid { background-color: #d1fae5; color: #065f46; font-size: 13px; font-weight: bold; padding: 6px 16px; border-radius: 20px; text-transform: uppercase; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 14px; }
          .details-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #f1f5f9; }
          .details-box h4 { margin: 0 0 8px 0; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
          td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .text-right { text-align: right; }
          .summary-box { width: 300px; margin-left: auto; font-size: 14px; }
          .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .summary-total { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #6f42c1; font-weight: bold; font-size: 18px; color: #6f42c1; }
          .print-btn { display: block; width: 220px; margin: 30px auto 0 auto; text-align: center; background: #6f42c1; color: #fff; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; cursor: pointer; border: none; }
          @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .receipt-card { border: none; box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header">
            <div>
              <div class="logo">NHIQUELA<span>.</span></div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Recibo de Compra & Fatura Simplificada</div>
            </div>
            <div style="text-align: right;">
              <span class="badge-paid">🟢 PAGAMENTO CONFIRMADO</span>
              <div style="font-size: 13px; font-weight: bold; margin-top: 8px; color: #334155;">Nº ${receiptCode}</div>
              <div style="font-size: 12px; color: #64748b;">Data: ${new Date(order.createdAt).toLocaleString('pt-PT')}</div>
            </div>
          </div>

          <div class="details-grid">
            <div class="details-box">
              <h4>Cliente / Destinatário</h4>
              <div><strong>${order.name || order.user?.name || 'Cliente'}</strong></div>
              <div>📞 ${order.phoneNumber || order.user?.phoneNumber || 'N/A'}</div>
              <div>📍 ${order.origin || order.destination || order.user?.address || 'Maputo, Moçambique'}</div>
            </div>

            <div class="details-box">
              <h4>Dados do Pagamento</h4>
              <div><strong>Método:</strong> ${order.paymentMethod || 'Dinheiro / M-Pesa'}</div>
              <div><strong>Opção:</strong> ${order.paymentOption || 'Pagamento na Entrega'}</div>
              <div><strong>Estado:</strong> Confirmado & Processado</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item / Descrição</th>
                <th class="text-right">Qtd</th>
                <th class="text-right">Preço Unitário</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.orderItems && order.orderItems.length > 0 ? order.orderItems.map(item => `
                <tr>
                  <td><strong>${item.name || item.title || 'Produto Marketplace'}</strong></td>
                  <td class="text-right">${item.quantity || 1}</td>
                  <td class="text-right">${(item.price || 0).toLocaleString('pt-PT')} MT</td>
                  <td class="text-right"><strong>${((item.price || 0) * (item.quantity || 1)).toLocaleString('pt-PT')} MT</strong></td>
                </tr>
              `).join('') : `
                <tr>
                  <td><strong>${order.goodType || order.description || 'Serviço de Transporte / Entrega'}</strong></td>
                  <td class="text-right">1</td>
                  <td class="text-right">${grandTotal.toLocaleString('pt-PT')} MT</td>
                  <td class="text-right"><strong>${grandTotal.toLocaleString('pt-PT')} MT</strong></td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal dos Produtos</span>
              <span>${itemsFare.toLocaleString('pt-PT')} MT</span>
            </div>
            <div class="summary-row">
              <span>Taxa de Entrega / Frete</span>
              <span>${shippingFare.toLocaleString('pt-PT')} MT</span>
            </div>
            <div class="summary-total">
              <span>TOTAL PAGO</span>
              <span>${grandTotal.toLocaleString('pt-PT')} MT</span>
            </div>
          </div>

          <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(receiptHtml);
  })
);

export default orderRouter;




