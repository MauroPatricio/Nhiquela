import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Order from '../models/OrderModel.js';
import Service from '../models/ServiceModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import { isAuth, isAdmin, isSellerOrAdmin } from '../utils.js';
import { body, validationResult } from 'express-validator';
import DeliverymanUpdateRequest from '../models/DeliverymanUpdateRequestModel.js';

const router = express.Router();

// Get all drivers (delivery men)
// Get all drivers (delivery men) with pagination and optional search
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const filter = { isDeliveryMan: true, isDeleted: { $ne: true } };
    if (search && search !== 'all') {
      const regex = { $regex: search, $options: 'i' };
      filter.$or = [{ name: regex }, { email: regex }];
    }
    const [drivers, total] = await Promise.all([
      User.find(filter)
        .skip(pageSize * (page - 1))
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.send({ drivers, page, pages: Math.ceil(total / pageSize), total });
  })
);

// Rota ultra-rápida (Ping) para os Motoristas atualizarem a sua localização (10 em 10 segs)
router.put(
  '/ping',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).send({ message: 'Coordenadas (lat, lng) são obrigatórias' });
    }

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          locationGeo: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)] // Padrão GeoJSON [longitude, latitude]
          },
          latitude: String(lat),
          longitude: String(lng),
          lastPingAt: new Date(),
        }
      }
    );

    res.send({ message: 'Ping recebido' });
  })
);

// Obter perfil atualizado do motorista autenticado
router.get(
  '/me',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.user._id).lean();
    if (!driver) {
      return res.status(404).send({ message: 'Motorista não encontrado.' });
    }
    res.send(driver);
  })
);

// Atualizar Disponibilidade do Motorista (Online / Offline)
router.put(
  '/availability',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { availability } = req.body;
    
    if (!['active', 'paused', 'inactive'].includes(availability)) {
      return res.status(400).send({ message: 'Status de disponibilidade inválido.' });
    }

    // Integrar Motor Financeiro (verificação de saldo antes de ficar online)
    if (availability === 'active') {
      const { hasSufficientBalance } = await import('../services/walletService.js');
      const canGoOnline = await hasSufficientBalance(req.user._id);
      if (!canGoOnline) {
        return res.status(402).send({ message: 'Saldo insuficiente. Faça um recarregamento para voltar a receber pedidos.' });
      }
    }

    const driver = await User.findById(req.user._id);
    if (driver) {
      // Se estava suspenso (Inativo por administração ou saldo), não deixa ficar ativo
      if (availability === 'active' && driver.status === 'Inativo') {
         return res.status(403).send({ message: 'A sua conta encontra-se suspensa. Contacte o suporte ou recarregue o seu saldo.' });
      }

      driver.availability = availability;
      await driver.save();
      res.send({ message: 'Disponibilidade atualizada com sucesso', availability: driver.availability });
    } else {
      res.status(404).send({ message: 'Motorista não encontrado' });
    }
  })
);

// Estatísticas do Motorista
router.get(
  '/stats/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Conta as viagens concluídas pelo motorista autenticado
    const totalTrips = await Order.countDocuments({
      'deliveryman.id': req.user._id,
      isDelivered: true
    });

    // Rating fixo para já (4.8), no futuro virá da média das avaliações das ordens
    res.send({
      totalTrips: totalTrips || 0,
      rating: 4.8
    });
  })
);

