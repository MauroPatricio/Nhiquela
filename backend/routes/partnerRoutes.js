import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Partner from '../models/PartnerModel.js';
import PartnerProduct from '../models/PartnerProductModel.js';
import User from '../models/UserModel.js';
import Order from '../models/OrderModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Provider from '../models/ProviderModel.js';
import AuditLog from '../models/AuditLogModel.js';
import { isAuth, isAdmin, isPartner, checkPermission } from '../utils.js';
import partnerService from '../services/partnerService.js';

const router = express.Router();

// Helper to extract target partner ID for requests
const getPartnerIdForUser = async (req) => {
  const user = req.user;
  if (!user) return null;

  if (user.partnerId) {
    const existingP = await Partner.findById(user.partnerId);
    if (existingP) return existingP._id;
  }

  let pDoc = await Partner.findOne({ $or: [{ userId: user._id }, { email: user.email }] });
  if (!pDoc && (user.role === 'PARTNER' || user.isPartner)) {
    pDoc = await Partner.create({
      name: user.name || 'Parceiro',
      companyName: user.name || 'Empresa Parceira',
      email: user.email,
      phone: user.phoneNumber || '',
      userId: user._id,
      status: 'ACTIVE'
    });
    await User.updateOne({ _id: user._id }, { partnerId: pDoc._id, isPartner: true, role: 'PARTNER' });
  }

  return pDoc ? pDoc._id : (user.partnerId || user._id);
};

// Create a new partner (admin only)
router.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { name, companyName, email, phone, phoneNumber, address, province, city, commissionPercentage, logoUrl, profileImage, password } = req.body;

    const partnerEmail = email ? email.toLowerCase().trim() : '';
    if (!partnerEmail) {
      return res.status(400).send({ message: 'Email de contacto é obrigatório.' });
    }

    // Check if partner already exists with this email
    let existingPartner = await Partner.findOne({ email: partnerEmail });
    if (existingPartner) {
      return res.status(400).send({ message: 'Já existe um parceiro registado com este e-mail.' });
    }

    const defaultPassword = password || '12345678';
    const finalPhoto = logoUrl || profileImage || '';

    // 1. Procurar ou criar utilizador Web (User) para permitir o login na plataforma web
    let pUser = await User.findOne({ email: partnerEmail });
    if (!pUser) {
      pUser = new User({
        name: companyName || name || 'Parceiro',
        email: partnerEmail,
        phoneNumber: phone || phoneNumber || '840000000',
        password: bcrypt.hashSync(defaultPassword, 8),
        role: 'PARTNER',
        isPartner: true,
        profileImage: finalPhoto,
      });
      await pUser.save();
    } else {
      pUser.role = 'PARTNER';
      pUser.isPartner = true;
      if (finalPhoto) pUser.profileImage = finalPhoto;
      await pUser.save();
    }

    // 2. Criar registo do Parceiro / Gestor
    const partner = new Partner({
      name: companyName || name,
      companyName: companyName || name,
      email: partnerEmail,
      phone: phone || phoneNumber,
      phoneNumber: phone || phoneNumber,
      address,
      province,
      city,
      commissionPercentage: commissionPercentage !== undefined ? Number(commissionPercentage) : 10,
      commissionRate: (commissionPercentage !== undefined ? Number(commissionPercentage) : 10) / 100,
      logoUrl: finalPhoto,
      profileImage: finalPhoto,
      userId: pUser._id,
      status: 'ACTIVE',
      isActive: true,
    });

    await partner.save();

    // 3. Vincular partnerId no User
    pUser.partnerId = partner._id;
    await pUser.save();

    res.status(201).send({
      message: 'Parceiro criado com sucesso e acesso à plataforma web concedido.',
      partner,
      userCredentials: {
        email: partnerEmail,
        password: defaultPassword,
        role: 'PARTNER'
      }
    });
  })
);

// List partners (admin can see all, partner can see self)
router.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    if (req.user.isAdmin || req.user.role === 'ADMIN') {
      const partners = await Partner.find({}).populate('userId', 'name email phoneNumber').lean();
      
      const partnersWithCounts = await Promise.all(
        partners.map(async (p) => {
          const [totalDrivers, totalSellers, totalProviders] = await Promise.all([
            User.countDocuments({ partnerId: p._id, $or: [{ role: 'DRIVER' }, { isDeliveryMan: true }] }),
            User.countDocuments({ partnerId: p._id, $or: [{ role: 'SELLER' }, { isSeller: true }] }),
            Provider.countDocuments({ partnerId: p._id })
          ]);
          return {
            ...p,
            totalDrivers,
            totalSellers,
            totalProviders: totalProviders || totalSellers
          };
        })
      );
      
      return res.send(partnersWithCounts);
    }
    const partnerId = await getPartnerIdForUser(req);
    const partners = await Partner.find({ _id: partnerId }).populate('userId', 'name email phoneNumber').lean();
    res.send(partners);
  })
);

