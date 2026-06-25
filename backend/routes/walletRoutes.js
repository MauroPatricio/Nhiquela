import express from 'express';
import mongoose from 'mongoose';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';
import { isAuth } from '../utils.js';
import mpesa from 'mpesa-node-api';
import config from '../config.js';

function randomString(codeLength){
    const chars = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890";
    const randomArray = Array.from(
        { length: codeLength },
        (v, k) => chars[Math.floor(Math.random() * chars.length)]
      );
    return randomArray.join("");
}

const walletRouter = express.Router();

/**
 * Função genérica para atualizar saldo e registrar transação com segurança (MongoDB transaction)
 */
async function updateWallet(userId, amount, type, method, description, status = 'confirmado') {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{ userId, balance: 0 }], { session });
      wallet = wallet[0]; // create retorna array no modo transacional
    }

    if (type === 'debit' && wallet.balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    // Atualiza saldo
    wallet.balance += (type === 'credit' ? amount : -amount);
    await wallet.save({ session });

    // Registra transação separada
    await Transaction.create([{
      walletId: wallet._id,
      type,
      amount,
      method,
      description,
      status
    }], { session });

    await session.commitTransaction();
    session.endSession();
    return wallet.balance;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

/**
 * Recarregar saldo (top-up)
 */
walletRouter.post('/topup', isAuth, async (req, res) => {
  try {
    const { amount, method, description, phone } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valor inválido para recarga.' });
    }

    if (method === 'M-Pesa/e-Mola' || method === 'M-Pesa') {
      if (!phone) {
        return res.status(400).json({ message: 'Número de telefone é obrigatório para pagamentos M-Pesa.' });
      }

      const referenceCode = randomString(5);
      mpesa.initializeApi({
        baseUrl: config.MPESA_API_HOST,
        apiKey: config.MPESA_API_KEY,
        publicKey: config.MPESA_PUBLIC_KEY,
        origin: config.MPESA_ORIGIN,
        serviceProviderCode: config.MPESA_SERVICE_PROVIDER_CODE,
        timeout: 60000 
      });

      const cleanPhone = phone.replace('+', '');

      // Iniciar STK Push (C2B)
      const mpesaRes = await mpesa.initiate_c2b(amount, cleanPhone, referenceCode, referenceCode);

      if (mpesaRes.output_ResponseCode !== 'INS-0') {
        return res.status(400).json({ 
          message: mpesaRes.output_ResponseDesc || 'Transação rejeitada pelo M-Pesa.' 
        });
      }
    }

    const balance = await updateWallet(
      req.user._id,
      amount,
      'credit',
      method || 'Pagamento recebido',
      description || 'Recepção de valor do cliente'
    );

    return res.json({ message: 'Saldo recarregado com sucesso', balance });
  } catch (error) {
    console.error('Erro ao recarregar saldo:', error?.response?.data || error.message);
    const mpesaError = error?.response?.data?.output?.ResponseDesc;
    return res.status(500).json({ message: mpesaError || error.message || 'Erro interno ao recarregar saldo.' });
  }
});

/**
 * Consultar saldo
 */
walletRouter.get('/balance', isAuth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    res.json({ balance: wallet?.balance || 0 });
  } catch (error) {
    console.error('Erro ao consultar saldo:', error);
    res.status(500).json({ message: 'Erro interno ao consultar saldo.' });
  }
});

/**
 * Listar transações
 */
walletRouter.get('/transactions', isAuth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) return res.json([]);
    const transactions = await Transaction.find({ walletId: wallet._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    res.status(500).json({ message: 'Erro interno ao listar transações.' });
  }
});

/**
 * Efetuar pagamento
 */
walletRouter.post('/pay', isAuth, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valor inválido para pagamento.' });
    }

    const balance = await updateWallet(
      req.user._id,
      amount,
      'debit',
      'wallet',
      description || 'Pagamento com carteira'
    );

    res.json({ message: 'Pagamento realizado com sucesso', balance });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({ message: error.message || 'Erro interno ao processar pagamento.' });
  }
});

/**
 * Solicitar levantamento (withdraw) - sem taxa de levantamento de 20% por isso esta comentado
 */
// walletRouter.post('/withdraw', isAuth, async (req, res) => {
//   try {
//     const { amount, phone } = req.body;
//     if (!amount || amount <= 0 || !phone) {
//       return res.status(400).json({ message: 'Dados inválidos para levantamento.' });
//     }

