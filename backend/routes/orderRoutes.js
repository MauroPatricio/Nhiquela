import express from 'express';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';
import  axios  from 'axios' // Ensure axios is imported
import { createNotification } from '../controllers/notificationControllerNhabanga.js';





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
    // Create a new order object
    const newOrder = new Order({
      seller: req.body.orderItems[0].seller,
      orderItems: req.body.orderItems.map((x) => ({ ...x, product: x._id })),
      deliveryAddress: req.body.address,
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
      const order = await newOrder.save();

      // Create a notification after the order is saved
      const mensagem = `O seu pedido com o código ${order.code} foi criado com sucesso. Por favor! Aguarde pela confirmação do fornecedor.`;
     
      console.log(mensagem);
      console.log(order.seller);
      console.log(order.user);
      console.log(order._id);

      await createNotification({
        message: mensagem,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
      });

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
    
    const orders = await Order.find({ user: req.user._id, isDeletedByRequester: false }).sort({createdAt: -1});
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

orderRouter.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDeletedBySeller = true;
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
    const order = await Order.findById(req.params.id);

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
       

      //  Para envio de mensagens
      let msg =`Ola, a Nhiquela Shop gostaria de lhe informar que o pagamento referente ao pedido nr ${updateOrder.code} no valor de ${updateOrder.totalPrice} foi efectuado com sucesso.`;
      sendEmailOrderToSeller(req,msg, sellerOfProduct, updateOrder, res);


      await createNotification({
        message: msg,
        receiver_id: updateOrder.seller,
        sender_id: updateOrder.user,
        orderID: updateOrder._id,
      });

      if (sellerOfProduct){

        //  Para envio de mensagens
      let msgSeller =`Ola, a Nhiquela Shop gostaria de lhe informar que possui um novo pedido com o codigo ${updateOrder.code}.`;
    //  sendSMSToSellerUSendIt(sellerOfProduct, msgSeller);
  }

      res.send({ message: `Pedido Pago`, order: updateOrder });
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

    let msg =`Ola, a Nhiquela Shop tem o prazer de lhe informar que o seu pedido nr ${order.code} foi aceite com sucesso pelo fornecedor.`;
 
    //  sendSMSToUSendIt(req, msg);

    await createNotification({
      message: msg,
      receiver_id: order.seller,
      sender_id: order.user,
      orderID: order._id,
    });


    sendEmailOrderStatus(req,msg, order, res);

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

      let msg =`Ola, a Nhiquela Shop lhe informa que o pedido nr ${order.code} esta pronto e disponivel para entrega.`;

      await createNotification({
        message: msg,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
      });
  
  

      sendEmailOrderStatus(req,msg, order, res);

      // sendSMSToUSendItAdmin(msg);
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

      let msg =`Ola, a Nhiquela Shop lhe informa que o pedido nr ${order.code} esta pronto e disponivel para entrega.`;

      await createNotification({
        message: msg,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
      });
  
  

      sendEmailOrderStatus(req,msg, order, res);

      // sendSMSToUSendItAdmin(msg);
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

      let msg =`Ola, a Nhiquela Shop lhe informa que o pagamento correspondente ao pedido nr ${order.code} foi pago com sucesso.`;

      // sendEmailOrderStatus(req,msg, order, res);

      await createNotification({
        message: msg,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
      });
  
  

      // sendSMSToUSendItAdmin(msg);
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

      // let msg =`Ola, a Nhiquela Shop lhe informa que o pagamento correspondente ao pedido nr ${order.code} foi pago com sucesso.`;

      // sendEmailOrderStatus(req,msg, order, res);

      await createNotification({
        message: msg,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
      });
  
  

      // sendSMSToUSendItAdmin(msg);
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

    if (order) {
      order.status = 'Aceite pelo entregador';
      order.stepStatus=4;

      if(user_deliver.isDeliveryMan){

        order.deliveryman = {
          id: user_deliver._id,
          photo: user_deliver.deliveryman.photo,
          name:  user_deliver.deliveryman.name,
          phoneNumber:  user_deliver.deliveryman.phoneNumber,
          transport_type:  user_deliver.deliveryman.transport_type,
          transport_color:  user_deliver.deliveryman.transport_color,
          transport_registration:  user_deliver.deliveryman.transport_registration,
        }
      }

      const updateOrder = await order.save();


      const sellerOfProduct = await User.findById(order.seller);

      //  Para envio de mensagens

       let msg =`Ola, a Nhiquela Shop informa que o entregador aceitou o pedido nr ${updateOrder.code}`;
 
      //  sendSMSToSellerUSendIt(sellerOfProduct,msg);

      sendEmailOrderToSeller(req,msg,sellerOfProduct, updateOrder, res);

      await createNotification({
        message: msg,
        receiver_id: updateOrder.seller,
        sender_id: updateOrder.user,
        orderID: updateOrder._id,
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

        //  Para envio de mensagens

        let msg =`A Nhiquela Shop tem o prazer de lhe informar que o pedido ${order.code} esta a caminho do destino indicado. Em caso de duvida contacte o entregador pelo nr nos detalhes do pedido`;
 
        //  sendSMSToUSendIt(req,msg);

        await createNotification({
          message: msg,
          receiver_id: order.seller,
          sender_id: order.user,
          orderID: order._id,
        });
    

        const sellerOfProduct = await User.findById(order.seller);


      sendEmailOrderToSeller(req,msg, sellerOfProduct, order, res);

        
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

       let msg =`Ola, a Nhiquela Shop informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nr ${updateOrder.code}`;
 
      //  sendSMSToUSendIt(req,msg);

      sendEmailOrderToSeller(req,msg,sellerOfProduct, updateOrder, res);

      await createNotification({
        message: msg,
        receiver_id: updateOrder.seller,
        sender_id: updateOrder.user,
        orderID: updateOrder._id,
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

    if (order) {
      //     order.isPaid = true;
      //     order.paidAt= Date.now();



      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.status = 'Entregue';
      order.stepStatus = 6;

      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };
      const savedOrder = await order.save();

       //  Para envio de mensagens

      let msg =`Ola, o pedido ${order.code} foi entregue com sucesso. Agradecemos por escolher e confiar em nós. Nhiquela Shop - Tudo em suas mãos.`;
 
      await createNotification({
        message: msg,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
      });
  

      //  sendSMSToUSendIt(req,msg);

      const sellerOfProduct = await User.findById(order.seller);


      sendEmailOrderToSeller(req,msg, sellerOfProduct, order, res);

      res.send({ message: `Pedido entregue com sucesso`, order: savedOrder });
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

      let msg =`Ola, a Nhiquela Shop lamenta lhe informar que o seu pedido nr ${order.code} foi cancelado. O motivo do cancelamento podera verificar no site pesquisando pelo codigo.`;

        // sendSMSToUSendIt(req,msg);    

      const sellerOfProduct = await User.findById(order.seller);

      await createNotification({
        message: msg,
        receiver_id: order.seller,
        sender_id: order.user,
        orderID: order._id,
      });
  


      sendEmailOrderToSeller(req,msg, sellerOfProduct, order, res);

      res.send({ message: `Pedido cancelado com sucesso`, order: savedOrder});
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


export default orderRouter;
