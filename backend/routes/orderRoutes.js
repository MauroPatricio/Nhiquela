import express from 'express';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';
import sendNotification from '../utils/sendNotification.js';
import createNotification from '../utils/createNotification.js';
import Partner from '../models/PartnerModel.js';
import partnerService from '../services/partnerService.js';
import reputationTracker from '../utils/reputationTracker.js';
import mongoose from 'mongoose';
import { debitDriverCommissionWithSession, getFinancialConfig, canAffordTripCommission, hasSufficientBalance } from '../services/walletService.js';


const orderRouter = express.Router();



function generateCode() {
  let code = Math.floor(Math.random() * 900000) + 100000;
  return code.toString();
}

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
      isPaid: { $eq: true },
      deleted: { $eq: false },
      status: { $ne: 'Finalizado' }

    }).populate('user', 'name phoneNumber profileImage').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      isPaid: { $eq: true },
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
      isPaid: { $eq: true },
      deleted: { $eq: false },
      status: { $ne: 'Cancelado' }

    }).populate('user', 'name').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      isPaid: { $eq: true },
      deleted: { $eq: false },
      status: { $ne: 'Cancelado' }


    });

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, pages });
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
      deliveryAddress: req.body.address,
      isUserWantDelivery: req.body.isUserWantDelivery, // If user want delivery or not
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
      sellerPriceWithDeliver: req.body.sellerPriceWithDeliver
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
            if (newStock < 0) {
              throw new Error(`Insufficient stock for partner product: ${pp.name}`);
            }
            pp.stock = newStock;
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
            // Ensure stock doesn't go below 0
            const newCountInStock = product.countInStock - item.quantity;
            if (newCountInStock < 0) {
              throw new Error(`Estoque insuficiente para o produto: ${product.name}.  Por favor verifique a quantidade`);
            }
            // Update and save product stock
            product.countInStock = newCountInStock;
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
      const savedOrder = await newOrder.save();
      const order = await savedOrder.populate('seller');

      // Debit partner commission if this is a marketplace order
      if (req.body.partnerId) {
        const { debitCommissionFromPartner } = await import('../services/walletService.js');
        const partner = await Partner.findById(req.body.partnerId);
        const commissionRate = partner?.commissionRate ?? 0.1;
        await debitCommissionFromPartner(req.body.partnerId, parseFloat(req.body.itemsPriceForSeller), commissionRate);
      }

      // Create a notification after the order is saved
      const mensagem = `Olï¿½! Seu pedido com o cï¿½digo ${order.code} foi criado com sucesso! ?? Agora, aguarde a confirmaï¿½ï¿½o do fornecedor. Acompanhe o status do seu pedido diretamente no app. Obrigado por escolher a Nhiquela! ??`;


      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);

      //toSeller

      if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
        await createNotification({
          message: mensagem,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.deviceToken,

        });
        //toOrderClient
        await createNotification({
          message: mensagem,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: clientOfProduct.deviceToken
        });
      }

      // Respond with success message
      res.status(201).send({ mensagem, order });

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
    const orders = await Order.find({ user: req.user._id, isDeletedByRequester: false, deleted: { $eq: false } }).populate('seller deliveryman').sort({ createdAt: -1 });
    
    // ?? IMPORTANTE: Incluir tambï¿½m os serviï¿½os (RequestService)
    const trips = await RequestService.find({ user: req.user._id, deleted: { $eq: false } }).populate('user deliveryman').sort({ createdAt: -1 });
    
    // Mesclar ambos e ordenar por data
    const all = [...orders, ...trips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.send(all);
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
    const order = await Order.findById(req.params.id).populate('seller');

    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
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

    const sellerOfProduct = await User.findById(updatedOrder.seller);
    const clientOfProduct = await User.findById(updatedOrder.user);

    //  Para envio de mensagens
    let message = `Olï¿½! ?? O pagamento referente ao pedido ${updatedOrder.code} no valor de ${updatedOrder.totalPrice} foi confirmado com sucesso! Agora, estamos preparando tudo para vocï¿½. Obrigado por confiar na Nhiquela!`;
    // sendEmailOrderToSeller(req,message, sellerOfProduct, updatedOrder, res);

    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      //toSeller
      await createNotification({
        message: message,
        receiver_id: updatedOrder.seller,
        sender_id: updatedOrder.user,
        orderID: updatedOrder._id,
        pushToken: sellerOfProduct.deviceToken,
      });
      //toOrderClient
      await createNotification({
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

    order.isAccepted = true;
    order.isCanceled = false;
    order.stepStatus = 2;
    order.status = 'Aceite';

    await order.save();

    // Buscar o pedido novamente com populate
    const updatedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber profileImage');

    //  Para envio de mensagens
    const message = `Olá, o seu pedido nÂº ${order.code} foi aceite com sucesso pelo fornecedor.`;

    //  sendSMSToUSendIt(req, message);
    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      //toSeller
      await createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken,
      });
      //toOrderClient
      await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.deviceToken
      });
    }

    // sendEmailOrderStatus(req,message, order, res);

    res.send({ order: updatedOrder, message: `Pedido nÂº ${order.code} aceite com sucesso` });
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

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      //toSeller
      await createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken,
      });
      //toOrderClient
      await createNotification({
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
      order.status = 'Disponï¿½vel para entrega';
      order.stepStatus = 3;
      if (order.addressPrice === 0) {
        order.status = 'Finalizado';
        order.isInTransit = true;
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      }

      const savedOrder = await order.save();

      let message = `Olá, a Nhiquela lhe informa que o pedido nÂº ${order.code} esta pronto e disponivel para entrega.`;

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);

      if (sellerOfProduct.deviceToken && clientOfProduct.deviceToken) {

        //toSeller
        await createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.deviceToken,

        });
        //toOrderClient
        await createNotification({
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
    } else {
      res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }

    order.isAvailableToDeliver = true;
    order.status = 'Disponï¿½vel para entrega';
    order.stepStatus = 3;

    if (order.addressPrice === 0) {
      order.status = 'Finalizado';
      order.isInTransit = true;
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();

    // ?? Recarrega o pedido com o campo `user` populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber profileImage');

    const message = `Olï¿½, a Nhiquela lhe informa que o pedido nÂº ${order.code} estï¿½ pronto e disponï¿½vel para entrega.`;

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      // Aqui vocï¿½ pode ativar o envio de notificaï¿½ï¿½o, se necessï¿½rio
      /*
      await createNotification({
        message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        deviceToken: sellerOfProduct.deviceToken,
      });

      await createNotification({
        message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        deviceToken: clientOfProduct.deviceToken,
      });
      */
    }

    //  sendEmailOrderStatus(req, message, order, res);

    res.send({ order: savedOrder, message: `Pedido disponï¿½vel para entrega` });
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

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);

      if (sellerOfProduct.deviceToken && clientOfProduct.deviceToken) {

        //toSeller
        await createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.deviceToken,

        });
        //toOrderClient
        await createNotification({
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

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);

      if (sellerOfProduct.deviceToken && clientOfProduct.deviceToken) {
        //toSeller
        await createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.deviceToken,

        });
        //toOrderClient
        await createNotification({
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

    // Usar uma transação para garantir que débito e aceite ocorrem de forma atómica
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findOne({ _id: req.params.id, status: 'Pendente' }).session(session);

      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).send({ message: 'Pedido já foi aceite por outro motorista ou não está disponível' });
      }

      // Calcular comissão baseada nas configurações financeiras e subcategoria
      const { calculateDynamicCommission } = await import('../services/walletService.js');
      const commissionAmount = await calculateDynamicCommission(order);

      // Apenas validar se o motorista tem saldo suficiente, mas NÃO debitar ainda.
      const canAfford = await canAffordTripCommission(user_deliver._id, commissionAmount);
      if (!canAfford) {
        await session.abortTransaction();
        session.endSession();
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

      order.status = 'Pedido aceite';
      order.stepStatus = 4;
      order.isAccepted = true;
      order.deliveryman = deliverymanData;

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      const updateOrder = await Order.findById(order._id)
        .populate('user', 'name phoneNumber profileImage')
        .populate('seller', 'name location');
      const sellerOfProduct = await User.findById(order.seller);

      //  Para envio de mensagens
      let message = `Olá, a Nhiquela informa que o entregador aceitou o pedido nÂº ${updateOrder.code}`;

      //  sendSMSToSellerUSendIt(sellerOfProduct,message);
      //  sendEmailOrderToSeller(req,message,sellerOfProduct, updateOrder, res);

      const clientOfProduct = await User.findById(order.user);

      if (clientOfProduct && clientOfProduct.deviceToken) {
        await createNotification({
          message: message,
          receiver_id: order.user,
          sender_id: order.seller,
          orderID: order._id,
          pushToken: clientOfProduct.deviceToken
        });
      }

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        // Notificar o motorista que aceitou
        io.to(`driver_${user_deliver._id}`).emit('order_assigned', updateOrder);
        // Notificar o cliente que o pedido foi aceite
        io.to(`order_${order._id}`).emit('order_updated', updateOrder);
        // 🔥 Notificar TODOS os outros motoristas que tinham este pedido que ele já foi aceite
        io.emit('order_taken', { orderId: order._id.toString(), acceptedBy: user_deliver._id.toString() });
      }

      res.send({ order: updateOrder, message: `Pedido aceite` });

    } catch (error) {
      await session.abortTransaction();
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
      order.status = 'Em trï¿½nsito';
      order.isInTransit = true;
      order.stepStatus = 5;

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

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);

      //toSeller
      await createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken,

      });
      //toOrderClient
      await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.deviceToken
      });

      //     sendEmailOrderToSeller(req,message, sellerOfProduct, order, res);

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', savedOrder);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', savedOrder);
        }
      }

      res.send({ order: savedOrder, message: `Pedido em trï¿½nsito` });
    } else {
      res.status(404).send({ message: 'Pedido nï¿½o encontrado' });
    }

    order.status = 'Em trï¿½nsito';
    order.isInTransit = true;
    order.stepStatus = 5;

    await order.save();

    // Recarrega o pedido com o campo user populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber profileImage');

    const message = `A Nhiquela lhe informa que o pedido ${order.code} estï¿½ a caminho do destino indicado.`;

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    // Aqui vocï¿½ pode reativar as notificaï¿½ï¿½es se desejar:
    /*
    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      await createNotification({
        message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        deviceToken: sellerOfProduct.deviceToken,
      });

      await createNotification({
        message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        deviceToken: clientOfProduct.deviceToken,
      });
    }
    */

    // Exemplo de envio de e-mail (jï¿½ comentado no seu cï¿½digo):
    // sendEmailOrderToSeller(req, message, sellerOfProduct, order, res);

    res.send({ order: savedOrder, message: `Pedido em trï¿½nsito` });
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
      order.stepStatus = 5;
      
      order.arrivedAtDestination = Date.now();
      if (req.body.latitude && req.body.longitude) {
        order.arrivalLatitude = req.body.latitude;
        order.arrivalLongitude = req.body.longitude;
      }
      
      const updateOrder = await order.save();


      const sellerOfProduct = await User.findById(order.seller);

      //  Para envio de mensagens

      let message = `Olá, a Nhiquela informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nÂº ${updateOrder.code}`;

      //  sendSMSToUSendIt(req,message);

      // sendEmailOrderToSeller(req,message,sellerOfProduct, updateOrder, res);


      const clientOfProduct = await User.findById(order.user);

      //toSeller
      // await createNotification({
      //   message: message,
      //   receiver_id: order.seller,
      //   sender_id: order.user,
      //   orderID: order._id,
      //   deviceToken: sellerOfProduct.deviceToken,

      // });
      //toOrderClient
      await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.deviceToken
      });

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
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
      order.stepStatus = 7; // Status de cancelamento/falha
      
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(req.params.id).session(session);

      if (order) {
        order.status = 'Entregue';
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.stepStatus = 6;

        await reputationTracker.recordOrderCompleted(order.user);

        // Calculate and debit commission if a deliveryman exists
        if (order.deliveryman && order.deliveryman.id) {
          // Calcular comissão baseada nas configurações financeiras e subcategoria
          const { calculateDynamicCommission } = await import('../services/walletService.js');
          const commissionAmount = await calculateDynamicCommission(order);

          try {
            await debitDriverCommissionWithSession(
              order.deliveryman.id,
              commissionAmount,
              `Comissão de serviço para o pedido ${order.code}`,
              'wallet',
              session
            );
          } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: error.message });
          }
        }

        const savedOrder = await order.save({ session });
        await session.commitTransaction();
        session.endSession();

        let message = `A Nhiquela informa que o pedido ${order.code} foi entregue com sucesso.`;

        const sellerOfProduct = await User.findById(order.seller);
        const clientOfProduct = await User.findById(order.user);

        if (sellerOfProduct && sellerOfProduct.deviceToken) {
          await createNotification({
            message: message,
            receiver_id: order.seller,
            sender_id: order.user,
            orderID: order._id,
            pushToken: sellerOfProduct.deviceToken,
          });
        }

        if (clientOfProduct && clientOfProduct.deviceToken) {
          await createNotification({
            message: message,
            receiver_id: order.user,
            sender_id: order.seller,
            orderID: order._id,
            pushToken: clientOfProduct.deviceToken
          });
        }

        const io = req.app.get('io');
        if (io) {
          io.to(`order_${order._id}`).emit('order_updated', savedOrder);
          if (order.deliveryman?.id) {
            io.to(`driver_${order.deliveryman.id}`).emit('order_updated', savedOrder);
          }
        }

        res.send({ order: savedOrder, message: `Pedido entregue com sucesso` });
      } else {
        await session.abortTransaction();
        session.endSession();
        res.status(404).send({ message: 'Pedido não encontrado' });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).send({ message: error.message || 'Erro ao finalizar o pedido.' });
    }
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
      order.stepStatus = 7;
      order.canceledReason = req.body.message;

      // Track reputation for cancelled order
      await reputationTracker.recordOrderCancelled(order.user);


      const savedOrder = await order.save();

      //  Para envio de mensagens

      let message = `Olá, a Nhiquela lamenta lhe informar que o seu pedido nÂº ${order.code} foi cancelado. O motivo do cancelamento poderá verificar pesquisando pelo código.`;

      // sendSMSToUSendIt(req,message);    

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);

      //toSeller
      await createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.deviceToken,

      });
      //toOrderClient
      await createNotification({
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

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    // Notificaï¿½ï¿½es (se quiser ativar):
    /*
    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      await createNotification({
        message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        deviceToken: sellerOfProduct.deviceToken,
      });

      await createNotification({
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

    // Buscar Orders normais
    const orderConditions = [
      { 'deliveryman.id': deliverymanId },
      { 'deliveryman._id': deliverymanId }  // compatibilidade com diferentes schemas
    ];
    if (canAcceptNewTrips) {
      orderConditions.push({ stepStatus: 3 }); // Disponíveis para aceitar se ativo
    }

    const ordersPromise = Order.find({
      deleted: false,
      $or: orderConditions
    })
      .populate('user', 'name phoneNumber profileImage')
      .populate('seller', 'name')
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

    // Format orders
    const formattedOrders = ordersResult.map(o => ({ ...o, type: 'order' }));
    const formattedRequests = requestServicesResult.map(r => ({ ...r, type: 'requestService' }));

    let combined = [...formattedOrders, ...formattedRequests];
    // Ordenar por data
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.send({ orders: combined });
  })
);

orderRouter.get(
  '/deliveryman/history/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const deliverymanId = req.params.id;
    const page = parseInt(req.query.page) || 1;

    console.log("Chegou ate aqui", deliverymanId)
    const pageSize = 10;

    // Buscar Orders normais
    const ordersPromise = Order.find({
      'deliveryman.id': deliverymanId,
      deleted: false
    })
      .populate('user', 'name profileImage phoneNumber')
      .populate('sellers', 'name')
      .lean();

    // Buscar RequestServices (Encomendas independentes)
    const requestServicesPromise = RequestService.find({
      'deliveryman.id': deliverymanId,
      deleted: false
    })
      .populate('user', 'name profileImage phoneNumber')
      .populate('serviceId', 'name')
      .lean();

    const [ordersResult, requestServicesResult] = await Promise.all([ordersPromise, requestServicesPromise]);

    // Identificar de onde veio para o Frontend saber renderizar (caso precise)
    const formattedOrders = ordersResult.map(o => ({ ...o, type: 'order' }));
    const formattedRequests = requestServicesResult.map(r => ({ ...r, type: 'requestService' }));

    // Combinar, ordenar por data e fazer paginaï¿½ï¿½o em memï¿½ria
    let combined = [...formattedOrders, ...formattedRequests];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = combined.length;
    const pages = Math.ceil(total / pageSize);
    const paginatedOrders = combined.slice(pageSize * (page - 1), pageSize * page);

    res.send({ orders: paginatedOrders, total, pages, currentPage: page });
  })
);






export default orderRouter;
