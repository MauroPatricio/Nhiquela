// backend/services/walletService.js
import mongoose from 'mongoose';
import Wallet from '../models/WalletModel.js';
import User from '../models/UserModel.js';
import Partner from '../models/PartnerModel.js';
import PricingEngine from '../models/PricingEngineModel.js';
import VehicleType from '../models/VehicleTypeModel.js';
import Transaction from '../models/TransactionModel.js';
// removed getIo // Assuming io can be fetched, or we pass io/emit elsewhere. 
// Wait, we can't easily import io from index.js directly if it doesn't export it. Let's just use a callback or require it conditionally.
// A better way is to avoid importing index.js to prevent circular dependencies. I will just rely on the driver routes for WebSocket or use a global if available. We can do it safely.

export const getFinancialConfig = async () => {
  let engineConfig = await PricingEngine.findOne();
  if (!engineConfig) {
    engineConfig = new PricingEngine();
    await engineConfig.save();
  }
  
  // Clone to avoid modifying mongoose document directly
  const financialEngine = { ...engineConfig.financialEngine };
  
  try {
    const Settings = (await import('../models/SettingsModel.js')).default;
    const commSetting = await Settings.findOne({ key: 'driver_commission_rate' });
    if (commSetting && commSetting.value !== undefined) {
      // Divide by 100 because the web dashboard sends it as a percentage (e.g. 15 for 15%)
      financialEngine.driverCommissionRate = Number(commSetting.value) / 100;
    }

    const useGenCommSetting = await Settings.findOne({ key: 'enable_global_commission' });
    if (useGenCommSetting && useGenCommSetting.value !== undefined) {
      financialEngine.useGeneralCommission = useGenCommSetting.value === 'true' || useGenCommSetting.value === true;
    } else {
      financialEngine.useGeneralCommission = true; // Habilitado por padrão
    }
  } catch (err) {
    console.error('Erro ao ler configuracoes de comissao do settings:', err);
  }

  return financialEngine;
};

/** Helper: Calculate exact commission based on subcategory rules */
export const calculateDynamicCommission = async (order) => {
  // ✅ NOVA REGRA: Isenção de comissão na 1ª viagem do motorista
  const driverId = order.deliveryman?.id || (order.deliveryman && order.deliveryman._id ? order.deliveryman._id : null) || order.driverId;
  if (driverId) {
    const driver = await User.findById(driverId);
    // Se o motorista ainda não tem viagens concluídas, isenta a comissão
    if (driver && (driver.completedOrders || 0) === 0) {
      return 0; // 0 MT de comissão na primeira viagem
    }
  }

  const financialConfig = await getFinancialConfig();
  let defaultCommissionRate = financialConfig?.driverCommissionRate || 0.15;
  
  // Se houve negociação aceite, o valor base para a comissão é o finalAgreedPrice
  const hasAgreedPrice = (order.negotiationState === 'ACCEPTED' || order.finalAgreedPrice > 0) && Number(order.finalAgreedPrice) > 0;
  const agreedPrice = hasAgreedPrice ? Number(order.finalAgreedPrice) : null;

  // Para serviços (RequestService), o preço do serviço é pricetopay ou costServico, e o deslocamento é deliveryPrice ou costDeslocacao
  let servicePrice = agreedPrice !== null ? agreedPrice : (order.pricing?.breakdown?.servicePrice || order.pricing?.costServico || order.servicePrice || order.pricetopay || 0);
  let distancePrice = agreedPrice !== null ? 0 : (order.pricing?.breakdown?.distancePrice || order.pricing?.costDeslocacao || order.distancePrice || order.deliveryPrice || 0);

  // Se não existir o breakdown (por exemplo, pedidos antigos de loja ou simples), fallback para usar o total
  if (agreedPrice === null && servicePrice === 0 && distancePrice === 0) {
    servicePrice = order.pricing?.totalPrice || order.totalPrice || 0;
  }

  let categoryRefId = order.subcategoryId || order.serviceId;

  // 1. Tentar encontrar a partir do requestServiceId vinculado (para motoristas/viagens)
  if (!categoryRefId && order.requestServiceId) {
    try {
      const RequestService = mongoose.model('RequestService');
      const linkedRequest = await RequestService.findById(order.requestServiceId);
      if (linkedRequest) {
        categoryRefId = linkedRequest.serviceId || linkedRequest.subcategoryId;
      }
    } catch (err) {
      console.error('Error fetching linked requestService for commission:', err);
    }
  }

  // 2. Tentar encontrar a partir do Provider do vendedor (para pedidos de lojas)
  if (!categoryRefId && (order.seller || (order.sellers && order.sellers.length > 0))) {
    try {
      const Provider = mongoose.model('Provider');
      const providerId = order.seller || order.sellers[0];
      const provider = await Provider.findById(providerId);
      if (provider) {
        categoryRefId = provider.subcategoryId;
        if (!categoryRefId && provider.userId) {
          const sellerUser = await User.findById(provider.userId);
          if (sellerUser?.seller?.tipoEstabelecimento) {
            categoryRefId = sellerUser.seller.tipoEstabelecimento;
          }
        }
      }
    } catch(err) {
      console.error('Error fetching provider subcategory for commission:', err);
    }
  }

  if (categoryRefId) {
    try {
      const ProviderSubcategory = (await import('../models/ProviderSubcategoryModel.js')).default;
      const subId = categoryRefId._id ? categoryRefId._id : categoryRefId;
      const sub = await ProviderSubcategory.findById(subId);
      
      if (sub) {
        let servComm = sub.serviceCommission !== undefined && sub.serviceCommission !== null 
          ? sub.serviceCommission 
          : (financialConfig.useGeneralCommission !== false ? defaultCommissionRate * 100 : 0);
        
        const mode = sub.pricingMode;
        if (mode === 'AUTO') {
          // Calculado pela Plataforma: comissão apenas sobre o valor da deslocação
          return distancePrice * (servComm / 100);
        } else if (mode === 'PROVIDER_DEFINED') {
          // Definido pelo Prestador: comissão apenas sobre o valor cobrado pelo prestador
          return servicePrice * (servComm / 100);
        } else {
          // Calculado + Prestador (AUTO_PLUS_PROVIDER) ou indefinido: comissão sobre deslocação + prestador
          return (servicePrice + distancePrice) * (servComm / 100);
        }
      }
    } catch(err) {
      console.error('Error calculating dynamic commission for subcategory:', err);
    }
  }
  
  // Caso não tenha subcategoria, aplica a taxa global a tudo (se habilitada)
  if (financialConfig.useGeneralCommission === false) {
    return 0; // Taxa global desabilitada
  }
  return (servicePrice + distancePrice) * defaultCommissionRate;
};

