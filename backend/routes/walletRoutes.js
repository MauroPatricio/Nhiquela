import express from 'express';
import mongoose from 'mongoose';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';
import VehicleType from '../models/VehicleTypeModel.js';
import { isAuth, sendAdminNotificationEmail } from '../utils.js';
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
async function updateWallet(ownerId, amount, type, method, description, status = 'confirmado', ownerType = 'driver') {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let wallet = await Wallet.findOne({ ownerId }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{ ownerId, ownerType, balance: 0 }], { session });
      wallet = wallet[0]; // create retorna array no modo transacional
    }

    if (type === 'debit' && wallet.balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    // Atualiza saldo apenas se não for um crédito pendente
    // (créditos pendentes só entram no saldo quando o admin/sistema confirmar)
    const shouldUpdateBalance = !(type === 'credit' && status === 'pendente');
    
    if (shouldUpdateBalance) {
      wallet.balance += (type === 'credit' ? amount : -amount);
      await wallet.save({ session });
    }

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

    const isManualDeposit = method && method.includes('Manual');
    const txStatus = isManualDeposit ? 'pendente' : 'confirmado';

    const balance = await updateWallet(
      req.user._id,
      amount,
      'credit',
      method || 'Pagamento recebido',
      description || 'Recepção de valor do cliente',
      txStatus,
      req.user.isDriver ? 'driver' : 'User'
    );

    const successMessage = isManualDeposit 
      ? 'O seu pedido de recarga foi recebido e está pendente de validação pela nossa equipa.'
      : 'Saldo recarregado com sucesso!';

    const title = isManualDeposit ? 'Novo Pedido de Recarga Pendente' : 'Nova Recarga Efetuada';
    const textHtml = isManualDeposit
      ? `O motorista/cliente <b>${req.user.name || 'Utilizador'}</b> solicitou uma recarga manual na carteira no valor de <b>${amount} MT</b>.<br><br>Por favor, aceda à aba Financeiro no painel de administração para analisar o comprovativo e aprovar/rejeitar o pedido.<br>Detalhes: ${description}`
      : `O motorista/cliente <b>${req.user.name || 'Utilizador'}</b> efetuou com sucesso uma recarga automática na carteira no valor de <b>${amount} MT</b>.<br>Detalhes: ${description}`;

    await sendAdminNotificationEmail(title, textHtml);

    // [NOVO] Emissão global em tempo real via WebSocket para todos os administradores conectados
    if (isManualDeposit) {
      const io = req.app.get('io');
      const users = req.app.get('users');
      if (io && users) {
        const admins = users.filter(u => u.isAdmin && u.socketId);
        admins.forEach(admin => {
          io.to(admin.socketId).emit('adminNotification', {
            type: 'recharge',
            message: `Novo pedido de recarga pendente: ${amount} MT de ${req.user.name || 'Utilizador'}`
          });
        });
      }
    }

    return res.json({ message: successMessage, balance });
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
    if (req.user.isAdmin) {
      // Admin sees the total balance of the platform (or maybe sum of all confirmed credits minus debits)
      // Let's just sum all wallets for available, and pending for pending
      const wallets = await Wallet.find();
      const available_balance = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);
      
      const pendingTrans = await Transaction.find({ status: 'pendente' });
      const pending_balance = pendingTrans.reduce((acc, t) => acc + (t.amount || 0), 0);

      return res.json({ available_balance, pending_balance, currency: 'MZN' });
    }

    const wallet = await Wallet.findOne({ $or: [{ ownerId: req.user._id }, { userId: req.user._id }] });
    const pendingTrans = await Transaction.find({ walletId: wallet?._id, status: 'pendente' });
    const pending_balance = pendingTrans.reduce((acc, t) => acc + (t.amount || 0), 0);

    res.json({ 
      available_balance: wallet?.balance || 0,
      pending_balance: pending_balance,
      currency: 'MZN'
    });
  } catch (error) {
    console.error('Erro ao consultar saldo:', error);
    res.status(500).json({ message: 'Erro interno ao consultar saldo.' });
  }
});

/**
 * Consultar sumário financeiro do Motorista (Dashboard Financeiro)
 */
