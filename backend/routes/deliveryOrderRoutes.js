import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import { isAuth } from '../utils.js';

const deliveryOrderRouter = express.Router();

// Helper: Haversine Distance (km)
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 1. POST /api/delivery-orders/optimize-route
 * Calcula rota otimizada e preço consolidado multi-destino
 */
deliveryOrderRouter.post(
  '/optimize-route',
  expressAsyncHandler(async (req, res) => {
    const { origin, stops } = req.body;

    if (!origin || !stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).send({ message: 'Origem e lista de destinos são obrigatórios.' });
    }

    // Nearest-neighbor route optimization (Algoritmo Caixeiro Viajante)
    let currentLat = Number(origin.lat);
    let currentLng = Number(origin.lng);
    let unvisited = stops.map((s, index) => ({ ...s, originalIndex: index }));
    let optimizedStops = [];
    let totalDistance = 0;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = getHaversineDistance(
          currentLat,
          currentLng,
          Number(unvisited[i].latitude || unvisited[i].lat),
          Number(unvisited[i].longitude || unvisited[i].lng)
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      const nextStop = unvisited.splice(nearestIndex, 1)[0];
      totalDistance += minDistance;
      currentLat = Number(nextStop.latitude || nextStop.lat);
      currentLng = Number(nextStop.longitude || nextStop.lng);
      optimizedStops.push(nextStop);
    }

    // Sequenciar paragens
    optimizedStops = optimizedStops.map((stop, i) => ({
      ...stop,
      sequence: i + 1
    }));

    // Cálculo do Preço Consolidado
    // Tarifa base (300 MT) + Distância (25 MT/km) + Adicional por paragem (150 MT por paragem além da 1ª)
    const baseFare = 300;
    const distanceFare = Math.round(totalDistance * 25);
    const extraStopsFare = Math.max(0, (optimizedStops.length - 1) * 150);
    const totalPackages = optimizedStops.reduce((acc, s) => acc + (Number(s.packages) || 1), 0);
    const packageFare = Math.max(0, (totalPackages - optimizedStops.length) * 50);

    const totalPrice = baseFare + distanceFare + extraStopsFare + packageFare;
    const commission = Math.round(totalPrice * 0.15); // 15% Nhiquela
    const driverAmount = totalPrice - commission;
    const estimatedDurationMin = Math.round((totalDistance / 35) * 60) + (optimizedStops.length * 10);

    res.send({
      optimizedStops,
      summary: {
        totalStops: optimizedStops.length,
        totalPackages,
        totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
        estimatedDurationMin,
        baseFare,
        distanceFare,
        extraStopsFare,
        packageFare,
        totalPrice,
        commission,
        driverAmount
      }
    });
  })
);

/**
 * 2. POST /api/delivery-orders
 * Criar pedido multi-destino
 */
deliveryOrderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { origin, stops, transportType, description, paymentMethod, paymentOption } = req.body;

    if (!origin || !stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).send({ message: 'É necessário fornecer origem e pelo menos 1 destino.' });
    }

    const formattedStops = stops.map((s, i) => ({
      sequence: i + 1,
      latitude: Number(s.latitude || s.lat),
      longitude: Number(s.longitude || s.lng),
      address: s.address || 'Destino não especificado',
      recipientName: s.recipientName || 'Destinatário',
      recipientPhone: s.recipientPhone || req.user.phoneNumber || '840000000',
      packages: Number(s.packages) || 1,
      description: s.description || '',
      notes: s.notes || '',
      status: 'PENDING',
      proofOfDelivery: {
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        otpVerified: false
      }
    }));

    // Calcular distância e preço
    let totalDist = 0;
    let currLat = Number(origin.lat);
    let currLng = Number(origin.lng);
    formattedStops.forEach(st => {
      totalDist += getHaversineDistance(currLat, currLng, st.latitude, st.longitude);
      currLat = st.latitude;
      currLng = st.longitude;
    });

    const baseFare = 300;
    const distanceFare = Math.round(totalDist * 25);
    const extraStopsFare = Math.max(0, (formattedStops.length - 1) * 150);
    const totalPrice = baseFare + distanceFare + extraStopsFare;

    const firstStop = formattedStops[0];
    const lastStop = formattedStops[formattedStops.length - 1];

    const code = `#NQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const deliveryOrder = new RequestService({
      name: firstStop.recipientName,
      phoneNumber: firstStop.recipientPhone,
      goodType: 'Entrega Multi-Destino',
      transportType: transportType || 'Mota',
      deliverCity: 'Maputo',
      origin: origin.address,
      destination: lastStop.address,
      originDetails: { address: origin.address, lat: Number(origin.lat), lng: Number(origin.lng) },
      destinationDetails: { address: lastStop.address, lat: lastStop.latitude, lng: lastStop.longitude },
      stops: formattedStops.map(s => ({ address: s.address, lat: s.latitude, lng: s.longitude })),
      deliveryStops: formattedStops,
      multiStopStatus: 'PENDING',
      paymentOption: paymentOption || 'Pagamento na entrega',
      paymentMethod: paymentMethod || 'Dinheiro',
      description: description || `Entrega multi-destino (${formattedStops.length} paragens)`,
      deliveryPrice: totalPrice,
      basePrice: totalPrice,
      finalAgreedPrice: totalPrice,
      user: req.user._id,
      status: 'Pendente',
      stepStatus: 1,
      code,
      isAvailableToDeliver: true,
      auditTrail: [{
        action: 'CREATED',
        performedBy: req.user.name || 'Cliente',
        reason: 'Pedido multi-destino criado pelo cliente',
        timestamp: new Date()
      }]
    });

    const createdOrder = await deliveryOrder.save();

    // Notificar motoristas via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_multi_stop_order', { order: createdOrder });
    }

    res.status(201).send({ message: 'Pedido multi-destino criado com sucesso!', order: createdOrder });
  })
);

/**
 * 3. GET /api/delivery-orders/:id
 * Obter detalhes do pedido multi-destino
 */
deliveryOrderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id)
      .populate('user', 'name email phoneNumber profileImage')
      .populate('deliveryman.id', 'name phoneNumber photo transport_type transport_registration');

    if (!order) {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }

    res.send(order);
  })
);

/**
 * 4. POST /api/delivery-orders/:id/stops/:stopId/arrive
 * Motorista notifica que chegou à paragem
 */
deliveryOrderRouter.post(
  '/:id/stops/:stopId/arrive',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
    if (!order) return res.status(404).send({ message: 'Pedido não encontrado.' });

    const stop = order.deliveryStops.id ? order.deliveryStops.id(req.params.stopId) : order.deliveryStops.find(s => String(s._id) === String(req.params.stopId));
    if (!stop) return res.status(404).send({ message: 'Paragem não encontrada.' });

    stop.status = 'ARRIVED';
    stop.actualArrival = new Date();
    order.multiStopStatus = 'IN_PROGRESS';
    order.stepStatus = 5; // Em trânsito / entregando paragem

    if (!order.auditTrail) order.auditTrail = [];
    order.auditTrail.push({
      action: 'STOP_ARRIVED',
      performedBy: req.user.name || 'Motorista',
      reason: `Chegada à paragem ${stop.sequence} (${stop.recipientName})`,
      timestamp: new Date()
    });

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('DRIVER_ARRIVED_STOP', { orderId: order._id, stopId: stop._id, sequence: stop.sequence });
    }

    res.send({ message: `Chegada à paragem ${stop.sequence} confirmada.`, order, stop });
  })
);

/**
 * 5. POST /api/delivery-orders/:id/stops/:stopId/deliver
 * Confirmar entrega de uma paragem (OTP, foto, assinatura)
 */
deliveryOrderRouter.post(
  '/:id/stops/:stopId/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { otp, photo, signature, latitude, longitude } = req.body;
    const order = await RequestService.findById(req.params.id);
    if (!order) return res.status(404).send({ message: 'Pedido não encontrado.' });

    const stop = order.deliveryStops.id ? order.deliveryStops.id(req.params.stopId) : order.deliveryStops.find(s => String(s._id) === String(req.params.stopId));
    if (!stop) return res.status(404).send({ message: 'Paragem não encontrada.' });

    // Validar OTP se fornecido
    if (stop.proofOfDelivery?.otp && otp) {
      if (stop.proofOfDelivery.otp !== otp.toString().trim()) {
        return res.status(400).send({ message: 'Código OTP incorreto.' });
      }
      stop.proofOfDelivery.otpVerified = true;
    }

    stop.status = 'DELIVERED';
    stop.deliveredAt = new Date();
    if (photo) stop.proofOfDelivery.photo = photo;
    if (signature) stop.proofOfDelivery.signature = signature;
    if (latitude) stop.proofOfDelivery.latitude = Number(latitude);
    if (longitude) stop.proofOfDelivery.longitude = Number(longitude);
    stop.proofOfDelivery.timestamp = new Date();

    // Verificar se TODAS as paragens estão concluídas
    const allDone = order.deliveryStops.every(s => s.status === 'DELIVERED' || s.status === 'FAILED' || s.status === 'CANCELLED');
    const hasSuccess = order.deliveryStops.some(s => s.status === 'DELIVERED');

    if (allDone) {
      order.status = hasSuccess ? 'Entregue' : 'Cancelado';
      order.multiStopStatus = hasSuccess ? 'DELIVERED' : 'CANCELLED';
      order.stepStatus = 6;
      order.isDelivered = true;
      order.deliveredAt = new Date();
    } else {
      order.multiStopStatus = 'PARTIALLY_DELIVERED';
      order.status = 'Em trânsito';
      order.stepStatus = 5;
    }

    if (!order.auditTrail) order.auditTrail = [];
    order.auditTrail.push({
      action: 'STOP_DELIVERED',
      performedBy: req.user.name || 'Motorista',
      reason: `Paragem ${stop.sequence} entregue com sucesso`,
      timestamp: new Date()
    });

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('STOP_DELIVERED', { orderId: order._id, stopId: stop._id, isAllDone: allDone });
    }

    res.send({ message: `Paragem ${stop.sequence} entregue com sucesso!`, order, stop, allDone });
  })
);

/**
 * 6. POST /api/delivery-orders/:id/stops/:stopId/fail
 * Registrar ocorrência/falha em uma paragem
 */
deliveryOrderRouter.post(
  '/:id/stops/:stopId/fail',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { failureReason, failureNotes, photo } = req.body;
    const order = await RequestService.findById(req.params.id);
    if (!order) return res.status(404).send({ message: 'Pedido não encontrado.' });

    const stop = order.deliveryStops.id ? order.deliveryStops.id(req.params.stopId) : order.deliveryStops.find(s => String(s._id) === String(req.params.stopId));
    if (!stop) return res.status(404).send({ message: 'Paragem não encontrada.' });

    stop.status = 'FAILED';
    stop.failureReason = failureReason || 'Cliente ausente';
    stop.failureNotes = failureNotes || '';
    if (photo) stop.proofOfDelivery.photo = photo;

    // Atualizar status geral
    const allDone = order.deliveryStops.every(s => s.status === 'DELIVERED' || s.status === 'FAILED' || s.status === 'CANCELLED');
    if (allDone) {
      const anyDelivered = order.deliveryStops.some(s => s.status === 'DELIVERED');
      order.multiStopStatus = anyDelivered ? 'PARTIALLY_DELIVERED' : 'FAILED';
      order.status = anyDelivered ? 'Entregue Parcialmente' : 'Cancelado';
    } else {
      order.multiStopStatus = 'PARTIALLY_DELIVERED';
    }

    if (!order.auditTrail) order.auditTrail = [];
    order.auditTrail.push({
      action: 'STOP_FAILED',
      performedBy: req.user.name || 'Motorista',
      reason: `Ocorrência na paragem ${stop.sequence}: ${failureReason}`,
      timestamp: new Date()
    });

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('STOP_FAILED', { orderId: order._id, stopId: stop._id, failureReason });
    }

    res.send({ message: `Ocorrência registada na paragem ${stop.sequence}.`, order, stop });
  })
);

/**
 * 7. POST /api/delivery-orders/:id/reassign-driver
 * Admin/Parceiro reatribui motorista com auditoria
 */
deliveryOrderRouter.post(
  '/:id/reassign-driver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { newDriverId, reason } = req.body;
    const order = await RequestService.findById(req.params.id);
    if (!order) return res.status(404).send({ message: 'Pedido não encontrado.' });

    const newDriver = await User.findById(newDriverId);
    if (!newDriver) return res.status(404).send({ message: 'Novo motorista não encontrado.' });

    const oldDriverName = order.deliveryman?.name || 'Nenhum';

    order.deliveryman = {
      id: newDriver._id,
      name: newDriver.name,
      photo: newDriver.profileImage || newDriver.photo,
      phoneNumber: newDriver.phoneNumber,
      transport_type: newDriver.transport_type,
      transport_color: newDriver.transport_color,
      transport_registration: newDriver.transport_registration
    };
    order.targetDriverId = newDriver._id.toString();
    order.multiStopStatus = 'DRIVER_ASSIGNED';

    order.auditTrail.push({
      action: 'DRIVER_REASSIGNED',
      performedBy: req.user.name || 'Admin',
      reason: `Reatribuído de ${oldDriverName} para ${newDriver.name}. Motivo: ${reason || 'Ação Administrativa'}`,
      timestamp: new Date()
    });

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('DRIVER_REASSIGNED', { orderId: order._id, newDriver: order.deliveryman });
    }

    res.send({ message: `Motorista alterado para ${newDriver.name} com sucesso.`, order });
  })
);

/**
 * 8. POST /api/delivery-orders/:id/reorder-stops
 * Reordenar paragens com registo no audit trail
 */
deliveryOrderRouter.post(
  '/:id/reorder-stops',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const newStopSequence = req.body.newStopSequence || req.body.newSequence;
    const order = await RequestService.findById(req.params.id);
    if (!order) return res.status(404).send({ message: 'Pedido não encontrado.' });

    if (!Array.isArray(newStopSequence) || newStopSequence.length !== order.deliveryStops.length) {
      return res.status(400).send({ message: 'A nova sequência deve conter todas as paragens.' });
    }

    const reorderedStops = [];
    newStopSequence.forEach((stopItem, index) => {
      const stopId = typeof stopItem === 'object' ? stopItem.stopId : stopItem;
      const st = order.deliveryStops.id ? order.deliveryStops.id(stopId) : order.deliveryStops.find(s => String(s._id) === String(stopId));
      if (st) {
        st.sequence = index + 1;
        reorderedStops.push(st);
      }
    });

    order.deliveryStops = reorderedStops;
    if (!order.auditTrail) order.auditTrail = [];
    order.auditTrail.push({
      action: 'STOPS_REORDERED',
      performedBy: req.user.name || 'Admin',
      reason: 'Reordenação das paragens da viagem',
      timestamp: new Date()
    });

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('STOP_REORDERED', { orderId: order._id, stops: order.deliveryStops });
    }

    res.send({ message: 'Ordem das paragens atualizada com sucesso.', order });
  })
);

export default deliveryOrderRouter;