/** Get or create a wallet for a user or partner */
export const getWallet = async (userId) => {
  let wallet = await Wallet.findOne({ $or: [{ ownerId: userId }, { userId: userId }] });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: userId, ownerType: 'driver', userId: userId, balance: 0 });
  }
  return wallet;
};

/** Debit a commission from the driver’s wallet */
export const debitCommission = async (driverId, amount, orderId = null) => {
  const wallet = await getWallet(driverId);
  const config = await getFinancialConfig();

  // Allow negative balance if configured
  if (config.allowNegativeBalance) {
    wallet.balance = Math.round((wallet.balance - amount) * 100) / 100;
  } else {
    wallet.balance = Math.max(0, Math.round((wallet.balance - amount) * 100) / 100);
  }
  
  if (wallet.balance < 0 && !wallet.negativeSince) {
    wallet.negativeSince = new Date();
  } else if (wallet.balance >= 0) {
    wallet.negativeSince = null;
  }
  
  await wallet.save();

  if (amount > 0) {
    await Transaction.create({
      walletId: wallet._id,
      type: 'debit',
      amount: amount,
      method: 'commission',
      description: orderId ? `Comissão da viagem #${orderId}` : 'Comissão da plataforma',
      status: 'confirmado'
    });
  }

  // If balance falls below the credit limit (or min balance if no credit allowed), suspend driver
  const limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
  
  if (config.autoDisableOnLowBalance && wallet.balance < limit) {
    const driver = await User.findById(driverId);
    if (driver) {
      driver.status = 'Inativo'; // Suspenso por falta de saldo
      if (!driver.deliveryman) driver.deliveryman = {};
      driver.deliveryman.register_conformance = 'INCONFORMANCE';
      await driver.save();
      // Socket emission should ideally be here if possible, but let's keep it simple.
    }
  }
  return wallet;
};

