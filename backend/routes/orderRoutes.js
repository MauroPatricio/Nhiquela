import express from 'express';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendSMSToUSendIt, sendEmailOrderStatus } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';





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

    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

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
            _id: "$orderItems.slug",
            slug: { $first: "$orderItems.slug" },
            name: { $first: "$orderItems.name" },
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


    const newOrder = new Order({
      seller: req.body.orderItems[0].seller,
      orderItems: req.body.orderItems.map((x) => ({ ...x, product: x._id})),
      deliveryAddress: req.body.address,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice,
      deliveryPrice: req.body.deliveryPrice,
      taxPrice: req.body.taxPrice,
      totalPrice: req.body.totalPrice,
      ivaTax: req.body.ivaTax,
      siteTax: req.body.siteTax,
      addressPrice: req.body.addressPrice,
      user: req.user._id,
      code: generateCode(),
      status: 'Pendente',
    });


   
      //  Para envio de mensagens

      let msg = `Ola, seja bem vindo(a) a Nhiquela Shop. Dentro de instantes confirmaremos o seu pagamento. Por favor, aguarde e muito obrigado pela preferencia. Pedido: ${newOrder.code}`; 
 
    //  sendSMSToUSendIt(req, msg);

    let mailText = `Ola ${req.user.name},\n \n Seja bem vindo(a) a Nhiquela Shop.\n Dentro de instantes confirmaremos o seu pagamento.\n Por favor, aguarde e muito obrigado pela preferencia. Pedido: ${newOrder.code}. \n Atenciosamente,\n \n Nhiquela Shop`; 
 
    //  sendSMSToUSendIt(req, msg);

     sendEmailOrderStatus(req,mailText, newOrder, res);

    req.body.orderItems.map(async o=>{

      const product = await Product.findById(o);


      if(product.countInStock > 0){
        product.countInStock = product.countInStock - o.quantity

        await product.save();

      }

    })

    const order = await newOrder.save();

    res.status(201).send({ message: 'Novo pedido criado com sucesso', order });
  })
);

// get orders by user id
orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    
    const orders = await Order.find({ user: req.user._id, deleted: false });
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
      order.deleted = true;
      order.isActive = false;

      await order.save();

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

// get order paid
orderRouter.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };

      
      
      const updateOrder = await order.save();

      //  Para envio de mensagens
      let msg =`Ola, a Nhiquela Shop gostaria de lhe informar que o pagamento referente ao pedido nr ${updateOrder.code} no valor de ${updateOrder.price} foi efectuado com sucesso.`;
 
      //  sendSMSToUSendIt(req, msg);
      sendEmailOrderStatus(req,msg, updateOrder, res);

      res.send({ message: `Pedido Pago`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

orderRouter.put(
  '/:id/confirmDestination',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = 'No destino indicado';
      const updateOrder = await order.save();

      //  Para envio de mensagens

       let msg =`Ola, a Nhiquela Shop informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nr *****`;
 
      //  sendSMSToUSendIt(msg);

      sendEmailOrderStatus(req,msg, updateOrder, res);


      res.send({ message: `No destino indicado`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

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
      order.status = 'Finalizado';

      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };
      await order.save();

       //  Para envio de mensagens

      let msg =`Ola, o pedido XXXX foi entregue com sucesso. Agradecemos por escolher a Nhiquela Shop.`;
 
      //  sendSMSToUSendIt(req,msg);

      sendEmailOrderStatus(req,msg, order, res);

 
      res.send({ message: `Pedido entregue com sucesso ` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

orderRouter.put(
  '/:id/intransit',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    const user_deliver = await User.findById(req.user._id);

    if (order) {
      //     order.isPaid = true;
      //     order.paidAt= Date.now();
      order.status = 'Em trânsito';
      order.isInTransit = true;


      if(user_deliver.isDeliveryMan){

        order.deliveryman = {
          photo: user_deliver.deliveryman.photo,
          name:  user_deliver.deliveryman.name,
          phoneNumber:  user_deliver.deliveryman.phoneNumber,
          transport_type:  user_deliver.deliveryman.transport_type,
          transport_color:  user_deliver.deliveryman.transport_color,
          transport_registration:  user_deliver.deliveryman.transport_registration,
        }
      }


      // order.paymentResult = {
      //   id: req.body.id,
      //   status: req.body.status,
      //   update_time: req.body.update_time,
      //   email_address: req.body.email_address,
      // };
      await order.save();

        //  Para envio de mensagens

        let msg =`A Nhiquela Shop tem o prazer de lhe informar que o pedido XXXXX esta a caminho do destino indicado. Em caso de duvida contacte o entregador pelo nr: 840000000`;
 
        //  sendSMSToUSendIt(req,msg);

        sendEmailOrderStatus(req,msg, order, res);

        
      res.send({ message: `Pedido em trânsito` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

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
      order.canceledReason = req.body.message;


      await order.save();
      
      //  Para envio de mensagens

      let msg =`Ola, a Nhiquela Shop lamenta lhe informar que o seu pedido nr XXXXX foi cancelado. O motivo do cancelamento podera verificar no site pesquisando pelo codigo.`;

      //  sendSMSToUSendIt(req,msg);    

      sendEmailOrderStatus(req,msg, order, res);

      res.send({ message: `Pedido cancelado com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

orderRouter.put(
  '/:id/accept',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isAccepted = true;
      order.isCanceled = false;

      order.status = 'Aceite';
      await order.save();

      //  Para envio de mensagens

    let msg =`Ola, a Nhiquela Shop tem o prazer de lhe informar que o seu pedido nr XXXXX foi aceite com sucesso pelo fornecedor.`;
 
    //  sendSMSToUSendIt(req, msg);
    sendEmailOrderStatus(req,msg, order, res);

      res.send({ message: `Pedido aceite com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

orderRouter.put(
  '/:id/availableToDeliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isAvailableToDeliver = true;
      order.status = 'Pronto';

      if(order.addressPrice === 0){
        order.status = 'Finalizado';
        order.isInTransit = true;
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      }

      await order.save();

      let msg =`Ola, a Nhiquela Shop lhe informa que o seu pedido nr xxxxx ja esta pronto e disponivel para entrega.`;

      sendEmailOrderStatus(req,msg, order, res);

//  sendSMSToUSendIt(req, msg);
      res.send({ message: `Pedido disponível para entrega` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

export default orderRouter;
