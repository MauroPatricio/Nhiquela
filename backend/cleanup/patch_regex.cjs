const fs = require('fs');

let content = fs.readFileSync('services/walletService.js', 'utf8');

const getWalletRegex = /export const getWallet = async \(userId\) => \{[\s\S]*?return wallet;\n\};/;
const newGetWallet = `export const getWallet = async (userId) => {
  let wallet = await Wallet.findOne({ $or: [{ ownerId: userId }, { userId: userId }] });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: userId, ownerType: 'driver', userId: userId, balance: 0 });
  }
  return wallet;
};`;

content = content.replace(getWalletRegex, newGetWallet);

const hasSufficientRegex = /export const hasSufficientBalance = async \(driverId\) => \{[\s\S]*?return wallet\.balance >= limit;\n\};/;
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

content = content.replace(hasSufficientRegex, newHasSufficient);

fs.writeFileSync('services/walletService.js', content, 'utf8');
console.log('File patched successfully.');