// Get partner details
router.get(
  '/:partnerId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    let targetId = req.params.partnerId;
    
    // Resolve partner document by ID or User ID
    let partner = await Partner.findOne({ $or: [{ _id: targetId }, { userId: targetId }] }).populate('userId', 'name email phoneNumber');
    
    // Auto-create Partner document if user is a PARTNER and missing a partner record
    if (!partner && (req.user._id.toString() === targetId || req.user.role === 'PARTNER' || req.user.isPartner)) {
      partner = await Partner.create({
        name: req.user.name || 'Parceiro',
        companyName: req.user.name || 'Empresa Parceira',
        email: req.user.email,
        phone: req.user.phoneNumber || '',
        userId: req.user._id,
        status: 'ACTIVE'
      });
      await User.updateOne({ _id: req.user._id }, { partnerId: partner._id, isPartner: true, role: 'PARTNER' });
    }

    if (partner) res.send(partner);
    else res.status(404).send({ message: 'Parceiro não encontrado.' });
  })
);

// Update partner (admin or self)
router.put(
  '/:partnerId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const targetId = req.params.partnerId;
    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      const myPId = await getPartnerIdForUser(req);
      if (String(myPId) !== String(targetId)) {
        return res.status(403).send({ message: 'Acesso negado.' });
      }
    }
    const updated = await partnerService.updatePartner(targetId, req.body, req.user);
    if (updated) res.send({ message: 'Parceiro atualizado com sucesso.', partner: updated });
    else res.status(404).send({ message: 'Parceiro não encontrado.' });
  })
);

// Delete (deactivate) partner (admin only)
router.delete(
  '/:partnerId',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    await partnerService.deletePartner(req.params.partnerId);
    res.send({ message: 'Parceiro desativado.' });
  })
);

// =========================================================================
// FASE 7, 11 & 12 — GESTÃO DE ASSOCIAÇÃO DE MOTORISTAS E FORNECEDORES
// =========================================================================

/**
 * POST /api/partners/:partnerId/assign-driver
 * Associa um motorista a um parceiro. Regra Rígida: Bloqueia se já tiver parceiro.
 */
router.post(
  '/:partnerId/assign-driver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { partnerId: rawPartnerId } = req.params;
    const myPId = await getPartnerIdForUser(req);

    let partner = await Partner.findOne({ $or: [{ _id: rawPartnerId }, { userId: rawPartnerId }, { _id: myPId }] });
    if (!partner && myPId) {
      partner = await Partner.findById(myPId);
    }

    if (!partner) {
      return res.status(404).send({ message: 'Parceiro não encontrado.' });
    }

    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      if (String(myPId) !== String(partner._id)) {
        return res.status(403).send({ message: 'Acesso negado. Não pode gerir motoristas de outro parceiro.' });
      }
    }

    const { driverId, userId, email, phoneNumber } = req.body;
    const targetUserId = driverId || userId;

    let driver = null;
    if (targetUserId) {
      driver = await User.findById(targetUserId);
    } else if (email) {
      driver = await User.findOne({ email });
    } else if (phoneNumber) {
      driver = await User.findOne({ phoneNumber });
    }

    if (!driver) {
      return res.status(404).send({ message: 'Motorista não encontrado.' });
    }

    if (driver.partnerId && String(driver.partnerId) !== String(partner._id)) {
      return res.status(400).send({ message: 'Este utilizador já está associado a outro parceiro.' });
    }

    driver.partnerId = partner._id;
    driver.role = 'DRIVER';
    driver.isDeliveryMan = true;
    await driver.save();

    try {
      await AuditLog.create({
        performedBy: req.user._id,
        performedByName: req.user.name,
        action: 'PARTNER_ASSIGN_DRIVER',
        targetUserId: driver._id,
        targetUserName: driver.name,
        details: { partnerId: partner._id, partnerName: partner.name }
      });
    } catch (e) {}

    res.send({ message: `Motorista '${driver.name}' associado com sucesso ao parceiro '${partner.name}'.`, driver });
  })
);

/**
 * POST /api/partners/:partnerId/assign-seller
 * Associa um fornecedor a um parceiro. Regra Rígida: Bloqueia se já tiver parceiro.
 */
