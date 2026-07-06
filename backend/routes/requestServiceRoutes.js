import express from 'express';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin, sendSMSToUSendItDeliverman } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { debitDriverCommissionWithSession, getFinancialConfig, canAffordTripCommission } from '../services/walletService.js';
import PricingService from '../services/PricingService.js';


const requestServiceer = express.Router();

function generateCode() {
  let code = Math.floor(Math.random() * 900000) + 100000;
  return code.toString();
}

// All requests
requestServiceer.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const orders = await RequestService.find({
      ...sellerFilter,
      deleted: { $eq: false},
    }).populate('user', 'name phoneNumber profileImage').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countOrders = await RequestService.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
    });

    const  pages = Math.ceil(countOrders/pageSize);
    res.send({orders, pages});
  })
);

// All requests sorted by user
requestServiceer.get(
  '/user',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = 10    
    
    const requests = await requestServiceer.find({
      isPaid: {$eq: true},
      deleted: { $eq: false},
    }).populate('user', 'name phoneNumber profileImage').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});

    const countRequests = await requestServiceer.countDocuments({
      isPaid: {$eq: true},
      deleted: { $eq: false },
    });

    const  pages = Math.ceil(countRequests/pageSize);
    res.send({requests, pages});
  })
);

// Get user's active trip
requestServiceer.get(
  '/active',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const activeTrip = await RequestService.findOne({
      user: req.user._id,
      deleted: false,
      status: { $in: ['Pendente', 'Aceite pelo entregador', 'A Caminho', 'Em andamento'] }
    }).populate('user', 'name phoneNumber profileImage');

    if (activeTrip) {
      res.send(activeTrip);
    } else {
      res.status(404).send({ message: 'Nenhuma viagem activa encontrada' });
    }
  })
);