// Create a new driver (admin only)
router.post(
  '/',
  isAuth,
  isSellerOrAdmin,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
    body('phoneNumber').notEmpty().withMessage('Telefone é obrigatório'),
  ],
  expressAsyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password, phoneNumber, transport_type, transport_color, plate, licenseNumber, idNumber, document_type, status, vehicle_type_id, providedServices } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (exists) {
      return res.status(400).send({ message: 'Email ou telefone já registado' });
    }
    
    // Process VehicleType to get baseFee
    let assigned_base_fee = 0;
    let final_transport_type = transport_type;
    
    if (vehicle_type_id) {
      const VehicleType = (await import('../models/VehicleTypeModel.js')).default;
      const vType = await VehicleType.findById(vehicle_type_id);
      if (vType) {
        assigned_base_fee = vType.basePrice || 0;
        final_transport_type = vType.name;
      }
    }

    const driverServices = Array.isArray(providedServices) 
      ? providedServices.map(id => ({ serviceId: id, isAvailable: true })) 
      : [];

    if (!driverServices || driverServices.length === 0) {
      return res.status(400).send({ message: 'É obrigatório selecionar pelo menos um serviço/subcategoria para se registar como motorista.' });
    }

    const driver = new User({
      name,
      email,
      password,
      phoneNumber,
      isDeliveryMan: true,
      deliveryman: {
        name,
        phoneNumber,
        transport_type: final_transport_type,
        transport_color,
        transport_registration: plate,
        vehicle_type_id,
        assigned_base_fee,
        license_front: licenseNumber,
        document_type,
        document_front: idNumber,
        providedServices: driverServices
      },
      status: status || 'Pendente',
    });
    await driver.save();
    res.status(201).send({ message: 'Motorista criado', driver });
  })
);

// Get available drivers near a location (public endpoint)
router.get(
  '/available',
  expressAsyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 5; // km
    const serviceId = req.query.serviceId;

    const filter = {
      isDeliveryMan: true,
      availability: 'active',
      isDeleted: { $ne: true },
    };

    if (serviceId) {
      try {
        let serviceObj = await Service.findById(serviceId);
        if (!serviceObj) {
          serviceObj = await ProviderSubcategory.findById(serviceId);
        }
        if (serviceObj) {
          filter.$or = [
            {
              'deliveryman.providedServices': {
                $elemMatch: {
                  serviceId: serviceId,
                  isAvailable: true
                }
              }
            },
            {
              'deliveryman.transport_type': { $regex: new RegExp('^' + serviceObj.name + '$', 'i') }
            }
          ];
        } else {
          filter['deliveryman.providedServices.serviceId'] = serviceId;
          filter['deliveryman.providedServices.isAvailable'] = true;
        }
      } catch (error) {
        filter['deliveryman.providedServices.serviceId'] = serviceId;
        filter['deliveryman.providedServices.isAvailable'] = true;
      }
    }

    // Try to find drivers. Since geoPosition index might not be created, we'll do an initial find
    // and filter by Haversine distance in Javascript to be safe and avoid index errors.
    
    // Try to find drivers
    let drivers = await User.find(filter).lean();
    
    // EXCLUDE OCCUPIED DRIVERS (drivers with active orders or pending direct requests)
    const activeOrders = await RequestService.find({
       status: { $nin: ['Finalizado', 'Cancelado'] }
    }).select('deliveryman targetDriverId').lean();
    
    const busyDriverIds = new Set();
    activeOrders.forEach(order => {
       if (order.deliveryman && order.deliveryman.id) {
          busyDriverIds.add(order.deliveryman.id.toString());
       }
       if (order.targetDriverId) {
          busyDriverIds.add(order.targetDriverId.toString());
       }
    });

    drivers = drivers.filter(d => !busyDriverIds.has(d._id.toString()));
  

    if (!lat || !lng) {
      return res.send({ drivers });
    }

    const toRad = (value) => (value * Math.PI) / 180;
    const calcDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const nearbyDrivers = [];
    drivers.forEach(driver => {
      let dLat, dLng;
      if (driver.geoPosition && driver.geoPosition.coordinates) {
        dLng = driver.geoPosition.coordinates[0];
        dLat = driver.geoPosition.coordinates[1];
      } else if (driver.latitude && driver.longitude) {
        dLat = parseFloat(driver.latitude);
        dLng = parseFloat(driver.longitude);
      }
      
      if (dLat && dLng) {
        const dist = calcDistance(lat, lng, dLat, dLng);
        if (dist <= radius) {
          driver.distance = dist;
          nearbyDrivers.push(driver);
        }
      }
    });

    res.send({ drivers: nearbyDrivers });
  })
);

