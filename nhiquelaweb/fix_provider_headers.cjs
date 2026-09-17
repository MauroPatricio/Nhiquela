const fs = require('fs');

const filepath = 'src/screens/admin/ProviderTypesScreen.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Fix Table Headers
const theadRegex = /<thead[\s\S]*?<\/thead>/;
if (theadRegex.test(content)) {
  const newThead = `<thead className="bg-light">
                <tr>
                  <th className="border-0 py-3 text-muted">Nome</th>
                  <th className="border-0 py-3 text-muted">Classificação Base</th>
                  <th className="border-0 py-3 text-muted">Descrição</th>
                  <th className="border-0 py-3 text-muted">Estado</th>
                  <th className="border-0 py-3 text-muted text-end">Ações</th>
                </tr>
              </thead>`;
  content = content.replace(theadRegex, newThead);
}

// 2. Fix the page title/description
const headerRegex = /<h2 className="fw-bold m-0 text-dark">Tipos de Prestador<\/h2>[\s\S]*?<\/div>/;
if (headerRegex.test(content)) {
  const newHeader = `<h2 className="fw-bold m-0 text-dark">Tipos de Prestador</h2>
          <span className="text-muted small">Gestão das categorias de prestadores (BUSINESS / SERVICE)</span>
        </div>`;
  content = content.replace(headerRegex, newHeader);
}

// 3. Add toggle button to the actions column
const importRegex = /faEdit, faTrash, faPlus, faSave, faTimes, faSearch, faUpload/;
if (importRegex.test(content)) {
  content = content.replace('faUpload', 'faUpload, faPowerOff, faCheckCircle');
}

const actionColumnRegex = /<td className="align-middle text-end">[\s\S]*?<\/td>/;
if (actionColumnRegex.test(content)) {
  const newActionColumn = `<td className="align-middle text-end">
                      <button 
                        className={\`btn btn-sm \${type.isActive ? 'btn-light text-warning' : 'btn-light text-success'} rounded-3 shadow-sm transition-all hover-transform me-2\`} 
                        onClick={() => toggleActive(type)} 
                        title={type.isActive ? "Inativar" : "Ativar"}
                      >
                        <FontAwesomeIcon icon={type.isActive ? faPowerOff : faCheckCircle} />
                      </button>
                      <button className="btn btn-sm btn-light text-primary rounded-3 shadow-sm transition-all hover-transform me-2" onClick={() => openEditModal(type)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(type._id || type.id)} title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>`;
  // We need to replace ALL occurrences if we use global, but there's only one in the map
  content = content.replace(actionColumnRegex, newActionColumn);
}

// Also ensure the badge is not clickable anymore since we have a dedicated button
const badgeRegex = /<span[\s]*className=\{`badge \$\{type\.isActive \? 'bg-success' : 'bg-danger'\} rounded-pill px-3 py-2 cursor-pointer`\}[\s\S]*?<\/span>/;
if (badgeRegex.test(content)) {
  const newBadge = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-2\`}>
                        {type.isActive ? 'Ativo' : 'Inativo'}
                      </span>`;
  content = content.replace(badgeRegex, newBadge);
} else {
  // If the old regex matches
  const oldBadgeRegex = /<span className=\{`badge \$\{type\.isActive \? 'bg-success' : 'bg-danger'\} rounded-pill px-3 py-2`\}>[\s\S]*?<\/span>/;
  if (oldBadgeRegex.test(content)) {
      const newBadge = `<span className={\`badge \${type.isActive ? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-2\`}>
                            {type.isActive ? 'Ativo' : 'Inativo'}
                          </span>`;
      content = content.replace(oldBadgeRegex, newBadge);
  }
}


fs.writeFileSync(filepath, content);
console.log('Fixed headers and added toggle button');
