import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faEdit, faTrash, faPlus, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function ProvincesScreen() {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const { data } = await api.get('/provinces');
      setProvinces(data.provinces || []);
    } catch (error) {
      toast.error('Erro ao carregar províncias');
    } finally {
      setLoading(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', status: 'Ativo' });
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentProvinces,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(provinces, 10, ['name', 'code', 'status']);

  const handleOpenModal = (province = null) => {
    if (province) {
      setIsEditing(true);
      setCurrentId(province._id || province.id);
      setFormData({ ...province });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', code: '', status: 'Ativo' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Nome da província é obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/provinces/${currentId}`, formData);
        toast.success('Província atualizada!');
      } else {
        await api.post('/provinces', formData);
        toast.success('Província criada!');
      }
      fetchProvinces();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar província');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminar esta província permanentemente?')) {
      try {
        await api.delete(`/provinces/${id}`);
        toast.success('Eliminado com sucesso!');
        fetchProvinces();
      } catch (error) {
        toast.error('Erro ao eliminar província');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Províncias e Regiões</h2>
          <span className="text-muted small">Gestão de zonas de operação e cobertura</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar província..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nova Província
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome da Província</th>
                  <th className="border-0 text-muted py-3">Código/Sigla</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">A carregar províncias...</td></tr>
                ) : currentProvinces.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">Nenhuma província encontrada.</td></tr>
                ) : currentProvinces.map(province => (
                  <tr key={province._id || province.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-1">
                        <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 text-primary-custom shadow-sm" style={{ width: '40px', height: '40px' }}>
                          <FontAwesomeIcon icon={faMapMarkerAlt} />
                        </div>
                        <span className="fw-bold text-dark">{province.name}</span>
                      </div>
                    </td>
                    <td><span className="text-muted fw-bold">{province.code}</span></td>
                    <td>
                      <span className={`badge rounded-pill ${province.status === 'Ativo' ? 'bg-success' : 'bg-secondary'}`}>
                        {province.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(province)}><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(province._id || province.id)}><FontAwesomeIcon icon={faTrash} /></button>
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Província' : 'Nova Província'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome da Província</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Sigla / Código</label>
                    <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="Ex: MPM" />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Status</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Província'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
