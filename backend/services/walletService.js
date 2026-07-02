// backend/services/walletService.js
import Wallet from '../models/WalletModel.js';
import User from '../models/UserModel.js';
import Partner from '../models/PartnerModel.js';
import PricingEngine from '../models/PricingEngineModel.js';
import VehicleType from '../models/VehicleTypeModel.js';
// removed getIo // Assuming io can be fetched, or we pass io/emit elsewhere. 
// Wait, we can't easily import io from index.js directly if it doesn't export it. Let's just use a callback or require it conditionally.
// A better way is to avoid importing index.js to prevent circular dependencies. I will just rely on the driver routes for WebSocket or use a global if available. We can do it safely.

export const getFinancialConfig = async () => {
  let engineConfig = await PricingEngine.findOne();
  if (!engineConfig) {
    engineConfig = new PricingEngine();
    await engineConfig.save();
  }
  return engineConfig.financialEngine;
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
    wallet.balance -= amount;
  } else {
    wallet.balance = Math.max(0, wallet.balance - amount);
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
  return { wallet, commission };
};

/** Helper: check whether driver has enough balance */
export const hasSufficientBalance = async (driverId) => {
  const wallet = await getWallet(driverId);
  const config = await getFinancialConfig();
  
  let limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
  
  const driver = await User.findById(driverId);
  if (driver && driver.deliveryman && driver.deliveryman.transport_type) {
    const vType = await VehicleType.findOne({ name: driver.deliveryman.transport_type });
    if (vType && vType.minVisibilityFee > 0) {
      limit = vType.minVisibilityFee;
    }
  }
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
