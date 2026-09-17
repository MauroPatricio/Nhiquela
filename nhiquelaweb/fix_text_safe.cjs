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
  ' Frmula': ' à Fórmula',
  ' cobrada': ' é cobrada',
  'Configuraes': 'Configurações',
  'Simulaes Rpidas': 'Simulações Rápidas',
  'Simulao': 'Simulação',
  'matemtica': 'matemática',
  'nmero': 'número',
  ' POST': ' é POST',
  'Clculo': 'Cálculo',
  'preo': 'preço',
  'Configuraes': 'Configurações'
};

for (const [bad, good] of Object.entries(replacements)) {
  if(bad === '') continue;
  content = content.split(bad).join(good);
}

content = content.replace(/\uFFFD/g, ''); // Remove bad chars

fs.writeFileSync(filepath, content);
console.log('Fixed encoding safely');
