import express from 'express';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';
import  axios  from 'axios' // Ensure axios is imported
import { createNotification } from '../controllers/notificationControllerNhabanga.js';
import { Server } from 'socket.io';

let io;




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

    }).populate('user').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

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
    const priceComission = parseFloat(priceFromSeller * comission_price);


    
    // const priceWithComission = parseFloat(priceComission + priceFromSeller);
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
    });

    try {
      // Update stock levels for each ordered product
      await Promise.all(
        req.body.orderItems.map(async (item) => {
          // Check if the item is defined
          if (!item || !item._id) {
            throw new Error(`Invalid item: ${JSON.stringify(item)}`);
          }

          const product = await Product.findById(item._id);
          
          // Ensure product exists and quantity is valid
          if (!product) {
            throw new Error(`Product not found: ${item._id}`);
          }
          if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
            throw new Error(`Invalid quantity for product: ${item.name}`);
          }

          // Ensure stock doesn't go below 0
          const newCountInStock = product.countInStock - item.quantity;
          if (newCountInStock < 0) {
            throw new Error(`Insufficient stock for product: ${product.name}`);
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

      console.log("Fornecedor "+sellerOfProduct.pushToken)
      console.log("Cliente  "+clientOfProduct.pushToken)

  //toSeller

  if (sellerOfProduct.pushToken != null && clientOfProduct.pushToken != null) {
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
      res.status(201).send({ message: 'Novo pedido criado com sucesso', order });
      
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
    
    const orders = await Order.find({ user: req.user._id, isDeletedByRequester: false,   deleted: { $eq: false} }).populate('seller').sort({createdAt: -1});
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

    if (order) {
      order.isPaid = true;
      order.stepStatus = 1;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
        
      };

      
      const order = await order.save();


      const sellerOfProduct = await User.findById(order.seller);
      const clientOfProduct = await User.findById(order.user);
       

      //  Para envio de mensagens
      let message =`Olá! 👋 O pagamento referente ao pedido ${order.code} no valor de ${order.totalPrice} foi confirmado com sucesso! Agora, estamos preparando tudo para você. Obrigado por confiar na Nhiquela!`;
      // sendEmailOrderToSeller(req,message, sellerOfProduct, updateOrder, res);

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

      if (sellerOfProduct){

        //  Para envio de mensagens
      let msgSeller =`Ola, a Nhiquela gostaria de lhe informar que possui um novo pedido com o codigo ${order.code}.`;
    //  sendSMSToSellerUSendIt(sellerOfProduct, msgSeller);
  }

      res.send({ message: `Pedido Pago`, order: order });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Pedido aceite pelo fornecedor
orderRouter.put(
  '/:id/accept',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);


    if (order) {
      order.isAccepted = true;
      order.isCanceled = false;
      order.stepStatus = 2;
      order.status = 'Aceite';

     
      await order.save();

      //  Para envio de mensagens

    let message =`Ola, o seu pedido nr ${order.code} foi aceite com sucesso pelo fornecedor.`;
 
    //  sendSMSToUSendIt(req, message);
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



    // sendEmailOrderStatus(req,message, order, res);

      res.send({ order, message: `Pedido aceite com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// a comida esta pronta
orderRouter.put(
  '/:id/availableToDeliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isAvailableToDeliver = true;
      order.status = 'Pronto';
      order.stepStatus = 3;
      if(order.addressPrice === 0){
        order.status = 'Finalizado';
        order.isInTransit = true;
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      }

      const savedOrder = await order.save();

      let message =`Ola, a Nhiquela lhe informa que o pedido nr ${order.code} esta pronto e disponivel para ser entregue.`;

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
    console.log("🚗 Iniciando aceitação de pedido pelo entregador...");

    const order = await Order.findById(req.params.id);
    const user_deliver = await User.findById(req.user._id);

    if (!order) {
      console.log("❌ Pedido não encontrado:", req.params.id);
      return res.status(404).send({ message: 'Pedido não encontrado' });
    }

    if (!user_deliver || !user_deliver.isDeliveryMan) {
      console.log("❌ Usuário não é entregador:", req.user._id);
      return res.status(403).send({ message: 'Apenas entregadores podem aceitar pedidos' });
    }

    // VERIFICAÇÃO CRÍTICA: Verificar se o entregador já tem algum pedido ativo
    console.log("🔍 Verificando se entregador já tem pedidos ativos...");
    const activeOrders = await Order.find({
      'deliveryman.id': user_deliver._id,
      deleted: false,
      $or: [
        { status: 'Aceite pelo entregador' },
        { status: 'Em trânsito' },
        { status: 'No destino indicado' }
      ]
    });

    console.log(`📊 Pedidos ativos encontrados: ${activeOrders.length}`);

    // Se o entregador já tem um pedido ativo, impedir aceitar outro
    if (activeOrders.length > 0) {
      console.log("🚫 Entregador já tem pedido ativo. Bloqueando nova aceitação.");
      return res.status(400).send({ 
        message: 'Você já tem um pedido em andamento. Finalize ou cancele o pedido atual antes de aceitar outro.' 
      });
    }

    // Verificar também se o pedido já foi aceito por outro entregador
    if (order.deliveryman && order.deliveryman.id) {
      console.log("❌ Pedido já foi aceito por outro entregador:", order.deliveryman.id);
      return res.status(400).send({ 
        message: 'Este pedido já foi aceito por outro entregador.' 
      });
    }

    // Verificar se o pedido está disponível para entrega
    if (order.stepStatus !== 3 || !order.isAvailableToDeliver) {
      console.log("❌ Pedido não está disponível para entrega. Status:", order.status);
      return res.status(400).send({ 
        message: 'Este pedido não está disponível para entrega no momento.' 
      });
    }

    console.log("✅ Todas as verificações passaram. Aceitando pedido...");

    // Atualizar o pedido
    order.status = 'Aceite pelo entregador';
    order.stepStatus = 4;

    order.deliveryman = {
      id: user_deliver._id,
      photo: user_deliver.deliveryman.photo,
      name: user_deliver.deliveryman.name,
      phoneNumber: user_deliver.deliveryman.phoneNumber,
      transport_type: user_deliver.deliveryman.transport_type,
      transport_color: user_deliver.deliveryman.transport_color,
      transport_registration: user_deliver.deliveryman.transport_registration,
    };

    const updateOrder = await order.save();
    console.log("🎉 Pedido aceito com sucesso pelo entregador:", user_deliver._id);

    emitOrderUpdate(updateOrder, 'accepted_by_deliveryman', user_deliver._id);

    // Notificações
    const sellerOfProduct = await User.findById(order.seller);
    const clientOfProduct = await User.findById(order.user);

    let message = `Olá, a Nhiquela informa que o entregador aceitou o pedido nr ${updateOrder.code}`;

    // Enviar email para o vendedor
    sendEmailOrderToSeller(req, message, sellerOfProduct, updateOrder, res);

    // Criar notificações
    if (sellerOfProduct && sellerOfProduct.pushToken) {
      await createNotification({
        message: message,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
        pushToken: sellerOfProduct.pushToken,
      });
    }

    if (clientOfProduct && clientOfProduct.pushToken) {
      await createNotification({
        message: message,
        receiver_id: order.user,
        sender_id: order.seller,
        orderID: order._id,
        pushToken: clientOfProduct.pushToken
      });
    }

    console.log("📢 Notificações enviadas com sucesso");

    res.send({ 
      order: updateOrder, 
      message: `Pedido aceito pelo entregador com sucesso` 
    });
  })
);


// 📦 Pedidos aceites pelo entregador logado
orderRouter.get(
  '/accepted/byDeliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;

      console.log(`🔍 Buscando pedidos aceites pelo entregador: ${userId}`);

      // Verifica se o usuário é realmente um entregador
      const user = await User.findById(userId);
      if (!user || !user.isDeliveryMan) {
        return res.status(403).send({
          message: 'Apenas entregadores podem visualizar pedidos aceites.',
        });
      }

      // Busca todos os pedidos aceites (status = 4) pelo entregador atual
      const acceptedOrders = await Order.find({
        deleted: false,
        stepStatus: 4,
        'deliveryman.id': userId,
      })
        .populate({
          path: 'user',
          select: 'name email phoneNumber seller',
        })
        .sort({ createdAt: -1 });

      if (!acceptedOrders.length) {
        return res.status(200).send({
          message: 'Nenhum pedido aceite encontrado.',
          orders: [],
        });
      }

      // Monta resposta simplificada
      const formattedOrders = acceptedOrders.map((order) => ({
        id: order._id,
        code: order.code,
        status: order.status,
        stepStatus: order.stepStatus,
        createdAt: order.createdAt,
        clientName: order.user?.name || 'Cliente desconhecido',
        clientPhone: order.user?.phoneNumber || 'N/D',
        sellerInfo: order.user?.seller
          ? {
              name: order.user.seller.name,
              latitude: order.user.seller.latitude,
              longitude: order.user.seller.longitude,
            }
          : null,
        deliveryman: order.deliveryman,
      }));

      console.log(`📋 ${formattedOrders.length} pedidos aceites encontrados.`);
      res.status(200).send({
        message: 'Pedidos aceites encontrados com sucesso.',
        orders: formattedOrders,
      });
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos aceites:', error);
      res.status(500).send({ message: 'Erro interno ao buscar pedidos aceites.' });
    }
  })
);


// O pedido esta a caminho
orderRouter.put(
  '/:id/intransit',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    // const user_deliver = await User.findById(req.user._id);

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
      emitOrderUpdate(savedOrder, 'in_transit', order.deliveryman?.id);

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

      sendEmailOrderToSeller(req,message, sellerOfProduct, order, res);

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
      order.stepStatus= 5;
      const updateOrder = await order.save();


      const sellerOfProduct = await User.findById(order.seller);

      //  Para envio de mensagens

       let message =`Ola, a Nhiquela informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nr ${updateOrder.code}`;
 
      //  sendSMSToUSendIt(req,message);

      sendEmailOrderToSeller(req,message,sellerOfProduct, updateOrder, res);

      
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
     emitOrderUpdate(savedOrder, 'cancelled', order.deliveryman?.id);

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



// 📦 Pedido aceite pelo entregador (apenas um)
orderRouter.get(
  '/accepted-by-deliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;

      console.log(`🔍 Buscando pedido aceite pelo entregador: ${userId}`);

      // Busca o ÚLTIMO pedido aceite (status = 4) pelo entregador atual
      const acceptedOrder = await Order.findOne({
        deleted: false,
        stepStatus: 4,
        'deliveryman.id': userId,
      })
        .populate({
          path: 'user',
          select: 'name email phoneNumber',
        })
        .populate({
          path: 'seller',
          select: 'name address latitude longitude',
        })
        .sort({ createdAt: -1 }); // Pega o mais recente

      if (!acceptedOrder) {
        return res.status(200).send({
          message: 'Nenhum pedido aceite encontrado.',
          order: null,
        });
      }

      // Monta resposta simplificada
      const formattedOrder = {
        _id: acceptedOrder._id,
        code: acceptedOrder.code,
        status: acceptedOrder.status,
        stepStatus: acceptedOrder.stepStatus,
        createdAt: acceptedOrder.createdAt,
        user: {
          name: acceptedOrder.user?.name || 'Cliente desconhecido',
          phoneNumber: acceptedOrder.user?.phoneNumber || 'N/D',
        },
        seller: acceptedOrder.seller ? {
          name: acceptedOrder.seller.name,
          address: acceptedOrder.seller.address,
          latitude: acceptedOrder.seller.latitude,
          longitude: acceptedOrder.seller.longitude,
        } : null,
        deliveryman: acceptedOrder.deliveryman,
      };

      console.log(`✅ Pedido aceite encontrado: ${formattedOrder._id}`);
      res.status(200).send({
        message: 'Pedido aceite encontrado com sucesso.',
        order: formattedOrder,
      });
    } catch (error) {
      console.error('❌ Erro ao buscar pedido aceite:', error);
      res.status(500).send({ message: 'Erro interno ao buscar pedido aceite.' });
    }
  })
);

// Pedidos disponíveis (status 3)
orderRouter.get('/statusDelivery/:status', isAuth, async (req, res) => {
  try {
    if (req.params.status == 3) {
      console.log("📦 Buscando pedidos disponíveis (status 3)...");
      
      // 🔹 Busca apenas pedidos disponíveis (stepStatus = 3)
      const ordersAvailable = await Order.find({
        stepStatus: 3,
        deleted: false
      })
        .populate({
          path: 'user',
          select: 'name email phoneNumber',
        })
        .populate({
          path: 'seller',
          select: 'name address latitude longitude',
        })
        .sort({ createdAt: -1 })
        .limit(50); // Limite para evitar timeout

      console.log(`✅ ${ordersAvailable.length} pedidos disponíveis encontrados`);

      // Mapeia resultado simplificado
      const simplifiedOrders = ordersAvailable.map(order => ({
        _id: order._id,
        code: order.code,
        status: order.status,
        stepStatus: order.stepStatus,
        createdAt: order.createdAt,
        user: {
          name: order.user?.name || 'Cliente desconhecido',
          phoneNumber: order.user?.phoneNumber || 'N/D',
        },
        seller: order.seller ? {
          name: order.seller.name,
          address: order.seller.address,
          latitude: order.seller.latitude,
          longitude: order.seller.longitude,
        } : null,
      }));

      return res.json(simplifiedOrders);
    }

    // Caso status inválido
    return res.status(404).send({ message: "Invalid status" });
  } catch (error) {
    console.error("❌ Erro ao buscar pedidos:", error);
    return res.status(500).send({ message: "Erro interno no servidor" });
  }
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
  '/deliveryman/history/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const deliverymanId = req.params.id;
    const page = parseInt(req.query.page) || 1;

    console.log("Chegou ate aqui", deliverymanId)
    const pageSize = 10;
    const orders = await Order.find({
      'deliveryman.id': deliverymanId,
      deleted: false,
      isDelivered: true
    })
      .populate('user', 'name')
      .populate('seller', 'name')
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .sort({ deliveredAt: -1 });

    const countOrders = await Order.countDocuments({
      'deliveryman.id': deliverymanId,
      deleted: false,
      isDelivered: true
    });

    const pages = Math.ceil(countOrders / pageSize);

    res.send({ orders, total: countOrders, pages, currentPage: page });
  })
);



// 📦 Pedidos aceites pelo entregador logado
orderRouter.get(
  '/accepted-by-deliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;

      console.log(`🔍 Buscando pedidos aceites pelo entregador: ${userId}`);

      // Verifica se o usuário é realmente um entregador
      const user = await User.findById(userId).select('isDeliveryMan');
      if (!user) {
        return res.status(404).send({
          message: 'Usuário não encontrado.',
        });
      }
      
      if (!user.isDeliveryMan) {
        return res.status(403).send({
          message: 'Apenas entregadores podem visualizar pedidos aceites.',
        });
      }

      // Busca o ÚLTIMO pedido aceite (status = 4) pelo entregador atual
      // Assumindo que só pode haver um pedido ativo por vez
      const acceptedOrder = await Order.findOne({
        deleted: false,
        stepStatus: 4, // Status 4 = aceite
        'deliveryman.id': userId,
      })
        .populate('user', 'name email phoneNumber')
        .populate('seller', 'name address')
        .sort({ createdAt: -1 }); // Pega o mais recente

      if (!acceptedOrder) {
        return res.status(200).send({
          message: 'Nenhum pedido aceite encontrado.',
          order: null,
        });
      }

      // Monta resposta simplificada
      const formattedOrder = {
        id: acceptedOrder._id,
        code: acceptedOrder.code,
        status: acceptedOrder.status,
        stepStatus: acceptedOrder.stepStatus,
        createdAt: acceptedOrder.createdAt,
        clientName: acceptedOrder.user?.name || 'Cliente desconhecido',
        clientPhone: acceptedOrder.user?.phoneNumber || 'N/D',
        pickup: acceptedOrder.seller?.address || 'Local de origem',
        destination: acceptedOrder.shippingAddress?.address || 'Destino',
        sellerInfo: {
          name: acceptedOrder.seller?.name || 'Vendedor',
          latitude: acceptedOrder.seller?.latitude || 0,
          longitude: acceptedOrder.seller?.longitude || 0,
        },
        deliveryman: acceptedOrder.deliveryman,
      };

      console.log(`✅ Pedido aceite encontrado: ${formattedOrder.id}`);
      res.status(200).send({
        message: 'Pedido aceite encontrado com sucesso.',
        order: formattedOrder,
      });
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos aceites:', error);
      res.status(500).send({ 
        message: 'Erro interno ao buscar pedidos aceites.',
        error: error.message 
      });
    }
  })
);


// 📦 TODAS AS VIAGENS PARA O ENTREGADOR: 
// - Viagens disponíveis (status 3) NÃO associadas a ele
// - Viagens aceitas (status 4) associadas a ele
// orderRouter.get(
//   '/deliveryman/all',
//   isAuth,
//   expressAsyncHandler(async (req, res) => {
//     try {
//       const userId = req.user._id;

//       console.log(`🚗 Buscando TODAS as viagens para o entregador: ${userId}`);

//       // Verifica se o usuário é realmente um entregador
//       const user = await User.findById(userId);
//       if (!user || !user.isDeliveryMan) {
//         return res.status(403).send({
//           message: 'Apenas entregadores podem visualizar viagens.',
//         });
//       }

//       // 🔹 BUSCAR VIAGENS DISPONÍVEIS (status 3) NÃO ASSOCIADAS AO ENTREGADOR
//       const availableTrips = await Order.find({
//         deleted: false,
//         stepStatus: 3, // Disponível para entrega
//         isAvailableToDeliver: true,
//         isPaid: true,
//         $or: [
//           { 'deliveryman.id': { $exists: false } }, // Não tem entregador
//           { 'deliveryman.id': { $ne: userId } } // Tem entregador, mas não é este
//         ]
//       })
//         .populate({
//           path: 'user',
//           select: 'name email phoneNumber',
//         })
//         .populate({
//           path: 'seller',
//           select: 'name address latitude longitude',
//         })
//         .sort({ createdAt: -1 });

//       console.log(`📦 ${availableTrips.length} viagens disponíveis encontradas`);

//       // 🔹 BUSCAR VIAGENS ACEITAS (status 4) ASSOCIADAS AO ENTREGADOR
//       const acceptedTrips = await Order.find({
//         deleted: false,
//         stepStatus: 4, // Aceite pelo entregador
//         'deliveryman.id': userId // Apenas as associadas a este entregador
//       })
//         .populate({
//           path: 'user',
//           select: 'name email phoneNumber',
//         })
//         .populate({
//           path: 'seller',
//           select: 'name address latitude longitude',
//         })
//         .sort({ createdAt: -1 });

//       console.log(`✅ ${acceptedTrips.length} viagens aceitas encontradas`);

//       // 🔹 COMBINAR TODAS AS VIAGENS
//       const allTrips = [...acceptedTrips, ...availableTrips];

//       // 🔹 FORMATAR RESPOSTA
//       const formattedTrips = allTrips.map(trip => {
//         const baseTrip = {
//           _id: trip._id,
//           code: trip.code,
//           status: trip.status,
//           stepStatus: trip.stepStatus,
//           createdAt: trip.createdAt,
//           isAvailableToDeliver: trip.isAvailableToDeliver,
//           isPaid: trip.isPaid,
//           itemsPrice: trip.itemsPrice,
//           deliveryPrice: trip.deliveryPrice,
//           totalPrice: trip.totalPrice,
//           user: {
//             _id: trip.user?._id,
//             name: trip.user?.name || 'Cliente desconhecido',
//             email: trip.user?.email || 'N/D',
//             phoneNumber: trip.user?.phoneNumber || 'N/D',
//           },
//           seller: trip.seller ? {
//             _id: trip.seller._id,
//             name: trip.seller.name,
//             address: trip.seller.address,
//             latitude: trip.seller.latitude,
//             longitude: trip.seller.longitude,
//           } : null,
//           deliveryAddress: trip.deliveryAddress || {},
//           deliveryman: trip.deliveryman,
//           // 🔹 FLAG PARA IDENTIFICAR SE É UMA VIAGEM ACEITA PELO ENTREGADOR
//           isAcceptedByDeliveryman: trip.stepStatus === 4 && trip.deliveryman?.id?.toString() === userId.toString()
//         };

//         return baseTrip;
//       });

//       console.log(`🎯 Total de ${formattedTrips.length} viagens retornadas`);

//       res.status(200).send({
//         message: 'Viagens encontradas com sucesso.',
//         trips: formattedTrips,
//         summary: {
//           total: formattedTrips.length,
//           available: availableTrips.length,
//           accepted: acceptedTrips.length
//         }
//       });

//     } catch (error) {
//       console.error('❌ Erro ao buscar viagens:', error);
//       res.status(500).send({ 
//         message: 'Erro interno ao buscar viagens.',
//         error: error.message 
//       });
//     }
//   })
// );


// 📦 TODAS AS VIAGENS PARA O ENTREGADOR - OTIMIZADO PARA TEMPO REAL
orderRouter.get(
  '/deliveryman/all',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const cacheKey = `deliveryman_orders_${userId}`;

      console.log(`🚗 Buscando TODAS as viagens para o entregador: ${userId}`);

      // Verifica se o usuário é realmente um entregador
      const user = await User.findById(userId);
      if (!user || !user.isDeliveryMan) {
        return res.status(403).send({
          message: 'Apenas entregadores podem visualizar viagens.',
        });
      }

      // 🔥 BUSCA OTIMIZADA - SEM POPULAÇÕES DESNECESSÁRIAS
      const [availableTrips, acceptedTrips] = await Promise.all([
        // Viagens disponíveis (status 3)
        Order.find({
          deleted: false,
          stepStatus: 3,
          isAvailableToDeliver: true,
          isPaid: true,
          $or: [
            { 'deliveryman.id': { $exists: false } },
            { 'deliveryman.id': { $ne: userId } }
          ]
        })
          .select('_id code status stepStatus createdAt isAvailableToDeliver isPaid itemsPrice deliveryPrice totalPrice user seller deliveryAddress deliveryman')
          .lean(),

        // Viagens aceitas (status 4) pelo entregador atual
        Order.find({
          deleted: false,
          stepStatus: 4,
          'deliveryman.id': userId
        })
          .select('_id code status stepStatus createdAt isAvailableToDeliver isPaid itemsPrice deliveryPrice totalPrice user seller deliveryAddress deliveryman')
          .lean()
      ]);

      console.log(`📦 ${availableTrips.length} disponíveis, ${acceptedTrips.length} aceitas`);

      // 🔥 POPULAÇÃO EM LOTE PARA MELHOR PERFORMANCE
      const allOrderIds = [
        ...availableTrips.map(t => t._id),
        ...acceptedTrips.map(t => t._id)
      ];

      const [usersData, sellersData] = await Promise.all([
        // Buscar dados dos usuários
        User.find({ 
          '_id': { $in: [...new Set(availableTrips.map(t => t.user).filter(Boolean))] }
        }).select('name email phoneNumber').lean(),
        
        // Buscar dados dos vendedores
        User.find({ 
          '_id': { $in: [...new Set(availableTrips.map(t => t.seller).filter(Boolean))] }
        }).select('name address latitude longitude').lean()
      ]);

      // Criar mapas para acesso rápido
      const usersMap = new Map(usersData.map(u => [u._id.toString(), u]));
      const sellersMap = new Map(sellersData.map(s => [s._id.toString(), s]));

      // 🔥 FORMATAR RESPOSTA OTIMIZADA
      const formattedTrips = [...acceptedTrips, ...availableTrips].map(trip => {
        const userData = usersMap.get(trip.user?.toString());
        const sellerData = sellersMap.get(trip.seller?.toString());
        const isAcceptedByDeliveryman = trip.stepStatus === 4 && trip.deliveryman?.id?.toString() === userId.toString();

        return {
          _id: trip._id,
          code: trip.code,
          status: trip.status,
          stepStatus: trip.stepStatus,
          createdAt: trip.createdAt,
          isAvailableToDeliver: trip.isAvailableToDeliver,
          isPaid: trip.isPaid,
          itemsPrice: trip.itemsPrice,
          deliveryPrice: trip.deliveryPrice,
          totalPrice: trip.totalPrice,
          user: userData ? {
            _id: userData._id,
            name: userData.name || 'Cliente',
            email: userData.email || 'N/D',
            phoneNumber: userData.phoneNumber || 'N/D',
          } : { name: 'Cliente', phoneNumber: 'N/D' },
          seller: sellerData ? {
            _id: sellerData._id,
            name: sellerData.name || 'Vendedor',
            address: sellerData.address || 'Endereço não informado',
            latitude: sellerData.latitude || 0,
            longitude: sellerData.longitude || 0,
          } : null,
          deliveryAddress: trip.deliveryAddress || {},
          deliveryman: trip.deliveryman,
          isAcceptedByDeliveryman
        };
      });

      console.log(`🎯 ${formattedTrips.length} viagens formatadas em tempo real`);

      res.status(200).send({
        message: 'Viagens encontradas com sucesso.',
        trips: formattedTrips,
        summary: {
          total: formattedTrips.length,
          available: availableTrips.length,
          accepted: acceptedTrips.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Erro ao buscar viagens:', error);
      res.status(500).send({ 
        message: 'Erro interno ao buscar viagens.',
        error: error.message 
      });
    }
  })
);



export default orderRouter;