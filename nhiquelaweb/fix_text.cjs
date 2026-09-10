const fs = require('fs');

const filepath = 'src/screens/admin/DeliveryTariffsScreen.jsx';
let content = fs.readFileSync(filepath, 'utf8');

const replacements = {
  'Preos': 'Preços',
  'Preo': 'Preço',
  'Estratgia': 'Estratégia',
  'clculo': 'cálculo',
  'aplicvel': 'aplicável',
  'Escales': 'Escalões',
  'Frmula Varivel': 'Fórmula Variável',
  'Frmula': 'Fórmula',
  'Variveis': 'Variáveis',
  'Varivel': 'Variável',
  'mnimo': 'mínimo',
  'Quilmetro': 'Quilómetro',
  'distncia': 'distância',
  'Servio': 'Serviço',
  ' Frmula': 'à Fórmula',
  ' cobrada': 'é cobrada',
  'Configuraes': 'Configurações',
  'Simulaes Rpidas': 'Simulações Rápidas',
  'Simulao': 'Simulação',
  'matemtica': 'matemática',
  'nmero': 'número',
  'j': 'já',
  ' POST': 'é POST',
  'Clculo': 'Cálculo',
  'preo': 'preço',
  'Quilmetro': 'Quilómetro',
  '': 'x', // For "(Km  {pricePerKm} MT)"
};

for (const [bad, good] of Object.entries(replacements)) {
  // Use split/join to replace all occurrences globally
  content = content.split(bad).join(good);
}

// Any remaining unicode replacement characters  (U+FFFD)
content = content.replace(/\uFFFD/g, ''); // Remove any remaining unknown chars to avoid errors

fs.writeFileSync(filepath, content);
console.log('Fixed encoding issues in DeliveryTariffsScreen.jsx');
