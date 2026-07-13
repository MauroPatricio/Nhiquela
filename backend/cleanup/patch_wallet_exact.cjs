const fs = require('fs');
let c = fs.readFileSync('services/walletService.js', 'utf8');

c = c.replace(
  "export const getWallet = async (userId) => {\n  let wallet = await Wallet.findOne({ userId });\n  if (!wallet) {\n    wallet = await Wallet.create({ userId, balance: 0 });\n  }\n  return wallet;\n};",
  "export const getWallet = async (userId) => {\n  let wallet = await Wallet.findOne({ $or: [{ ownerId: userId }, { userId: userId }] });\n  if (!wallet) {\n    wallet = await Wallet.create({ ownerId: userId, ownerType: 'driver', userId: userId, balance: 0 });\n  }\n  return wallet;\n};"
);

c = c.replace(
  "export const hasSufficientBalance = async (driverId) => {\n  const wallet = await getWallet(driverId);\n  const config = await getFinancialConfig();\n  \n  const limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;\n  return wallet.balance >= limit;\n};",
  "export const hasSufficientBalance = async (driverId) => {\n  const wallet = await getWallet(driverId);\n  const config = await getFinancialConfig();\n  \n  let limit = config.allowNegativeBalance ? config.creditLimit : config.minOperationalBalance;\n  \n  const driver = await User.findById(driverId);\n  if (driver && driver.deliveryman && driver.deliveryman.transport_type) {\n    const vType = await VehicleType.findOne({ name: driver.deliveryman.transport_type });\n    if (vType && vType.minVisibilityFee > 0) {\n      limit = vType.minVisibilityFee;\n    }\n  }\n  return wallet.balance >= limit;\n};"
);

fs.writeFileSync('services/walletService.js', c, 'utf8');
console.log('Fixed exactly!');
