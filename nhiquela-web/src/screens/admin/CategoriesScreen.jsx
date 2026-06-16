import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus, faFolderOpen, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">Categorias e Subcategorias</h2>
          <span className="text-muted small">Estruturação do catálogo de produtos e serviços do servidor</span>
        </div>
        <button className="btn bg-primary-custom text-white">
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Nova Categoria
        </button>
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <div className="card shadow-sm-custom border-0 rounded-3">
            <div className="card-header bg-white border-0 pt-4 pb-2">
              <h5 className="fw-bold m-0">Categorias Principais</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle m-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 text-muted py-3 px-4">Ícone/Imagem</th>
                      <th className="border-0 text-muted py-3">Nome da Categoria</th>
                      <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-5">
                          <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-2" />
                          <p className="text-muted m-0">Carregando do servidor...</p>
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-5 text-muted">Nenhuma categoria cadastrada.</td>
                      </tr>
                    ) : categories.map(cat => (
                      <tr key={cat._id}>
                        <td className="px-4">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} className="border rounded" />
                          ) : (
                            <FontAwesomeIcon icon={faFolderOpen} className="text-primary-custom fs-4" />
                          )}
                        </td>
                        <td className="fw-bold">{cat.name}</td>
                        <td className="text-end px-4">
                          <button className="btn btn-sm btn-outline-primary me-2" title="Editar">
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" title="Eliminar">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3 h-100 bg-light">
            <div className="card-body d-flex flex-column justify-content-center align-items-center text-center p-5">
              <FontAwesomeIcon icon={faFolderOpen} size="3x" className="text-muted mb-3" />
              <h5 className="fw-bold">Gestão de Subcategorias</h5>
              <p className="text-muted small">Selecione uma categoria ao lado para gerenciar suas subcategorias conectadas ao MongoDB.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