// GET /api/drivers/doc-update-requests — Admin lista pedidos de documentos
router.get(
  '/doc-update-requests',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = { type: 'profile_update' };
    if (status) filter.status = status.toUpperCase();
    const requests = await DeliverymanUpdateRequest.find(filter)
      .populate('deliverymanId', 'name email deliveryman')
      .populate('reviewedBy', 'name')
      .sort({ requestedAt: -1 });
    res.send({ requests, total: requests.length });
  })
);

// PUT /api/drivers/doc-update-requests/:id/review — Admin aprova ou rejeita pedido de docs
router.put(
  '/doc-update-requests/:id/review',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { decision, rejectionReason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).send({ message: 'Decisão inválida. Use APPROVED ou REJECTED.' });
    }

    const request = await DeliverymanUpdateRequest.findById(req.params.id);
    if (!request || request.type !== 'profile_update') {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).send({ message: 'Este pedido já foi processado.' });
    }

    request.status = decision;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    request.reason = rejectionReason || '';
    await request.save();

    // Atualizar perfil do motorista
    const driver = await User.findById(request.deliverymanId);
    if (driver) {
      if (decision === 'APPROVED') {
        driver.deliveryman.docUpdateStatus = 'Aprovado';
      } else {
        driver.deliveryman.docUpdateStatus = 'Nenhum';
      }
      await driver.save();
    }

    // Notificação push opcional
    if (driver?.deviceToken) {
      try {
        const { Expo } = await import('expo-server-sdk');
        const expo = new Expo();
        const msg = decision === 'APPROVED'
          ? 'O seu pedido para atualizar documentos foi aprovado! Pode agora editar o seu perfil.'
          : 'O seu pedido para atualizar documentos foi rejeitado.';
        await expo.sendPushNotificationsAsync([{
          to: driver.deviceToken,
          sound: 'default',
          title: 'Atualização de Documentos',
          body: msg,
        }]);
      } catch (err) {
        console.error('Erro ao enviar push notification:', err);
      }
    }

    res.send({ message: `Pedido ${decision === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}`, request });
  })
);

// ============================================================
// POST /api/drivers/price-request — Motorista submete pedido de alteração de preço
router.post(
  '/price-request',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { requestedPrice } = req.body;
    if (!requestedPrice || isNaN(requestedPrice) || Number(requestedPrice) <= 0) {
      return res.status(400).send({ message: 'Valor inválido. O preço deve ser maior que 0.' });
    }

    const driver = await User.findById(req.user._id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado.' });
    }

    // Cancelar qualquer pedido pendente anterior
    await DeliverymanUpdateRequest.updateMany(
      { deliverymanId: req.user._id, type: 'price_change', status: 'PENDING' },
      { status: 'REJECTED', reason: 'Substituído por novo pedido' }
    );

    // Criar novo pedido
    const priceRequest = await DeliverymanUpdateRequest.create({
      deliverymanId: req.user._id,
      type: 'price_change',
      previousPrice: driver.deliveryman?.customPrice || driver.deliveryman?.assigned_base_fee || 0,
      requestedPrice: Number(requestedPrice),
      status: 'PENDING',
    });

    // Marcar no perfil do motorista como pendente
    driver.deliveryman.pendingCustomPrice = Number(requestedPrice);
    driver.deliveryman.priceRequestStatus = 'Pendente';
    await driver.save();

    res.status(201).send({ message: 'Pedido de alteração de preço submetido com sucesso.', request: priceRequest });
  })
);

// PUT /api/drivers/price-request/toggle — Motorista activa/desactiva preço personalizado
router.put(
  '/price-request/toggle',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { allowCustomPrice } = req.body;
    const driver = await User.findById(req.user._id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado.' });
    }
    driver.deliveryman.allowCustomPrice = !!allowCustomPrice;
    await driver.save();
    res.send({ message: 'Preferência de preço atualizada.', allowCustomPrice: driver.deliveryman.allowCustomPrice });
  })
);

