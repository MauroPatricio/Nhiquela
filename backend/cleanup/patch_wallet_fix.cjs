const fs = require('fs');

let content = fs.readFileSync('services/walletService.js', 'utf8');

if (!content.includes("import VehicleType")) {
  content = content.replace("import PricingEngine from '../models/PricingEngineModel.js';", "import PricingEngine from '../models/PricingEngineModel.js';\nimport VehicleType from '../models/VehicleTypeModel.js';");
}

const originalGetWallet = `export const getWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
  }
  return wallet;
};`;

const newGetWallet = `export const getWallet = async (userId) => {
  let wallet = await Wallet.findOne({ $or: [{ ownerId: userId }, { userId: userId }] });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: userId, ownerType: 'driver', userId: userId, balance: 0 });
  }
  return wallet;
};`;

const originalHasSufficient = `export const hasSufficientBalance = async (driverId) => {
  const wallet = await getWallet(driverId);
  const config = await getFinancialConfig();
  
  const limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
  return wallet.balance >= limit;
};`;

const newHasSufficient = `export const hasSufficientBalance = async (driverId) => {
  const wallet = await getWallet(driverId);
  const config = await getFinancialConfig();
  
  let limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;
  
  // Substituir o limite pelo minVisibilityFee do veículo, se existir
  const driver = await User.findById(driverId);
  if (driver && driver.deliveryman && driver.deliveryman.transport_type) {
    const vType = await VehicleType.findOne({ name: driver.deliveryman.transport_type });
    if (vType && vType.minVisibilityFee > 0) {
      limit = vType.minVisibilityFee;
    }
  }

  return wallet.balance >= limit;
};`;

content = content.replace(originalGetWallet, newGetWallet);
content = content.replace(originalHasSufficient, newHasSufficient);

fs.writeFileSync('services/walletService.js', content, 'utf8');
console.log('File patched successfully.');