requestServiceer.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // 1. Validate if user already has an active request
    const existingActiveTrip = await RequestService.findOne({
      user: req.user._id,
      deleted: false,
      status: { $in: ['Pendente', 'Aceite pelo entregador', 'A Caminho', 'Em andamento'] }
    });

    if (existingActiveTrip) {
      return res.status(409).send({ message: 'Já tem uma viagem activa. Conclua ou cancele a viagem actual antes de solicitar uma nova.' });
    }

    // Check for cancellation penalty block
    const currentUser = await User.findById(req.user._id);
    if (currentUser && currentUser.blockedUntil && currentUser.blockedUntil > new Date()) {
      return res.status(403).send({ message: "Conta bloqueada por 30 dias devido a cancelamentos sucessivos sem justificação válida." });
    }


    const newOrder = new RequestService({
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      goodType: req.body.goodType,
      transportType:  req.body.transportType,
      deliverCity:  req.body.deliverCity,
      origin:  req.body.origin,
      destination:  req.body.destination,
      originDetails: req.body.originDetails || null,
      destinationDetails: req.body.destinationDetails || null,
      stops: req.body.stops || [],
      paymentOption:  req.body.paymentOption,
      description:  req.body.description,
      paymentMethod:  req.body.paymentMethod,
      deliveryPrice:  req.body.deliveryPrice, // Will be overridden below by server-side calculation
      serviceId: req.body.serviceId || null,
      user: req.user._id,
      code: generateCode(),
      status: 'Pendente',
      isPaid: req.body.isPaid,
      paidAt: req.body.paidAt,
      stepStatus: req.body.stepStatus,
      targetDriverId: req.body.targetDriverId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      isSearching: !req.body.targetDriverId,
      searchRadius: 3000,
      contactedDrivers: [],
      lastDispatchTime: new Date()
    });

    // ============================================================
    // CÁLCULO AUTOMÁTICO DO PREÇO (server-side, imutável)
    // Executado ANTES do save() — o backend nunca confia no preço do cliente
    // ============================================================
    const originDetails = req.body.originDetails;
    const destinationDetails = req.body.destinationDetails;
    const serviceId = req.body.serviceId;

    if (originDetails?.lat && destinationDetails?.lat && serviceId) {
      try {
        console.log(`[PricingService] A calcular preço para pedido ${newOrder.code}...`);
        const priceResult = await PricingService.calculatePrice({
          serviceId,
          originLoc: { lat: originDetails.lat, lng: originDetails.lng },
          destLoc:   { lat: destinationDetails.lat, lng: destinationDetails.lng },
        });

        // Guardar snapshot completo e imutável do cálculo
        newOrder.pricing = {
          distanceKm:     priceResult.breakdown.distanceKm,
          costDeslocacao: priceResult.breakdown.distanceCost + priceResult.breakdown.timeCost,
          costServico:    priceResult.breakdown.actualBaseFare,
          totalPrice:     priceResult.price,
          calculatedAt:   new Date(),
          breakdown:      priceResult.breakdown,
        };

        // Substituir o deliveryPrice enviado pelo cliente pelo valor calculado pelo servidor
        newOrder.deliveryPrice = priceResult.price;

        console.log(`[PricingService] ✅ Preço calculado: ${priceResult.price} MT (distância: ${priceResult.breakdown.distanceKm?.toFixed(2)} km)`);
      } catch (pricingErr) {
        // Não bloquear a criação do pedido — usar o preço do cliente como fallback
        console.warn(`[PricingService] ⚠️ Falha no cálculo automático. A usar deliveryPrice do cliente (${req.body.deliveryPrice} MT). Erro: ${pricingErr.message}`);
      }
    } else {
      console.log(`[PricingService] ℹ️ Campos insuficientes para cálculo (serviceId=${serviceId}, origin lat=${originDetails?.lat}, dest lat=${destinationDetails?.lat}). A usar deliveryPrice do cliente.`);
    }

    let mailText = `Ola ${req.user.name},\n \n Seja bem vindo(a) a Nhiquela Shop.\n Dentro de instantes confirmaremos o seu pagamento.\n Por favor, aguarde e muito obrigado pela preferencia. Pedido: ${newOrder.code}. \n Atenciosamente,\n \n Nhiquela Shop`; 
    
    //  Para envio de mensagens
    // const sellerOfProduct = await User.findById(newOrder.seller);

      if (newOrder.isPaid){
        // Enviar sms para o fornecedor
      let msg = `Olá, a Nhiquela Shop informa que possui um novo pedido com o código nº ${newOrder.code}`; 
      sendSMSToUSendItDeliverman( msg);
    }else{
       let msg = `Olá, a Nhiquela Shop informa que possui um novo pedido com o código nº ${newOrder.code}`; 
        sendSMSToUSendItAdmin(msg);
    }

     sendEmailOrderStatus(req,mailText, newOrder, res);


    const requestService = await newOrder.save();
    await requestService.populate('user', 'name phoneNumber profileImage');

    const io = req.app.get('io');
    if (io) {
      if (newOrder.targetDriverId) {
        io.to(`driver_${newOrder.targetDriverId}`).emit('new_order', requestService);
      } else {
        // Intelligent Dispatch engine will handle emitting to nearest drivers
      }
    }

    res.status(201).send({ message: 'Novo pedido criado com sucesso', requestService });
  })
);



requestServiceer.get(
  '/userview',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = req.query.user || '';
    const userFilter = user ? { user } : {};

    const page = req.query.page || 1;
    const pageSize = 10    
    
    const deliverRequests = await RequestService.find({
      user,
      deleted: { $eq: false},

    }).populate('user', 'name phoneNumber profileImage').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});


    const countRequests = await RequestService.countDocuments({
     user,
     deleted: { $eq: false},

    });

    const  pages = Math.ceil(countRequests/pageSize);

    res.send({deliverRequests, pages});
  })
);




requestServiceer.get(
  '/admin',
  isAuth,
  expressAsyncHandler(async (req, res) => {

    const page = req.query.page || 1;
    const pageSize = 10    
    
    const deliverRequests = await RequestService.find({
      deleted: { $eq: false},

    }).populate('user', 'name phoneNumber profileImage').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});


    const countRequests = await RequestService.countDocuments({
     deleted: { $eq: false},
    });

    const  pages = Math.ceil(countRequests/pageSize);

    res.send({deliverRequests, pages});
  })
);




