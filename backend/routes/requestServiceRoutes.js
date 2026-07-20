import express from 'express';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin, sendSMSToUSendItDeliverman } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { debitDriverCommissionWithSession, refundDriverCommissionWithSession, getFinancialConfig, canAffordTripCommission } from '../services/walletService.js';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';
import PricingService from '../services/PricingService.js';
import createNotification from '../utils/createNotification.js';

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
      deleted: { $eq: false },
    }).populate('user', 'name phoneNumber profileImage').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countOrders = await RequestService.countDocuments({
      ...sellerFilter,
      deleted: { $eq: false },
    });

    const pages = Math.ceil(countOrders / pageSize);
    res.send({ orders, pages });
  })
);

// All requests sorted by user
requestServiceer.get(
  '/user',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = 10

    const requests = await RequestService.find({
      isPaid: { $eq: true },
      deleted: { $eq: false },
    }).populate('user', 'name phoneNumber profileImage').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });

    const countRequests = await RequestService.countDocuments({
      isPaid: { $eq: true },
      deleted: { $eq: false },
    });

    const pages = Math.ceil(countRequests / pageSize);
    res.send({ requests, pages });
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
      status: { $in: ['Pendente', 'Pedido aceite', 'A Caminho', 'Em andamento', 'Em trânsito'] }
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
      status: { $in: ['Pendente', 'Pedido aceite', 'A Caminho', 'Em andamento', 'Em trânsito'] }
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
      transportType: req.body.transportType,
      deliverCity: req.body.deliverCity,
      reason: req.body.reason,
      origin: req.body.origin,
      destination: req.body.destination,
      originDetails: req.body.originDetails || null,
      destinationDetails: req.body.destinationDetails || null,
      stops: req.body.stops || [],
      paymentOption: req.body.paymentOption,
      description: req.body.description,
      paymentMethod: req.body.paymentMethod,
      deliveryPrice: req.body.deliveryPrice, // Will be overridden below by server-side calculation
      serviceId: req.body.serviceId || null,
      user: req.user._id,
      code: generateCode(),
      status: req.body.isScheduled ? 'SCHEDULED' : 'Pendente',
      isPaid: req.body.isPaid,
      paidAt: req.body.paidAt,
      stepStatus: req.body.stepStatus,
      targetDriverId: req.body.targetDriverId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      isSearching: !req.body.targetDriverId && !req.body.isScheduled, // Não iniciar busca se for agendado
      searchRadius: 3000,
      contactedDrivers: [],
      lastDispatchTime: new Date(),
      // Agendamento
      isScheduled: req.body.isScheduled || false,
      scheduledAt: req.body.isScheduled && req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
    });

    // ============================================================
    // CÁLCULO AUTOMÁTICO DO PREÇO (server-side, imutável)
    // Executado ANTES do save() â€” o backend nunca confia no preço do cliente
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
          destLoc: { lat: destinationDetails.lat, lng: destinationDetails.lng },
          clientSuggestedPrice: req.body.deliveryPrice,
          providerId: req.body.targetDriverId
        });

        // Guardar snapshot completo e imutável do cálculo
        newOrder.pricing = {
          distanceKm: priceResult.breakdown.distanceKm,
          costDeslocacao: priceResult.breakdown.distanceCost + priceResult.breakdown.timeCost,
          costServico: priceResult.breakdown.actualBaseFare,
          totalPrice: priceResult.price,
          calculatedAt: new Date(),
          breakdown: priceResult.breakdown,
        };

        // Substituir o deliveryPrice enviado pelo cliente pelo valor calculado pelo servidor
        newOrder.deliveryPrice = priceResult.price;

        console.log(`[PricingService] âœ… Preço calculado: ${priceResult.price} MT (distância: ${priceResult.breakdown.distanceKm?.toFixed(2)} km)`);
      } catch (pricingErr) {
        // Não bloquear a criação do pedido â€” usar o preço do cliente como fallback
        console.warn(`[PricingService] âš ï¸ Falha no cálculo automático. A usar deliveryPrice do cliente (${req.body.deliveryPrice} MT). Erro: ${pricingErr.message}`);
      }
    } else {
      console.log(`[PricingService] â„¹ï¸ Campos inósuficientes para cálculo (serviceId=${serviceId}, origin lat=${originDetails?.lat}, dest lat=${destinationDetails?.lat}). A usar deliveryPrice do cliente.`);
    }

    let mailText = `Olá ${req.user.name},\n \n Seja bem vindo(a) a nhiquela.\n Dentro de instantes confirmaremos o seu pagamento.\n Por favor, aguarde e muito obrigado pela preferencia. Pedido: ${newOrder.code}. \n Atenciosamente,\n \n nhiquela`;

    //  Para envio de mensagens
    // const sellerOfProduct = await User.findById(newOrder.seller);

    if (newOrder.isPaid) {
      // Enviar sms para o fornecedor
      let msg = `Olá, a Nhiquela  informa que possui um novo pedido com o código n ${newOrder.code}`;
      sendSMSToUSendItDeliverman(msg);
    } else {
      let msg = `Olá, a Nhiquela  informa que possui um novo pedido com o código n ${newOrder.code}`;
      sendSMSToUSendItAdmin(msg);
    }

    sendEmailOrderStatus(req, mailText, newOrder, res);


    const requestService = await newOrder.save();
    await requestService.populate([
      { path: 'user', select: 'name phoneNumber profileImage' },
      { path: 'serviceId', select: 'name' }
    ]);

    const io = req.app.get('io');
    if (io) {
      if (newOrder.targetDriverId) {
        const orderPayload = { ...requestService.toObject(), type: 'requestService' };
        io.to(`driver_${newOrder.targetDriverId}`).emit('new_order', orderPayload);

        // Push notification para o motorista alvo
        const targetDriver = await User.findById(newOrder.targetDriverId);
        if (targetDriver && targetDriver.deviceToken) {
          await createNotification({
            message: `Novo pedido de viagem! Origem: ${newOrder.initialLocationName || 'Local de partida'}. Clique para aceitar.`,
            receiver_id: targetDriver._id,
            pushToken: targetDriver.deviceToken
          });
        }

        // 45s timeout logic
        setTimeout(async () => {
          try {
            const checkOrder = await RequestService.findById(requestService._id);
            if (checkOrder && checkOrder.status === 'Pendente') {
              checkOrder.status = 'Motorista indisponível';
              checkOrder.targetDriverId = null;
              checkOrder.canceledReason = 'Tempo esgotado (45s)';
              await checkOrder.save();

              // Notify driver to remove order from their screen
              io.to(`driver_${newOrder.targetDriverId}`).emit('order_updated', checkOrder);

              // Notify client
              io.to(`order_${checkOrder._id}`).emit('order_updated', checkOrder);
              const users = req.app.get('users') || [];
              const orderUser = users.find((x) => x._id === checkOrder.user._id.toString());
              if (orderUser) {
                io.to(orderUser.socketId).emit('order_updated', checkOrder);
              }
            }
          } catch (e) {
            console.error('[RequestService Timeout Error]', e);
          }
        }, 45000);
      } else if (newOrder.isScheduled) {
        // ============================================================
        // PEDIDO AGENDADO â€” NÃO despachar agora.
        // Notificar apenas o cliente com a confirmação do agendamento.
        // ============================================================
        const orderPayload = { ...requestService.toObject(), type: 'requestService' };

        // Notificar o cliente via socket (confirmação de agendamento)
        const users = req.app.get('users') || [];
        const orderUser = users.find((x) => x._id === req.user._id.toString());
        if (orderUser) {
          io.to(orderUser.socketId).emit('order_scheduled', orderPayload);
        }

        // Buscar todos os motoristas disponíveis e notificá-los do novo serviço agendado
        const availableDrivers = await User.find({
          role: 'deliveryman',
          'deliveryman.status': { $in: ['Disponível', 'Em Entrega'] },
          pushToken: { $exists: true, $ne: null }
        }).select('_id pushToken deliveryman');

        const scheduledDateStr = requestService.scheduledAt
          ? new Date(requestService.scheduledAt).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo', dateStyle: 'short', timeStyle: 'short' })
          : 'hora não definida';

        for (const driver of availableDrivers) {
          io.to(`driver_${driver._id}`).emit('new_scheduled_order', orderPayload);
          if (driver.deviceToken) {
            await createNotification({
              message: `â° Serviço agendado para ${scheduledDateStr}! Origem: ${newOrder.origin}. Aceite com antecedência.`,
              receiver_id: driver._id,
              pushToken: driver.deviceToken
            });
          }
        }

        console.log(`[Scheduling] Pedido agendado ${requestService.code} para ${scheduledDateStr}. Notificados ${availableDrivers.length} motoristas.`);
      } else {
        // Intelligent Dispatch engine will handle emitting to nearest drivers
        import('../services/dispatchService.js').then((module) => {
          const DispatchService = module.default;
          DispatchService.startDispatch(requestService, io);
        }).catch(err => console.error('Falha ao carregar DispatchService', err));
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
      ...userFilter,
      deleted: { $eq: false },

    }).populate('user', 'name phoneNumber profileImage').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });


    const countRequests = await RequestService.countDocuments({
      ...userFilter,
      deleted: { $eq: false },

    });

    const pages = Math.ceil(countRequests / pageSize);

    res.send({ deliverRequests, pages });
  })
);