walletRouter.get('/driver-summary', isAuth, async (req, res) => {
  try {
    const { getFinancialConfig } = await import('../services/walletService.js');
    const config = await getFinancialConfig();

    const wallet = await Wallet.findOne({ $or: [{ ownerId: req.user._id }, { userId: req.user._id }] });
    const balance = wallet?.balance || 0;
    
    // Calcular estatísticas usando transações
    // Total Recarregado (Soma de todos os 'credit')
    const recharges = await Transaction.aggregate([
      { $match: { walletId: wallet?._id, type: 'credit', status: 'confirmado' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRecharged = recharges[0]?.total || 0;

    // Comissões descontadas (Soma de todos os 'debit' de serviço)
    const commissions = await Transaction.aggregate([
      { $match: { walletId: wallet?._id, type: 'debit', status: 'confirmado' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCommissions = commissions[0]?.total || 0;

    // Determinar o Estado
    const limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
    let currentState = 'Ativo';
    
    if (balance < limit) {
      currentState = 'Suspenso';
    } else if (config.allowNegativeBalance && balance < 0) {
      currentState = 'Crédito Controlado';
    } else if (balance <= config.lowBalanceWarningThreshold) {
      currentState = 'Aviso';
    }

    // Obter Taxa Base do Veículo e Taxa Mínima de Visibilidade
    let baseFare = 0;
    let minVisibilityFee = 0;
    let vehicleName = '';
    let categoryName = '';
    const fullUser = await mongoose.model('User').findById(req.user._id);
    if (fullUser && fullUser.deliveryman && fullUser.deliveryman.transport_type) {
      let vType = null;
      const transportType = fullUser.deliveryman.transport_type;
      
      if (mongoose.Types.ObjectId.isValid(transportType)) {
        const ProviderSubcategory = mongoose.model('ProviderSubcategory');
        const subcategory = await ProviderSubcategory.findById(transportType);
        if (subcategory) {
          categoryName = subcategory.name;
          if (subcategory.vehicleTypes && subcategory.vehicleTypes.length > 0) {
            vType = await VehicleType.findById(subcategory.vehicleTypes[0]);
          }
        }
      } else {
        vType = await VehicleType.findOne({ name: transportType });
      }

      if (vType) {
        baseFare = vType.basePrice || vType.baseFare || 0;
        minVisibilityFee = vType.minVisibilityFee || 0;
        vehicleName = vType.name;
      }
    }

    res.json({
      saldo_atual: balance,
      limite_credito: config.allowNegativeBalance ? config.creditLimit : 0,
      saldo_operacional_minimo: config.minOperationalBalance,
      taxa_base_veículo: baseFare,
      taxa_minima_recarga: minVisibilityFee > 0 ? minVisibilityFee : config.minOperationalBalance,
      nome_veículo: vehicleName,
      nome_categoria: categoryName,
      saldo_disponivel: balance - limit,
      estado_atual: currentState,
      total_recarregado: totalRecharged,
      total_comissoes: totalCommissions,
      permite_negativo: config.allowNegativeBalance,
      bloqueio_automatico: config.autoDisableOnLowBalance,
      currency: 'MZN'
    });
  } catch (error) {
    console.error('Erro ao buscar sumário financeiro:', error);
    res.status(500).json({ message: 'Erro interno ao consultar sumário financeiro.' });
  }
});

/**
 * Listar transações
 */
walletRouter.get('/transactions', isAuth, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const transactions = await Transaction.find()
        .populate({
          path: 'walletId',
          model: 'Wallet',
          populate: { path: 'ownerId', select: 'name phoneNumber phone email', model: 'User' }
        })
        .sort({ createdAt: -1 });
      return res.json(transactions);
    }

    const wallet = await Wallet.findOne({ $or: [{ ownerId: req.user._id }, { userId: req.user._id }] });
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
    const MIN_WITHDRAW = 10; // valor mínimo de levantamento

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valor inválido para levantamento.' });
    }

    if (amount < MIN_WITHDRAW) {
      return res.status(400).json({ message: `O valor mínimo de levantamento é ${MIN_WITHDRAW} MT.` });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (req.user.isAdmin) {
        // Lógica para Admin (apenas registo histórico, afeta o "Saldo Disponível" geral)
        let adminWallet = await Wallet.findOne({ ownerId: req.user._id }).session(session);
        if (!adminWallet) {
          adminWallet = await Wallet.findOne({ userId: req.user._id }).session(session);
        }
        if (!adminWallet) {
          adminWallet = await Wallet.create([{ ownerId: req.user._id, ownerType: 'admin', userId: req.user._id, balance: 0 }], { session }).then(w => w[0]);
        }

        // Subtrai do saldo do admin (que reduzirá o saldo total do sistema)
        adminWallet.balance -= amount;
        await adminWallet.save({ session });

        await Transaction.create([{
          walletId: adminWallet._id,
          type: 'debit',
          amount: amount,
          method: 'withdrawal',
          description: `Levantamento manual do sistema (Registo Histórico)`,
          status: 'confirmado'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.json({ 
          message: 'Levantamento registado com sucesso no sistema.',
          amountRequested: amount
        });
      }

      // --- Lógica original para Motorista/Utilizador ---
      if (!phone) {
        throw new Error('Número de telemóvel é obrigatório para motoristas.');
      }

      // Valor total a debitar da carteira (valor + taxa)
      const totalDebit = amount / (1 - TAX_RATE); // Ex: 100 / 0.8 = 125 MT

      // Buscar o utilizador pelo número de telefone
      const targetUser = await User.findOne({ 
        $or: [{ phoneNumber: phone }, { phone: phone }] 
      }).session(session);

      if (!targetUser) {
        throw new Error(`Utilizador com o número ${phone} não encontrado.`);
      }

      const wallet = await Wallet.findOne({ ownerId: targetUser._id }).session(session);
      if (!wallet || wallet.balance < totalDebit) {
        throw new Error(`Saldo insuficiente. É necessário ter pelo menos ${totalDebit.toFixed(2)} MT.`);
      }

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
      return res.status(400).json({ message: error.message });
    }
  } catch (error) {
    console.error('Erro ao solicitar levantamento:', error);
    return res.status(500).json({ message: error.message || 'Erro interno ao solicitar levantamento.' });
  }
});


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

// Autorizar Recarga
walletRouter.put('/:id/authorize-topup', isAuth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Acesso negado' });
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findById(req.params.id).session(session);
    if (!tx || tx.status !== 'pendente' || tx.type !== 'credit') {
      throw new Error('Transação inválida ou já processada');
    }
    tx.status = 'confirmado';
    await tx.save({ session });

    const wallet = await Wallet.findById(tx.walletId).session(session);
    wallet.balance += tx.amount;
    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Emit socket event to notify the driver to refresh wallet/status
    try {
      const io = req.app.get('io');
      if (io) {
        const userId = wallet.user.toString();
        io.to(userId).emit('userStatusChanged', {
          userId: userId,
          status: 'approved', // Trigger a refresh on frontend
          message: 'A sua recarga foi aprovada!'
        });
        io.to(`driver_${userId}`).emit('userStatusChanged', {
          userId: userId,
          status: 'approved', // Trigger a refresh on frontend
          message: 'A sua recarga foi aprovada!'
        });
        
        io.to(userId).emit('walletUpdated', {
          message: 'A sua recarga foi aprovada!'
        });
        io.to(`driver_${userId}`).emit('walletUpdated', {
          message: 'A sua recarga foi aprovada!'
        });
      }
    } catch (socketErr) {
      console.log('Socket error emitting:', socketErr.message);
    }

    res.status(200).json({ message: 'Recarga autorizada com sucesso!' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message || 'Erro ao autorizar recarga' });
  }
});

// Rejeitar Recarga
walletRouter.put('/:id/reject-topup', isAuth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Acesso negado' });
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx || tx.status !== 'pendente' || tx.type !== 'credit') {
      return res.status(400).json({ message: 'Transação inválida ou já processada' });
    }
    tx.status = 'falhado';
    await tx.save();
    res.status(200).json({ message: 'Recarga rejeitada com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erro ao rejeitar recarga' });
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

// Buscar ganhos e viagens do motorista
walletRouter.get('/driver-earnings', isAuth, async (req, res) => {
  try {
    const driverId = req.user._id;
    const now = new Date();
    
    // Hoje (início do dia atual local)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Esta semana (últimos 7 dias)
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    // Import models
    const Order = mongoose.model('Order');
    const RequestService = mongoose.model('RequestService');

    // Busca encomendas normais (Orders)
    const ordersPromise = Order.find({
      'deliveryman.id': driverId,
      isDelivered: true,
      deliveredAt: { $gte: startOfWeek }
    }).populate('user', 'name profileImage');

    // Busca serviços de transporte directo (RequestService)
    const requestsPromise = RequestService.find({
      'deliveryman.id': driverId,
      isDelivered: true,
      deliveredAt: { $gte: startOfWeek }
    }).populate('user', 'name profileImage');

    const [orders, requestServices] = await Promise.all([ordersPromise, requestsPromise]);
    const allTrips = [...orders, ...requestServices];

    let todayEarnings = 0;
    let weekEarnings = 0;
    let tripsToday = 0;

    const dailyStatsMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyStatsMap[dateStr] = { date: dateStr, amount: 0, trips: 0, tripsList: [] };
    }

    allTrips.forEach(trip => {
      const deliveryPrice = trip.pricing?.totalPrice || trip.deliveryPrice || trip.deliveryman?.pricetopay || 0;
      const tripDate = new Date(trip.deliveredAt);
      
      if (tripDate >= startOfToday) {
        todayEarnings += deliveryPrice;
        tripsToday++;
      }
      weekEarnings += deliveryPrice;

      const dStr = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
      if (dailyStatsMap[dStr]) {
        dailyStatsMap[dStr].amount += deliveryPrice;
        dailyStatsMap[dStr].trips += 1;
        
        // Determinar origem e destino
        const origin = trip.origin || trip.pickupAddress?.address || 'Origem não especificada';
        const destination = trip.destination || trip.deliveryAddress?.address || 'Destino não especificado';
        
        dailyStatsMap[dStr].tripsList.push({
          id: trip._id,
          code: trip.code || trip._id.toString().slice(-6).toUpperCase(),
          time: tripDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          amount: deliveryPrice,
          type: trip.pricing ? 'Serviço' : 'Encomenda',
          clientName: trip.user?.name || trip.name || 'Cliente Desconhecido',
          clientImage: trip.user?.profileImage || null,
          origin,
          destination,
          reason: trip.reason || trip.description || 'Sem motivo especificado'
        });
      }
    });

    res.json({
      today: todayEarnings,
      week: weekEarnings,
      tripsToday: tripsToday,
      totalTrips: allTrips.length,
      dailyEarnings: Object.values(dailyStatsMap).sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    console.error('Erro ao buscar ganhos:', error);
    res.status(500).json({ message: 'Erro interno ao buscar ganhos.' });
  }
});

export default walletRouter;