//     const balance = await updateWallet(
//       req.user._id,
//       amount,
//       'debit',
//       'withdrawal',
//       `Levantamento solicitado para ${phone}`,
//       'pendente' // levantamento fica pendente
//     );

//     // Aqui poderia chamar serviço externo (ex: M-PESA) após aprovação admin

//     res.json({ message: 'Solicitação de levantamento registrada. Aguarde confirmação.', balance });
//   } catch (error) {
//     console.error('Erro ao solicitar levantamento:', error);
//     res.status(500).json({ message: error.message || 'Erro interno ao solicitar levantamento.' });
//   }
// });




// Buscar levantamentos pendentes
walletRouter.get('/pending', async (req, res) => {
  try {
    const withdrawals = await Transaction.find({ 
      type: 'debit', 
      method: 'withdrawal', 
      status: 'pendente' 
    }).sort({ createdAt: -1 });
    res.status(200).json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar levantamentos pendentes' });
  }
});

// Autorizar levantamento
walletRouter.put('/:id/authorize', async (req, res) => {
  try {
    const withdrawal = await Transaction.findById(req.params.id);
    if (!withdrawal || withdrawal.status !== 'pendente') {
      return res.status(404).json({ message: 'Solicitação não encontrada ou já processada' });
    }
    withdrawal.status = 'confirmado';
    await withdrawal.save();
    // Aqui você pode chamar o serviço externo (ex.: M-PESA)
    res.status(200).json({ message: 'Solicitação autorizada com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao autorizar solicitação' });
  }
});

// Cancelar levantamento e devolver saldo
walletRouter.put('/:id/cancel', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const withdrawal = await Transaction.findById(req.params.id).session(session);
    if (!withdrawal || withdrawal.status !== 'pendente') {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Solicitação não encontrada ou já processada' });
    }

    // devolver saldo à carteira
    const wallet = await Wallet.findById(withdrawal.walletId).session(session);
    if (wallet) {
      wallet.balance += withdrawal.amount;
      await wallet.save({ session });
    }

    withdrawal.status = 'falhado';
    await withdrawal.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: 'Solicitação cancelada e valor devolvido!' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Erro ao cancelar solicitação' });
  }
});

/**
 * Solicitar levantamento (withdraw) com taxa de 20%
 */
walletRouter.post('/withdraw', isAuth, async (req, res) => {
  try {
    const { amount, phone } = req.body;
    const TAX_RATE = 0.20; // 20% de taxa
    const MIN_WITHDRAW = 100; // valor mínimo de levantamento

    if (!amount || amount <= 0 || !phone) {
      return res.status(400).json({ message: 'Dados inválidos para levantamento.' });
    }

    if (amount < MIN_WITHDRAW) {
      return res.status(400).json({ message: `O valor mínimo de levantamento é ${MIN_WITHDRAW} MT.` });
    }

    // Valor total a debitar da carteira (valor + taxa)
    const totalDebit = amount / (1 - TAX_RATE); // Ex: 100 / 0.8 = 125 MT

    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet || wallet.balance < totalDebit) {
      return res.status(400).json({ message: `Saldo insuficiente. É necessário ter pelo menos ${totalDebit.toFixed(2)} MT.` });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Debitar total (valor + taxa)
      wallet.balance -= totalDebit;
      await wallet.save({ session });

      // Registrar transação para o usuário (valor líquido que ele recebe)
      await Transaction.create([{
        walletId: wallet._id,
        type: 'debit',
        amount: amount, // valor líquido que ele recebe
        method: 'withdrawal',
        description: `Levantamento solicitado para ${phone} (valor líquido: ${amount} MT)`,
        status: 'pendente'
      }], { session });

      // Registrar transação para a plataforma (taxa)
      await Transaction.create([{
        walletId: wallet._id,
        type: 'debit',
        amount: totalDebit - amount, // taxa da plataforma
        method: 'fee',
        description: `Taxa de levantamento de 20%`,
        status: 'confirmado'
      }], { session });

      await session.commitTransaction();
      session.endSession();

      res.json({ 
        message: 'Solicitação de levantamento registrada. Aguarde confirmação.',
        balance: wallet.balance.toFixed(2),
        amountRequested: amount,
        fee: (totalDebit - amount).toFixed(2)
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao solicitar levantamento:', error);
    return res.status(500).json({ message: error.message || 'Erro interno ao solicitar levantamento.' });
  }
});


export default walletRouter;