// GET /api/drivers/price-requests — Admin lista pedidos de alteração de preço
router.get(
  '/price-requests',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = { type: 'price_change' };
    if (status) filter.status = status.toUpperCase();
    const requests = await DeliverymanUpdateRequest.find(filter)
      .populate('deliverymanId', 'name email deliveryman')
      .populate('reviewedBy', 'name')
      .sort({ requestedAt: -1 });
    res.send({ requests, total: requests.length });
  })
);

// PUT /api/drivers/price-requests/:id/review — Admin aprova ou rejeita
router.put(
  '/price-requests/:id/review',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { decision, rejectionReason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).send({ message: 'Decisão inválida. Use APPROVED ou REJECTED.' });
    }

    const request = await DeliverymanUpdateRequest.findById(req.params.id);
    if (!request || request.type !== 'price_change') {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).send({ message: 'Este pedido já foi processado.' });
    }

    request.status = decision;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    request.reason = rejectionReason || '';
    await request.save();

    // Atualizar perfil do motorista
    const driver = await User.findById(request.deliverymanId);
    if (driver) {
      if (decision === 'APPROVED') {
        driver.deliveryman.customPrice = request.requestedPrice;
        driver.deliveryman.priceRequestStatus = 'Aprovado';
        driver.deliveryman.pendingCustomPrice = null;
      } else {
        driver.deliveryman.priceRequestStatus = 'Rejeitado';
        driver.deliveryman.priceRequestRejectionReason = rejectionReason || '';
        driver.deliveryman.pendingCustomPrice = null;
      }
      driver.markModified('deliveryman');
      await driver.save();
    }

    // Notificação push (se tiver deviceToken)
    if (driver?.deviceToken) {
      try {
        const { Expo } = await import('expo-server-sdk');
        const expo = new Expo();
        const msg = decision === 'APPROVED'
          ? `✅ O seu preço de ${request.requestedPrice} MT foi aprovado!`
          : `❌ O seu pedido de preço foi rejeitado. Motivo: ${rejectionReason || 'Não especificado'}`;
        await expo.sendPushNotificationsAsync([{ to: driver.deviceToken, title: 'Nhiquela — Preço', body: msg }]);
      } catch (e) { /* ignore push errors */ }
    }

    res.send({ message: `Pedido ${decision === 'APPROVED' ? 'aprovado' : 'rejeitado'} com sucesso.` });
  })
);

// Get driver by ID (auth driver or admin)
router.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.params.id).populate('deliveryman.providedServices.serviceId');
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }
    // Allow self or admin
    if (req.user._id !== driver._id.toString() && !req.user.isAdmin) {
      return res.status(403).send({ message: 'Acesso negado' });
    }
    res.send(driver);
  })
);