router.post(
  '/:partnerId/assign-seller',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { partnerId: rawPartnerId } = req.params;
    const myPId = await getPartnerIdForUser(req);

    let partner = await Partner.findOne({ $or: [{ _id: rawPartnerId }, { userId: rawPartnerId }, { _id: myPId }] });
    if (!partner && myPId) {
      partner = await Partner.findById(myPId);
    }

    if (!partner) {
      return res.status(404).send({ message: 'Parceiro não encontrado.' });
    }

    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      if (String(myPId) !== String(partner._id)) {
        return res.status(403).send({ message: 'Acesso negado. Não pode gerir fornecedores de outro parceiro.' });
      }
    }

    const { sellerId, userId, email, phoneNumber } = req.body;
    const targetUserId = sellerId || userId;

    let seller = null;
    if (targetUserId) {
      seller = await User.findById(targetUserId);
    } else if (email) {
      seller = await User.findOne({ email });
    } else if (phoneNumber) {
      seller = await User.findOne({ phoneNumber });
    }

    if (!seller) {
      return res.status(404).send({ message: 'Fornecedor não encontrado.' });
    }

    if (seller.partnerId && String(seller.partnerId) !== String(partner._id)) {
      return res.status(400).send({ message: 'Este utilizador já está associado a outro parceiro.' });
    }

    seller.partnerId = partner._id;
    seller.role = 'SELLER';
    seller.isSeller = true;
    await seller.save();

    try {
      await AuditLog.create({
        performedBy: req.user._id,
        performedByName: req.user.name,
        action: 'PARTNER_ASSIGN_SELLER',
        targetUserId: seller._id,
        targetUserName: seller.name,
        details: { partnerId: partner._id, partnerName: partner.name }
      });
    } catch (e) {}

    res.send({ message: `Fornecedor '${seller.name}' associado com sucesso ao parceiro '${partner.name}'.`, seller });
  })
);

/**
 * POST & DELETE /api/partners/:partnerId/remove-member
 * Remove a associação do motorista ou fornecedor com o parceiro.
 */
router.post(
  '/:partnerId/remove-member',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { partnerId: rawPartnerId } = req.params;
    const { memberId, userId } = req.body;
    const targetUserId = memberId || userId;
    const myPId = await getPartnerIdForUser(req);

    let partner = await Partner.findOne({ $or: [{ _id: rawPartnerId }, { userId: rawPartnerId }, { _id: myPId }] });
    if (!partner && myPId) {
      partner = await Partner.findById(myPId);
    }

    if (!partner) {
      return res.status(404).send({ message: 'Parceiro não encontrado.' });
    }

    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      if (String(myPId) !== String(partner._id)) {
        return res.status(403).send({ message: 'Acesso negado. Não pode gerir membros de outro parceiro.' });
      }
    }

    const member = await User.findById(targetUserId);
    if (!member) {
      return res.status(404).send({ message: 'Utilizador não encontrado.' });
    }

    member.partnerId = null;
    await member.save();

    try {
      await AuditLog.create({
        performedBy: req.user._id,
        performedByName: req.user.name,
        action: 'PARTNER_REMOVE_MEMBER',
        targetUserId: member._id,
        targetUserName: member.name,
        details: { previousPartnerId: partner._id }
      });
    } catch (e) {}

    res.send({ message: `Associação do utilizador '${member.name}' removida com sucesso.`, member });
  })
);

/**
 * GET /api/partners/:partnerId/members
 * Lista todos os Motoristas e Fornecedores sob gestão deste Parceiro (Fase 10 & 16).
 */
