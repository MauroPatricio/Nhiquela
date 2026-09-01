import express from 'express';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import { isAuth, isAdmin, sendEmailOrderStatus, sendEmailOrderToSeller, sendSMSToUSendIt, sendSMSToSellerUSendIt, sendSMSToUSendItAdmin, sendSMSToUSendItDeliverman, sendNegotiationEmail, containsPhoneNumber } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { debitDriverCommissionWithSession, refundDriverCommissionWithSession, getFinancialConfig, canAffordTripCommission, calculateDynamicCommission, checkAndDisableDriverIfLowBalance } from '../services/walletService.js';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';
import PricingService from '../services/PricingService.js';
import createNotification from '../utils/createNotification.js';
import DispatchService from '../services/dispatchService.js';
import Order from '../models/OrderModel.js';

const getSellerUser = async (sellerId) => {
  if (!sellerId) return null;
  const Provider = mongoose.model('Provider');
  const provider = await Provider.findById(sellerId).populate('userId');
  return provider?.userId || null;
};

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
      transportType: req.body.transportType, // Guarda o valor tal como vem (ObjectId string ou nome)
      deliverCity: req.body.deliverCity,
      reason: req.body.reason,
      origin: req.body.origin,
      destination: req.body.destination,
      originDetails: req.body.originDetails || null,
      destinationDetails: req.body.destinationDetails || null,
      stops: (req.body.stops || []).map(s => ({
        address: s.address || s.text || '',
        lat: Number(s.lat || s.latitude),
        lng: Number(s.lng || s.longitude)
      })),
      deliveryStops: (req.body.stops || []).map((s, idx) => ({
        sequence: s.sequence || (idx + 1),
        address: s.address || s.text || `Paragem #${idx + 1}`,
        latitude: Number(s.lat || s.latitude),
        longitude: Number(s.lng || s.longitude),
        recipientName: s.recipientName || s.name || `Destinatário #${idx + 1}`,
        recipientPhone: s.recipientPhone || s.phone || req.body.phoneNumber || '000000000',
        status: 'PENDING',
        proofOfDelivery: {
          otp: Math.floor(1000 + Math.random() * 9000).toString(),
          otpVerified: false
        }
      })),
      paymentOption: req.body.paymentOption,
      description: req.body.description,
      paymentMethod: req.body.paymentMethod,
      deliveryPrice: req.body.deliveryPrice,
      serviceId: req.body.serviceId || null,
      user: req.user._id,
      code: generateCode(),
      status: req.body.isScheduled ? 'SCHEDULED' : 'Pendente',
      isPaid: req.body.isPaid,
      paidAt: req.body.paidAt,
      stepStatus: req.body.stepStatus !== undefined ? req.body.stepStatus : (req.body.isScheduled ? 1 : 3),
      targetDriverId: req.body.targetDriverId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      isSearching: !req.body.targetDriverId && !req.body.isScheduled,
      searchRadius: 3000,
      contactedDrivers: [],
      lastDispatchTime: new Date(),
      isScheduled: req.body.isScheduled || false,
      scheduledAt: req.body.isScheduled && req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
    });

    // Normalizar transportTypeId: se transportType for um ObjectId válido, guardar como ref
    const rawTransport = req.body.transportType;
    if (rawTransport && mongoose.Types.ObjectId.isValid(rawTransport) && rawTransport.length === 24) {
      newOrder.transportTypeId = new mongoose.Types.ObjectId(rawTransport);
    }


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
          destLoc: { lat: destinationDetails.lat, lng: destinationDetails.lng },
          stops: req.body.stops || [],
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

        console.log(`[PricingService] ✅ Preço calculado: ${priceResult.price} MT (distância: ${priceResult.breakdown.distanceKm?.toFixed(2)} km)`);
      } catch (pricingErr) {
        console.error(`[PricingService] ❌ Falha no cálculo automático:`, pricingErr);
        return res.status(503).send({ 
          message: 'Falha temporária ao calcular o preço exato da viagem (Erro de GPS/OSRM). Por favor, tente novamente.'
        });
      }
    } else {
      // Se não vierem coordenadas (pedidos legados ou web), valida se pelo menos o deliveryPrice não é suspeito.
      if (!req.body.deliveryPrice || req.body.deliveryPrice < 0) {
        return res.status(400).send({ message: 'Preço de viagem inválido ou em falta.' });
      }
      console.log(`[PricingService] ℹ️  Campos insuficientes para cálculo OSRM. A usar fallback do cliente.`);
    }

    // ============================================================
    // VALIDAÇÃO DE FOTOS E CONFIGURAÇÃO DE NEGOCIAÇÃO POR SUBCATEGORIA
    // ============================================================
    try {
      const ProviderSubcategory = mongoose.model('ProviderSubcategory');
      let subcat = null;
      if (newOrder.serviceId) {
        subcat = await ProviderSubcategory.findById(newOrder.serviceId);
      } else if (req.body.transportType) {
        subcat = await ProviderSubcategory.findOne({
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(req.body.transportType) ? req.body.transportType : null },
            { name: { $regex: new RegExp(`^${req.body.transportType}$`, 'i') } }
          ]
        });
      }

      if (subcat) {
        if (!newOrder.serviceId) newOrder.serviceId = subcat._id;
        
        if (subcat.requiresPhotos) {
          const vp = req.body.vehiclePhotos;
          if (!vp || !vp.front || !vp.rear || !vp.leftSide || !vp.rightSide) {
            return res.status(400).send({
              message: 'É obrigatório fornecer as 4 fotografias do veículo (frente, traseira, lado esquerdo e lado direito).'
            });
          }
          newOrder.vehiclePhotos = {
            front: vp.front,
            rear: vp.rear,
            leftSide: vp.leftSide,
            rightSide: vp.rightSide
          };
        } else if (req.body.vehiclePhotos) {
          newOrder.vehiclePhotos = req.body.vehiclePhotos;
        }

        if (subcat.allowNegotiation) {
          newOrder.maxNegotiationRounds = subcat.maxNegotiationRounds || 3;
          newOrder.negotiationState = 'NONE';
        }
      }
    } catch (subErr) {
      console.error('Erro ao verificar subcategoria:', subErr);
    }

    newOrder.basePrice = newOrder.deliveryPrice;

    const requestService = await newOrder.save();
    await requestService.populate([
      { path: 'user', select: 'name phoneNumber profileImage' },
      { path: 'serviceId', select: 'name' }
    ]);

    const clientUser = await User.findById(req.user._id);
    const orderPayload = { 
      ...requestService.toObject(), 
      type: 'requestService',
      passengerName: clientUser ? clientUser.name : (req.user.name || "Cliente"),
      passengerImage: clientUser ? (clientUser.profileImage || clientUser.photo) : null,
      passengerPhone: clientUser ? clientUser.phoneNumber : (req.user.phoneNumber || "000000000")
    };

    // 🔥 1. DESPACHO INSTANTÂNEO VIA WEBSOCKET (0ms delay)
    const io = req.app.get('io');
    if (!newOrder.isScheduled) {
      if (io) {
        console.log(`[Dispatch Flow] 🚀 Disparo instantâneo do Pedido #${newOrder.code} via WebSocket!`);
        if (newOrder.targetDriverId) {
          const driverRoom = `driver_${newOrder.targetDriverId}`;
          io.to(driverRoom).emit('new_order', orderPayload);
        }
        io.emit('new_order', orderPayload);
      }

      if (newOrder.targetDriverId) {
        // 45s timeout logic
        setTimeout(async () => {
          try {
            const checkOrder = await RequestService.findById(requestService._id);
            if (checkOrder && checkOrder.status === 'Pendente' && (!checkOrder.negotiationState || checkOrder.negotiationState === 'NONE')) {
              checkOrder.status = 'Motorista indisponível';
              checkOrder.targetDriverId = null;
              checkOrder.canceledReason = 'Tempo esgotado (45s)';
              await checkOrder.save();

              console.log(`\n====================================================`);
              console.log(`[Dispatch Flow] ⚠️ TEMPO ESGOTADO (45s): O motorista ignorou ou rejeitou o pedido ${checkOrder.code || checkOrder._id}.`);
              console.log(`====================================================\n`);

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
      }
    } else if (newOrder.isScheduled) {
      // ============================================================
      // PEDIDO AGENDADO — NÃO despachar agora.
      // Notificar apenas o cliente com a confirmação do agendamento.
      // ============================================================
      const scheduledPayload = { ...requestService.toObject(), type: 'requestService' };

      // Notificar o cliente via socket (confirmação de agendamento)
      const users = req.app.get('users') || [];
      const orderUser = users.find((x) => x._id === req.user._id.toString());
      if (orderUser && io) {
        io.to(orderUser.socketId).emit('order_scheduled', scheduledPayload);
      }

      // Buscar todos os motoristas disponíveis e notificá-los do novo serviço agendado
      const availableDrivers = await User.find({
        role: 'deliveryman',
        'deliveryman.status': { $in: ['Disponível', 'Em Entrega'] },
        deviceToken: { $exists: true, $ne: null }
      }).select('_id deviceToken deliveryman');

      const scheduledDateStr = requestService.scheduledAt
        ? new Date(requestService.scheduledAt).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo', dateStyle: 'short', timeStyle: 'short' })
        : 'hora não definida';

      for (const driver of availableDrivers) {
        if (io) io.to(`driver_${driver._id}`).emit('new_scheduled_order', scheduledPayload);
        if (driver.deviceToken) {
          createNotification({
            message: `Serviço agendado para ${scheduledDateStr}! Origem: ${newOrder.origin}. Aceite com antecedência.`,
            receiver_id: driver._id,
            pushToken: driver.deviceToken
          });
        }
      }

      console.log(`[Scheduling] Pedido agendado ${requestService.code} para ${scheduledDateStr}. Notificados ${availableDrivers.length} motoristas.`);
    }

    // 🔥 2. TAREFAS DE SEGUNDO PLANO (SMS, Email & Push em background sem bloquear o Socket)
    (async () => {
      try {
        let mailText = `Olá ${req.user.name},\n \n Seja bem vindo(a) a nhiquela.\n Dentro de instantes confirmaremos o seu pagamento.\n Por favor, aguarde e muito obrigado pela preferencia. Pedido: ${newOrder.code}. \n Atenciosamente,\n \n nhiquela`;
        
        if (newOrder.isPaid) {
          let msg = `Olá, a Nhiquela informa que possui um novo pedido com o código n ${newOrder.code}`;
          sendSMSToUSendItDeliverman(msg);
        } else {
          let msg = `Olá, a Nhiquela informa que possui um novo pedido com o código n ${newOrder.code}`;
          sendSMSToUSendItAdmin(msg);
        }
        sendEmailOrderStatus(req, mailText, newOrder, res);

        if (newOrder.targetDriverId) {
          const targetDriver = await User.findById(newOrder.targetDriverId).select('_id name deviceToken');
          if (targetDriver && targetDriver.deviceToken) {
            createNotification({
              message: `Novo pedido de viagem! Origem: ${newOrder.initialLocationName || 'Local de partida'}. Clique para aceitar.`,
              receiver_id: targetDriver._id,
              pushToken: targetDriver.deviceToken || null
            });
          }
        }
      } catch (bgErr) {
        console.error('Erro em tarefas de fundo do envio:', bgErr);
      }
    })();

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
    const requestService = await RequestService.findById(req.params.id)
      .populate('user', 'name phoneNumber profileImage');

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
          createNotification({
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

    // ✅ Verificação de saldo FORA da transação (leitura apenas — sem locks)
    // Verificar se o pedido ainda existe antes de abrir transação
    const orderCheck = await RequestService.findOne({ _id: req.params.id, status: 'Pendente' });
    if (!orderCheck) {
      return res.status(409).send({ message: 'Pedido já foi aceite por outro motorista ou não está disponível' });
    }

    // Calcular comissão e verificar saldo (operações read-only fora da transação)
    const commissionmount = await calculateDynamicCommission(orderCheck);
    const canAfford = await canAffordTripCommission(user_deliver._id, commissionmount);
    if (!canAfford) {
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

    // ✅ Transação mínima — apenas a escrita atómica, sem reads extras
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 🔥 ATOMIC UPDATE — impede race conditions entre motoristas
      const updatedOrder = await RequestService.findOneAndUpdate(
        { _id: req.params.id, status: 'Pendente' },
        {
          $set: {
            status: 'Pedido aceite',
            stepStatus: 4,
            isAccepted: true,
            acceptedAt: new Date(),
            isSearching: false,
            deliveryman: deliverymanData
          }
        },
        { new: true, session }
      );

      if (!updatedOrder) {
        // Alguém aceitou entre a leitura e o update
        await session.abortTransaction();
        session.endSession();
        return res.status(409).send({ message: 'Pedido já foi aceite por outro motorista ou não está disponível' });
      }

      // Marcar motorista como ocupado
      await User.updateOne(
        { _id: user_deliver._id },
        { $set: { 'deliveryman.hasActiveService': true } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      console.log(`\n====================================================`);
      console.log(`[Dispatch Flow] ✅ SUCESSO: O motorista ${user_deliver.name} ACEITOU o pedido ${updatedOrder.code || updatedOrder._id}!`);
      console.log(`====================================================\n`);

      const updateOrder = updatedOrder;

      //  Para envio de mensagens
      const orderCode = updateOrder.code || updateOrder._id.toString().substring(0, 8);
      let msg = `Olá, a Nhiquela informa que o entregador aceitou o pedido n ${orderCode}`;

      try {
        sendSMSToUSendIt(req, msg);
      } catch (smsErr) {
        console.error('[SMS] Erro ao enviar SMS:', smsErr.message);
      }

      let mailText = `Olá ${req.user.name},\n \n a Nhiquela informa que o entregador aceitou o pedido n ${orderCode}. \n \n Atenciosamente, \n nhiquela`;

      try {
        sendEmailOrderStatus(req, mailText, updateOrder, res);
      } catch (mailErr) {
        console.error('[Email] Erro ao enviar email:', mailErr.message);
      }

      // WebSocket Optimization
      try {
        await updateOrder.populate('user', 'name phoneNumber profileImage');
        // Garantir que as coordenadas estão diretamente na raiz para o Frontend (MapScreen)
        if (updateOrder.originDetails && updateOrder.originDetails.lat && updateOrder.originDetails.lng) {
          updateOrder.originLat = updateOrder.originDetails.lat;
          updateOrder.originLng = updateOrder.originDetails.lng;
        }
        if (updateOrder.destinationDetails && updateOrder.destinationDetails.lat && updateOrder.destinationDetails.lng) {
          updateOrder.destLat = updateOrder.destinationDetails.lat;
          updateOrder.destLng = updateOrder.destinationDetails.lng;
        }
      } catch (popErr) {
        console.error('[Populate] Erro ao popular dados do cliente:', popErr.message);
      }

      const io = req.app.get('io');
      if (io) {
        // Notificar o motorista que aceitou
        io.to(`driver_${user_deliver._id}`).emit('order_assigned', updateOrder);
        // Notificar o cliente que o pedido foi aceite
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        
        createNotification({
          message: `O seu pedido foi aceite por ${user_deliver.deliveryman?.name || 'um motorista'} e está a caminho!`,
          receiver_id: updateOrder.user?._id || updateOrder.user,
          sender_id: user_deliver._id,
          orderID: updateOrder._id,
          title: 'Pedido Aceite!'
        }).catch(err => console.error('[Notification] Falha background:', err.message));
        
        // 🔥 Notificar TODOS os outros motoristas que tinham este pedido que ele já foi aceite
        io.emit('order_taken', { orderId: updateOrder._id.toString(), acceptedBy: user_deliver._id.toString() });

        // [Reverse Sync] Atualizar a Order subjacente, se existir
        try {
          const linkedOrder = await Order.findOne({ requestServiceId: updateOrder._id });
          if (linkedOrder) {
            linkedOrder.status = 'Pedido aceite pelo motorista'; // ou 'Pedido aceite' conforme a lógica atual da App
            linkedOrder.stepStatus = 5; // Step adequado para aceitação por parte de um motorista na loja
            linkedOrder.deliveryman = deliverymanData;
            await linkedOrder.save();
            io.to(`order_${linkedOrder._id}`).emit('order_updated', linkedOrder);
          }
        } catch (syncErr) {
          console.error('[Reverse Sync] Erro ao sincronizar aceitação com Order:', syncErr.message);
        }
      }

      res.status(200).send({ message: `Pedido aceite`, order: updateOrder });

    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      console.error('Erro ao aceitar pedido direto:', error);
      res.status(500).send({ message: 'Erro ao aceitar o pedido. Tente novamente.', error: error.message });
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
        try {
          await order.populate('user', 'name phoneNumber profileImage');
        } catch (e) {
          console.error("Error populating user:", e);
        }
        
        io.to(`order_${order._id}`).emit('order_updated', order);
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
        }

        // [Reverse Sync] Atualizar a Order subjacente, se existir
        try {
          const linkedOrder = await Order.findOne({ requestServiceId: order._id });
          if (linkedOrder) {
            linkedOrder.status = 'Em trânsito';
            linkedOrder.isInTransit = true;
            linkedOrder.stepStatus = 6;
            await linkedOrder.save();
            io.to(`order_${linkedOrder._id}`).emit('order_updated', linkedOrder);
          }
        } catch (syncErr) {
          console.error('[Reverse Sync] Erro ao sincronizar in-transit com Order:', syncErr.message);
        }
      }

      createNotification({
        message: `A viagem foi iniciada. O motorista está a caminho do destino.`,
        receiver_id: order.user,
        sender_id: order.deliveryman?.id,
        orderID: order._id,
        title: 'Viagem Iniciada'
      });

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
      order.stepStatus = 6;

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
        try {
          await updateOrder.populate('user', 'name phoneNumber profileImage');
        } catch (e) {
          console.error("Error populating user:", e);
        }
        
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        if (updateOrder.deliveryman?.id) {
          io.to(`driver_${updateOrder.deliveryman.id}`).emit('order_updated', updateOrder);
        }
      }

      createNotification({
        message: `O motorista chegou ao local de recolha/destino. Por favor, vá ao encontro do motorista.`,
        receiver_id: updateOrder.user,
        sender_id: updateOrder.deliveryman?.id,
        orderID: updateOrder._id,
        title: 'Motorista Chegou!',
        type: 'driver_arrived'
      });

      res.send({ message: `No destino indicado`, order: updateOrder });
    } else {
      res.status(404).send({ message: 'Pedido não encontrado' });
    }
  })
);

// Motorista ou Cliente cancela/recusa a viagem
requestServiceer.put(
  '/:id/cancel',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // 1. Validar que o motivo de cancelamento foi enviado
    if (!req.body.message || req.body.message.trim() === '') {
      return res.status(400).send({ message: 'Por favor indique o motivo do cancelamento antes de prosseguir.' });
    }

    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (e) {
      session = null;
    }

    try {
      const order = session 
        ? await RequestService.findById(req.params.id).session(session)
        : await RequestService.findById(req.params.id);

      if (!order) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        return res.status(404).send({ message: 'Pedido não encontrado' });
      }

      // 2. Verificar permissões: apenas cliente, motorista associado, motorista alvo ou admin
      const isClient = order.user && order.user.toString() === req.user._id.toString();
      const isAssignedDriver = order.deliveryman && order.deliveryman.id && order.deliveryman.id.toString() === req.user._id.toString();
      const isTargetDriver = order.targetDriverId && order.targetDriverId.toString() === req.user._id.toString();
      const isAdminUser = req.user.isAdmin;

      if (!isClient && !isAssignedDriver && !isTargetDriver && !isAdminUser) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        return res.status(403).send({ message: 'Sem permissão para cancelar este pedido' });
      }

      // 3. Validar estado do pedido
      if (order.status === 'Cancelado' || order.status === 'Finalizado' || order.status === 'Entregue' || order.status === 'Concluído') {
        if (session) { await session.abortTransaction(); session.endSession(); }
        return res.status(400).send({ message: 'Este pedido já não pode ser cancelado.' });
      }

      const wasAccepted = (order.isAccepted || order.status === 'Pedido aceite') && order.deliveryman && order.deliveryman.id;
      const isDriverRecusingPending = order.status === 'Pendente' && (isAssignedDriver || isTargetDriver);

      order.isCanceled = true;
      order.isAccepted = false;
      order.canceledReason = req.body.message;
      order.stepStatus = 8;

      if (isDriverRecusingPending) {
        // Motorista recusou ou deu timeout antes de aceitar
        order.status = 'Motorista indisponível';
        order.targetDriverId = null;
      } else {
        // Cancelado definitivamente
        order.status = 'Cancelado';
      }

      if (session) {
        await order.save({ session });
      } else {
        await order.save();
      }

      // 4. Libertar motorista se a viagem já tinha sido aceite
      if (wasAccepted) {
        const User = (await import('../models/UserModel.js')).default;
        if (session) {
          await User.updateOne(
            { _id: order.deliveryman.id },
            { $set: { 'deliveryman.hasActiveService': false } },
            { session }
          );
        } else {
          await User.updateOne(
            { _id: order.deliveryman.id },
            { $set: { 'deliveryman.hasActiveService': false } }
          );
        }

        // Penalização de 50MT se o próprio motorista cancelar após ter aceite
        if (req.user.isDeliveryMan && isAssignedDriver) {
          const Wallet = (await import('../models/WalletModel.js')).default;
          const Transaction = (await import('../models/TransactionModel.js')).default;

          let wallet = session
            ? await Wallet.findOne({ ownerId: req.user._id }).session(session)
            : await Wallet.findOne({ ownerId: req.user._id });

          if (!wallet) {
            wallet = new Wallet({ ownerId: req.user._id, ownerType: 'driver', userId: req.user._id, balance: 0 });
          }

          wallet.balance -= 50;
          
          if (session) {
            await wallet.save({ session });
            await Transaction.create([{
              walletId: wallet._id,
              type: 'debit',
              amount: 50,
              method: 'wallet',
              description: 'Penalização por cancelar viagem aceite',
              status: 'confirmado'
            }], { session });
          } else {
            await wallet.save();
            await Transaction.create({
              walletId: wallet._id,
              type: 'debit',
              amount: 50,
              method: 'wallet',
              description: 'Penalização por cancelar viagem aceite',
              status: 'confirmado'
            });
          }
        }
      }

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      // 5. Comunicações pós-sucesso
      try {
        let msg = `Olá, a Nhiquela lamenta lhe informar que o seu pedido n ${order.code} foi cancelado. O motivo do cancelamento poderá verificar no site pesquisando pelo código.`;
        sendSMSToUSendIt(req, msg);

        let mailText = `Olá ${req.user.name},\n \n a Nhiquela informa que o pedido n ${order.code} foi cancelado. \n \n Atenciosamente, \n nhiquela`;
        sendEmailOrderStatus(req, mailText, order, res);
      } catch (err) {
        console.log('Skipping mail/sms send during cancel route:', err.message);
      }

      // 6. WebSocket updates
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('order_updated', order);
        if (order.targetDriverId) {
          io.to(`driver_${order.targetDriverId}`).emit('order_cancelled', { orderId: order._id });
        }
        if (order.deliveryman?.id) {
          io.to(`driver_${order.deliveryman.id}`).emit('order_cancelled', { orderId: order._id });
          io.to(`driver_${order.deliveryman.id}`).emit('service_released', { message: 'Serviço cancelado. Pode agora receber novos pedidos.' });
        } else {
          io.emit('order_updated', order);
        }

        // Criar notificação para outra parte
        const receiverId = isClient ? (order.deliveryman?.id || order.targetDriverId) : order.user;
        if (receiverId) {
          createNotification({
            message: isClient 
              ? `O cliente cancelou a viagem. O seu estado foi libertado.`
              : `A sua viagem foi cancelada pelo motorista. Motivo: ${req.body.message}`,
            receiver_id: receiverId,
            sender_id: req.user._id,
            orderID: order._id,
            title: 'Viagem Cancelada'
          });
        }
      }

      res.status(200).send({ message: 'Pedido cancelado com sucesso', order });

    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Erro no cancelamento do pedido:', error);
      res.status(500).send({ message: error.message || 'Erro ao cancelar o pedido. Tente novamente.' });
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
      order.stepStatus = 8; // Status de cancelamento/falha

      const updateOrder = await order.save();

      // WebSocket Optimization
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${updateOrder._id}`).emit('order_updated', updateOrder);
        if (updateOrder.deliveryman?.id) {
          io.to(`driver_${updateOrder.deliveryman.id}`).emit('order_updated', updateOrder);
        }

        createNotification({
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
    const MAX_RETRIES = 3;
    let lastError;
    let savedOrder = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const order = await RequestService.findById(req.params.id).session(session);

        if (!order) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).send({ message: 'Pedido não encontrado' });
        }

        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.status = 'Concluído';
        order.stepStatus = 7;

        if (req.body && req.body.id) {
          order.paymentResult = {
            id: req.body.id,
            status: req.body.status,
            update_time: req.body.update_time,
            email_address: req.body.email_address,
          };
        }

        if (order.deliveryman && order.deliveryman.id) {
          const commissionAmount = await calculateDynamicCommission(order);

          try {
            await debitDriverCommissionWithSession(
              order.deliveryman.id,
              commissionAmount,
              `Comissão de serviço para o pedido direto ${order.code} finalizado`,
              'commission',
              session
            );
          } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: error.message });
          }
        }

        await order.save({ session });

        // Libertar motorista e colocar offline após concluir a viagem
        if (order.deliveryman && order.deliveryman.id) {
          await User.updateOne(
            { _id: order.deliveryman.id },
            { 
              $set: { 
                'deliveryman.hasActiveService': false,
                availability: 'paused',
                isOnline: false
              },
              $inc: { completedOrders: 1 }
            },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();
        savedOrder = order;

        // ✅ Verificar e suspender motorista se saldo baixo — FORA da transação
        if (order.deliveryman && order.deliveryman.id) {
          try {
            await checkAndDisableDriverIfLowBalance(order.deliveryman.id);
          } catch (err) {
            console.error('[Deliver] Erro ao verificar saldo pós-entrega:', err.message);
          }
        }

        break; // Sucesso — sair do loop

      } catch (error) {
        await session.abortTransaction().catch(() => {});
        session.endSession();

        const isTransient = error.errorLabels?.has?.('TransientTransactionError') ||
                            error.code === 112 ||
                            error.codeName === 'WriteConflict';

        if (isTransient && attempt < MAX_RETRIES) {
          console.warn(`[Deliver] ⚠️ WriteConflict na tentativa ${attempt}/${MAX_RETRIES}. A tentar novamente em ${attempt * 200}ms...`);
          await new Promise(r => setTimeout(r, attempt * 200));
          lastError = error;
          continue;
        }

        lastError = error;
        break;
      }
    }

    if (!savedOrder) {
      console.error('Erro na finalização do pedido:', lastError);
      return res.status(500).send({ message: lastError?.message || 'Erro ao finalizar o pedido. Tente novamente.' });
    }

    // ✅ Fora da transação: notificações, email e WebSocket
    const order = savedOrder;

    let msg = `Olá, o pedido ${order.code} foi entregue com sucesso. Agradecemos por escolher e confiar em nós. nhiquela - Tudo em suas mãos.`;
    sendSMSToUSendIt(req, msg);

    let mailText = `Olá ${req.user.name},\n \n a Nhiquela informa que o seu pedido foi entregue com sucesso e agradecemos por escolher e confiar em nós. \n \n Atenciosamente, \n nhiquela`;
    sendEmailOrderStatus(req, mailText, order, res);

    // WebSocket Optimization — notificar cliente e motorista
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order_updated', order);
      if (order.deliveryman?.id) {
        io.to(`driver_${order.deliveryman.id}`).emit('order_updated', order);
        // Notificar motorista que pode aceitar novos pedidos
        io.to(`driver_${order.deliveryman.id}`).emit('service_released', { message: 'Pode agora receber novos pedidos.' });
      }

      createNotification({
        message: `A sua viagem foi entregue com sucesso! Obrigado por viajar com a Nhiquela.`,
        receiver_id: order.user,
        sender_id: order.deliveryman?.id,
        orderID: order._id,
        title: 'Viagem Concluída'
      });
      
      // [Reverse Sync] Atualizar a Order subjacente, se existir
      try {
        const linkedOrder = await Order.findOne({ requestServiceId: order._id });
        if (linkedOrder) {
          linkedOrder.status = 'Entregue';
          linkedOrder.isDelivered = true;
          linkedOrder.deliveredAt = Date.now();
          linkedOrder.stepStatus = 7;
          await linkedOrder.save();
          
          io.to(`order_${linkedOrder._id}`).emit('order_updated', linkedOrder);

          // Notificações originais da Order
          const sellerOfProduct = await getSellerUser(linkedOrder.seller);
          const clientOfProduct = await User.findById(linkedOrder.user);

          if (sellerOfProduct) {
            createNotification({
              message: `O cliente confirmou a recepção do pedido nº ${linkedOrder.code}.`,
              title: 'Pedido entregue com sucesso!',
              receiver_id: linkedOrder.seller,
              sender_id: linkedOrder.user,
              orderID: linkedOrder._id,
              pushToken: sellerOfProduct.deviceToken || 'none',
            });
          }

          if (clientOfProduct) {
            createNotification({
              message: `Confirmámos a receção do seu pedido nº ${linkedOrder.code}. Esperamos vê-lo de novo em breve!`,
              title: '🎉 Obrigado pela preferência!',
              receiver_id: linkedOrder.user,
              sender_id: linkedOrder.seller,
              orderID: linkedOrder._id,
              pushToken: clientOfProduct.deviceToken || 'none',
            });
          }
        }
      } catch (syncErr) {
        console.error('[Reverse Sync] Erro ao sincronizar deliver com Order:', syncErr.message);
      }
    }

    res.send({ message: `Pedido entregue com sucesso` });
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
      order.stepStatus = 8;
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
          io.to(`driver_${targetDriverId}`).emit('new_order', { ...order.toObject(), type: 'requestService' });

          // Push notification para o motorista alvo
          const targetDriverUser = await User.findById(targetDriverId);
          if (targetDriverUser && targetDriverUser.deviceToken) {
            createNotification({
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
            createNotification({
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

// ============================================================
// ROTAS DE NEGOCIAÇÃO DE VALOR
// ============================================================

// POST /api/request-service/:id/negotiate/start
requestServiceer.post(
  '/:id/negotiate/start',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }

    order.negotiationState = 'NEGOTIATING';
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('negotiation_updated', order);
      io.to(`order_${order._id}`).emit('order_updated', order);
      io.to(`order_${order._id}`).emit('order_negotiating', order);
      if (order.targetDriverId) {
        io.to(`driver_${order.targetDriverId}`).emit('negotiation_updated', order);
        io.to(`driver_${order.targetDriverId}`).emit('order_updated', order);
      }
      const users = req.app.get('users') || [];
      const orderUser = users.find((x) => x._id === (order.user?._id || order.user).toString());
      if (orderUser) {
        io.to(orderUser.socketId).emit('order_updated', order);
        io.to(orderUser.socketId).emit('negotiation_updated', order);
        io.to(orderUser.socketId).emit('order_negotiating', order);
      }
    }

    try {
      const recipientId = order.user?._id || order.user;
      if (recipientId) {
        const recipientUser = await User.findById(recipientId);
        if (recipientUser) {
          const orderCodeStr = order.code || order._id.toString().slice(-6);
          const driverName = req.user.name || 'O motorista';
          createNotification({
            message: `${driverName} está a propor um novo valor para o pedido #${orderCodeStr}.`,
            receiver_id: recipientUser._id,
            sender_id: req.user._id,
            orderID: order._id,
            title: `Negociação Iniciada (#${orderCodeStr})`
          }).catch(err => console.error('[Push Start Negotiation] Erro:', err));
        }
      }
    } catch (e) {
      console.error('[Start Negotiation Notify Error]:', e);
    }

    res.send({ message: 'Negociação iniciada.', order });
  })
);

