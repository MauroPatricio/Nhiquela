import express from 'express';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendSMSToUSendIt } from '../utils.js';
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
          _id: "_id",
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
      { $limit: 10 }, // Adjust the number as per your requirements
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

      // let msg = 'Ola Seja bem vindo a Nhiquela Shop. O seu pagamento sera confirmado dentro de instantes. Por favor aguarde' 
      // +` e muito obrigado pela confiança e preferência. O codigo do seu pedido e ${newOrder.code}`; 
 
    //  sendSMSToUSendIt(msg);

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

      //  Para envio de mensagens

      // let msg =`Olá [Nome do Cliente],
      // Gostaríamos de lhe informar que confirmamos o seu pagamento no valor de ${order.totalPrice} foi processado com sucesso em ${order.totalPrice}. Este pagamento refere-se ao pedido no: ${order.code}
      // Aguarde pela confirmacao do fornecedor.
      // Em caso de dúvida, por favor, entre em contato conosco imediatamente.
      // Agradecemos por usar nossos serviços online.
      // Atenciosamente, Nhiquela Shop.`;
 
    //  sendSMSToUSendIt(msg);

      const updateOrder = await order.save();
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

      // let msg =`Ola [Nome do Destinatário],

      //     Gostaríamos de confirmar que o seu pedido  foi entregue com sucesso em ${order.deliveredAt}. O pacote foi entregue no endereço indicado:

      //     Endereço de Entrega:

      //     ${order.deliveryAddress.referenceAddress}
      //     ${order.deliveryAddress.address},
      //     ${order.deliveryAddress.city}


      //     Ficamos satisfeitos em saber que o seu pedido chegou conforme o planejado. Se você tiver algum problema ou dúvida relacionada à entrega, por favor, entre em contato conosco imediatamente.

      //     Agradecemos por escolher a Nhiquela Shop e esperamos que fique satisfeito com sua compra. Se precisar de assistência adicional, não hesite em nos contatar.

      //     Atenciosamente,

      //     Nhiquela Shop.`;
 
    //  sendSMSToUSendIt(msg);
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

    if (order) {
      //     order.isPaid = true;
      //     order.paidAt= Date.now();
      order.status = 'Em trânsito';
      order.isInTransit = true;

      // order.paymentResult = {
      //   id: req.body.id,
      //   status: req.body.status,
      //   update_time: req.body.update_time,
      //   email_address: req.body.email_address,
      // };
      await order.save();

        //  Para envio de mensagens

            // let msg =`Ola [Nome do Cliente],

            // Temos o prazer de informar que seu pedido número ${order.code} está a caminho do destino indicado.

            // Certifique-se de estar disponível no endereço de entrega ou forneça instruções específicas para o entregador.

            // Ficamos à disposição para qualquer dúvida ou assistência adicional. Agradecemos por escolher a Nhiquela Shop e esperamos que você tenha uma excelente experiência com o seu pedido.

            // Atenciosamente,
            // Nhiquela Shop
            // .`;
 
    //  sendSMSToUSendIt(msg);
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


       //  Para envio de mensagens

//             let msg =`Ola [Nome do Cliente],

// Esperamos que esteja bem. Lamentamos informar que o seu pedido número ${order.code} foi cancelado. Pedimos desculpas por qualquer inconveniente que isso possa causar.

// Motivo do Cancelamento podera verificar no site e pesquisando pelo codigo ${order.code}.

// Qualquer pagamento já realizado será reembolsado para a sua conta original de pagamento. Por favor, permita 5 dias úteis para o processamento do reembolso.

// Se você tiver alguma dúvida ou precisar de assistência adicional, não hesite em entrar em contato conosco. Estamos à disposição para ajudá-lo(a) de qualquer maneira possível.

// Lamentamos profundamente qualquer inconveniente que isso possa causar e agradecemos pela sua compreensão.

// Atenciosamente,
// Nhiquela Shop.`;
 
    //  sendSMSToUSendIt(msg);
      await order.save();
      res.send({ message: `Pedido Cancelado com Sucesso` });
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

            let msg =`Ola [Nome do Cliente],

            Temos o prazer de informar que o seu pedido número ${order.code} foi aceito pelo nosso fornecedor. Isso significa que o processo de atendimento do seu pedido está em andamento e em breve você receberá mais actualizacoes.
            Detalhes do Pedido:
            - Número do Pedido: ${order.code}
            - Data do Pedido: ${order.createdAt}
            - Valor Total: ${order.totalPrice}
            
            Agradecemos pela confiança em nosso serviço e estamos à disposição para qualquer dúvida ou assistência adicional. Fique à vontade para entrar em contato conosco a qualquer momento.
            
            Esperamos que tenha uma excelente experiência de compra conosco.
            
            Atenciosamente,
            Nhiquela Shop`;
 
    //  sendSMSToUSendIt(msg);
      res.send({ message: `Pedido Aceite com Sucesso` });
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

      // let msg =`Ola [Nome do Cliente],

      // Temos o prazer de informar que o seu pedido número ${order.code} foi entregue com sucesso e está agora em suas mãos.
      
      // Detalhes do Pedido:
      // - Número do Pedido: [Número do Pedido]
      // - Data do Pedido: [Data do Pedido]
      // - Valor Total: [Valor Total do Pedido]
      
      // Detalhes da Entrega:
      // - Data e Horário da Entrega: [Horário da Entrega]
      // - Endereço de Entrega: [Endereço de Entrega]
      
      // Agradecemos por escolher a Nhiquela Shop e esperamos que esteja satisfeito(a) com os produtos que recebeu. Se você tiver alguma dúvida ou precisar de assistência adicional relacionada ao seu pedido, não hesite em entrar em contato conosco. 
      
      // Atenciosamente,
      // Nhiquela Shop`;

//  sendSMSToUSendIt(msg);
      res.send({ message: `Pedido disponível para entrega` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

export default orderRouter;
