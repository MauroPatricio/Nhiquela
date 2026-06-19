import express from 'express';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import RequestDeliver from '../models/RequestDeliverModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';
import sendNotification from '../utils/sendNotification.js';
import createNotification from '../utils/createNotification.js';





const orderRouter = express.Router();



function generateCode() {
  let code = Math.floor(Math.random() * 900000) + 100000;
  return code.toString();
}

// All Orders
orderRouter.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const orders = await Order.find({
      ...sellerFilter,
      deleted: { $eq: false},
    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
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
      isPaid: {$eq: true},
      deleted: { $eq: false},
    }).populate('user', 'name').populate('seller').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await Order.countDocuments({
      isPaid: {$eq: true},
      deleted: { $eq: false },
    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
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
      isPaid: {$eq: true},
      deleted: { $eq: false},
      deliveryman: { $exists: true }
    }).populate('user', 'name').populate('deliveryman.id').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await Order.countDocuments({
      isPaid: {$eq: true},
      deleted: { $eq: false },
      deliveryman: { $exists: true }
    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
  })
);


orderRouter.get(
  '/sellerview',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const orders = await Order.find({
      ...sellerFilter,
      isPaid: { $eq: true},
      deleted: { $eq: false},
      status: { $ne: 'Finalizado' }

    }).populate('user', 'name phoneNumber').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      isPaid: { $eq: true},
      deleted: { $eq: false },
      status: { $ne: 'Finalizado' }

    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
  })
);



orderRouter.get(
  '/sellerordersview',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const orders = await Order.find({
      ...sellerFilter,
      isPaid: { $eq: true},
      deleted: { $eq: false},
      status: { $ne: 'Cancelado' }

    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      isPaid: { $eq: true},
      deleted: { $eq: false },
      status: { $ne: 'Cancelado' }


    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
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
            localField:"orderItems.product",
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
    res.send({orders});
  })
);

// All Orders
orderRouter.get(
  '/deliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const orders = await Order.find({
      ...sellerFilter,
      deleted: { $eq: false },
      isPaid: { $eq: true },
      isAvailableToDeliver: { $eq: true },
      status: { $ne: 'Finalizado' }
    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await Order.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
  })
);



orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {

    const comission_price = parseFloat(process.env.COMISSION_PRICE);
    const priceFromSeller = parseFloat(req.body.itemsPriceForSeller);
    const priceComission  = parseFloat(priceFromSeller * comission_price);

    
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
      comissionPercentage: comission_price,
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

          const product = await Product.findById(item._id);
          
          // Ensure product exists and quantity is valid
          if (!product) {
            throw new Error(`Produto nao encontrado: ${item._id}`);
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
        })
      );

      // Save the order

      const savedOrder = await newOrder.save();
      const order = await savedOrder.populate('seller');

      // Create a notification after the order is saved
      const mensagem = `Olá! Seu pedido com o código ${order.code} foi criado com sucesso! 🎉 Agora, aguarde a confirmação do fornecedor. Acompanhe o status do seu pedido diretamente no app. Obrigado por escolher a Nhiquela! ❤️`;
     

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);

  //toSeller

  if (sellerOfProduct?.pushToken && clientOfProduct?.pushToken) {
    await createNotification({
      message: mensagem,
      receiver_id: order.seller,
      sender_id: order.user,
      orderID: order._id,
      pushToken: sellerOfProduct.pushToken,
    
    });
    //toOrderClient
    await createNotification({
    message: mensagem,
    receiver_id: order.seller,
    sender_id: order.user,
    orderID: order._id,
    pushToken: clientOfProduct.pushToken
    });
  }

      // Respond with success message
      res.status(201).send({ mensagem, order });
      
    } catch (error) {
      // Handle errors during product update or order save
      res.status(400).send({ message: error.message });
    }
  })
);


// get orders by user id
orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    
    const orders = await Order.find({ user: req.user._id, isDeletedByRequester: false,   deleted: { $eq: false} }).populate('seller deliveryman').sort({createdAt: -1});
    res.send(orders);
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

