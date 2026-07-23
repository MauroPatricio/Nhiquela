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
  } catch (err) {
    console.error('Erro ao ler comissao do settings:', err);
  }

  return financialEngine;
};

/** Helper: Calculate exact commission based on subcategory rules */
export const calculateDynamicCommission = async (order) => {
  const financialConfig = await getFinancialConfig();
  let defaultCommissionRate = financialConfig?.driverCommissionRate || 0.15;
  
  // Para serviços (RequestService), o preço do serviço é pricetopay ou costServico, e o deslocamento é deliveryPrice ou costDeslocacao
  let servicePrice = order.pricing?.breakdown?.servicePrice || order.pricing?.costServico || order.servicePrice || order.pricetopay || 0;
  let distancePrice = order.pricing?.breakdown?.distancePrice || order.pricing?.costDeslocacao || order.distancePrice || order.deliveryPrice || 0;

  // Se não existir o breakdown (por exemplo, pedidos antigos de loja ou simples), fallback para usar o total
  if (servicePrice === 0 && distancePrice === 0) {
    servicePrice = order.pricing?.totalPrice || order.totalPrice || 0;
  }

  const categoryRefId = order.subcategoryId || order.serviceId;

  if (categoryRefId) {
    try {
      const ProviderSubcategory = (await import('../models/ProviderSubcategoryModel.js')).default;
      const subId = categoryRefId._id ? categoryRefId._id : categoryRefId;
      const sub = await ProviderSubcategory.findById(subId);
      
      if (sub) {
        let servComm = sub.serviceCommission !== undefined && sub.serviceCommission !== null ? sub.serviceCommission : defaultCommissionRate * 100;
        
        let sCommAmt = servicePrice * (servComm / 100);
        let dCommAmt = distancePrice * defaultCommissionRate; // Sempre usa a global (ex: 15%)
        
        return sCommAmt + dCommAmt;
      }
    } catch(err) {
      console.error('Error calculating dynamic commission for subcategory:', err);
    }
  }
  
  // Caso não tenha subcategoria, aplica a taxa global a tudo
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
export const debitCommission = async (driverId, amount) => {
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
  const wallet = await getWallet(driverId);

  const config = await getFinancialConfig();
  
  let limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
  
  const driver = driverDoc || await User.findById(driverId);
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

  // Suspend driver if balance falls below required minimum after this debit
  const config = await getFinancialConfig();
  const limit = await getDriverMinimumBalance(driverId, config, session);
  if (config.autoDisableOnLowBalance && wallet.balance < limit) {
    const driver = await User.findById(driverId).session(session);
    if (driver) {
      driver.status = 'Inativo'; // Suspenso por falta de saldo
      if (!driver.deliveryman) driver.deliveryman = {};
      driver.deliveryman.register_conformance = 'INCONFORMANCE';
      await driver.save({ session });
    }
  }

  // Note: we don't commit the session here, the route controller does it
  return wallet;
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
