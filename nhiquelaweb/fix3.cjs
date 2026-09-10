const fs = require('fs');
let c = fs.readFileSync('src/screens/admin/VehicleTypesScreen.jsx', 'utf8');

const oldThead = `<thead className="bg-light">
                  <tr>
                    <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome do Tipo</th>
                    <th className="border-0 text-muted py-3">Categoria</th>
                    <th className="border-0 text-muted py-3">Taxa Base (MT)</th>
                    <th className="border-0 text-muted py-3">Peso Mx. (Capacidade)</th>
                    <th className="border-0 text-muted py-3">Taxa Mn. (Disp.)</th>\`n                  <th className="border-0 text-muted py-3">Estado</th>
                    <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Aes</th>
                  </tr>
                </thead>`;

// Let's use string manipulation to find `<thead className="bg-light">` and `</thead>`
const startIdx = c.indexOf('<thead className="bg-light">');
const endIdx = c.indexOf('</thead>', startIdx) + '</thead>'.length;

if (startIdx !== -1 && endIdx !== -1) {
  const newThead = `<thead className="bg-light">
                  <tr>
                    <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome do Tipo</th>
                    <th className="border-0 text-muted py-3">Categoria</th>
                    <th className="border-0 text-muted py-3">Taxa Base (MT)</th>
                    <th className="border-0 text-muted py-3">Capacidade</th>
                    <th className="border-0 text-muted py-3">Taxa Mín. (Disp.)</th>
                    <th className="border-0 text-muted py-3 text-center">Estado</th>
                    <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                  </tr>
                </thead>`;
  c = c.substring(0, startIdx) + newThead + c.substring(endIdx);
  fs.writeFileSync('src/screens/admin/VehicleTypesScreen.jsx', c, 'utf8');
  console.log('Fixed thead.');
} else {
  console.log('thead not found.');
}
