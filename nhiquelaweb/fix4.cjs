const fs = require('fs');
let c = fs.readFileSync('src/screens/admin/VehicleTypesScreen.jsx', 'utf8');

c = c.replace(
  /<td>\s*<span className=\{\`badge rounded-pill \$\{vehicle\.status === 'Ativo'/g,
  '<td className="text-center">\n                      <span className={`badge rounded-pill ${vehicle.status === \'Ativo\''
);

fs.writeFileSync('src/screens/admin/VehicleTypesScreen.jsx', c, 'utf8');
console.log('Fixed tbody.');
