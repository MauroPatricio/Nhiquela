import { Router } from 'express';
import { WalletController } from '../controllers/walletController';

const router = Router();

// Rota de Saldo
router.get('/balance', WalletController.getBalance);

// Rota de Transações/Extrato
router.get('/transactions', WalletController.getTransactions);

// Rota de Ganhos de Entregadores
router.get('/driver-earnings', WalletController.getDriverEarnings);

// Rota de Solicitação de Saque/Levantamento
router.post('/withdraw', WalletController.requestWithdrawal);

export default router;