// POST /api/request-service/:id/negotiate/propose
requestServiceer.post(
  '/:id/negotiate/propose',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { amount, note } = req.body;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).send({ message: 'Valor de proposta inválido.' });
    }

    if (note && containsPhoneNumber(note)) {
      return res.status(400).send({ message: 'Não é permitido incluir números de telefone ou contactos nas notas da negociação por razões de segurança.' });
    }

    const order = await RequestService.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }

    const maxRounds = order.maxNegotiationRounds || 3;
    if (order.negotiationRoundCount >= maxRounds) {
      return res.status(400).send({ message: `Limite máximo de ${maxRounds} rondas de negociação atingido.` });
    }

    const userIdStr = req.user._id.toString();
    const isCustomer = order.user && order.user.toString() === userIdStr;
    const proposedBy = isCustomer ? 'CUSTOMER' : 'PROVIDER';
    const nextState = isCustomer ? 'PENDING_PROVIDER' : 'PENDING_CUSTOMER';

    order.negotiationRoundCount = (order.negotiationRoundCount || 0) + 1;
    order.negotiationState = nextState;

    if (!order.basePrice) {
      order.basePrice = order.deliveryPrice || order.pricing?.totalPrice || 0;
    }

    order.negotiationHistory.push({
      proposedBy,
      amount: numericAmount,
      note: note || '',
      status: 'PROPOSED',
      timestamp: new Date()
    });

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('negotiation_updated', order);
      io.to(`order_${order._id}`).emit('order_updated', order);
      if (order.targetDriverId) {
        io.to(`driver_${order.targetDriverId}`).emit('negotiation_updated', order);
        io.to(`driver_${order.targetDriverId}`).emit('order_updated', order);
      }
      const users = req.app.get('users') || [];
      const orderUser = users.find((x) => x._id === (order.user?._id || order.user).toString());
      if (orderUser) {
        io.to(orderUser.socketId).emit('order_updated', order);
        io.to(orderUser.socketId).emit('negotiation_updated', order);
      }
    }

    // Notificações Push e E-mail para o destinatário da proposta
    try {
      const recipientId = proposedBy === 'CUSTOMER' 
        ? (order.targetDriverId || order.deliveryman?.id) 
        : (order.user?._id || order.user);

      if (recipientId) {
        const recipientUser = await User.findById(recipientId);
        if (recipientUser) {
          const orderCodeStr = order.code || order._id.toString().slice(-6);
          const pushTitle = `Nova Proposta de Preço (#${orderCodeStr})`;
          const pushMsg = `${proposedBy === 'CUSTOMER' ? 'O cliente' : 'O prestador/motorista'} enviou uma proposta de ${numericAmount} MT.${note ? ' Nota: ' + note : ''}`;

          createNotification({
            message: pushMsg,
            receiver_id: recipientUser._id,
            sender_id: req.user._id,
            orderID: order._id,
            title: pushTitle
          }).catch(err => console.error('[Push Negotiation] Erro ao enviar notificação:', err));

          if (recipientUser.email) {
            sendNegotiationEmail({
              toEmail: recipientUser.email,
              recipientName: recipientUser.name,
              orderCode: orderCodeStr,
              action: 'PROPOSE',
              amount: numericAmount,
              note,
              proposedBy
            }).catch(err => console.error('[Email Negotiation] Erro ao enviar e-mail:', err));
          }
        }
      }
    } catch (notifyErr) {
      console.error('[Negotiation Notify Error]:', notifyErr);
    }

    res.send({ message: 'Proposta de valor enviada com sucesso.', order });
  })
);

