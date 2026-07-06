import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSpinner, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import api from '../../api';

export default function SupplierProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estado do formulário
  const [currentProduct, setCurrentProduct] = useState({
    _id: '', name: '', price: '', countInStock: '', category: '', description: '', image: ''
  });

  const userInfo = useSelector(selectUser);

  useEffect(() => {
    if (userInfo) {
      fetchProducts();
    }
  }, [userInfo]);

  const fetchProducts = async () => {
    if (!userInfo) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/products?seller=${userInfo._id}`);
      setProducts(data.products || []);
    } catch (error) {
      toast.error('Erro ao buscar produtos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
    
    try {
      if (currentProduct._id) {
        // Edit
        await api.put(`/products/${currentProduct._id}`, currentProduct, config);
        toast.success('Produto atualizado!');
      } else {
        // Create
        await api.post('/products', currentProduct, config);
        toast.success('Produto criado com sucesso!');
      }
      setShowModal(false);
      fetchProducts(); // Recarrega a lista
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este produto? Esta ação não pode ser desfeita.')) {
      try {
        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
        await api.delete(`/products/${id}`, config);
        toast.success('Produto removido!');
        fetchProducts();
      } catch (error) {
        toast.error('Erro ao remover produto.');
      }
    }
  };

  const toggleStatus = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      await api.patch(`/products/${id}/toggle-status`, {}, config);
      toast.success('Status do produto alterado!');
      fetchProducts();
    } catch (error) {
      toast.error('Erro ao alterar status.');
    }
  };

  const openNewProductModal = () => {
    setCurrentProduct({ _id: '', name: '', price: '', countInStock: '', category: '', description: '', image: '' });
    setShowModal(true);
  };

  const openEditProductModal = (prod) => {
    setCurrentProduct({
      _id: prod._id,
      name: prod.name,
      price: prod.priceFromSeller || prod.price,
      countInStock: prod.countInStock,
      category: prod.category?._id || prod.category || '',
      description: prod.description,
      image: prod.image || (prod.images && prod.images.length > 0 ? prod.images[0].url : '')
    });
    setShowModal(true);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">Meus Produtos</h2>
          <span className="text-muted small">Gerencie o seu estoque e catálogo</span>
        </div>
        <button onClick={openNewProductModal} className="btn bg-success text-white shadow-sm">
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Produto
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Produto</th>
                  <th className="border-0 text-muted py-3">Preço</th>
                  <th className="border-0 text-muted py-3">Estoque</th>
                  <th className="border-0 text-muted py-3">Status da Loja</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-success mb-2" />
                      <p className="text-muted m-0">Buscando o seu catálogo...</p>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      Você ainda não possui produtos cadastrados.<br/>Clique em "Novo Produto" para começar a vender.
                    </td>
                  </tr>
                ) : products.map(prod => (
                  <tr key={prod._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center">
                        <img src={prod.image || (prod.images && prod.images.length > 0 ? prod.images[0].url : 'https://via.placeholder.com/40')} alt={prod.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} className="me-3 border" />
                        <div>
                          <div className="fw-bold">{prod.name}</div>
                          <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: '150px' }}>{prod.description}</small>
                        </div>
                      </div>
                    </td>
                    <td className="fw-bold">{prod.priceFromSeller || prod.price} MT</td>
                    <td>
                      <span className={`badge rounded-pill ${prod.countInStock > 0 ? 'bg-light text-dark' : 'bg-danger'}`}>
                        {prod.countInStock} un
                      </span>
                    </td>
                    <td>
                      <button onClick={() => toggleStatus(prod._id)} className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center">
                        <FontAwesomeIcon icon={prod.isActive ? faToggleOn : faToggleOff} size="lg" className={prod.isActive ? 'text-success me-2' : 'text-muted me-2'} />
                        <span className={prod.isActive ? 'text-success fw-bold' : 'text-muted'}>{prod.isActive ? 'Ativo' : 'Oculto'}</span>
                      </button>
                    </td>
                    <td className="text-end px-4">
                      <button onClick={() => openEditProductModal(prod)} className="btn btn-sm btn-outline-primary me-2" title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button onClick={() => handleDelete(prod._id)} className="btn btn-sm btn-outline-danger" title="Eliminar">
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

      {/* Modal Simples Customizado */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0">
                  <h5 className="modal-title fw-bold text-success">{currentProduct._id ? 'Editar Produto' : 'Novo Produto'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSave}>
                    <div className="mb-3">
                      <label className="form-label small text-muted fw-bold">Nome do Produto</label>
                      <input type="text" className="form-control bg-light border-0" required value={currentProduct.name} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} />
                    </div>
                    
                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <label className="form-label small text-muted fw-bold">Preço (MT)</label>
                        <input type="number" className="form-control bg-light border-0" required value={currentProduct.price} onChange={(e) => setCurrentProduct({...currentProduct, price: e.target.value})} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small text-muted fw-bold">Estoque</label>
                        <input type="number" className="form-control bg-light border-0" required value={currentProduct.countInStock} onChange={(e) => setCurrentProduct({...currentProduct, countInStock: e.target.value})} />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small text-muted fw-bold">Categoria (ID ou Nome da Categoria)</label>
                      <input type="text" className="form-control bg-light border-0" required placeholder="Ex: Roupas, Comida..." value={currentProduct.category} onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})} />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small text-muted fw-bold">URL da Imagem</label>
                      <input type="url" className="form-control bg-light border-0" required placeholder="https://..." value={currentProduct.image} onChange={(e) => setCurrentProduct({...currentProduct, image: e.target.value})} />
                    </div>

                    <div className="mb-4">
                      <label className="form-label small text-muted fw-bold">Descrição</label>
                      <textarea className="form-control bg-light border-0" rows="3" required value={currentProduct.description} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}></textarea>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowModal(false)}>Cancelar</button>
                      <button type="submit" disabled={saving} className="btn bg-success text-white rounded-pill px-4 fw-bold">
                        {saving ? <FontAwesomeIcon icon={faSpinner} spin className="me-2" /> : null}
                        Salvar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
