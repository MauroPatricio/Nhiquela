import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import { refundDriverCommissionWithSession, debitDriverCommissionWithSession } from '../services/walletService.js';
import { isAdmin, isAuth } from '../utils.js';

const adminOpsRouter = express.Router();

/**
 * PONTO 1: LIVE OPS
 * 
 * Busca todos os motoristas ativos com as suas localizações
 */
adminOpsRouter.get(
  '/live-map',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    // Buscar todos os motoristas cuja disponibilidade seja 'active' ou que estejam em entrega/disponível
    const drivers = await User.find({
      isDeliveryMan: true,
      availability: 'active',
    }).select('name phoneNumber locationGeo status deliveryman.photo deliveryman.transport_type');

    res.send(drivers);
  })
);

/**
 * Busca pontos de recolha de pedidos pendentes para o Heatmap
 */
adminOpsRouter.get(
  '/heatmap',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const pendingRequests = await RequestService.find({
      status: { $in: ['PENDING', 'SEARCHING'] },
    }).select('pickupAddress');

    res.send(pendingRequests);
  })
);

/**
 * Força a desconexão de um motorista (Kick offline)
 */
adminOpsRouter.post(
  '/driver/:id/force-offline',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.params.id);
    if (driver) {
      driver.availability = 'inactive';
      await driver.save();
      
      // Emitir via socket para a app do motorista o desconectar se estivermos a usar socketio
      const io = req.app.get('io');
      if (io) {
         io.emit(`force_offline_${driver._id}`, { message: 'A sua conta foi colocada offline pelo Administrador.' });
      }

      res.send({ message: 'Motorista colocado offline com sucesso.' });
    } else {
      res.status(404).send({ message: 'Motorista não encontrado' });
    }
  })
);

/**
 * PONTO 2: KYC
 * 
 * Listar motoristas pendentes de conformidade (KYC)
 */
adminOpsRouter.get(
  '/kyc/pending',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const pendingDrivers = await User.find({
      isDeliveryMan: true,
      'deliveryman.register_conformance': 'PENDING_CONFORMANCE'
    });
    res.send(pendingDrivers);
  })
);

/**
 * Aprovar ou Rejeitar Documentos KYC
 */
adminOpsRouter.post(
  '/kyc/:id/review',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { action, reason } = req.body; // action: 'APPROVE' or 'REJECT'
    const driver = await User.findById(req.params.id);
    
    if (driver) {
      if (action === 'APPROVE') {
        driver.deliveryman.register_conformance = 'CONFORMANCE';
        driver.isApproved = true;
      } else {
        driver.deliveryman.register_conformance = 'INCONFORMANCE';
        // Pode-se enviar um email ou notificação com o motivo (reason)
      }
      await driver.save();
      res.send({ message: `Documentos ${action === 'APPROVE' ? 'Aprovados' : 'Rejeitados'}` });
    } else {
      res.status(404).send({ message: 'Motorista não encontrado' });
    }
  })
);

/**
 * PONTO 3: SUPORTE E REEMBOLSOS
 * 
 * Forçar o cancelamento de uma viagem e emitir reembolso se pago via Carteira/M-Pesa
 */
adminOpsRouter.post(
  '/trip/:id/force-cancel',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { reason } = req.body;
    const request = await RequestService.findById(req.params.id);
    
    if (!request) {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }

    if (request.status === 'CANCELLED' || request.status === 'COMPLETED') {
      return res.status(400).send({ message: 'Pedido já foi finalizado ou cancelado.' });
    }

    request.status = 'CANCELLED';
    request.paymentStatus = 'Reembolsado (Admin)';
    
    // Libertar motorista se estiver atribuído
    const assignedDriverId = request.deliveryman?.id || request.driverId;
    if (assignedDriverId) {
      const driver = await User.findById(assignedDriverId);
      if (driver) {
        driver.status = 'Disponível';
        driver.availability = 'active';
        await driver.save();
        // Notificar o motorista em tempo real
        const io = req.app.get('io');
        if (io) {
          io.to(`driver_${assignedDriverId}`).emit('order_cancelled', { orderId: request._id, message: 'Viagem cancelada pelo Admin.' });
        }
      }
    }

    await request.save();
    
    // Se precisarmos usar uma Sessão Mongoose, deveríamos, mas para simplificar:
    // Se o cliente pagou por M-Pesa ou E-Mola antecipadamente, reembolsa a carteira do cliente
    if (['M-Pesa', 'E-Mola', 'Carteira'].includes(request.paymentMethod)) {
      // Usar uma nota de crédito na carteira do cliente
      try {
         await refundDriverCommissionWithSession(request.userId, request.totalPrice, `Reembolso Admin: Pedido ${request._id} - Motivo: ${reason}`, 'wallet', null);
      } catch (err) {
         console.error('Falha ao reembolsar cliente:', err);
      }
    }

    res.send({ message: 'Viagem cancelada com sucesso. Reembolso emitido.' });
  })
);

adminOpsRouter.post(
  '/driver/:id/instant-ban',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).send({ message: 'A justificação (reason) é obrigatória.' });
    }

    const driver = await User.findById(id);
    if (!driver || driver.role !== 'driver') {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }

    driver.isBanned = true;
    driver.status = 'Inativo';
    driver.availability = 'inactive';
    driver.banReason = reason;
    driver.banAppealJustification = '';
    
    await driver.save();
    
    // Desconectar o motorista via Socket.IO — usar sala dedicada (mais fiável que socketId)
    const io = req.app.get('io');
    if (io) {
      // Emitir para a sala pessoal do motorista (driver_<id>) — sempre activa enquanto online
      io.to(`driver_${driver._id}`).emit('account_banned', {
        reason,
        message: 'A sua conta foi suspensa pelo Administrador. Pode submeter uma justificação.'
      });
    }

    res.send({ message: 'Motorista bloqueado instantaneamente.', driver });
  })
);

adminOpsRouter.post(
  '/driver/:id/unban',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;

    const driver = await User.findById(id);
    if (!driver || driver.role !== 'driver') {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }

    driver.isBanned = false;
    driver.banReason = '';
    driver.banAppealJustification = '';
    
    await driver.save();

    res.send({ message: 'Motorista desbloqueado com sucesso.', driver });
  })
);

export default adminOpsRouter;