// Deleted by the user
orderRouter.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.deleted = true;
      order.isActive = false;

      await order.save();

      res.send({ message: `Pedido removido com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
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

      await order.save();

      res.send({ message: `Pedido removido com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
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

      await order.deleteOne();

      res.send({ message: `Pedido removido com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
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
      return res.status(404).send({ message: 'Pedido não encontrado' });
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
    let message =`Olá! 👋 O pagamento referente ao pedido ${updatedOrder.code} no valor de ${updatedOrder.totalPrice} foi confirmado com sucesso! Agora, estamos preparando tudo para você. Obrigado por confiar na Nhiquela!`;
    // sendEmailOrderToSeller(req,message, sellerOfProduct, updatedOrder, res);

    if(sellerOfProduct?.pushToken && clientOfProduct?.pushToken){
      //toSeller
      await createNotification({
        message: message,
        receiver_id: updatedOrder.seller,
        sender_id: updatedOrder.user,
        orderID: updatedOrder._id,
        pushToken: sellerOfProduct.pushToken,
      });
      //toOrderClient
      await createNotification({
        message: message,
        receiver_id: updatedOrder.user,
        sender_id: updatedOrder.seller,
        orderID: updatedOrder._id,
        pushToken: clientOfProduct.pushToken
      });
    }

    if (sellerOfProduct){
      //  Para envio de mensagens
      let msgSeller =`Ola, a Nhiquela gostaria de lhe informar que possui um novo pedido com o codigo ${updatedOrder.code}.`;
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
      return res.status(404).send({ message: 'Pedido não encontrado' });
    }

    order.isAccepted = true;
    order.isCanceled = false;
    order.stepStatus = 2;
    order.status = 'Aceite';

    await order.save();

    // Buscar o pedido novamente com populate
    const updatedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber');

    //  Para envio de mensagens
    const message = `Ola, o seu pedido nr ${order.code} foi aceite com sucesso pelo fornecedor.`;
 
    //  sendSMSToUSendIt(req, message);
    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if(sellerOfProduct?.pushToken && clientOfProduct?.pushToken){
      //toSeller
      await createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.pushToken,
      });
      //toOrderClient
      await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.pushToken
      });
    }

    // sendEmailOrderStatus(req,message, order, res);

    res.send({ order: updatedOrder, message: `Pedido nr ${order.code} aceite com sucesso` });
  })
);

// a comida esta pronta
orderRouter.put(
  '/:id/availableToDeliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado' });
    }

    order.isAvailableToDeliver = true;
    order.status = 'Pronto';
    order.stepStatus = 3;
    if(order.addressPrice === 0){
      order.status = 'Finalizado';
      order.isInTransit = true;
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();

    // Recarrega o pedido com o campo `user` populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber');

    const message = `Ola, a Nhiquela lhe informa que o pedido nr ${order.code} esta pronto e disponivel para ser entregue.`;

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if(sellerOfProduct?.pushToken && clientOfProduct?.pushToken){
      //toSeller
      await createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.pushToken,
      });
      //toOrderClient
      await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.pushToken
      });
    }

    sendEmailOrderStatus(req,message, order, res);

    // sendSMSToUSendItAdmin(message);
    res.send({ order: savedOrder, message: `Pedido disponível para entrega` });
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
      order.status = 'Disponível para entrega';
      order.stepStatus = 3;
      if(order.addressPrice === 0){
        order.status = 'Finalizado';
        order.isInTransit = true;
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      }

      const savedOrder = await order.save();

      let message =`Ola, a Nhiquela lhe informa que o pedido nr ${order.code} esta pronto e disponivel para entrega.`;

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);
  
      if(sellerOfProduct.pushToken && clientOfProduct.pushToken){

        //toSeller
        await createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.pushToken,
        
        });
        //toOrderClient
        await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.pushToken
        });
      }
  
  

      sendEmailOrderStatus(req,message, order, res);

      // sendSMSToUSendItAdmin(message);
      res.send({ order: savedOrder, message: `Pedido disponível para entrega` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }

    order.isAvailableToDeliver = true;
    order.status = 'Disponível para entrega';
    order.stepStatus = 3;

    if (order.addressPrice === 0) {
      order.status = 'Finalizado';
      order.isInTransit = true;
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();

    // 👉 Recarrega o pedido com o campo `user` populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber');

    const message = `Olá, a Nhiquela lhe informa que o pedido nr ${order.code} está pronto e disponível para entrega.`;

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    if (sellerOfProduct?.deviceToken && clientOfProduct?.deviceToken) {
      // Aqui você pode ativar o envio de notificação, se necessário
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

    res.send({ order: savedOrder, message: `Pedido disponível para entrega` });
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

      let message =`Ola, a Nhiquela lhe informa que o pagamento correspondente ao pedido nr ${order.code} foi pago com sucesso.`;

      // sendEmailOrderStatus(req,message, order, res);

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);
  
      if(sellerOfProduct.pushToken && clientOfProduct.pushToken){

        //toSeller
        await createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.pushToken,
        
        });
        //toOrderClient
        await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.pushToken
        });
      }
  
  

      // sendSMSToUSendItAdmin(message);
      res.send({ order: savedOrder, message: `Fornecedor pago com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
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

      let message =`Ola, a Nhiquela lhe informa que o pagamento correspondente ao pedido nr ${order.code} foi pago com sucesso.`;

      // sendEmailOrderStatus(req,message, order, res);

      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);
  
      if( sellerOfProduct.pushToken && clientOfProduct.pushToken){
        //toSeller
        await createNotification({
          message: message,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
          pushToken: sellerOfProduct.pushToken,
        
        });
        //toOrderClient
        await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.pushToken
        });

      }
  
  

      // sendSMSToUSendItAdmin(message);
      res.send({ order: savedOrder, message: `Entregador pago com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Pedido aceite pelo entregador
orderRouter.put(
  '/:id/acceptedByDeliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    const user_deliver = await User.findById(req.user._id);

    if (!user_deliver) {
      return res.status(404).send({ message: 'Motorista não encontrado na base de dados. Por favor, inicie sessão novamente.' });
    }

    if (order) {
      order.status = 'Aceite pelo entregador';
      order.stepStatus=4;

      if(user_deliver.isDeliveryMan){

        order.deliveryman = {
          id: user_deliver._id,
          photo: user_deliver.deliveryman?.photo || '',
          name:  user_deliver.deliveryman?.name || '',
          phoneNumber:  user_deliver.deliveryman?.phoneNumber || '',
          transport_type:  user_deliver.deliveryman?.transport_type || '',
          transport_color:  user_deliver.deliveryman?.transport_color || '',
          transport_registration:  user_deliver.deliveryman?.transport_registration || '',
        }
      }

      const updateOrder = await order.save();


      const sellerOfProduct = await User.findById(order.seller);

      //  Para envio de mensagens

       let message =`Ola, a Nhiquela informa que o entregador aceitou o pedido nr ${updateOrder.code}`;
 
      //  sendSMSToSellerUSendIt(sellerOfProduct,message);

  //    sendEmailOrderToSeller(req,message,sellerOfProduct, updateOrder, res);


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
  pushToken: clientOfProduct.pushToken
  });
  
  


      res.send({ order, message: `Aceite pelo entregador`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
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
      order.stepStatus=5;

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
      const savedOrder =await order.save();

        //  Para envio de mensagens

        let message =`A Nhiquela lhe informa que o pedido ${order.code} esta a caminho do destino indicado.`;
 
        //  sendSMSToUSendIt(req,message);

        const sellerOfProduct = await User.findById(order.seller);
        const clientOfProduct = await User.findById(order.user);
    
    //toSeller
    await createNotification({
      message: message,
      receiver_id: order.seller,
      sender_id: order.user,
      orderID: order._id,
      pushToken: sellerOfProduct.pushToken,
    
    });
    //toOrderClient
    await createNotification({
    message: message,
    receiver_id: order.user,
    sender_id: order.seller,
    orderID: order._id,
    pushToken: clientOfProduct.pushToken
    });

 //     sendEmailOrderToSeller(req,message, sellerOfProduct, order, res);

      res.send({ order: savedOrder, message: `Pedido em trânsito` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }

    order.status = 'Em trânsito';
    order.isInTransit = true;
    order.stepStatus = 5;

    await order.save();

    // Recarrega o pedido com o campo user populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber');

    const message = `A Nhiquela lhe informa que o pedido ${order.code} está a caminho do destino indicado.`;

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    // Aqui você pode reativar as notificações se desejar:
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

    // Exemplo de envio de e-mail (já comentado no seu código):
    // sendEmailOrderToSeller(req, message, sellerOfProduct, order, res);

    res.send({ order: savedOrder, message: `Pedido em trânsito` });
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
      order.stepStatus= 5;
      const updateOrder = await order.save();


      const sellerOfProduct = await User.findById(order.seller);

      //  Para envio de mensagens

       let message =`Ola, a Nhiquela informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nr ${updateOrder.code}`;
 
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
  pushToken: clientOfProduct.pushToken
  });
      res.send({ message: `No destino indicado`, order: updateOrder });
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
    const order = await Order.findById(req.params.id);
    // const user_deliver = await User.findById(req.user._id);

    if (order) {
      //     order.isPaid = true;
      //     order.paidAt= Date.now();
      order.status = 'Entregue';
      order.isDelivered = true
      order.deliveredAt = Date.now();
      order.stepStatus=6;

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
      const savedOrder =await order.save();

        //  Para envio de mensagens

        let message =`A Nhiquela informa que o pedido ${order.code} foi entregue com sucesso.`;
 
        //  sendSMSToUSendIt(req,message);

        const sellerOfProduct = await User.findById(order.seller);
        const clientOfProduct = await User.findById(order.user);
    
    //toSeller
    await createNotification({
      message: message,
      receiver_id: order.seller,
      sender_id: order.user,
      orderID: order._id,
      pushToken: sellerOfProduct.pushToken,
    
    });
    //toOrderClient
    await createNotification({
    message: message,
    receiver_id: order.user,
    sender_id: order.seller,
    orderID: order._id,
    pushToken: clientOfProduct.pushToken
    });
      // sendEmailOrderToSeller(req,message, sellerOfProduct, order, res);       
      res.send({ order: savedOrder, message: `Pedido entregue com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
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
      order.orderItems.map(async o=>{

        const product = await Product.findById(o);
        product.countInStock = parseInt(product.countInStock) + parseInt(o.quantity)
        await product.save();

      })
      order.isCanceled = true;
      order.isAccepted = false;
      order.status = 'Cancelado';
      order.stepStatus = 7;
      order.canceledReason = req.body.message;


     const savedOrder = await order.save();
      
      //  Para envio de mensagens

      let message =`Ola, a Nhiquela lamenta lhe informar que o seu pedido nr ${order.code} foi cancelado. O motivo do cancelamento podera verificar pesquisando pelo codigo.`;

        // sendSMSToUSendIt(req,message);    

        const sellerOfProduct = await User.findById(order.seller);
        const clientOfProduct = await User.findById(order.user);
    
    //toSeller
    await createNotification({
      message: message,
      receiver_id: order.seller,
      sender_id: order.user,
      orderID: order._id,
      pushToken: sellerOfProduct.pushToken,
    
    });
    //toOrderClient
    await createNotification({
    message: message,
    receiver_id: order.user,
    sender_id: order.seller,
    orderID: order._id,
    pushToken: clientOfProduct.pushToken
    });
  


      sendEmailOrderToSeller(req,message, sellerOfProduct, order, res);

      res.send({ message: `Pedido cancelado com sucesso`, order: savedOrder});
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
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

    await order.save();

    // Buscar novamente o pedido com o campo user populado
    const savedOrder = await Order.findById(order._id).populate('user', 'name phoneNumber');

    const message = `Ola, a Nhiquela lamenta lhe informar que o seu pedido nr ${order.code} foi cancelado. O motivo do cancelamento poderá verificar pesquisando pelo código.`;

    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    // Notificações (se quiser ativar):
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


// Pedidos disponíveis para entrega (stepStatus = 3)
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

      console.log("📄 Orders com seller simplificado:", JSON.stringify(simplifiedOrders, null, 2));
      return res.json(simplifiedOrders);

    } catch (error) {
      console.error("❌ Erro ao buscar orders:", error);
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
    
    const orders = await Order.find({ user: req.user._id, isDeletedByRequester: false,   deleted: { $eq: false} }).populate('deliveryman').sort({createdAt: -1});
    res.send(orders);
  })
);