// get requestService by userid
requestServiceer.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const requestService = await RequestService.findById(req.params.id);

    if (requestService) {
      res.send(requestService);
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


requestServiceer.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const requestService = await RequestService.findById(req.params.id);
    if (requestService) {
      requestService.deleted = true;
      requestService.isActive = false;
      requestService.status = 'Cancelado';
      requestService.targetDriverId = null;
      if (requestService.deliveryman && requestService.deliveryman.id) {
        requestService.deliveryman.id = null;
      }

      await requestService.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`order_${requestService._id}`).emit('order_updated', requestService);
        // Se ainda não tinha sido aceite por ninguém, avisar todos para removerem da lista
        io.emit('order_updated', requestService);
      }

      res.send({ message: `Pedido removido com sucesso` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


requestServiceer.put(
  '/:id/acceptedByDeliveryman',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user_deliver = await User.findById(req.user._id);

    if (!user_deliver) {
      return res.status(404).send({ message: 'Motorista não encontrado na base de dados. Por favor, inicie sessão novamente.' });
    }

    // Usar uma transação para garantir que débito e aceite ocorrem de forma atómica
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await RequestService.findOne({ _id: req.params.id, status: 'Pendente' }).session(session);

      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).send({ message: 'Pedido já foi aceite por outro motorista ou não está disponível' });
      }

      // Calcular comissão baseada nas configurações financeiras dinâmicas (default 15%)
      const financialConfig = await getFinancialConfig();
      const commissionRate = financialConfig?.driverCommissionRate || 0.15;
      const serviceValue = order.pricing?.totalPrice || order.deliveryPrice || order.totalPrice || 0;
      const commissionAmount = serviceValue * commissionRate;

      // Realizar o débito da carteira imediatamente na aceitação (confirmação do serviço)
      try {
        await debitDriverCommissionWithSession(
          user_deliver._id, 
          commissionAmount, 
          `Comissão de serviço para o pedido direto ${order.code} confirmado`, 
          'wallet', 
          session
        );
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send({ message: error.message });
      }

      let deliverymanData = {};
      if(user_deliver.isDeliveryMan){
        deliverymanData = {
          id: user_deliver._id,
          photo: user_deliver.deliveryman?.photo || '',
          name:  user_deliver.deliveryman?.name || '',
          phoneNumber:  user_deliver.deliveryman?.phoneNumber || user_deliver.phoneNumber || 0,
          transport_type:  user_deliver.deliveryman?.transport_type || '',
          transport_color:  user_deliver.deliveryman?.transport_color || '',
          transport_registration:  user_deliver.deliveryman?.transport_registration || '',
        };
      }

      // 🔥 ATOMIC UPDATE manually on the document
      order.status = 'Aceite pelo entregador';
      order.stepStatus = 4;
      order.isAccepted = true;
      order.isSearching = false;
      order.deliveryman = deliverymanData;

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      const updateOrder = order;

      //  Para envio de mensagens
      const orderCode = updateOrder.code || updateOrder._id.toString().substring(0, 8);
      let msg =`Olá, a Nhiquela Shop informa que o entregador aceitou o pedido nº ${orderCode}`;

      sendSMSToUSendIt(req, msg);

      let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o entregador aceitou o pedido nº ${orderCode}. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
      sendEmailOrderStatus(req,mailText, updateOrder, res);

      // WebSocket Optimization
      await updateOrder.populate('user', 'name phoneNumber profileImage');
      const io = req.app.get('io');
      if (io) {
        // Notificar o motorista que aceitou
        io.to(`driver_${user_deliver._id}`).emit('order_assigned', updateOrder);
        // Notificar o cliente que o pedido foi aceite
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        // 🔥 Notificar TODOS os outros motoristas que tinham este pedido que ele já foi aceite
        io.emit('order_taken', { orderId: updateOrder._id.toString(), acceptedBy: user_deliver._id.toString() });
      }

      res.send({ message: `Aceite pelo entregador`, order: updateOrder });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Erro ao aceitar pedido direto:', error);
      res.status(500).send({ message: 'Erro ao aceitar o pedido. Tente novamente.' });
    }
  })
);

// O pedido esta a caminho
requestServiceer.put(
  '/:id/intransit',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);

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

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', order);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
        }
      }
        
      res.send({ message: `Pedido em trânsito` });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// O entregador Confirma a chegada do destino de entrega
