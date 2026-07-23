import cron from 'node-cron';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import createNotification from '../utils/createNotification.js';

/**
 * Retorna os minutos de antecedência ideais para começar a procurar o motorista,
 * dependendo do tipo de serviço.
 */
const getSearchWindowMinutes = (goodType) => {
  const type = goodType ? goodType.toLowerCase() : '';
  
  if (type.includes('mudança') || type.includes('mudanca')) return 12 * 60; // 12 horas
  if (type.includes('camião') || type.includes('camiao')) return 24 * 60; // 24 horas
  if (type.includes('gás') || type.includes('gas')) return 25; // 25 minutos
  if (type.includes('mototáxi') || type.includes('mototaxi')) return 10; // 10 minutos
  
  // Deliver e Padrão
  return 45; // 45 minutos
};

export const startSchedulingEngine = (io, users) => {
  console.log('🤖 Scheduling Engine Started');

  // Corre a cada 1 minuto
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // 1. Encontrar todos os pedidos AGENDADOS que ainda não têm `searchWindowStart`
      const uncalculatedSchedules = await RequestService.find({
        isScheduled: true,
        status: 'SCHEDULED',
        searchWindowStart: null,
        scheduledAt: { $ne: null }
      });

      for (const req of uncalculatedSchedules) {
        const minutesBefore = getSearchWindowMinutes(req.goodType);
        const windowStart = new Date(req.scheduledAt.getTime() - minutesBefore * 60000);
        
        req.searchWindowStart = windowStart;
        await req.save();
        console.log(`⏱️ Window calculada para pedido ${req._id}: Inicia a procura às ${windowStart.toISOString()}`);
      }

      // 2. Encontrar pedidos onde `searchWindowStart` já foi atingido, mas ainda estão 'SCHEDULED'
      const readyToSearchSchedules = await RequestService.find({
        isScheduled: true,
        status: 'SCHEDULED',
        searchWindowStart: { $lte: now },
        scheduledAt: { $gt: now }
      });

      for (const req of readyToSearchSchedules) {
        console.log(`🔎 Iniciando procura ativa para o pedido agendado ${req._id}`);
        req.status = 'SEARCHING';
        req.isSearching = true;
        req.lastDispatchTime = now;
        await req.save();

        if (io) {
          // Precisamos encontrar os utilizadores da aplicação para notificar
          // O socket instance geralmente tem acesso a io.sockets.emit, mas é melhor emitir para a sala/driver específico
          // Atualmente o 'createRequest' envia um emit 'newServiceRequest' em broadcast
          io.emit('newServiceRequest', req);
          io.emit('updateRequestState', req);
        }
      }

    } catch (error) {
      console.error('Erro no Scheduling Engine:', error);
    }
  });
};
