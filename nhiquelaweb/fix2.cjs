const fs = require('fs');

let c = fs.readFileSync('src/screens/admin/VehicleTypesScreen.jsx', 'utf8');

// The file has a literal backtick followed by 'n'
c = c.replace(/<th className="border-0 text-muted py-3">Taxa Mn. \(Disp.\)<\/th>`n\s*<th className="border-0 text-muted py-3">Estado<\/th>/g, 
  '<th className="border-0 text-muted py-3">Taxa Mín. (Disp.)</th>\n                  <th className="border-0 text-muted py-3">Estado</th>');

fs.writeFileSync('src/screens/admin/VehicleTypesScreen.jsx', c, 'utf8');
console.log('Fixed.');
