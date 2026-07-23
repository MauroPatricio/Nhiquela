import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags, faEdit, faTrash, faPlus, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function ProviderClassificationsScreen() {
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });
  
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(classifications, 10, ['name', 'description']);

  useEffect(() => {
    fetchClassifications();
  }, []);

  const fetchClassifications = async () => {
    try {
      const { data } = await api.get('/provider-classifications');
      setClassifications(data || []);
    } catch (error) {
      toast.error('Erro ao carregar classificações');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditing(true);
      setCurrentId(item._id || item.id);
      setFormData({ 
        name: item.name || '', 
        description: item.description || '', 
        isActive: item.isActive !== undefined ? item.isActive : true
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', description: '', isActive: true });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('O nome � obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/provider-classifications/${currentId}`, formData);
        toast.success('Classificação atualizada com sucesso!');
      } else {
        await api.post('/provider-classifications', formData);
        toast.success('Classificação criada com sucesso!');
      }
      fetchClassifications();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar classificação');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar esta classificação? Se existirem tipos associados, poderá haver erros.')) {
      try {
        await api.delete(`/provider-classifications/${id}`);
        toast.success('Classificação eliminada com sucesso!');
        fetchClassifications();
      } catch (error) {
        toast.error('Erro ao eliminar classificação');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Classificações de Prestador</h2>
          <span className="text-muted small">Gestão das classificações base (ex: BUSINESS, SERVICE, FREELANCER)</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Nova Classificação
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome</th>
                  <th className="border-0 text-muted py-3">Descrição</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">A carregar...</td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">Nenhuma classificação encontrada.</td>
                  </tr>
                ) : currentData.map(item => (
                  <tr key={item._id || item.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="p-2 bg-primary-subtle rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm fs-4 overflow-hidden" style={{ width: '50px', height: '50px' }}>
                          <FontAwesomeIcon icon={faTags} size="sm" />
                        </div>
                        <span className="fw-bold text-dark fs-6">{item.name}</span>
                      </div>
                    </td>
                    <td className="text-muted">{item.description || 'Sem descrição'}</td>
                    <td>
                      <span className={`badge ${item.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {item.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(item)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(item._id || item.id)} title="Eliminar">
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
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Classificação' : 'Nova Classificação'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome</label>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0 py-3 rounded-3" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    placeholder="Ex: BUSINESS, SERVICE, FREELANCER"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                  <textarea 
                    className="form-control bg-light border-0 py-3 rounded-3" 
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição da classificação"
                  ></textarea>
                </div>
                <div className="form-check mb-4">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    id="isActiveCheck"
                  />
                  <label className="form-check-label fw-bold small text-muted ms-2" htmlFor="isActiveCheck">
                    Classificação Ativa
                  </label>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {isEditing ? 'Guardar Alterações' : 'Criar Classificação'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .text-primary-custom { color: #8a2be2 !important; }
        .hover-transform:hover { transform: translateY(-3px); }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
