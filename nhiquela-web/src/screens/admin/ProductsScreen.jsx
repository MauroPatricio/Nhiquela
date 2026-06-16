import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus, faEyeSlash, faEye, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">Catálogo de Produtos</h2>
          <span className="text-muted small">Gestão de estoque, preços e fornecedores</span>
        </div>
        <button className="btn bg-primary-custom text-white">
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Novo Produto
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Código / Imagem</th>
                  <th className="border-0 text-muted py-3">Produto</th>
                  <th className="border-0 text-muted py-3">Categoria</th>
                  <th className="border-0 text-muted py-3">Preço</th>
                  <th className="border-0 text-muted py-3">Estoque</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-2" />
                      <p className="text-muted m-0">Carregando produtos do servidor...</p>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">Nenhum produto cadastrado no banco de dados.</td>
                  </tr>
                ) : products.map(product => (
                  <tr key={product._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0].url} alt={product.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} className="me-3 border" />
                        ) : (
                          <div className="bg-light border rounded me-3 d-flex justify-content-center align-items-center" style={{ width: '40px', height: '40px' }}>
                            <span className="text-muted small">Img</span>
                          </div>
                        )}
                        <span className="text-muted small fw-bold">{product._id.substring(0, 8)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-truncate" style={{ maxWidth: '200px' }}>{product.name}</div>
                      <small className="text-muted">{product.brand || 'Sem marca'}</small>
                    </td>
                    <td>{product.category}</td>
                    <td className="fw-bold">{product.price} MZN</td>
                    <td>
                      <span className={`badge rounded-pill ${product.countInStock > 0 ? 'bg-light text-dark' : 'bg-danger'}`}>
                        {product.countInStock} un
                      </span>
                    </td>
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
  );
}
