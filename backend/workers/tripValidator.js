import cron from 'node-cron';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import createNotification from '../utils/createNotification.js';

export const startTripValidator = (io, users) => {
  console.log('🛡️ Trip Validator Started');

  // Corre a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      // Validação a -30 minutos da viagem: Verifica se o motorista está online
      const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60000);
      const fortyMinsFromNow = new Date(now.getTime() + 40 * 60000);

      const confirmedSchedules = await RequestService.find({
        isScheduled: true,
        status: 'CONFIRMED',
        scheduledAt: { $gt: now, $lt: fortyMinsFromNow }
      }).populate('targetDriverId');

      for (const req of confirmedSchedules) {
        let isDriverValid = true;

        if (req.targetDriverId) {
          const driver = await User.findById(req.targetDriverId);
          // Verificar se motorista existe, está online e a sua carteira
          // Como não temos um lastGpsUpdate direto no UserModel, usamos online status
          if (!driver || !driver.isOnline) {
            isDriverValid = false;
          }
        } else {
          isDriverValid = false;
        }

        if (!isDriverValid) {
          console.log(`⚠️ Motorista inválido para o pedido agendado ${req._id} a 30 mins da viagem. Iniciando Plano B!`);
          
          // PLANO B:
          // Voltar ao status SEARCHING
          req.status = 'SEARCHING';
          req.isSearching = true;
          req.targetDriverId = null; 
          req.priorityLevel = 'alta';
          req.searchRadius = (req.searchRadius || 3000) * 2; // Dobra o raio (sem limite máximo, conforme utilizador)
          
          await req.save();

          // Retirar trip do calendário do motorista anterior, se existir
          if (req.targetDriverId) {
             await User.findByIdAndUpdate(req.targetDriverId, {
               $pull: { upcomingScheduledTrips: { tripId: req._id } }
             });
             
             // Notificar o motorista que perdeu a viagem
             createNotification({
                user: req.targetDriverId,
                title: 'Viagem Agendada Cancelada',
                body: 'A sua viagem agendada foi reatribuída porque o seu estado era offline ou inválido nos 30 minutos anteriores à viagem.',
                type: 'SYSTEM'
             });
          }

          // Notificar o App do cliente via Socket que estamos a procurar um substituto
          if (io) {
            io.emit('newServiceRequest', req); // Broadcast para motoristas com alta prioridade
            io.emit('updateRequestState', req);
          }
        }
      }

    } catch (error) {
      console.error('Erro no Trip Validator:', error);
    }
  });
};