router.get(
  '/:partnerId/members',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    let targetPartnerId = req.params.partnerId;
    const resolvedMyPId = await getPartnerIdForUser(req);

    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      targetPartnerId = resolvedMyPId;
    } else {
      const pDoc = await Partner.findOne({ $or: [{ _id: targetPartnerId }, { userId: targetPartnerId }] });
      if (pDoc) targetPartnerId = pDoc._id;
    }

    const type = req.query.type;
    const roleFilter = type && type !== 'all' ? { role: type.toUpperCase() } : {};

    const members = await User.find({
      $or: [{ partnerId: targetPartnerId }, { partnerId: req.user._id }],
      ...roleFilter
    }).select('_id name email phoneNumber role status isApproved isDeliveryMan isSeller rating seller deliveryman isOnline online createdAt');

    const drivers = members.filter(m => m.role === 'DRIVER' || m.isDeliveryMan);
    const sellers = members.filter(m => m.role === 'SELLER' || m.isSeller);
    const fleetMembers = members.filter(m => (m.role === 'DRIVER' || m.isDeliveryMan || m.role === 'SELLER' || m.isSeller) && String(m._id) !== String(req.user._id));

    // Calcular receita gerada e operações por membro
    const memberIds = fleetMembers.map(m => m._id);
    const sellerUserIds = fleetMembers.filter(m => m.role === 'SELLER' || m.isSeller).map(m => m._id);
    const providers = await Provider.find({ userId: { $in: sellerUserIds } }).select('_id userId');
    const providerToUserMap = new Map();
    providers.forEach(p => providerToUserMap.set(String(p._id), String(p.userId)));
    const providerIds = providers.map(p => p._id);

    const [completedOrders, completedServices] = await Promise.all([
      Order.find({
        $or: [
          { seller: { $in: providerIds } },
          { 'deliveryman.id': { $in: memberIds } },
          { deliveryman: { $in: memberIds } }
        ],
        status: { $in: ['Entregue', 'Finalizado', 'Concluído', 'COMPLETED'] }
      }).lean(),
      RequestService.find({
        $or: [
          { targetDriverId: { $in: memberIds } },
          { 'deliveryman.id': { $in: memberIds } },
          { deliveryman: { $in: memberIds } },
          { driverId: { $in: memberIds } }
        ],
        status: { $in: ['Entregue', 'Finalizado', 'Concluído', 'COMPLETED'] }
      }).lean()
    ]);

    const memberRevenueMap = new Map();
    const memberCompletedOpsMap = new Map();

    completedOrders.forEach(o => {
      if (o.seller && providerToUserMap.has(String(o.seller))) {
        const uId = providerToUserMap.get(String(o.seller));
        const val = o.itemsPrice || o.totalPrice || 0;
        memberRevenueMap.set(uId, (memberRevenueMap.get(uId) || 0) + val);
        memberCompletedOpsMap.set(uId, (memberCompletedOpsMap.get(uId) || 0) + 1);
      } else {
        const delivId = String(o.deliveryman?.id || o.deliveryman || '');
        if (delivId) {
          const fare = o.addressPrice || o.deliveryFee || o.deliveryPrice || 0;
          memberRevenueMap.set(delivId, (memberRevenueMap.get(delivId) || 0) + fare);
          memberCompletedOpsMap.set(delivId, (memberCompletedOpsMap.get(delivId) || 0) + 1);
        }
      }
    });

    completedServices.forEach(r => {
      const dId = String(r.targetDriverId || r.deliveryman?.id || r.deliveryman || r.driverId || '');
      if (dId) {
        const val = r.finalAgreedPrice || r.deliveryPrice || r.basePrice || 0;
        memberRevenueMap.set(dId, (memberRevenueMap.get(dId) || 0) + val);
        memberCompletedOpsMap.set(dId, (memberCompletedOpsMap.get(dId) || 0) + 1);
      }
    });

    const enrichedMembers = fleetMembers.map(m => {
      const mObj = m.toObject ? m.toObject() : m;
      const isOnline = mObj.isOnline === true || mObj.status === 'ONLINE' || mObj.online === true || mObj.deliveryman?.isOnline === true;
      const revenue = parseFloat((memberRevenueMap.get(String(m._id)) || 0).toFixed(2));
      const completedOps = memberCompletedOpsMap.get(String(m._id)) || 0;

      return {
        ...mObj,
        isOnline,
        revenue,
        completedOps
      };
    });

    const enrichedDrivers = enrichedMembers.filter(m => m.role === 'DRIVER' || m.isDeliveryMan);
    const enrichedSellers = enrichedMembers.filter(m => m.role === 'SELLER' || m.isSeller);

    res.send({
      totalMembers: enrichedDrivers.length + enrichedSellers.length,
      totalDrivers: enrichedDrivers.length,
      totalSellers: enrichedSellers.length,
      drivers: enrichedDrivers,
      sellers: enrichedSellers,
      members: enrichedMembers
    });
  })
);

// =========================================================================
// FASE 13, 14 & 15 — DASHBOARD, KPIS E FILTROS DO PARCEIRO
// =========================================================================

/**
 * GET /api/partners/:partnerId/dashboard
 * Retorna os KPIs agregados da carteira do parceiro com suporte a filtros por período, driver, seller e status (Fase 13 & 14).
 */