orderRouter.get(
  '/deliveryman/all',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const deliverymanId = req.user._id;

    // Buscar Orders que estão disponíveis (stepStatus: 3) OU que pertencem a este entregador
    const ordersPromise = Order.find({
      deleted: false,
      $or: [
        { stepStatus: 3 }, // Disponíveis para aceitar
        { 'deliveryman.id': deliverymanId } // Já aceites por mim
      ]
    })
      .populate('user', 'name')
      .populate('sellers', 'name')
      .lean();

    // Buscar RequestDelivers que estão disponíveis (stepStatus: 3) OU pertencem a este entregador
    const requestDeliversPromise = RequestDeliver.find({
      deleted: false,
      $or: [
        { stepStatus: 3 }, // Disponíveis
        { 'deliveryman.id': deliverymanId } // Já aceites por mim
      ]
    })
      .populate('user', 'name')
      .lean();

    const [ordersResult, requestDeliversResult] = await Promise.all([ordersPromise, requestDeliversPromise]);

    // Format orders
    const formattedOrders = ordersResult.map(o => ({ ...o, type: 'order' }));
    const formattedRequests = requestDeliversResult.map(r => ({ ...r, type: 'requestDeliver' }));

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
      .populate('user', 'name')
      .populate('sellers', 'name')
      .lean();

    // Buscar RequestDelivers (Encomendas independentes)
    const requestDeliversPromise = RequestDeliver.find({
      'deliveryman.id': deliverymanId,
      deleted: false
    })
      .populate('user', 'name')
      .lean();

    const [ordersResult, requestDeliversResult] = await Promise.all([ordersPromise, requestDeliversPromise]);

    // Identificar de onde veio para o Frontend saber renderizar (caso precise)
    const formattedOrders = ordersResult.map(o => ({ ...o, type: 'order' }));
    const formattedRequests = requestDeliversResult.map(r => ({ ...r, type: 'requestDeliver' }));

    // Combinar, ordenar por data e fazer paginação em memória
    let combined = [...formattedOrders, ...formattedRequests];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = combined.length;
    const pages = Math.ceil(total / pageSize);
    const paginatedOrders = combined.slice(pageSize * (page - 1), pageSize * page);

    res.send({ orders: paginatedOrders, total, pages, currentPage: page });
  })
);






export default orderRouter;