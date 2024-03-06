import express from 'express';
import RequestDeliv from '../models/RequestDeliverModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin, sendSMSToUSendItDeliverman } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';


const requestDeliver = express.Router();

function generateCode() {
  let code = Math.floor(Math.random() * 900000) + 100000;
  return code.toString();
}

// All requests
requestDeliver.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const orders = await RequestDeliv.find({
      ...sellerFilter,
      deleted: { $eq: false},
    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await RequestDeliv.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
  })
);

// All requests sorted by user
requestDeliver.get(
  '/user',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const requests = await requestDeliver.find({
      isPaid: {$eq: true},
      deleted: { $eq: false},
    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countRequests = await requestDeliver.countDocuments({
      isPaid: {$eq: true},
      deleted: { $eq: false },
    });

    const  pages = Math.ceil(countRequests/pageSize);
    res.send({requests, pages});
  })
);


requestDeliver.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {


    const newOrder = new RequestDeliv({
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      goodType: req.body.goodType,
      transportType:  req.body.transportType,
      deliverCity:  req.body.deliverCity,
      origin:  req.body.origin,
      destination:  req.body.destination,
      paymentOption:  req.body.paymentOption,
      description:  req.body.description,
      paymentMethod:  req.body.paymentMethod,
      deliveryPrice:  req.body.deliveryPrice,
      user: req.user._id,
      code: generateCode(),
      status: 'Pendente',
      isPaid: req.body.isPaid,
      paidAt: req.body.paidAt,
      stepStatus: req.body.stepStatus
    });

    let mailText = `Ola ${req.user.name},\n \n Seja bem vindo(a) a Nhiquela Shop.\n Dentro de instantes confirmaremos o seu pagamento.\n Por favor, aguarde e muito obrigado pela preferencia. Pedido: ${newOrder.code}. \n Atenciosamente,\n \n Nhiquela Shop`; 
    
    //  Para envio de mensagens
    // const sellerOfProduct = await User.findById(newOrder.seller);

      if (newOrder.isPaid){
        // Enviar sms para o fornecedor
      let msg = `Ola, a Nhiquela Shop informa que possui um novo pedido com o codigo nr ${newOrder.code}`; 
      sendSMSToUSendItDeliverman( msg);
    }else{
       let msg = `Ola, a Nhiquela Shop informa que possui um novo pedido com o codigo nr ${newOrder.code}`; 
        sendSMSToUSendItAdmin(msg);
    }

     sendEmailOrderStatus(req,mailText, newOrder, res);


    const requestDeliv = await newOrder.save();

    res.status(201).send({ message: 'Novo pedido criado com sucesso', requestDeliv });
  })
);



requestDeliver.get(
  '/userview',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = req.query.user || '';
    const userFilter = user ? { user } : {};

    const page = req.query.page || 1;
    const pageSize = 10    
    
    const deliverRequests = await RequestDeliv.find({
      user,
      deleted: { $eq: false},

    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});


    const countRequests = await RequestDeliv.countDocuments({
     user,
     deleted: { $eq: false},

    });

    const  pages = Math.ceil(countRequests/pageSize);

    res.send({deliverRequests, pages});
  })
);




requestDeliver.get(
  '/admin',
  isAuth,
  expressAsyncHandler(async (req, res) => {

    const page = req.query.page || 1;
    const pageSize = 10    
    
    const deliverRequests = await RequestDeliv.find({
      deleted: { $eq: false},

    }).populate('user', 'name').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});


    const countRequests = await RequestDeliv.countDocuments({
     deleted: { $eq: false},
    });

    const  pages = Math.ceil(countRequests/pageSize);

    res.send({deliverRequests, pages});
  })
);