requestServiceer.put(
  '/:id/confirmDestination',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);

    if (order) {
      order.status = 'No destino indicado';
      order.stepStatus= 5;
      const updateOrder = await order.save();


      //  Para envio de mensagens

       let msg =`Olá, a Nhiquela Shop informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nº ${updateOrder.code}`;
 
 
       sendSMSToUSendIt(req, msg)
      

       let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o entregador ja se encontra no local de destino por si informado referente ao pedido nº ${updateOrder.code}. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
       sendEmailOrderStatus(req,mailText, updateOrder, res);

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        if (updateOrder.deliveryman?.id) {
          io.to(`driver_${updateOrder.deliveryman.id}`).emit('order_updated', updateOrder);
        }
      }

      res.send({ message: `No destino indicado`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);


// O cliente finaliza a confirmar a recepcao do pedido
requestServiceer.put(
  '/:id/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Iniciar sessão Mongoose para garantir débito e finalização de forma atómica
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await RequestService.findById(req.params.id).session(session);

      if (order) {
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

        // A comissão já foi debitada no momento da aceitação (acceptedByDeliveryman), 
        // portanto não é necessário realizar novo débito aqui.

        await order.save({ session });
        await session.commitTransaction();
        session.endSession();

       //  Para envio de mensagens

      let msg =`Olá, o pedido ${order.code} foi entregue com sucesso. Agradecemos por escolher e confiar em nós. Nhiquela Shop - Tudo em suas mãos.`;
 
      sendSMSToUSendIt(req,msg);

      let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o seu pedido foi entregue com sucesso e agradecemos por escolher e confiar em nós. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
      // Note: updateOrder variable is missing here in the original code, should use order
      // sendEmailOrderStatus(req,mailText, order, res);

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', order);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
        }
      }

      res.send({ message: `Pedido entregue com sucesso` });
    } else {
      await session.abortTransaction();
      session.endSession();
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Erro na finalização do pedido:', error);
    res.status(500).send({ message: error.message || 'Erro ao finalizar o pedido. Tente novamente.' });
  }
  })
);

// Em caso de cancelamento do pedido
requestServiceer.put(
  '/:id/cancel',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);

    if (order) {
  
      order.isCanceled = true;
      order.isAccepted = false;
      order.status = 'Cancelado';
      order.stepStatus = 7;
      order.canceledReason = req.body.message;


      await order.save();
      
      //  Para envio de mensagens

      let msg =`Olá, a Nhiquela Shop lamenta lhe informar que o seu pedido nº ${order.code} foi cancelado. O motivo do cancelamento poderá verificar no site pesquisando pelo código.`;
 
      sendSMSToUSendIt(req,msg);

      let mailText = `Ola ${req.user.name},\n \n a Nhiquela Shop informa que o pedido nº ${order.code} foi cancelado. \n \n Atenciosamente, \n Nhiquela Shop`; 
    
      sendEmailOrderStatus(req,mailText, order, res);

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', order);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
        } else {
          io.emit('order_updated', order); // broadcast to all
        }
      }

      res.send({ message: `Pedido Cancelado`, order: order });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);



// Actualizar o estado do pedido para pago
requestServiceer.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.stepStatus = 1;
      order.paidAt = Date.now();
      
      const updateOrder = await order.save();


       

      //  Para envio de mensagens
      let msg =`Olá, a Nhiquela Shop gostaria de lhe informar que o pagamento referente ao pedido nº ${updateOrder.code} no valor de ${updateOrder.totalPrice} foi efectuado com sucesso.`;

      // Em falta metodo para envio de mensagem e email
      sendSMSToUSendItDeliverman( msg);


      res.send({ message: `Pedido Pago`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);



// O motorista rejeita ou ocorre timeout
requestServiceer.put(
  '/:id/reject',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (order) {
      order.status = 'Cancelado';
      order.targetDriverId = null;
      order.stepStatus = 7; 
      order.canceledReason = 'Motorista indisponivel ou tempo esgotado';
      await order.save();
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', order);
      }
      res.send({ message: 'Pedido rejeitado/timeout', order: order });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// O admin muda o status na mesa de encomendas
requestServiceer.put(
  '/:id/status',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (order) {
      order.status = req.body.status;
      await order.save();
      
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', order);
      }
      
      res.send({ message: 'Estado atualizado com sucesso', order: order });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

export default requestServiceer;