/** Credit a recharge to the driver’s wallet */
export const creditWallet = async (driverId, amount) => {
  const wallet = await getWallet(driverId);
  const config = await getFinancialConfig();

  wallet.balance += amount;
  if (wallet.balance >= 0) {
    wallet.negativeSince = null;
  }
  await wallet.save();

  // Reactivate driver if balance is now sufficient
  if (wallet.balance >= config.minOperationalBalance) {
    const driver = await User.findById(driverId);
    if (driver && driver.status === 'Inativo') {
      driver.status = 'Disponível';
      if (!driver.deliveryman) driver.deliveryman = {};
      driver.deliveryman.register_conformance = 'CONFORMANCE';
      await driver.save();
    }
  }
  return wallet;
};

/** Debit commission from a partner’s wallet and update partner stats */
export const debitCommissionFromPartner = async (partnerId, orderAmount, commissionRate) => {
  const partner = await Partner.findById(partnerId);
  if (!partner) throw new Error('Partner not found');
  const commission = orderAmount * commissionRate;

  const wallet = await getWallet(partnerId);
  wallet.balance = Math.max(0, wallet.balance - commission);
  await wallet.save();

  // Update partner aggregates
  partner.accumulatedCommission = (partner.accumulatedCommission || 0) + commission;
  partner.salesDay = (partner.salesDay || 0) + orderAmount;
  partner.salesMonth = (partner.salesMonth || 0) + orderAmount;

  // Suspend partner if balance falls below required minimum
  const minBal = partner.minBalance ?? 2000;
  partner.isActive = wallet.balance >= minBal;

  await partner.save();

  // Record transaction
  const Transaction = (await import('../models/TransactionModel.js')).default;
  await Transaction.create({
    walletId: wallet._id,
    type: 'debit',
    amount: commission,
    method: 'wallet',
    description: `Comissão sobre venda de ${orderAmount}`,
    status: 'confirmado'
  });

  return { wallet, commission };
};

/** Helper: check whether driver has enough balance */
export const hasSufficientBalance = async (driverId, driverDoc = null) => {
  const driver = driverDoc || await User.findById(driverId);
  // ✅ NOVA REGRA: Isenção de saldo obrigatório para a primeira viagem
  if (driver && (driver.completedOrders || 0) === 0) {
    return true;
  }

  const wallet = await getWallet(driverId);

  const config = await getFinancialConfig();
  
  let limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
  
  if (driver && driver.deliveryman) {
    let vType = null;
    const VehicleType = (await import('../models/VehicleTypeModel.js')).default;
    
    // Consoante ao tipo associado (vehicle_type_id) ou transport_type
    if (driver.deliveryman.vehicle_type_id) {
      vType = await VehicleType.findById(driver.deliveryman.vehicle_type_id);
    } else if (driver.deliveryman.transport_type) {
      const transportType = driver.deliveryman.transport_type;
      
      // Se for um ObjectId, é um ProviderSubcategory
      if (mongoose.Types.ObjectId.isValid(transportType)) {
        const ProviderSubcategory = (await import('../models/ProviderSubcategoryModel.js')).default;
        const subcategory = await ProviderSubcategory.findById(transportType);
        if (subcategory && subcategory.vehicleTypes && subcategory.vehicleTypes.length > 0) {
          vType = await VehicleType.findById(subcategory.vehicleTypes[0]);
        }
      } else {
        vType = await VehicleType.findOne({ name: transportType });
      }
    }

    if (vType && vType.minVisibilityFee > 0) {
      limit = vType.minVisibilityFee;
    }
  }
  return wallet.balance >= limit;
};

export const getDriverMinimumBalance = async (driverId, config, session = null) => {
  let limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
  
  const query = User.findById(driverId);
  if (session) query.session(session);
  const driver = await query;
  
  if (driver && driver.deliveryman) {
    let vType = null;
    const VehicleType = (await import('../models/VehicleTypeModel.js')).default;
    
    // Consoante ao tipo associado (vehicle_type_id) ou transport_type
    if (driver.deliveryman.vehicle_type_id) {
      vType = await VehicleType.findById(driver.deliveryman.vehicle_type_id);
    } else if (driver.deliveryman.transport_type) {
      const transportType = driver.deliveryman.transport_type;
      
      // Se for um ObjectId, é um ProviderSubcategory
      if (mongoose.Types.ObjectId.isValid(transportType)) {
        const ProviderSubcategory = (await import('../models/ProviderSubcategoryModel.js')).default;
        const subcategory = await ProviderSubcategory.findById(transportType);
        if (subcategory && subcategory.vehicleTypes && subcategory.vehicleTypes.length > 0) {
          vType = await VehicleType.findById(subcategory.vehicleTypes[0]);
        }
      } else {
        vType = await VehicleType.findOne({ name: transportType });
      }
    }

    if (vType && vType.minVisibilityFee > 0) {
      limit = vType.minVisibilityFee;
    }
  }
  return limit;
};