// Update driver (admin or self)
router.put(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  [
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('phoneNumber').optional().notEmpty().withMessage('Telefone não pode ser vazio'),
    body('password').optional().isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
  ],
  expressAsyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const driver = await User.findById(req.params.id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }
    if (req.user._id !== driver._id.toString() && !req.user.isAdmin) {
      return res.status(403).send({ message: 'Acesso negado' });
    }
    const { name, email, phoneNumber, password, transport_type, transport_color, plate, licenseNumber, idNumber, document_type, status, vehicle_type_id, providedServices } = req.body;
    if (name) driver.name = name;
    if (email) driver.email = email;
    if (phoneNumber) driver.phoneNumber = phoneNumber;
    if (password) driver.password = password;
    if (status) {
      driver.status = status;
      // Sincroniza register_conformance com o status para que o app mobile
      // reflita imediatamente a decisão tomada no painel de administração.
      if (!driver.deliveryman) driver.deliveryman = {};
      if (status === 'Disponível') {
        driver.deliveryman.register_conformance = 'CONFORMANCE';
      } else if (status === 'Inativo') {
        driver.deliveryman.register_conformance = 'INCONFORMANCE';
      } else if (status === 'Pendente') {
        driver.deliveryman.register_conformance = 'PENDING_CONFORMANCE';
      }
    }

    // Process VehicleType
    if (vehicle_type_id || transport_type || transport_color || plate || licenseNumber || idNumber || document_type || providedServices) {
      driver.deliveryman = driver.deliveryman || {};
      
      if (name) driver.deliveryman.name = name;
      if (phoneNumber) driver.deliveryman.phoneNumber = phoneNumber;
      if (transport_type) driver.deliveryman.transport_type = transport_type;
      if (transport_color) driver.deliveryman.transport_color = transport_color;
      if (plate) driver.deliveryman.transport_registration = plate;
      if (licenseNumber) driver.deliveryman.license_front = licenseNumber;
      if (document_type) driver.deliveryman.document_type = document_type;
      if (idNumber) driver.deliveryman.document_front = idNumber;
      
      if (Array.isArray(providedServices)) {
        driver.deliveryman.providedServices = providedServices.map(id => ({ serviceId: id, isAvailable: true }));
      }
      
      if (vehicle_type_id && (!driver.deliveryman.vehicle_type_id || driver.deliveryman.vehicle_type_id.toString() !== vehicle_type_id.toString())) {
        const VehicleType = (await import('../models/VehicleTypeModel.js')).default;
        const vType = await VehicleType.findById(vehicle_type_id);
        if (vType) {
          driver.deliveryman.vehicle_type_id = vehicle_type_id;
          driver.deliveryman.assigned_base_fee = vType.basePrice || 0;
          driver.deliveryman.transport_type = vType.name;
        }
      }
    }

    await driver.save();

    // 🔔 Notifica o motorista em tempo real via Socket.io
    try {
      const io = req.app.get('io');
      if (io && status) {
        // Emite para a sala pessoal do motorista (driver_<id>)
        io.to(`driver_${driver._id}`).emit('driver_status_updated', {
          status: driver.status,
          register_conformance: driver.deliveryman?.register_conformance,
          isApproved: driver.status === 'Disponível',
          message: driver.status === 'Disponível'
            ? '✅ A sua conta foi aprovada! Já pode receber pedidos.'
            : driver.status === 'Inativo'
            ? '❌ A sua conta foi suspensa. Contacte o suporte.'
            : '⏳ A sua conta está em análise.',
        });
        console.log(`📡 Evento driver_status_updated enviado para driver_${driver._id}: ${driver.status}`);
      }
    } catch (socketError) {
      console.error('Erro ao emitir evento socket:', socketError);
    }

    res.send({ message: 'Motorista atualizado', driver });
  })
);

// Delete driver (admin only)
router.delete(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.params.id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }
    await driver.deleteOne();
    res.send({ message: 'Motorista removido' });
  })
);

export default router;

// ============================================================
// ROTAS DE PREÇO PERSONALIZADO
// ============================================================



// ============================================================
// PEDIDOS DE ATUALIZAÇÃO DE DOCUMENTOS (DOC UPDATE)
// ============================================================

// POST /api/drivers/doc-update-request — Motorista submete pedido de alteração de documentos
router.post(
  '/doc-update-request',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.user._id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado.' });
    }

    // Cancelar qualquer pedido pendente anterior do mesmo tipo
    await DeliverymanUpdateRequest.updateMany(
      { deliverymanId: req.user._id, type: 'profile_update', status: 'PENDING' },
      { status: 'REJECTED', reason: 'Substituído por novo pedido' }
    );

    // Criar novo pedido
    const docRequest = await DeliverymanUpdateRequest.create({
      deliverymanId: req.user._id,
      type: 'profile_update',
      status: 'PENDING',
    });

    // Atualizar estado no motorista
    if (!driver.deliveryman) driver.deliveryman = {};
    driver.deliveryman.docUpdateStatus = 'Pendente';
    await driver.save();

    res.send({ message: 'Pedido de atualização enviado com sucesso.', docRequest });
  })
);
