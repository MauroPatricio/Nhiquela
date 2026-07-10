const fs = require('fs');
let c = fs.readFileSync('services/walletService.js', 'utf8');

c = c.replace(
  /console\.log\('hasSufficientBalance debug:'.*?\);\n/s,
  ''
);

fs.writeFileSync('services/walletService.js', c, 'utf8');
console.log('Cleaned up debug log');
