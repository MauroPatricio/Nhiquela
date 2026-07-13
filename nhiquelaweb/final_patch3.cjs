const fs = require('fs');

const filepath = 'src/screens/admin/ProviderTypesScreen.jsx';
let lines = fs.readFileSync(filepath, 'utf8').split('\n');

// 1. Add imports
const importLine = lines.findIndex(l => l.includes('faUpload } from'));
if (importLine !== -1) {
  lines[importLine] = lines[importLine].replace('faUpload } from', 'faUpload, faPowerOff, faCheckCircle } from');
}

// 2. Add toggleActive right before fetchTypes
const fetchTypesIdx = lines.findIndex(l => l.includes('const fetchTypes = async () => {'));
if (fetchTypesIdx !== -1 && !lines.find(l => l.includes('const toggleActive'))) {
  const toggleFn = `  const toggleActive = async (type) => {
    try {
      const updatedData = { ...type, isActive: !type.isActive };
      await api.put(\`/provider-types/\${type._id || type.id}\`, updatedData);
      toast.success(\`Estado do tipo "\${type.name}" atualizado!\`);
      fetchTypes();
    } catch (error) {
      toast.error('Erro ao atualizar estado.');
    }
  };

`;
  lines.splice(fetchTypesIdx, 0, toggleFn);
}

// 3. Fix headers and table actions inside the body
const actionIdx = lines.findIndex(l => l.includes('<td className="text-end px-4">'));
if (actionIdx !== -1 && !lines[actionIdx + 2].includes('faPowerOff')) {
  // Replace lines actionIdx to actionIdx + 7
  const newActions = [
    '                    <td className="text-end px-4">',
    '                      <button ',
    '                        className={`btn btn-sm ${type.isActive ? \'btn-light text-warning\' : \'btn-light text-success\'} rounded-3 shadow-sm transition-all hover-transform me-2`} ',
    '                        onClick={() => toggleActive(type)} ',
    '                        title={type.isActive ? "Inativar" : "Ativar"}',
    '                      >',
    '                        <FontAwesomeIcon icon={type.isActive ? faPowerOff : faCheckCircle} />',
    '                      </button>',
    '                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(type)} title="Editar">',
    '                        <FontAwesomeIcon icon={faEdit} />',
    '                      </button>',
    '                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(type._id || type.id)} title="Eliminar">',
    '                        <FontAwesomeIcon icon={faTrash} />',
    '                      </button>',
    '                    </td>'
  ];
  
  lines.splice(actionIdx, 8, ...newActions);
}

let content = lines.join('\n');

const oldBadge1 = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'}\`}>`;
const newBadge1 = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'} px-3 py-2 rounded-pill\`}>`;
content = content.replace(oldBadge1, newBadge1);

// Fix encodings
content = content.replace(/<th className="border-0 py-3 text-muted">Classifica(.*?)o Base<\/th>/g, '<th className="border-0 py-3 text-muted">Classificação Base</th>');
content = content.replace(/<th className="border-0 py-3 text-muted">Descri(.*?)o<\/th>/g, '<th className="border-0 py-3 text-muted">Descrição</th>');
content = content.replace(/<th className="border-0 py-3 text-muted text-end">A(.*?)es<\/th>/g, '<th className="border-0 py-3 text-muted text-end">Ações</th>');
content = content.replace(/<td className="text-muted">\{type.description \|\| 'Sem descri(.*?)o'\}<\/td>/g, '<td className="text-muted">{type.description || \'Sem descrição\'}</td>');
content = content.replace(/<h2 className="fw-bold m-0 text-dark">Tipos de Prestador<\/h2>\s*<span className="text-muted small">Gest(.*?)o das categorias/g, '<h2 className="fw-bold m-0 text-dark">Tipos de Prestador</h2>\n          <span className="text-muted small">Gestão das categorias');


fs.writeFileSync(filepath, content);
console.log('Final patch 3 applied successfully');