/** Verify if driver has sufficient balance/credit to afford an upcoming trip commission */
export const canAffordTripCommission = async (driverId, amount) => {
  // ✅ NOVA REGRA: Isenção para a primeira viagem
  const driver = await User.findById(driverId);
  if (driver && (driver.completedOrders || 0) === 0) {
    return true;
  }

  const wallet = await getWallet(driverId);
  const config = await getFinancialConfig();
  
  const limit = await getDriverMinimumBalance(driverId, config);
  
  // O motorista pode aceitar a viagem desde que o seu saldo ATUAL seja >= ao limite (Ex: 500MT).
  // Se a comissão for 537, ele ficará negativo (-37), o que é permitido. Ele será inativado ao finalizar a viagem.
  return wallet.balance >= limit;
};

/** Reset daily sales for all partners */
export const resetDailySales = async () => {
  await Partner.updateMany({}, { salesDay: 0 });
};

/** Reset monthly sales for all partners */
export const resetMonthlySales = async () => {
  await Partner.updateMany({}, { salesMonth: 0 });
};

/** Debit driver commission using MongoDB Sessions for atomicity */
export const debitDriverCommissionWithSession = async (driverId, amount, description, method, session) => {
  // Se o valor debitado for 0, atualizamos a descrição para refletir o bónus de isenção
  if (amount === 0) {
    description = "Isenção de Comissão - Bónus de 1ª Viagem";
  }

  let wallet = await Wallet.findOne({ $or: [{ ownerId: driverId }, { userId: driverId }] }).session(session);
  if (!wallet) {
    wallet = await Wallet.create([{ ownerId: driverId, ownerType: 'driver', userId: driverId, balance: 0 }], { session });
    wallet = wallet[0];
  }

  // Deduct amount (allow negative balance)
  wallet.balance -= amount;
  if (wallet.balance < 0 && !wallet.negativeSince) {
    wallet.negativeSince = new Date();
  } else if (wallet.balance >= 0) {
    wallet.negativeSince = null;
  }
  await wallet.save({ session });

  // Record transaction
  await Transaction.create([{
    walletId: wallet._id,
    type: 'debit',
    amount: amount,
    method: method || 'wallet',
    description: description,
    status: 'confirmado'
  }], { session });

  // ✅ Auto-disable check é feito FORA da transação (em background) para evitar dynamic imports dentro de session
  // O chamador deve invocar checkAndDisableDriverIfLowBalance(driverId) após commitTransaction()
  // Note: we don't commit the session here, the route controller does it
  return wallet;
};

/**
 * ✅ Verificar e suspender motorista se saldo baixo — chamar FORA de qualquer transação
 */
export const checkAndDisableDriverIfLowBalance = async (driverId) => {
  try {
    const config = await getFinancialConfig();
    const limit = await getDriverMinimumBalance(driverId, config);
    const wallet = await Wallet.findOne({ $or: [{ ownerId: driverId }, { userId: driverId }] });
    if (!wallet) return;

    const currentBalance = wallet.balance;
    const formattedBalance = `MT ${Number(currentBalance).toFixed(2)}`;

    if (config.autoDisableOnLowBalance && currentBalance < limit) {
      await User.updateOne(
        { _id: driverId },
        {
          $set: {
            status: 'Inativo',
            'deliveryman.register_conformance': 'INCONFORMANCE',
            'deliveryman.balance': formattedBalance,
            'deliveryman.walletBalance': currentBalance
          }
        }
      );
      console.log(`[Wallet] ⚠️ Motorista ${driverId} suspenso por saldo insuficiente (${currentBalance} < ${limit})`);
    } else {
      // ✅ SE O SALDO É SUFICIENTE (ex: 950 MT >= 50 MT), REATIVAR O MOTORISTA E ATUALIZAR O SALDO NA BD
      await User.updateOne(
        { _id: driverId },
        {
          $set: {
            status: 'Disponível',
            'deliveryman.register_conformance': 'CONFORMANCE',
            'deliveryman.balance': formattedBalance,
            'deliveryman.walletBalance': currentBalance
          }
        }
      );
      console.log(`[Wallet] ✅ Motorista ${driverId} reativado/sincronizado com sucesso (Saldo: ${currentBalance} >= ${limit})`);
    }
  } catch (err) {
    console.error('[Wallet] Erro ao verificar saldo do motorista:', err.message);
  }
};


