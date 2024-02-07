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
    const sellerOfProduct = await User.findById(newOrder.seller);

      if (newOrder.isPaid){
        // Enviar sms para o fornecedor
      let msg = `Ola, a Nhiquela Shop informa que possui um novo pedido com o codigo nr ${newOrder.code}`; 
      sendSMSToUSendItDeliverman(sellerOfProduct, msg);
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



export default requestDeliver;
