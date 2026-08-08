const fs = require('fs');

const filepath = 'src/screens/admin/ProviderTypesScreen.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add imports
const importRegex = /faUserTie, faEdit, faTrash, faPlus, faSave, faTimes, faSearch, faUpload/;
if (importRegex.test(content)) {
  content = content.replace('faUpload', 'faUpload, faPowerOff, faCheckCircle');
}

// 2. Add toggleActive right before fetchTypes
const fetchTypesMatch = "  const fetchTypes = async () => {";
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
  content = content.replace('  const fetchTypes', toggleFn.trimEnd());
}

// 3. Fix headers and table actions inside the body using simple string replace
const oldBadge1 = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'}\`}>`;
const newBadge1 = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'} px-3 py-2 rounded-pill\`}>`;
content = content.replace(oldBadge1, newBadge1);

const oldActions = `<td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(type)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(type._id || type.id)} title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>`;
const newActions = `<td className="text-end px-4">
                      <button 
                        className={\`btn btn-sm \${type.isActive ? 'btn-light text-warning' : 'btn-light text-success'} rounded-3 shadow-sm transition-all hover-transform me-2\`} 
                        onClick={() => toggleActive(type)} 
                        title={type.isActive ? "Inativar" : "Ativar"}
                      >
                        <FontAwesomeIcon icon={type.isActive ? faPowerOff : faCheckCircle} />
                      </button>
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(type)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(type._id || type.id)} title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>`;
content = content.replace(oldActions, newActions);

const theadOld = `<thead className="bg-light">
                <tr>
                  <th className="border-0 py-3 text-muted">Nome</th>
                  <th className="border-0 py-3 text-muted">Classificação Base</th>
                  <th className="border-0 py-3 text-muted">Descrição</th>
                  <th className="border-0 py-3 text-muted">Estado</th>
                  <th className="border-0 py-3 text-muted text-end">Ações</th>
                </tr>
              </thead>`;
// theadOld might have encoding issues in the actual file, let's just replace the exact th tags.
content = content.replace(/<th className="border-0 py-3 text-muted">Classifica(.*?)o Base<\/th>/g, '<th className="border-0 py-3 text-muted">Classificação Base</th>');
content = content.replace(/<th className="border-0 py-3 text-muted">Descri(.*?)o<\/th>/g, '<th className="border-0 py-3 text-muted">Descrição</th>');
content = content.replace(/<th className="border-0 py-3 text-muted text-end">A(.*?)es<\/th>/g, '<th className="border-0 py-3 text-muted text-end">Ações</th>');
content = content.replace(/<td className="text-muted">\{type.description \|\| 'Sem descri(.*?)o'\}<\/td>/g, '<td className="text-muted">{type.description || \'Sem descrição\'}</td>');
content = content.replace(/<h2 className="fw-bold m-0 text-dark">Tipos de Prestador<\/h2>\s*<span className="text-muted small">Gest(.*?)o das categorias/g, '<h2 className="fw-bold m-0 text-dark">Tipos de Prestador</h2>\n          <span className="text-muted small">Gestão das categorias');


fs.writeFileSync(filepath, content);
console.log('Final patch applied successfully');