/** Refund driver commission using MongoDB Sessions for atomicity */
export const refundDriverCommissionWithSession = async (driverId, amount, description, method, session) => {
  let wallet = await Wallet.findOne({ $or: [{ ownerId: driverId }, { userId: driverId }] }).session(session);
  if (!wallet) {
    wallet = await Wallet.create([{ ownerId: driverId, ownerType: 'driver', userId: driverId, balance: 0 }], { session });
    wallet = wallet[0];
  }

  // Add amount back to wallet
  wallet.balance += amount;
  if (wallet.balance >= 0) {
    wallet.negativeSince = null;
  }
  await wallet.save({ session });

  // Record transaction
  await Transaction.create([{
    walletId: wallet._id,
    type: 'credit',
    amount: amount,
    method: method || 'wallet',
    description: description,
    status: 'confirmado'
  }], { session });

  // Note: we don't commit the session here, the route controller does it
  return wallet;
};

/**
 * Automatically close supplier store if wallet balance is below the minimum recommended.
 */
export const checkAndDisableSellerIfLowBalance = async (userId) => {
  try {
    const User = (await import('../models/UserModel.js')).default;
    const Settings = (await import('../models/SettingsModel.js')).default;
    const Provider = (await import('../models/ProviderModel.js')).default;
    const Product = (await import('../models/ProductModel.js')).default;

    const user = await User.findById(userId);
    if (!user || !user.seller) return;

    // Se tiver primeira venda grátis ativa, não suspende por saldo baixo!
    if (user.seller.free_sale_available) {
      return;
    }

    const minBalSetting = await Settings.findOne({ key: 'minimum_recommended_balance' });
    const minBalance = minBalSetting ? Number(minBalSetting.value) : 50;

    const blockSetting = await Settings.findOne({ key: 'block_store_below_minimum' });
    const blockLow = blockSetting ? (blockSetting.value === 'true' || blockSetting.value === true) : true;

    if (!blockLow) return;

    const wallet = await getWallet(userId, 'seller');
    if (wallet.balance < minBalance) {
      user.seller.openstore = false;
      user.seller.storeStatus = 'CLOSED_LOW_BALANCE';
      await user.save();

      const provider = await Provider.findOne({ userId });
      const targetSellerId = provider ? provider._id : userId;

      // Fechar produtos
      await Product.updateMany(
        { seller: targetSellerId },
        { isSellerOpen: false }
      );
      console.log(`[Wallet] 🏪 Loja do fornecedor ${userId} fechada automaticamente por saldo insuficiente (${wallet.balance} < ${minBalance}).`);
    }
  } catch (err) {
    console.error('Erro ao suspender loja do fornecedor:', err.message);
  }
};

/**
 * Automatically reopen supplier store if balance satisfies the recommended limit.
 */
export const checkAndReactivateSellerIfMinBalance = async (userId) => {
  try {
    const User = (await import('../models/UserModel.js')).default;
    const Settings = (await import('../models/SettingsModel.js')).default;
    const Provider = (await import('../models/ProviderModel.js')).default;
    const Product = (await import('../models/ProductModel.js')).default;

    const user = await User.findById(userId);
    if (!user || !user.seller) return;

    let canOpen = false;
    if (user.seller.free_sale_available) {
      canOpen = true;
    } else {
      const minBalSetting = await Settings.findOne({ key: 'minimum_recommended_balance' });
      const minBalance = minBalSetting ? Number(minBalSetting.value) : 50;

      const wallet = await getWallet(userId, 'seller');
      canOpen = wallet.balance >= minBalance;
    }

    if (canOpen) {
      if (user.seller.storeStatus === 'CLOSED_LOW_BALANCE') {
        user.seller.storeStatus = 'OPEN';
        user.seller.openstore = true;
        await user.save();

        const provider = await Provider.findOne({ userId });
        const targetSellerId = provider ? provider._id : userId;

        // Reabrir produtos
        await Product.updateMany(
          { seller: targetSellerId },
          { isSellerOpen: true }
        );
        console.log(`[Wallet] 🏪 Loja do fornecedor ${userId} reaberta automaticamente por saldo suficiente.`);
      }
    }
  } catch (err) {
    console.error('Erro ao reativar loja do fornecedor:', err.message);
  }
};

