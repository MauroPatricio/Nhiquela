const fs = require('fs');
let c = fs.readFileSync('services/walletService.js', 'utf8');

c = c.replace(/import \{ getIo \} from '\.\.\/index\.js';/g, '// removed getIo');

fs.writeFileSync('services/walletService.js', c, 'utf8');
console.log('Removed getIo');