// POST /api/request-service/:id/negotiate/accept
requestServiceer.post(
  '/:id/negotiate/accept',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }

    if (!order.negotiationHistory || order.negotiationHistory.length === 0) {
      return res.status(400).send({ message: 'Nenhuma proposta encontrada para aceitar.' });
    }

    const lastProposal = order.negotiationHistory[order.negotiationHistory.length - 1];
    if (lastProposal.status !== 'PROPOSED') {
      return res.status(400).send({ message: 'A última proposta já não se encontra pendente.' });
    }

    lastProposal.status = 'ACCEPTED';
    order.negotiationState = 'ACCEPTED';
    order.finalAgreedPrice = lastProposal.amount;
    order.deliveryPrice = lastProposal.amount;
    if (order.pricing) {
      order.pricing.totalPrice = lastProposal.amount;
    }

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('negotiation_updated', order);
      if (order.targetDriverId) {
        io.to(`driver_${order.targetDriverId}`).emit('negotiation_updated', order);
      }
    }

    // Notificações Push e E-mail para AMBOS (Cliente e Prestador) ao aceitar a proposta
    try {
      const orderCodeStr = order.code || order._id.toString().slice(-6);
      const customerId = order.user?._id || order.user;
      const driverId = order.targetDriverId || order.deliveryman?.id;

      const usersToNotify = await User.find({ _id: { $in: [customerId, driverId].filter(Boolean) } });
      for (const u of usersToNotify) {
        createNotification({
          message: `A proposta de ${order.finalAgreedPrice} MT foi ACEITE para o pedido #${orderCodeStr}.`,
          receiver_id: u._id,
          sender_id: req.user._id,
          orderID: order._id,
          title: `Proposta de Valor Aceite! (#${orderCodeStr})`
        }).catch(err => console.error('[Push Accept] Erro ao enviar notificação:', err));

        if (u.email) {
          sendNegotiationEmail({
            toEmail: u.email,
            recipientName: u.name,
            orderCode: orderCodeStr,
            action: 'ACCEPT',
            amount: order.finalAgreedPrice
          }).catch(err => console.error('[Email Accept] Erro ao enviar e-mail:', err));
        }
      }
    } catch (notifyErr) {
      console.error('[Accept Notify Error]:', notifyErr);
    }

    res.send({ message: 'Proposta de valor aceite com sucesso!', order });
  })
);