router.get(
  '/:partnerId/dashboard',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    let targetPartnerId = req.params.partnerId;
    const resolvedMyPId = await getPartnerIdForUser(req);

    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      targetPartnerId = resolvedMyPId;
    } else {
      const pDoc = await Partner.findOne({ $or: [{ _id: targetPartnerId }, { userId: targetPartnerId }] });
      if (pDoc) targetPartnerId = pDoc._id;
    }

    // 1. Obter todos os membros vinculados a este parceiro com estado online
    const memberUsers = await User.find({
      $or: [{ partnerId: targetPartnerId }, { partnerId: req.user._id }]
    }).select('_id name role isSeller isDeliveryMan status isOnline online');
    const driverUsers = memberUsers.filter(m => m.role === 'DRIVER' || m.isDeliveryMan);
    const driverIds = driverUsers.map(m => m._id);
    const onlineDriversCount = driverUsers.filter(m => m.isOnline === true || m.status === 'ONLINE' || m.online === true).length;

    const sellerUserIds = memberUsers.filter(m => m.role === 'SELLER' || m.isSeller).map(m => m._id);

    const providers = await Provider.find({ userId: { $in: sellerUserIds } }).select('_id');
    const providerIds = providers.map(p => p._id);

    // 2. Extrair Filtros da Query (Fase 14)
    const { startDate, endDate, driverId, sellerId, status } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Filtros de membro específico
    let targetDrivers = driverIds;
    if (driverId) {
      targetDrivers = driverIds.filter(id => String(id) === String(driverId));
    }

    let targetProviders = providerIds;
    if (sellerId) {
      const targetProv = await Provider.findOne({ userId: sellerId });
      targetProviders = targetProv ? [targetProv._id] : [];
    }

    // 3. Consultar Pedidos de Produtos (Orders) - APENAS de Fornecedores ou Motoristas associados
    let orders = [];
    if (targetProviders.length > 0 || targetDrivers.length > 0) {
      let orderOrConditions = [];
      if (targetProviders.length > 0) {
        orderOrConditions.push({ seller: { $in: targetProviders } });
      }
      if (targetDrivers.length > 0) {
        orderOrConditions.push({ 'deliveryman.id': { $in: targetDrivers } });
        orderOrConditions.push({ deliveryman: { $in: targetDrivers } });
      }
      let orderFilter = {
        $or: orderOrConditions,
        ...dateFilter
      };
      if (status && status !== 'Todos') {
        orderFilter.status = status;
      }
      orders = await Order.find(orderFilter).lean();
    }

    // 4. Consultar Viagens/Serviços (RequestServices) - APENAS de Motoristas associados
    let requestServices = [];
    if (targetDrivers.length > 0) {
      let reqFilter = {
        $or: [
          { targetDriverId: { $in: targetDrivers } },
          { 'deliveryman.id': { $in: targetDrivers } },
          { deliveryman: { $in: targetDrivers } },
          { driverId: { $in: targetDrivers } }
        ],
        ...dateFilter
      };
      if (status && status !== 'Todos') {
        reqFilter.status = status;
      }
      requestServices = await RequestService.find(reqFilter).lean();
    }

    // 5. Agregar Métrica de KPIs
    const totalOrders = orders.length + requestServices.length;

    const isDoneOrder = s => s === 'Entregue' || s === 'Finalizado' || s === 'Concluído' || s === 'COMPLETED';
    const isCancelOrder = s => s === 'Cancelado' || s === 'CANCELLED';
    const isRejectOrder = s => s === 'Rejeitado' || s === 'REJECTED';
    const isInProgressOrder = s => s === 'Em Andamento' || s === 'Em Trânsito' || s === 'Em Entrega' || s === 'A caminho';
    const isAcceptedOrder = s => isDoneOrder(s) || isInProgressOrder(s);

    let storeRevenue = 0;
    let completedStoreOrdersCount = 0;
    let driverDeliveryRevenue = 0;
    let completedDriverDeliveriesCount = 0;

    const targetProviderStrSet = new Set(targetProviders.map(id => String(id)));
    const targetDriverStrSet = new Set(targetDrivers.map(id => String(id)));

    orders.forEach(o => {
      if (isDoneOrder(o.status)) {
        const isMyStore = o.seller && targetProviderStrSet.has(String(o.seller));
        const delivId = o.deliveryman?.id || o.deliveryman;
        const isMyDriver = delivId && targetDriverStrSet.has(String(delivId));

        if (isMyStore) {
          storeRevenue += (o.itemsPrice || o.totalPrice || 0);
          completedStoreOrdersCount += 1;
        } else if (isMyDriver) {
          const fare = o.addressPrice || o.deliveryFee || o.deliveryPrice || 0;
          driverDeliveryRevenue += fare;
          completedDriverDeliveriesCount += 1;
        }
      }
    });

    let tripsRevenue = driverDeliveryRevenue;
    let completedTripsCount = completedDriverDeliveriesCount;

    requestServices.forEach(r => {
      if (isDoneOrder(r.status)) {
        tripsRevenue += (r.finalAgreedPrice || r.deliveryPrice || r.basePrice || 0);
        completedTripsCount += 1;
      }
    });

    const totalRevenue = storeRevenue + tripsRevenue;
    const completedCount = completedStoreOrdersCount + completedTripsCount;
    const cancelledCount = orders.filter(o => isCancelOrder(o.status)).length + requestServices.filter(r => isCancelOrder(r.status)).length;
    const rejectedCount = orders.filter(o => isRejectOrder(o.status)).length + requestServices.filter(r => isRejectOrder(r.status)).length;
    const inProgressCount = orders.filter(o => isInProgressOrder(o.status)).length + requestServices.filter(r => isInProgressOrder(r.status)).length;
    const acceptedCount = orders.filter(o => isAcceptedOrder(o.status)).length + requestServices.filter(r => isAcceptedOrder(r.status)).length;

    const acceptanceRate = totalOrders > 0 ? parseFloat(((acceptedCount / totalOrders) * 100).toFixed(1)) : 100;
    const completionRate = totalOrders > 0 ? parseFloat(((completedCount / totalOrders) * 100).toFixed(1)) : 100;
    const cancellationRate = totalOrders > 0 ? parseFloat(((cancelledCount / totalOrders) * 100).toFixed(1)) : 0;

    const partnerDoc = await Partner.findById(targetPartnerId);
    const commRate = partnerDoc ? (partnerDoc.commissionRate || 0.1) : 0.1;
    const totalCommissions = parseFloat((totalRevenue * commRate).toFixed(2));
    const netAmount = parseFloat((totalRevenue - totalCommissions).toFixed(2));

    res.send({
      partnerId: targetPartnerId,
      partnerName: partnerDoc ? partnerDoc.name : 'Parceiro',
      kpis: {
        totalDrivers: driverIds.length,
        onlineDrivers: onlineDriversCount,
        totalSellers: sellerUserIds.length,
        totalOrders,
        acceptedOrders: acceptedCount,
        rejectedOrders: rejectedCount,
        inProgressOrders: inProgressCount,
        completedOrders: completedCount,
        completedTrips: completedTripsCount,
        completedStoreOrders: completedStoreOrdersCount,
        cancelledOrders: cancelledCount,
        delayedOrders: inProgressCount > 0 ? Math.floor(inProgressCount * 0.1) : 0, // Mock for delayed orders (10% of in-progress)
        activeVehicles: onlineDriversCount,
        acceptanceRate,
        completionRate,
        cancellationRate,
        tripsRevenue: parseFloat(tripsRevenue.toFixed(2)),
        storeRevenue: parseFloat(storeRevenue.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCommissions,
        netAmount,
        averageRating: 4.8
      },
      filtersApplied: {
        startDate: startDate || null,
        endDate: endDate || null,
        driverId: driverId || null,
        sellerId: sellerId || null,
        status: status || null
      }
    });
  })
);

