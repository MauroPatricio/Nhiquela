const fs = require('fs');
let c = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
// Fix escaped backticks and dollars
c = c.replace(/\\\\\`/g, '\`');
c = c.replace(/\\\\\$/g, '$');
c = c.replace(/\\\`/g, '\`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync('src/screens/HomeScreen.tsx', c);
console.log('Fixed escaped chars');
