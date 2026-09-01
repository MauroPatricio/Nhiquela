import cron from 'node-cron';
import Wallet from '../models/WalletModel.js';
import User from '../models/UserModel.js';

/**
 * Inicia o Cron Job do Fraud Engine
 * Este serviço roda uma vez por dia à meia-noite (00:00).
 * Ele verifica as carteiras de motoristas com saldo negativo inferior a -500 MT
 * e cuja data "negativeSince" tenha mais de 3 dias.
 */
export const startFraudEngine = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('🛡️ [Fraud Engine] A verificar carteiras de motoristas com dívidas prolongadas...');
    
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Buscar as carteiras devedoras
      const badWallets = await Wallet.find({
        ownerType: 'driver',
        balance: { $lte: -500 }, // Dívida maior ou igual a 500 MT (-500 ou inferior)
        negativeSince: { $lte: threeDaysAgo } // Negativo há 3 dias ou mais
      });

      if (badWallets.length === 0) {
        console.log('🛡️ [Fraud Engine] Nenhuma conta a suspender hoje.');
        return;
      }

      console.log(`🛡️ [Fraud Engine] Encontradas ${badWallets.length} contas em incumprimento. A suspender...`);

      for (const wallet of badWallets) {
        const driverId = wallet.ownerId || wallet.userId;
        const driver = await User.findById(driverId);
        
        if (driver && !driver.isBanned) {
          driver.isBanned = true;
          driver.status = 'Inativo';
          driver.availability = 'inactive';
          await driver.save();
          console.log(`❌ Motorista suspenso: ${driver.name} (${driver._id}) - Saldo: ${wallet.balance}`);
        }
      }
      
    } catch (error) {
      console.error('⚠️ [Fraud Engine] Erro ao verificar fraudes:', error);
    }
  });
};
