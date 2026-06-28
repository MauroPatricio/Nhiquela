import cron from 'node-cron';
import Wallet from './models/WalletModel.js';
import Transaction from './models/TransactionModel.js';
import User from './models/UserModel.js';

// Executar todas as Quintas-feiras à meia-noite (00:00)
// '0 0 * * 4'
cron.schedule('0 0 * * 4', async () => {
  console.log('⏳ A iniciar o Batch Payment (Liquidação Semanal)...');

  try {
    // 1. Procurar todas as carteiras de Motoristas e Prestadores com saldo positivo
    const walletsToPay = await Wallet.find({
      walletType: { $in: ['Motorista', 'Prestador'] },
      balance: { $gt: 0 }
    });

    if (walletsToPay.length === 0) {
      console.log('✅ Nenhum saldo pendente para liquidar nesta semana.');
      return;
    }

    // 2. Iterar sobre cada carteira e processar o "payout"
    for (const wallet of walletsToPay) {
      const amountToPay = wallet.balance;
      
      // Aqui integrariamos a API do M-Pesa B2C Payout
      // const mpesaResult = await mpesaB2C(wallet.user.phoneNumber, amountToPay);
      const isSuccess = true; // Simulado para o MVP

      if (isSuccess) {
        // Reduz o saldo da carteira para 0
        wallet.balance = 0;
        await wallet.save();

        // Regista a transação de liquidação (Withdrawal)
        const tx = new Transaction({
          walletId: wallet._id,
          type: 'Debit',
          amount: amountToPay,
          description: `Liquidação Semanal M-Pesa B2C - Lote #${Date.now()}`,
          referenceType: 'Withdrawal',
          status: 'Completed'
        });
        await tx.save();

        console.log(`💰 Pago ${amountToPay} MZN para a Wallet ID: ${wallet._id}`);
      }
    }

    console.log('🎉 Liquidação Semanal concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o Batch Payment:', error);
  }
});

export default cron;
