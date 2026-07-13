const fs = require('fs');
let c = fs.readFileSync('routes/walletRoutes.js', 'utf8');
c = c.replace(/const isManualDeposit = method === .*?;/, "const isManualDeposit = method && method.includes('Manual');");
fs.writeFileSync('routes/walletRoutes.js', c);
