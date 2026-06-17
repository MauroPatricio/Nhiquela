import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { isAuth, isAdmin } from '../utils.js';

const router = express.Router();

router.get(
  '/balance',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Retorna saldo estático/mockado por enquanto até haver um modelo real de Wallet
    res.send({ available_balance: 24500, pending_balance: 1200 });
  })
);

router.get(
  '/transactions',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    res.send([
      { id: 'TXN-9021', type: 'credit', amount: 12000, date: new Date().toISOString(), description: 'Recebimento de Encomendas', status: 'Concluído' },
      { id: 'TXN-8342', type: 'debit', amount: 3500, date: new Date(Date.now() - 86400000).toISOString(), description: 'Pagamento a Fornecedor', status: 'Concluído' },
      { id: 'TXN-7123', type: 'credit', amount: 450, date: new Date(Date.now() - 172800000).toISOString(), description: 'Reembolso Cliente', status: 'Pendente' }
    ]);
  })
);

export default router;
