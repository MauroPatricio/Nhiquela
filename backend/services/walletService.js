// backend/services/walletService.js
import Wallet from '../models/WalletModel.js';
import User from '../models/UserModel.js';
import Partner from '../models/PartnerModel.js';

const DRIVER_MIN_BALANCE = 500; // Minimum operational credit (MT) for drivers

/** Get or create a wallet for a user or partner */
export const getWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
  }
  return wallet;
};

/** Debit a commission from the driver’s wallet */
export const debitCommission = async (driverId, amount) => {
  const wallet = await getWallet(driverId);
  wallet.balance = Math.max(0, wallet.balance - amount);
  await wallet.save();

  // If balance falls below the minimum, mark driver offline
  if (wallet.balance < DRIVER_MIN_BALANCE) {
    await User.findByIdAndUpdate(driverId, { isDeliveryMan: false });
  }
  return wallet;
};

/** Credit a recharge to the driver’s wallet */
export const creditWallet = async (driverId, amount) => {
  const wallet = await getWallet(driverId);
  wallet.balance += amount;
  await wallet.save();

  // Reactivate driver if balance is now sufficient
  if (wallet.balance >= DRIVER_MIN_BALANCE) {
    await User.findByIdAndUpdate(driverId, { isDeliveryMan: true });
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
  return wallet.balance >= DRIVER_MIN_BALANCE;
};

/** Reset daily sales for all partners */
export const resetDailySales = async () => {
  await Partner.updateMany({}, { salesDay: 0 });
};

/** Reset monthly sales for all partners */
export const resetMonthlySales = async () => {
  await Partner.updateMany({}, { salesMonth: 0 });
};