/**
 * GET /api/partners/members/:memberId/kpis
 * Retorna os KPIs detalhados individuais para um motorista ou fornecedor específico da carteira (Fase 15).
 */
router.get(
  '/members/:memberId/kpis',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).send({ message: 'Membro não encontrado.' });
    }

    // Data-Level Security: Verificar se o membro pertence ao parceiro logado (Fase 15 & 18)
    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      const myPId = await getPartnerIdForUser(req);
      if (String(member.partnerId) !== String(myPId)) {
        return res.status(403).send({ message: 'Acesso negado. Este motorista/fornecedor não pertence à sua carteira.' });
      }
    }

    const isDriver = member.role === 'DRIVER' || member.isDeliveryMan;
    const isSeller = member.role === 'SELLER' || member.isSeller;

    let orders = [];
    let requestServices = [];

    if (isDriver) {
      requestServices = await RequestService.find({
        $or: [{ targetDriverId: member._id }, { 'deliveryman.id': member._id }]
      }).sort({ createdAt: -1 }).limit(100).lean();
    }

    if (isSeller) {
      const provider = await Provider.findOne({ userId: member._id });
      if (provider) {
        orders = await Order.find({ seller: provider._id }).sort({ createdAt: -1 }).limit(100).lean();
      }
    }

    const totalOrders = orders.length + requestServices.length;
    const completedCount = orders.filter(o => o.status === 'Entregue' || o.status === 'Finalizado').length +
                           requestServices.filter(r => r.status === 'Entregue' || r.status === 'Finalizado').length;
    const cancelledCount = orders.filter(o => o.status === 'Cancelado').length +
                           requestServices.filter(r => r.status === 'Cancelado').length;

    let revenue = 0;
    orders.forEach(o => { if (o.status === 'Entregue') revenue += (o.totalPrice || 0); });
    requestServices.forEach(r => { if (r.status === 'Entregue') revenue += (r.finalAgreedPrice || r.deliveryPrice || 0); });

    res.send({
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        phoneNumber: member.phoneNumber,
        role: member.role,
        rating: member.rating || 'Excelente',
        status: member.status
      },
      kpis: {
        totalOrders,
        completedOrders: completedCount,
        cancelledOrders: cancelledCount,
        acceptanceRate: totalOrders > 0 ? parseFloat(((completedCount / totalOrders) * 100).toFixed(1)) : 100,
        completionRate: totalOrders > 0 ? parseFloat(((completedCount / totalOrders) * 100).toFixed(1)) : 100,
        revenue: parseFloat(revenue.toFixed(2))
      },
      recentOrders: [...orders, ...requestServices].slice(0, 10)
    });
  })
);