/**
 * Process order commission and payout for the seller wallet.
 * Uses a Mongoose transaction to ensure operations are atomic and safe against concurrent updates.
 */
export const processSellerOrderFinancials = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const Order = (await import('../models/OrderModel.js')).default;
    const User = (await import('../models/UserModel.js')).default;
    const Provider = (await import('../models/ProviderModel.js')).default;
    const Settings = (await import('../models/SettingsModel.js')).default;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.isCommissionProcessed) {
      await session.abortTransaction();
      session.endSession();
      return { success: true, alreadyProcessed: true };
    }

    // Only process if status is completed/delivered
    const isCompleted = ['Entregue', 'Finalizado'].includes(order.status) || order.isDelivered;
    if (!isCompleted) {
      throw new Error('Order is not in a completed status');
    }

    const provider = await Provider.findById(order.seller).session(session);
    if (!provider || !provider.userId) {
      throw new Error('Provider or seller user not found');
    }

    const sellerUser = await User.findById(provider.userId).session(session);
    if (!sellerUser) {
      throw new Error('Seller user account not found');
    }

    // Get configuration settings
    const minBalSetting = await Settings.findOne({ key: 'minimum_recommended_balance' }).session(session);
    const minBalance = minBalSetting ? Number(minBalSetting.value) : 50;

    const commRateSetting = await Settings.findOne({ key: 'platform_commission_rate' }).session(session);
    const globalCommRate = commRateSetting ? Number(commRateSetting.value) : 15;

    const firstSaleFreeSetting = await Settings.findOne({ key: 'enable_first_sale_free' }).session(session);
    const enableFirstSaleFree = firstSaleFreeSetting ? (firstSaleFreeSetting.value === 'true' || firstSaleFreeSetting.value === true) : true;

    // Check for First Sale Free promotion
    let isFreeSale = false;
    if (enableFirstSaleFree && sellerUser.seller && sellerUser.seller.free_sale_available !== false && !sellerUser.seller.free_sale_used) {
      isFreeSale = true;
    }

    const saleAmount = order.totalPrice || 0;
    const commissionRate = isFreeSale ? 0 : globalCommRate;
    const commissionAmount = Math.round((saleAmount * (commissionRate / 100)) * 100) / 100;
    const supplierNetAmount = Math.round((saleAmount - commissionAmount) * 100) / 100;

    // Retrieve or create Seller Wallet inside session
    let wallet = await Wallet.findOne({ $or: [{ ownerId: sellerUser._id }, { userId: sellerUser._id }] }).session(session);
    if (!wallet) {
      try {
        wallet = await Wallet.create([{ ownerId: sellerUser._id, ownerType: 'seller', userId: sellerUser._id, balance: 0 }], { session });
        wallet = wallet[0];
      } catch (createErr) {
        if (createErr.code === 11000 || createErr.message?.includes('E11000')) {
          wallet = await Wallet.findOne({ $or: [{ ownerId: sellerUser._id }, { userId: sellerUser._id }] }).session(session);
        } else {
          throw createErr;
        }
      }
    }

    const balanceBefore = wallet.balance;

    // Regra da Carteira Digital do Fornecedor:
    // O saldo da carteira é pré-pago e SÓ é incrementado por Recargas (Top-Up).
    // As vendas entram diretamente para o fornecedor.
    // Ao concluir a venda, é debitada a comissão da plataforma do saldo da carteira (exceto se for a 1ª Venda Grátis).
    if (commissionAmount > 0) {
      const allowNegativeSetting = await Settings.findOne({ key: 'allow_negative_balance' }).session(session);
      const allowNegative = allowNegativeSetting ? (allowNegativeSetting.value === 'true' || allowNegativeSetting.value === true) : false;

      if (!allowNegative && wallet.balance < commissionAmount) {
        throw new Error('TRANSACTION_REJECTED');
      }

      wallet.balance = Math.round((wallet.balance - commissionAmount) * 100) / 100;
      await wallet.save({ session });

      await Transaction.create([{
        walletId: wallet._id,
        type: 'debit',
        transaction_type: 'COMMISSION',
        balance_before: balanceBefore,
        balance_after: wallet.balance,
        amount: commissionAmount,
        method: 'wallet',
        description: `Comissão da plataforma sobre a venda #${order.code} (${commissionRate}%)`,
        status: 'confirmado',
        reference_id: order._id,
        referenceId: order._id
      }], { session });
    } else if (isFreeSale) {
      await Transaction.create([{
        walletId: wallet._id,
        type: 'debit',
        transaction_type: 'COMMISSION',
        balance_before: balanceBefore,
        balance_after: wallet.balance,
        amount: 0,
        method: 'wallet',
        description: `Comissão 1ª Venda Grátis (0 MT) da venda #${order.code}`,
        status: 'confirmado',
        reference_id: order._id,
        referenceId: order._id
      }], { session });
    }

    // Se a 1ª venda grátis foi usada, atualiza o perfil do vendedor
    if (isFreeSale) {
      sellerUser.seller.free_sale_available = false;
      sellerUser.seller.free_sale_used = true;
      sellerUser.seller.free_sale_used_at = new Date();
      sellerUser.seller.hasUsedFreeSale = true;
      await sellerUser.save({ session });
    }

    // Mark order as processed
    order.isCommissionProcessed = true;
    order.siteTax = commissionAmount;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Perform operational store status checks after commit
    await checkAndDisableSellerIfLowBalance(sellerUser._id);

    return { success: true, commissionAmount, supplierNetAmount, isFreeSale };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Reverse order commission and payouts for the seller wallet in case of refunds or cancellations.
 */
