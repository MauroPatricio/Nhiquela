const fs = require('fs');

const filepath = 'src/screens/admin/ProviderTypesScreen.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add imports
if (!content.includes('faPowerOff')) {
  content = content.replace('faUpload } from', 'faUpload, faPowerOff, faCheckCircle } from');
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

// 3. Fix headers and table actions inside the body
const oldBadge1 = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'}\`}>`;
const newBadge1 = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'} px-3 py-2 rounded-pill\`}>`;
content = content.replace(oldBadge1, newBadge1);

// We find the specific line and insert the button
const buttonPattern = `<td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom`;
if (content.includes(buttonPattern)) {
  const newButtonPattern = `<td className="text-end px-4">
                      <button 
                        className={\`btn btn-sm \${type.isActive ? 'btn-light text-warning' : 'btn-light text-success'} rounded-3 shadow-sm transition-all hover-transform me-2\`} 
                        onClick={() => toggleActive(type)} 
                        title={type.isActive ? "Inativar" : "Ativar"}
                      >
                        <FontAwesomeIcon icon={type.isActive ? faPowerOff : faCheckCircle} />
                      </button>
                      <button className="btn btn-sm btn-light text-primary-custom`;
  content = content.replace(buttonPattern, newButtonPattern);
}


// Fix encodings
content = content.replace(/<th className="border-0 py-3 text-muted">Classifica(.*?)o Base<\/th>/g, '<th className="border-0 py-3 text-muted">Classificação Base</th>');
content = content.replace(/<th className="border-0 py-3 text-muted">Descri(.*?)o<\/th>/g, '<th className="border-0 py-3 text-muted">Descrição</th>');
content = content.replace(/<th className="border-0 py-3 text-muted text-end">A(.*?)es<\/th>/g, '<th className="border-0 py-3 text-muted text-end">Ações</th>');
content = content.replace(/<td className="text-muted">\{type.description \|\| 'Sem descri(.*?)o'\}<\/td>/g, '<td className="text-muted">{type.description || \'Sem descrição\'}</td>');
content = content.replace(/<h2 className="fw-bold m-0 text-dark">Tipos de Prestador<\/h2>\s*<span className="text-muted small">Gest(.*?)o das categorias/g, '<h2 className="fw-bold m-0 text-dark">Tipos de Prestador</h2>\n          <span className="text-muted small">Gestão das categorias');


fs.writeFileSync(filepath, content);
console.log('Final patch 2 applied successfully');