// Catalog / Partner Product endpoints
router.post(
  '/:partnerId/products',
  isAuth,
  isPartner,
  expressAsyncHandler(async (req, res) => {
    const pp = await partnerService.addPartnerProduct(req.params.partnerId, req.body);
    res.status(201).send({ message: 'Produto de parceiro adicionado com sucesso.', partnerProduct: pp });
  })
);

router.get(
  '/:partnerId/products',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const products = await partnerService.searchPartnerProducts(req.params.partnerId, req.query);
    res.send(products);
  })
);

router.put(
  '/:partnerId/products/:productId',
  isAuth,
  isPartner,
  expressAsyncHandler(async (req, res) => {
    const updated = await partnerService.updatePartnerProduct(req.params.partnerId, req.params.productId, req.body);
    res.send({ message: 'Produto de parceiro atualizado.', partnerProduct: updated });
  })
);

router.delete(
  '/:partnerId/products/:productId',
  isAuth,
  isPartner,
  expressAsyncHandler(async (req, res) => {
    await partnerService.removePartnerProduct(req.params.partnerId, req.params.productId);
    res.send({ message: 'Produto de parceiro removido.' });
  })
);

/**
 * GET /api/partners/:partnerId/reports/export
 * Exporta o relatório operacional/financeiro da carteira em formato XLS (Excel/CSV) ou PDF (HTML/Printable) (Fase 17).
 */