// get requestDeliv by userid
requestDeliver.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const requestDeliv = await RequestDeliv.findById(req.params.id);

    if (requestDeliv) {
      res.send(requestDeliv);
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


requestDeliver.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const requestDeliv = await RequestDeliv.findById(req.params.id);
    if (requestDeliv) {
      requestDeliv.deleted = true;
      requestDeliv.isActive = false;

      await requestDeliv.save();

      res.send({ message: `Pedido removido com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


requestDeliver.put(
  '/:id/acceptedByDeliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const requestDeliv = await RequestDeliv.findById(req.params.id);
    const user_deliver = await User.findById(req.user._id);

    if (requestDeliv) {
      requestDeliv.status = 'Aceite pelo entregador';
      requestDeliv.stepStatus=4;

      if(user_deliver.isDeliveryMan){

        requestDeliv.deliveryman = {
          id: user_deliver._id,
          photo: user_deliver.deliveryman.photo,
          name:  user_deliver.deliveryman.name,
          phoneNumber:  user_deliver.deliveryman.phoneNumber,
          transport_type:  user_deliver.deliveryman.transport_type,
          transport_color:  user_deliver.deliveryman.transport_color,
          transport_registration:  user_deliver.deliveryman.transport_registration,
        }
      }

      const updateOrder = await requestDeliv.save();


      // const sellerOfProduct = await User.findById(order.seller);

      //  Para envio de mensagens

       let msg =`Ola, a Nhiquela Shop informa que o entregador aceitou o pedido nr ${updateOrder.code}`;
 
       sendSMSToUSendIt(req, msg)
      

       let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o entregador aceitou o pedido nr ${updateOrder.code}. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
      sendEmailOrderStatus(req,mailText, updateOrder, res);


      res.send({ message: `Aceite pelo entregador`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// O pedido esta a caminho
requestDeliver.put(
  '/:id/intransit',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestDeliv.findById(req.params.id);

    if (order) {
      order.status = 'Em trânsito';
      order.isInTransit = true;
      order.stepStatus=5;

      await order.save();

        //  Para envio de mensagens

        let msg =`Ola ${req.user.name},\n \n A Nhiquela Shop tem o prazer de lhe informar que o pedido ${order.code} esta a caminho do destino indicado.`;
 
 
        sendSMSToUSendIt(req, msg)
       
 
        let mailText = `A Nhiquela Shop tem o prazer de lhe informar que o pedido ${order.code} esta a caminho do destino indicado.. \n \n Atenciosamente, \n Nhiquela Shop`; 
     
       sendEmailOrderStatus(req,mailText, order, res);

        
      res.send({ message: `Pedido em trânsito` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// O entregador Confirma a chegada do destino de entrega
requestDeliver.put(
  '/:id/confirmDestination',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestDeliv.findById(req.params.id);

    if (order) {
      order.status = 'No destino indicado';
      order.stepStatus= 5;
      const updateOrder = await order.save();


      //  Para envio de mensagens

       let msg =`Ola, a Nhiquela Shop informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nr ${updateOrder.code}`;
 
 
       sendSMSToUSendIt(req, msg)
      

       let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nr ${updateOrder.code}. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
       sendEmailOrderStatus(req,mailText, order, res);


      res.send({ message: `No destino indicado`, order: order });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


// O cliente finaliza a confirmar a recepcao do pedido
requestDeliver.put(
  '/:id/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestDeliv.findById(req.params.id);

    if (order) {
      //     order.isPaid = true;
      //     order.paidAt= Date.now();



      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.status = 'Finalizado';
      order.stepStatus = 6;

      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };
      await order.save();

       //  Para envio de mensagens

      let msg =`Ola, o pedido ${order.code} foi entregue com sucesso. Agradecemos por escolher e confiar em nós. Nhiquela Shop - Tudo em suas mãos.`;
 
      sendSMSToUSendIt(req,msg);

      let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o seu pedido foi entregue com sucesso e agradecemos por escolher e confiar em nós. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
      sendEmailOrderStatus(req,mailText, updateOrder, res);

      res.send({ message: `Pedido entregue com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Em caso de cancelamento do pedido
requestDeliver.put(
  '/:id/cancel',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestDeliv.findById(req.params.id);

    if (order) {
  
      order.isCanceled = true;
      order.isAccepted = false;
      order.status = 'Cancelado';
      order.stepStatus = 7;
      order.canceledReason = req.body.message;


      await order.save();
      
      //  Para envio de mensagens

      let msg =`Ola, a Nhiquela Shop lamenta lhe informar que o seu pedido nr ${order.code} foi cancelado. O motivo do cancelamento podera verificar no site pesquisando pelo codigo.`;
 
      sendSMSToUSendIt(req,msg);

      let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o seu pedido foi cancelado. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
      sendEmailOrderStatus(req,mailText, updateOrder, res);


      res.send({ message: `Pedido cancelado com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);



// Actualizar o estado do pedido para pago
requestDeliver.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestDeliv.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.stepStatus = 1;
      order.paidAt = Date.now();
      
      const updateOrder = await order.save();


       

      //  Para envio de mensagens
      let msg =`Ola, a Nhiquela Shop gostaria de lhe informar que o pagamento referente ao pedido nr ${updateOrder.code} no valor de ${updateOrder.totalPrice} foi efectuado com sucesso.`;

      // Em falta metodo para envio de mensagem e email
      sendSMSToUSendItDeliverman( msg);


      res.send({ message: `Pedido Pago`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


export default requestDeliver;