export const reverseSellerOrderFinancials = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const Order = (await import('../models/OrderModel.js')).default;
    const User = (await import('../models/UserModel.js')).default;
    const Provider = (await import('../models/ProviderModel.js')).default;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.isCommissionProcessed) {
      await session.abortTransaction();
      session.endSession();
      return { success: true, notProcessed: true };
    }

    const provider = await Provider.findById(order.seller).session(session);
    if (!provider || !provider.userId) {
      throw new Error('Provider or seller user not found');
    }

    const sellerUser = await User.findById(provider.userId).session(session);
    if (!sellerUser) {
      throw new Error('Seller user account not found');
    }

    let wallet = await Wallet.findOne({ $or: [{ ownerId: sellerUser._id }, { userId: sellerUser._id }] }).session(session);
    if (!wallet) {
      try {
        wallet = await Wallet.create([{ ownerId: sellerUser._id, ownerType: 'seller', userId: sellerUser._id, balance: 0 }], { session });
        wallet = wallet[0];
      } catch (createErr) {
        if (createErr.code === 11000 || createErr.message?.includes('E11000')) {
          wallet = await Wallet.findOne({ $or: [{ ownerId: sellerUser._id }, { userId: sellerUser._id }] }).session(session);
        } else {
          throw createErr;
        }
      }
    }
    const balanceBefore = wallet.balance;

    const commissionAmount = order.siteTax || 0;
    const saleAmount = order.totalPrice || 0;
    const supplierNetAmount = Math.round((saleAmount - commissionAmount) * 100) / 100;

    const isPrepaid = order.paymentMethod !== 'Dinheiro' && order.paymentMethod !== 'Pagamento na entrega';

    if (commissionAmount > 0) {
      wallet.balance = Math.round((wallet.balance + commissionAmount) * 100) / 100;
      await wallet.save({ session });

      await Transaction.create([{
        walletId: wallet._id,
        type: 'credit',
        transaction_type: 'REFUND',
        balance_before: balanceBefore,
        balance_after: wallet.balance,
        amount: commissionAmount,
        method: 'wallet',
        description: `Devolução de comissão sobre a venda #${order.code} (cancelamento/reembolso)`,
        status: 'confirmado',
        reference_id: order._id,
        referenceId: order._id
      }], { session });
    }

    // Restore free sale if it was consumed by this order
    const isFreeSale = commissionAmount === 0 && order.siteTax === 0 && sellerUser.seller.free_sale_used;
    if (isFreeSale) {
      sellerUser.seller.free_sale_available = true;
      sellerUser.seller.free_sale_used = false;
      sellerUser.seller.free_sale_used_at = null;
      sellerUser.seller.hasUsedFreeSale = false;
      await sellerUser.save({ session });
    }

    order.isCommissionProcessed = false;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Trigger operational checks after commit
    await checkAndDisableSellerIfLowBalance(sellerUser._id);

    return { success: true, isFreeSaleRestored: isFreeSale };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