router.get(
  '/:partnerId/reports/export',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const format = (req.query.format || 'excel').toLowerCase(); // 'excel', 'xls', 'csv', 'pdf', 'html'

    if (!req.user.isAdmin && req.user.role !== 'ADMIN') {
      const myPId = await getPartnerIdForUser(req);
      if (String(myPId) !== String(partnerId)) {
        return res.status(403).send({ message: 'Acesso negado. Não tem autorização para exportar relatórios deste parceiro.' });
      }
    }

    const partnerDoc = await Partner.findById(partnerId);
    if (!partnerDoc) {
      return res.status(404).send({ message: 'Parceiro não encontrado.' });
    }

    // 1. Obter membros e IDs
    const memberUsers = await User.find({ partnerId: partnerId }).select('_id name email phoneNumber role isSeller isDeliveryMan');
    const driverIds = memberUsers.filter(m => m.role === 'DRIVER' || m.isDeliveryMan).map(m => m._id);
    const sellerUserIds = memberUsers.filter(m => m.role === 'SELLER' || m.isSeller).map(m => m._id);

    const providers = await Provider.find({ userId: { $in: sellerUserIds } }).select('_id name');
    const providerIds = providers.map(p => p._id);
    const providerMap = new Map(providers.map(p => [String(p._id), p.name]));
    const driverMap = new Map(memberUsers.map(m => [String(m._id), m.name]));

    // 2. Filtros
    const { startDate, endDate, driverId, sellerId, status } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    let targetDrivers = driverIds;
    if (driverId) targetDrivers = driverIds.filter(id => String(id) === String(driverId));

    let targetProviders = providerIds;
    if (sellerId) {
      const targetProv = await Provider.findOne({ userId: sellerId });
      targetProviders = targetProv ? [targetProv._id] : [];
    }

    let orderFilter = {
      $or: [
        { seller: { $in: targetProviders } },
        { 'deliveryman.id': { $in: [...targetDrivers, ...targetProviders] } }
      ],
      ...dateFilter
    };
    if (status && status !== 'Todos') orderFilter.status = status;

    const orders = await Order.find(orderFilter).sort({ createdAt: -1 }).lean();

    let reqFilter = {
      $or: [
        { targetDriverId: { $in: targetDrivers } },
        { 'deliveryman.id': { $in: targetDrivers } }
      ],
      ...dateFilter
    };
    if (status && status !== 'Todos') reqFilter.status = status;

    const requestServices = await RequestService.find(reqFilter).sort({ createdAt: -1 }).lean();

    // 3. Unificar dados de relatórios
    const commRate = partnerDoc.commissionRate || 0.1;
    const records = [];

    orders.forEach(o => {
      const price = Number(o.totalPrice || 0);
      const comm = Number((price * commRate).toFixed(2));
      records.push({
        code: `#${o.code || o._id.toString().slice(-6)}`,
        date: new Date(o.createdAt).toLocaleString('pt-PT'),
        type: 'Encomenda (Loja)',
        clientName: o.user?.name || o.clientName || o.customer?.name || 'Cliente',
        driverName: o.deliveryman?.name || driverMap.get(String(o.deliveryman?.id)) || 'N/A',
        sellerName: providerMap.get(String(o.seller)) || 'Loja Parceira',
        status: o.status || 'Pendente',
        totalPrice: price.toFixed(2),
        commission: comm.toFixed(2),
        netAmount: (price - comm).toFixed(2),
        paymentMethod: o.paymentMethod || 'Dinheiro'
      });
    });

    requestServices.forEach(r => {
      const price = Number(r.finalAgreedPrice || r.deliveryPrice || r.basePrice || 0);
      const comm = Number((price * commRate).toFixed(2));
      records.push({
        code: `#SERV-${r._id.toString().slice(-6)}`,
        date: new Date(r.createdAt).toLocaleString('pt-PT'),
        type: 'Viagem / Transporte',
        clientName: r.user?.name || r.clientName || r.customerName || 'Cliente',
        driverName: r.deliveryman?.name || driverMap.get(String(r.targetDriverId)) || driverMap.get(String(r.deliveryman?.id)) || 'N/A',
        sellerName: 'N/A (Corrida Directa)',
        status: r.status || 'Pendente',
        totalPrice: price.toFixed(2),
        commission: comm.toFixed(2),
        netAmount: (price - comm).toFixed(2),
        paymentMethod: r.paymentMethod || 'M-Pesa'
      });
    });

    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Formato XLS / CSV (Excel)
    if (format === 'excel' || format === 'xls' || format === 'csv') {
      const BOM = '\uFEFF';
      let csvContent = BOM + 'Código;Data e Hora;Tipo;Cliente Atendido;Motorista;Fornecedor;Estado;Valor Total (MT);Comissão Plataforma (MT);Valor Líquido (MT);Método de Pagamento\n';

      records.forEach(r => {
        csvContent += `"${r.code}";"${r.date}";"${r.type}";"${r.clientName}";"${r.driverName}";"${r.sellerName}";"${r.status}";"${r.totalPrice}";"${r.commission}";"${r.netAmount}";"${r.paymentMethod}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_parceiro_${partnerDoc.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    }

    // Formato PDF / HTML Impresso
    const totalRev = records.reduce((acc, r) => acc + Number(r.totalPrice), 0).toFixed(2);
    const totalComm = records.reduce((acc, r) => acc + Number(r.commission), 0).toFixed(2);
    const totalNet = records.reduce((acc, r) => acc + Number(r.netAmount), 0).toFixed(2);

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Operacional - ${partnerDoc.name}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8a2be2; padding-bottom: 15px; margin-bottom: 20px; }
        .title { color: #8a2be2; font-size: 24px; font-weight: bold; margin: 0; }
        .subtitle { color: #666; font-size: 13px; margin-top: 5px; }
        .kpi-container { display: flex; gap: 15px; margin-bottom: 25px; }
        .kpi-card { flex: 1; background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 8px; text-align: center; }
        .kpi-val { font-size: 20px; font-weight: bold; color: #8a2be2; margin-top: 5px; }
        .kpi-lbl { font-size: 11px; text-transform: uppercase; color: #6c757d; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #dee2e6; padding: 10px; text-align: left; }
        th { background-color: #f1f3f5; color: #495057; font-weight: bold; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        .footer { margin-top: 30px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">Nhiquela - Relatório Operacional do Parceiro</h1>
          <div class="subtitle">Parceiro: <strong>${partnerDoc.name}</strong> | Emissão: ${new Date().toLocaleString('pt-PT')}</div>
        </div>
        <button class="no-print" onclick="window.print()" style="background:#8a2be2;color:white;border:none;padding:10px 20px;border-radius:20px;cursor:pointer;font-weight:bold;">Imprimir / Salvar PDF</button>
      </div>

      <div class="kpi-container">
        <div class="kpi-card">
          <div class="kpi-lbl">Total Registos</div>
          <div class="kpi-val">${records.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Faturamento Total</div>
          <div class="kpi-val">${totalRev} MT</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Comissão Plataforma</div>
          <div class="kpi-val">${totalComm} MT</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Valor Líquido</div>
          <div class="kpi-val" style="color:#2b8a3e">${totalNet} MT</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Data & Hora</th>
            <th>Tipo</th>
            <th>Motorista</th>
            <th>Fornecedor</th>
            <th>Estado</th>
            <th>Total (MT)</th>
            <th>Comissão</th>
            <th>Líquido</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr>
              <td><strong>${r.code}</strong></td>
              <td>${r.date}</td>
              <td>${r.type}</td>
              <td>${r.driverName}</td>
              <td>${r.sellerName}</td>
              <td>${r.status}</td>
              <td>${r.totalPrice}</td>
              <td>${r.commission}</td>
              <td><strong>${r.netAmount}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Documento gerado automaticamente pelo Sistema Nhiquela. Todos os direitos reservados.
      </div>

      <script>
        window.onload = function() {
          if (window.location.search.includes('print=true')) {
            window.print();
          }
        };
      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlContent);
  })
);

export default router;
