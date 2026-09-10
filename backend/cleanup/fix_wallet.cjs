const fs = require('fs');

let c = fs.readFileSync('routes/walletRoutes.js', 'utf8');

// Fix updateWallet signature and variables
c = c.replace(/async function updateWallet\(userId.*?\{/, "async function updateWallet(ownerId, amount, type, method, description, status = 'confirmado', ownerType = 'driver') {");
c = c.replace(/let wallet = await Wallet\.findOne.*?userId.*?;/, "let wallet = await Wallet.findOne({ ownerId }).session(session);");
c = c.replace(/wallet = await Wallet\.create.*?userId.*?].*?;/, "wallet = await Wallet.create([{ ownerId, ownerType, balance: 0 }], { session });");

// Fix balance increment to only happen if status is confirmado
c = c.replace(/wallet\.balance \+= \(type === 'credit' \? amount : -amount\);\s*await wallet\.save\(\{ session \}\);/, 
  "if (status === 'confirmado') { wallet.balance += (type === 'credit' ? amount : -amount); await wallet.save({ session }); }");

c = c.replace(/const balance = await updateWallet\([\s\S]*?\);/, `
    const isManualDeposit = method === 'Depósito Manual' || method === 'Deposito Manual';
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
`);

fs.writeFileSync('routes/walletRoutes.js', c, 'utf8');
console.log('Fixed walletRoutes.js');
