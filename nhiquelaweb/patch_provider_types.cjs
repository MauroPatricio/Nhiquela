const fs = require('fs');

const filepath = 'src/screens/admin/ProviderTypesScreen.jsx';
let content = fs.readFileSync(filepath, 'utf8');

const replacements = {
  'Gesto': 'Gestão',
  'Classificao': 'Classificação',
  'Descrio': 'Descrição',
  'Aes': 'Ações',
  'cone': 'Ícone',
  'Alteraes': 'Alterações',
  'Esttica': 'Estética',
  'Mecnica': 'Mecânica',
  'Construo': 'Construção',
  'Canalizao': 'Canalização',
  'Eletrnica': 'Eletrónica',
  'Mudana': 'Mudança',
  'Farmcia': 'Farmácia',
  'Clnica': 'Clínica',
  'Opes': 'Opções',
  'Informaes': 'Informações'
};

for (const [bad, good] of Object.entries(replacements)) {
  content = content.split(bad).join(good);
}
content = content.replace(/\uFFFD/g, ''); // Remove any lingering invalid unicode characters

// Insert toggleActive function
const fetchTypesMatch = "const fetchTypes = async () => {";
if (content.includes(fetchTypesMatch) && !content.includes('toggleActive')) {
  const toggleFn = `
  const toggleActive = async (type) => {
    try {
      const updatedData = { ...type, isActive: !type.isActive };
      await api.put(\`/provider-types/\${type._id || type.id}\`, updatedData);
      toast.success(\`Estado do tipo "\${type.name}" atualizado!\`);
      fetchTypes();
    } catch (error) {
      toast.error('Erro ao atualizar estado.');
    }
  };

  const fetchTypes`;
  content = content.replace('const fetchTypes', toggleFn.trim());
}

// Replace badge
const badgeRegex = /<span className={`badge \${type\.isActive \? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-2`}>[\s\S]*?<\/span>/;
if (badgeRegex.test(content)) {
  const newBadge = `<span 
                        className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-2 cursor-pointer\`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActive(type)}
                        title="Clique para ativar/desativar"
                      >
                        {type.isActive ? 'Ativo' : 'Inativo'}
                      </span>`;
  content = content.replace(badgeRegex, newBadge);
}

fs.writeFileSync(filepath, content);
console.log('Patched ProviderTypesScreen.jsx');