requestServiceer.get(
  '/admin',
  isAuth,
  expressAsyncHandler(async (req, res) => {

    const page = req.query.page || 1;
    const pageSize = 10

    const deliverRequests = await RequestService.find({
      deleted: { $eq: false },

    }).populate('user', 'name phoneNumber profileImage').skip(pageSize * (page - 1)).limit(pageSize).sort({ createdAt: -1 });


    const countRequests = await RequestService.countDocuments({
      deleted: { $eq: false },
    });

    const pages = Math.ceil(countRequests / pageSize);

    res.send({ deliverRequests, pages });
  })
);




// get requestService by userid
// Endpoint publico para partilha de viagem (Tracking)
requestServiceer.get(
  '/:id/track',
  expressAsyncHandler(async (req, res) => {
    const requestService = await RequestService.findById(req.params.id)
      .select('-paymentMethod -paymentOption -isPaid -paidAt -deleted') // Esconder dados sensiveis
      .populate('user', 'name')
      .populate('deliveryman.id', 'name');

    if (requestService) {
      res.send(requestService);
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

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
        const driverIdToNotify = requestService.deliveryman.id;
        // 🔥 CORREÇÃO: Libertar o motorista ao apagar o pedido
        await User.updateOne(
          { _id: requestService.deliveryman.id },
          { $set: { 'deliveryman.hasActiveService': false } }
        );
        requestService.deliveryman.id = null;

        // Avisar o motorista que a viagem foi cancelada pelo cliente
        const targetDriver = await User.findById(driverIdToNotify);
        if (targetDriver && targetDriver.deviceToken) {
          await createNotification({
            message: `Atenção: O cliente cancelou a viagem. O seu veículo está livre para novos pedidos.`,
            receiver_id: targetDriver._id,
            pushToken: targetDriver.deviceToken,
            title: 'Viagem Cancelada'
          });
        }
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

    // Usar uma tranósação para garantir que débito e aceite ocorrem de forma atómica
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await RequestService.findOne({ _id: req.params.id, status: 'Pendente' }).session(session);

      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).send({ message: 'Pedido já foi aceite por outro motorista ou não está disponível' });
      }

      // Calcular comissão baseada nas configurações financeiras e subcategoria
      const { calculateDynamicCommission } = await import('../services/walletService.js');
      const commissionmount = await calculateDynamicCommission(order);

      // Apenas validar se o motorista tem saldo suficiente, mas NÃO debitar ainda.
      const canAfford = await canAffordTripCommission(user_deliver._id, commissionmount);
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
          phoneNumber: user_deliver.deliveryman?.phoneNumber || user_deliver.phoneNumber || 0,
          transport_type: user_deliver.deliveryman?.transport_type || '',
          transport_color: user_deliver.deliveryman?.transport_color || '',
          transport_registration: user_deliver.deliveryman?.transport_registration || '',
        };
      }

      // 🔥 ATOMIC UPDATE manually on the document
      order.status = 'Pedido aceite';
      order.stepStatus = 4;
      order.isAccepted = true;
      order.acceptedAt = new Date();
      order.isSearching = false;
      order.deliveryman = deliverymanData;

      await order.save({ session });

      // Marcar motorista como ocupado â€” não deve receber novos pedidos até o cliente confirmar
      await User.updateOne(
        { _id: user_deliver._id },
        { $set: { 'deliveryman.hasActiveService': true } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const updateOrder = order;

      //  Para envio de mensagens
      const orderCode = updateOrder.code || updateOrder._id.toString().substring(0, 8);
      let msg = `Olá, a Nhiquela informa que o entregador aceitou o pedido n ${orderCode}`;

      sendSMSToUSendIt(req, msg);

      let mailText = `Olá ${req.user.name},\n \n a Nhiquela informa que o entregador aceitou o pedido n ${orderCode}. \n \n Atenciosamente, \n nhiquela`;

      sendEmailOrderStatus(req, mailText, updateOrder, res);

      // WebSocket Optimization
      await updateOrder.populate('user', 'name phoneNumber profileImage');
      const io = req.app.get('io');
      if (io) {
        // Notificar o motorista que aceitou
        io.to(`driver_${user_deliver._id}`).emit('order_assigned', updateOrder);
        // Notificar o cliente que o pedido foi aceite
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        
        await createNotification({
          message: `O seu pedido foi aceite por ${user_deliver.deliveryman?.name || 'um motorista'} e está a caminho!`,
          receiver_id: updateOrder.user,
          sender_id: user_deliver._id,
          orderID: updateOrder._id,
          title: 'Pedido Aceite!'
        });
        
        // 🔥 Notificar TODOS os outros motoristas que tinham este pedido que ele já foi aceite
        io.emit('order_taken', { orderId: updateOrder._id.toString(), acceptedBy: user_deliver._id.toString() });
      }

      res.send({ message: `Pedido aceite`, order: updateOrder });

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
      order.stepStatus = 5;
      order.pickupStartedAt = new Date();

      await order.save();

      //  Para envio de mensagens

      let msg = `Olá ${req.user.name},\n \n A nhiquela tem o prazer de lhe informar que o pedido ${order.code} esta a caminho do destino indicado.`;


      sendSMSToUSendIt(req, msg)


      let mailText = `A nhiquela tem o prazer de lhe informar que o pedido ${order.code} esta a caminho do destino indicado.. \n \n Atenciosamente, \n nhiquela`;

      sendEmailOrderStatus(req, mailText, order, res);

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', order);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
        }

        await createNotification({
          message: `O motorista chegou ao local e a viagem foi iniciada.`,
          receiver_id: order.user,
          sender_id: order.deliveryman?.id,
          orderID: order._id,
          title: 'Viagem Iniciada'
        });
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
      order.stepStatus = 5;

      order.arrivedAtDestination = Date.now();
      if (req.body.latitude && req.body.longitude) {
        order.arrivalLatitude = req.body.latitude;
        order.arrivalLongitude = req.body.longitude;
      }

      const updateOrder = await order.save();


      //  Para envio de mensagens

      let msg = `Olá, a Nhiquela informa que o entregador ja se encontra no local de destino por si informado referente ao pedido n ${updateOrder.code}`;


      sendSMSToUSendIt(req, msg)


      let mailText = `Olá ${req.user.name},\n \n a Nhiquela informa que o entregador ja se encontra no local de destino por si informado referente ao pedido n ${updateOrder.code}. \n \n Atenciosamente, \n nhiquela`;

      sendEmailOrderStatus(req, mailText, updateOrder, res);

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        if (updateOrder.deliveryman?.id) {
          io.to(`driver_${updateOrder.deliveryman.id}`).emit('order_updated', updateOrder);
        }

        await createNotification({
          message: `O motorista chegou ao local de recolha/destino. Por favor, vá ao encontro do motorista.`,
          receiver_id: updateOrder.user,
          sender_id: updateOrder.deliveryman?.id,
          orderID: updateOrder._id,
          title: 'Motorista Chegou!'
        });
      }

      res.send({ message: `No destino indicado`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Motorista cancela viagem por "Cliente não compareceu" (após 5 minutos)
requestServiceer.put(
  '/:id/driver-no-show',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);

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

        await createNotification({
          message: `O seu pedido foi cancelado pelo motorista pelo motivo: Não comparência.`,
          receiver_id: updateOrder.user,
          sender_id: updateOrder.deliveryman?.id,
          orderID: updateOrder._id,
          title: 'Viagem Cancelada'
        });
      }

      res.send({ message: `Viagem cancelada por não comparência`, order: updateOrder });
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
        order.status = 'Concluído';
        order.stepStatus = 6;

        if (req.body && req.body.id) {
          order.paymentResult = {
            id: req.body.id,
            status: req.body.status,
            update_time: req.body.update_time,
            email_address: req.body.email_address,
          };
        }

        if (order.deliveryman && order.deliveryman.id) {
          // Calcular comissão baseada nas configurações financeiras e subcategoria
          const { calculateDynamicCommission } = await import('../services/walletService.js');
          const commissionAmount = await calculateDynamicCommission(order);

          try {
            await debitDriverCommissionWithSession(
              order.deliveryman.id,
              commissionAmount,
              `Comissão de serviço para o pedido direto ${order.code} finalizado`,
              'wallet',
              session
            );
          } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: error.message });
          }
        }

        await order.save({ session });

        // Libertar motorista â€” pode agora receber novos pedidos
        if (order.deliveryman && order.deliveryman.id) {
          await User.updateOne(
            { _id: order.deliveryman.id },
            { $set: { 'deliveryman.hasActiveService': false } },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();

        //  Para envio de mensagens

        let msg = `Olá, o pedido ${order.code} foi entregue com sucesso. Agradecemos por escolher e confiar em nós. nhiquela - Tudo em suas mãos.`;

        sendSMSToUSendIt(req, msg);

        let mailText = `Olá ${req.user.name},\n \n a Nhiquela informa que o seu pedido foi entregue com sucesso e agradecemos por escolher e confiar em nós. \n \n Atenciosamente, \n nhiquela`;

        sendEmailOrderStatus(req, mailText, order, res);

        // WebSocket Optimization â€” notificar cliente e motorista
        const io = req.app.get('io');
        if (io) {
          io.to(`order_${order._id}`).emit('order_updated', order);
          if (order.deliveryman?.id) {
            io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
            // Notificar motorista que pode aceitar novos pedidos
            io.to(`driver_${order.deliveryman.id}`).emit('service_released', { message: 'Pode agora receber novos pedidos.' });
          }

          await createNotification({
            message: `A sua viagem foi entregue com sucesso! Obrigado por viajar com a Nhiquela.`,
            receiver_id: order.user,
            sender_id: order.deliveryman?.id,
            orderID: order._id,
            title: 'Viagem Concluída'
          });
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

// Avaliar motorista
requestServiceer.post(
  '/:id/rate',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).send({ message: 'A avaliação deve ser entre 1 e 5 estrelas.' });
    }

    const order = await RequestService.findById(req.params.id);

    if (order) {
      if (order.user.toString() !== req.user._id.toString()) {
        return res.status(403).send({ message: 'Sem permissão para avaliar este pedido.' });
      }
      
      if (order.rating) {
        return res.status(400).send({ message: 'Este pedido já foi avaliado.' });
      }

      order.rating = rating;
      order.review = review;
      await order.save();

      // Recalcular a média de avaliação do motorista
      if (order.deliveryman && order.deliveryman.id) {
        const driver = await User.findById(order.deliveryman.id);
        
        if (driver && driver.deliveryman) {
          const currentTotal = driver.deliveryman.totalRatings || 0;
          const currentAvg = driver.deliveryman.averageRating || 0;
          
          const newTotal = currentTotal + 1;
          const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;
          
          driver.deliveryman.totalRatings = newTotal;
          driver.deliveryman.averageRating = newAvg;
          
          await driver.save();
        }
      }

      res.send({ message: 'Avaliação submetida com sucesso', order });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Em caso de cancelamento do pedido
requestServiceer.put(
  '/:id/cancel',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await RequestService.findById(req.params.id).session(session);

      if (order) {
        // Validar que o motivo de cancelamento foi enviado
        if (!req.body.message || req.body.message.trim() === '') {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).send({ message: 'Por favor indique o motivo do cancelamento antes de prosseguir.' });
        }

        const wasAccepted = order.isAccepted && order.deliveryman && order.deliveryman.id;

        order.isCanceled = true;
        order.isAccepted = false;

        if (req.user.isDeliveryMan && !wasAccepted) {
          order.status = 'Motorista indisponível';
        } else {
          order.status = 'Cancelado';
        }

        order.stepStatus = 7;
        order.canceledReason = req.body.message;

        await order.save({ session });

        // Se o pedido já tinha sido aceite, libertar o motorista
        if (wasAccepted) {
          await User.updateOne(
            { _id: order.deliveryman.id },
            { $set: { 'deliveryman.hasActiveService': false } },
            { session }
          );

          // Penalização de 50MT se o motorista cancelar a viagem que ele mesmo aceitou
          if (req.user.isDeliveryMan) {
            let wallet = await Wallet.findOne({ $or: [{ ownerId: req.user._id }, { userId: req.user._id }] }).session(session);
            if (!wallet) {
               // Criar carteira caso não exista (fallback)
               wallet = new Wallet({ ownerId: req.user._id, ownerType: 'driver', userId: req.user._id, balance: 0 });
            }
            wallet.balance -= 50;
            await wallet.save({ session });

            await Transaction.create([{
              walletId: wallet._id,
              type: 'debit',
              amount: 50,
              method: 'wallet',
              description: 'Penalização por cancelar viagem aceite',
              status: 'confirmado'
            }], { session });
          }
        }

        await session.commitTransaction();
        session.endSession();

        //  Para envio de mensagens

        let msg = `Olá, a Nhiquela lamenta lhe informar que o seu pedido n ${order.code} foi cancelado. O motivo do cancelamento poderá verificar no site pesquisando pelo código.`;

        sendSMSToUSendIt(req, msg);

        let mailText = `Olá ${req.user.name},\n \n a Nhiquela informa que o pedido n ${order.code} foi cancelado. \n \n Atenciosamente, \n nhiquela`;

        sendEmailOrderStatus(req, mailText, order, res);

        // WebSocket Optimization
        const io = req.app.get('io');
        if (io) {
          io.to(`order_${order._id}`).emit('order_updated', order);
          if (order.deliveryman?.id) {
            io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
            // Notificar motorista que está livre
            io.to(`driver_${order.deliveryman.id}`).emit('service_released', { message: 'Serviço cancelado. Pode agora receber novos pedidos.' });
          } else {
            io.emit('order_updated', order); // broadcast to all
          }
          
          await createNotification({
            message: `A sua viagem foi cancelada pelo motorista. Motivo: ${req.body.message}`,
            receiver_id: order.user,
            sender_id: order.deliveryman?.id,
            orderID: order._id,
            title: 'Viagem Cancelada'
          });
        }

        res.send({ message: `Pedido Cancelado`, order: order });
      } else {
        await session.abortTransaction();
        session.endSession();
        res.status(404).send({ message: 'Pedido não encontrado' });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Erro no cancelamento do pedido:', error);
      res.status(500).send({ message: error.message || 'Erro ao cancelar o pedido. Tente novamente.' });
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
      let msg = `Olá, a Nhiquela gostaria de lhe informar que o pagamento referente ao pedido n ${updateOrder.code} no valor de ${updateOrder.totalPrice} foi efectuado com sucesso.`;

      // Em falta metodo para envio de mensagem e email
      sendSMSToUSendItDeliverman(msg);


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
      order.status = 'Motorista indisponível';
      order.targetDriverId = null;
      order.stepStatus = 7;
      order.canceledReason = 'Motorista indisponível ou tempo esgotado';
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

// Reenviar notificação para o motorista
requestServiceer.post(
  '/:id/resend',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (order && (order.status === 'Pendente' || order.status === 'Motorista indisponível')) {
      const targetDriverId = req.body.targetDriverId || order.targetDriverId;

      if (targetDriverId) {
        order.status = 'Pendente';
        order.targetDriverId = targetDriverId;
        order.canceledReason = null;
        await order.save();

        const io = req.app.get('io');
        if (io) {
          io.to(`driver_${targetDriverId}`).emit('new_order', order);

          // Push notification para o motorista alvo
          const targetDriverUser = await User.findById(targetDriverId);
          if (targetDriverUser && targetDriverUser.deviceToken) {
            await createNotification({
              message: `Novo pedido de viagem! Origem: ${order.initialLocationName || 'Local de partida'}. Clique para aceitar.`,
              receiver_id: targetDriverUser._id,
              pushToken: targetDriverUser.deviceToken
            });
          }
          // Atualiza também o ecrã do cliente para refletir o estado 'Pendente' e apagar a mensagem de erro
          io.to(`order_${order._id}`).emit('order_updated', order);
        }
        res.send({ message: 'Notificação reenviada com sucesso' });
      } else {
        res.status(400).send({ message: 'Nenhum motorista alvo definido para reenvio' });
      }
    } else {
      res.status(400).send({ message: 'Não é possível reenviar este pedido' });
    }
  })
);

// Cancelar pedido pendente
requestServiceer.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (order) {
      if (order.status !== 'Pendente') {
        return res.status(409).send({ message: 'Não é possível cancelar a busca porque a viagem já foi aceite pelo motorista ou mudou de estado.' });
      }
      if (order.user.toString() === req.user._id.toString() || req.user.isAdmin) {
        order.status = 'Cancelado';
        order.canceledReason = 'Cancelado pelo cliente na busca';
        await order.save();

        const io = req.app.get('io');
        if (io) {
          io.to(`order_${order._id}`).emit('order_updated', order);
          if (order.targetDriverId) {
            io.to(`driver_${order.targetDriverId}`).emit('order_cancelled', { orderId: order._id });
          }
          
          if (order.targetDriverId) {
            await createNotification({
              message: `O cliente cancelou a busca pela viagem.`,
              receiver_id: order.targetDriverId,
              sender_id: order.user,
              orderID: order._id,
              title: 'Viagem Cancelada'
            });
          }
        }

        res.send({ message: 'Pedido cancelado com sucesso' });
      } else {
        res.status(403).send({ message: 'Sem permissão para cancelar este pedido' });
      }
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Cancelar pedido a partir da tela de detalhes
requestServiceer.put(
  '/:id/cancel',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (order) {
      if (order.user.toString() === req.user._id.toString() || req.user.isAdmin) {
        if (order.status === 'Cancelado' || order.status === 'Finalizado' || order.status === 'Entregue') {
          return res.status(400).send({ message: 'Este pedido já não pode ser cancelado.' });
        }
        order.status = 'Cancelado';
        order.canceledReason = req.body.message || 'Cancelado pelo cliente';
        await order.save();

        const io = req.app.get('io');
        if (io) {
          io.to(`order_${order._id}`).emit('order_updated', order);
          if (order.targetDriverId) {
            io.to(`driver_${order.targetDriverId}`).emit('order_cancelled', { orderId: order._id });
          }
          if (order.deliveryman && order.deliveryman.id) {
            io.to(`driver_${order.deliveryman.id}`).emit('order_cancelled', { orderId: order._id });
            // Libertar motorista
            const User = require('../models/UserModel.js').default || require('../models/UserModel.js');
            await User.updateOne({ _id: order.deliveryman.id }, { $set: { 'deliveryman.hasActiveService': false } });
            
            await createNotification({
              message: `O cliente cancelou a viagem. O seu estado foi libertado para receber novos pedidos.`,
              receiver_id: order.deliveryman.id,
              sender_id: order.user,
              orderID: order._id,
              title: 'Viagem Cancelada'
            });
          }
        }

        res.send({ message: 'Pedido cancelado com sucesso', order: order });
      } else {
        res.status(403).send({ message: 'Sem permissão para cancelar este pedido' });
      }
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

export default requestServiceer;
