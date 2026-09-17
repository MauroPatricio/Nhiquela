import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faEdit, faTrash, faPlus, faSave, faTimes, faSearch, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    icon: '', 
    status: 'Ativo', 
    order: 0, 
    type: '0 - Numerário / Dinheiro' 
  });
  
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentMethods,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(methods, 10, ['name', 'description', 'type']);

  const paymentTypes = [
    '0 - Numerário / Dinheiro', '1 - Carteira Digital', '2 - Transferência Móvel', '3 - Transferência Bancária / VISA'
  ];

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const { data } = await api.get('/payment-methods');
      setMethods(data || []);
    } catch (error) {
      toast.error('Erro ao carregar métodos de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (method = null) => {
    if (method) {
      setIsEditing(true);
      setCurrentId(method._id || method.id);
      setFormData({ 
        name: method.name || '', 
        description: method.description || '', 
        icon: method.icon || '', 
        status: method.status || 'Ativo',
        order: method.order ?? 0,
        type: method.type || '0 - Numerário / Dinheiro'
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ 
        name: '', 
        description: '', 
        icon: '', 
        status: 'Ativo', 
        order: 0, 
        type: '0 - Numerário / Dinheiro' 
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const toggleStatus = async (method) => {
    const newStatus = method.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      await api.put(`/payment-methods/${method._id || method.id}`, { status: newStatus });
      toast.success(`Método ${newStatus.toLowerCase()} com sucesso!`);
      fetchMethods();
    } catch (error) {
      toast.error('Erro ao alterar estado do método');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('O nome � obrigatório');
    if (!formData.type) return toast.error('O tipo � obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/payment-methods/${currentId}`, formData);
        toast.success('Método atualizado com sucesso!');
      } else {
        await api.post('/payment-methods', formData);
        toast.success('Método criado com sucesso!');
      }
      fetchMethods();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar método de pagamento');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar este método de pagamento?')) {
      try {
        await api.delete(`/payment-methods/${id}`);
        toast.success('Método eliminado com sucesso!');
        fetchMethods();
      } catch (error) {
        toast.error('Erro ao eliminar método');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Formas de Pagamento</h2>
          <span className="text-muted small">Gestão global de métodos de pagamento do sistema</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar método..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Novo Método
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Método</th>
                  <th className="border-0 text-muted py-3">Tipo</th>
                  <th className="border-0 text-muted py-3">Ordem</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">A carregar...</td>
                  </tr>
                ) : currentMethods.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">Nenhum método encontrado.</td>
                  </tr>
                ) : currentMethods.map(method => (
                  <tr key={method._id || method.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="p-2 bg-primary-subtle rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm fs-4 overflow-hidden" style={{ width: '50px', height: '50px' }}>
                          {method.icon && method.icon.startsWith('http') ? (
                            <img src={method.icon} alt={method.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : method.icon ? (
                            <span>{method.icon}</span>
                          ) : (
                            <FontAwesomeIcon icon={faWallet} size="sm" />
                          )}
                        </div>
                        <div>
                          <span className="fw-bold text-dark fs-6 d-block">{method.name}</span>
                          <span className="text-muted small">{method.description}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{method.type}</span>
                    </td>
                    <td>{method.order}</td>
                    <td>
                      <div 
                        className="d-inline-block transition-all" 
                        style={{ cursor: 'pointer' }} 
                        onClick={() => toggleStatus(method)}
                        title="Clique para alterar o estado"
                      >
                        {method.status === 'Ativo' ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle hover-transform"><FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Ativo</span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle hover-transform"><FontAwesomeIcon icon={faTimesCircle} className="me-1" /> Inativo</span>
                        )}
                      </div>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(method)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(method._id || method.id)} title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls 
            currentPage={currentPage} totalPages={totalPages} 
            onNext={nextPage} onPrev={prevPage} 
            totalItems={totalItems} indexOfFirstItem={indexOfFirstItem} indexOfLastItem={indexOfLastItem}
          />
        </div>
      </div>

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '600px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Método' : 'Novo Método de Pagamento'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="row mb-3">
                  <div className="col-md-8">
                    <label className="form-label fw-bold small text-muted mb-1">Nome</label>
                    <input 
                      type="text" 
                      className="form-control bg-light border-0 py-2 rounded-3" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: M-Pesa"
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Ícone</label>
                    <input 
                      type="text" 
                      className="form-control bg-light border-0 py-2 rounded-3 mb-2" 
                      value={formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      placeholder="URL ou Emoji"
                    />
                    <div className="d-flex flex-wrap gap-1">
                      {['💰', '💳', '🏦', '📱', '💵', '🪙', '💸', '💲'].map(emoji => (
                        <button 
                          type="button" 
                          key={emoji} 
                          className={`btn btn-sm ${formData.icon === emoji ? 'bg-primary-custom text-white border-0' : 'btn-light text-dark border'}`}
                          style={{ padding: '0.2rem 0.4rem', fontSize: '1.1rem' }}
                          onClick={() => setFormData({...formData, icon: emoji})}
                          title="Usar este emoji"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                  <textarea 
                    className="form-control bg-light border-0 py-2 rounded-3" 
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Breve descrição do método"
                  ></textarea>
                </div>

                <div className="row mb-4">
                  <div className="col-md-5">
                    <label className="form-label fw-bold small text-muted mb-1">Tipo de Pagamento</label>
                    <select 
                      className="form-select bg-light border-0 py-2 rounded-3"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      required
                    >
                      {paymentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Estado</label>
                    <select 
                      className="form-select bg-light border-0 py-2 rounded-3"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small text-muted mb-1">Ordem</label>
                    <input 
                      type="number" 
                      className="form-control bg-light border-0 py-2 rounded-3" 
                      value={formData.order}
                      onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {isEditing ? 'Guardar Alterações' : 'Criar Método'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-success-subtle { background-color: #d1e7dd !important; }
        .bg-danger-subtle { background-color: #f8d7da !important; }
        .hover-transform:hover { transform: translateY(-3px); }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