// POST /api/request-service/:id/negotiate/reject
requestServiceer.post(
  '/:id/negotiate/reject',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }

    if (order.negotiationHistory && order.negotiationHistory.length > 0) {
      const lastProposal = order.negotiationHistory[order.negotiationHistory.length - 1];
      if (lastProposal.status === 'PROPOSED') {
        lastProposal.status = 'REJECTED';
      }
    }

    order.negotiationState = 'REJECTED';
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('negotiation_updated', order);
      if (order.targetDriverId) {
        io.to(`driver_${order.targetDriverId}`).emit('negotiation_updated', order);
      }
    }

    // Notificações Push e E-mail ao rejeitar proposta
    try {
      const orderCodeStr = order.code || order._id.toString().slice(-6);
      const recipientId = req.user._id.toString() === (order.user?._id || order.user)?.toString()
        ? (order.targetDriverId || order.deliveryman?.id)
        : (order.user?._id || order.user);

      if (recipientId) {
        const recipientUser = await User.findById(recipientId);
        if (recipientUser) {
          createNotification({
            message: `A proposta de valor para o pedido #${orderCodeStr} foi rejeitada.`,
            receiver_id: recipientUser._id,
            sender_id: req.user._id,
            orderID: order._id,
            title: `Proposta Rejeitada (#${orderCodeStr})`
          }).catch(err => console.error('[Push Reject] Erro ao enviar notificação:', err));

          if (recipientUser.email) {
            sendNegotiationEmail({
              toEmail: recipientUser.email,
              recipientName: recipientUser.name,
              orderCode: orderCodeStr,
              action: 'REJECT'
            }).catch(err => console.error('[Email Reject] Erro ao enviar e-mail:', err));
          }
        }
      }
    } catch (notifyErr) {
      console.error('[Reject Notify Error]:', notifyErr);
    }

    res.send({ message: 'Proposta de valor rejeitada.', order });
  })
);

export default requestServiceer;


