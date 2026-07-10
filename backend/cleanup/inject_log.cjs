const fs = require('fs');
let c = fs.readFileSync('services/walletService.js', 'utf8');

c = c.replace(/return wallet\.balance >= limit;\s*\};/g, 
`  console.log('hasSufficientBalance debug:', { driverId, balance: wallet.balance, limit, transport_type: driver?.deliveryman?.transport_type });
  return wallet.balance >= limit;
};`);

fs.writeFileSync('services/walletService.js', c, 'utf8');
console.log('Injected console.log');
