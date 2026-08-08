const fs = require('fs');
let c = fs.readFileSync('routes/userRoutes.js', 'utf8');
// Find and replace the isShopper: req.body.isShopper line
c = c.replace(
  /isShopper: req\.body\.isShopper,(\s*\}\);)/,
  'isShopper: req.body.isShopper,\n            profileImage: req.body.profileImage || null,$1'
);
fs.writeFileSync('routes/userRoutes.js', c, 'utf8');
console.log('Patched userRoutes.js with profileImage field');
