const fs = require('fs');
let c = fs.readFileSync('src/components/TripCard.tsx', 'utf8');

c = c.replace(/\\\\\`/g, '\`');
c = c.replace(/\\\\\$/g, '$');
c = c.replace(/\\\`/g, '\`');
c = c.replace(/\\\$/g, '$');
c = c.replace(/\\\\D/g, '\\D');

fs.writeFileSync('src/components/TripCard.tsx', c);
console.log('Fixed TripCard.tsx escapes');
