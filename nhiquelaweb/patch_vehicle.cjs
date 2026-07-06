const fs = require('fs');

let content = fs.readFileSync('src/screens/admin/VehicleTypesScreen.jsx', 'utf8');

// 1. Add table header
content = content.replace(
  '<th className="border-0 text-muted py-3">Peso M\\uFFFdx. (Capacidade)</th>',
  '<th className="border-0 text-muted py-3">Peso M\\uFFFdx. (Capacidade)</th>\n                  <th className="border-0 text-muted py-3">Taxa Mín. Disponibilidade</th>'
);
content = content.replace(
  '<th className="border-0 text-muted py-3">Peso Mx. (Capacidade)</th>',
  '<th className="border-0 text-muted py-3">Peso Mx. (Capacidade)</th>\n                  <th className="border-0 text-muted py-3">Taxa Mín. Disponibilidade</th>'
);
content = content.replace(
  '<th className="border-0 text-muted py-3">Peso Máx. (Capacidade)</th>',
  '<th className="border-0 text-muted py-3">Peso Máx. (Capacidade)</th>\n                  <th className="border-0 text-muted py-3">Taxa Mín. Disponibilidade</th>'
);

// 2. Add table cell
content = content.replace(
  /<td><span className="text-muted fw-bold">\{vehicle\.capacityKg \|\| vehicle\.maxWeight \|\| 'N\/A'\}<\/span><\/td>/g,
  '<td><span className="text-muted fw-bold">{vehicle.capacityKg || vehicle.maxWeight || \'N/A\'}</span></td>\n                    <td><span className="text-dark fw-bold">{vehicle.minVisibilityFee || 0} MT</span></td>'
);

// 3. Add to modal initial state
content = content.replace(
  /basePrice: 0, maxWeight: '', status: 'Ativo' \}\);/g,
  'basePrice: 0, minVisibilityFee: 0, maxWeight: \'\', status: \'Ativo\' });'
);

// 4. Add input field to form
const inputHtml = `
                  <div className="col-12">
                    <label className="form-label fw-bold small text-muted mb-1">Taxa Mín. p/ Disponibilidade (MT)</label>
                    <input type="number" className="form-control bg-light border-0 py-3 rounded-3" value={formData.minVisibilityFee || 0} onChange={(e) => setFormData({...formData, minVisibilityFee: Number(e.target.value)})} placeholder="Ex: 50" required />
                  </div>
`;
content = content.replace(
  /<div className="col-6">\s*<label className="form-label fw-bold small text-muted mb-1">Status<\/label>/,
  inputHtml + '\n                  <div className="col-6">\n                    <label className="form-label fw-bold small text-muted mb-1">Status</label>'
);

fs.writeFileSync('src/screens/admin/VehicleTypesScreen.jsx', content, 'utf8');
console.log('File patched successfully.');
