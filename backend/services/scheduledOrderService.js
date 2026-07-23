/**
 * scheduledOrderService.js
 *
 * Servico que corre periodicamente em background (a cada minuto) para:
 * 1. Encontrar pedidos agendados cujo horario esta a 45 minutos de distância
 * 2. Enviar notificacao push ao motorista que aceitou (ou a todos se ainda não foi aceite)
 * 3. Aos 0 minutos, iniciar o dispatch normal se ainda não tiver motorista atribuido
 */

import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import createNotification from '../utils/createNotification.js';

let io = null;

/**
 * Inicializar o servico com a instancia do Socket.IO
 */
export function initScheduledOrderService(socketIo) {
  io = socketIo;
  console.log('[ScheduledOrderService] Servico de agendamentos iniciado.');
  setInterval(runScheduledCheck, 60 * 1000);
  runScheduledCheck();
}

async function runScheduledCheck() {
  try {
    const now = new Date();
    const in44min = new Date(now.getTime() + 44 * 60 * 1000);
    const in46min = new Date(now.getTime() + 46 * 60 * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // ===== 1. NOTIFICACAO DE 45 MINUTOS =====
    const pendingNotification = await RequestService.find({
      isScheduled: true,
      scheduledNotified: false,
      scheduledAt: { $gte: in44min, $lte: in46min },
      isAccepted: false,
      isCanceled: false,
      deleted: false,
    });

    for (const order of pendingNotification) {
      const scheduledDateStr = new Date(order.scheduledAt).toLocaleString('pt-PT', {
        timeZone: 'Africa/Maputo',
        dateStyle: 'short',
        timeStyle: 'short'
      });

      if (order.deliveryman && order.deliveryman.id) {
        const driver = await User.findById(order.deliveryman.id).select('pushToken _id');
        if (driver && driver.deviceToken) {
          await createNotification({
            message: 'Lembrete! Tem um servico agendado para daqui a 45 minutos (' + scheduledDateStr + '). Local: ' + order.origin + '.',
            receiver_id: driver._id,
            pushToken: driver.deviceToken
          });
        }
        if (io) {
          io.to('driver_' + order.deliveryman.id).emit('scheduled_reminder', { order, minutesLeft: 45 });
        }
      } else {
        const availableDrivers = await User.find({
          role: 'deliveryman',
          'deliveryman.status': { $in: ['Disponivel'] },
          pushToken: { $exists: true, $ne: null }
        }).select('_id pushToken');

        for (const driver of availableDrivers) {
          await createNotification({
            message: 'Servico agendado para daqui a 45 min (' + scheduledDateStr + ')! Origem: ' + order.origin + '. Aceite agora.',
            receiver_id: driver._id,
            pushToken: driver.deviceToken
          });
          if (io) {
            io.to('driver_' + driver._id).emit('scheduled_reminder', { order, minutesLeft: 45 });
          }
        }
      }

      order.scheduledNotified = true;
      await order.save();
      console.log('[ScheduledOrderService] Notificacao de 45min enviada para pedido ' + order.code);
    }

    // ===== 2. DESPACHO AUTOMATICO (quando a hora chegou) =====
    const readyToDispatch = await RequestService.find({
      isScheduled: true,
      isAccepted: false,
      isCanceled: false,
      deleted: false,
      isSearching: false,
      scheduledAt: { $lte: now, $gte: fiveMinAgo },
    });

    for (const order of readyToDispatch) {
      console.log('[ScheduledOrderService] A iniciar despacho do pedido agendado ' + order.code + '...');
      order.isSearching = true;
      order.lastDispatchTime = now;
      await order.save();
      if (io) {
        import('./dispatchService.js').then((module) => {
          const DispatchService = module.default;
          DispatchService.startDispatch(order, io);
        }).catch(err => console.error('[ScheduledOrderService] Erro ao carregar DispatchService:', err));
      }
    }
  } catch (err) {
    console.error('[ScheduledOrderService] Erro durante verificacao:', err);
  }
}

export default { initScheduledOrderService };
