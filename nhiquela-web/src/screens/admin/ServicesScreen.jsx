import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTools, faEdit, faTrash, faPlus, faSave, faTimes, faSpinner, faTags } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function ServicesScreen() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', categoryId: '', subcategoryId: '', basePrice: '', status: 'Ativo' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [srvRes, catRes, subRes] = await Promise.all([
        api.get('/services').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/subcategories').catch(() => ({ data: [] }))
      ]);
      setServices(srvRes.data);
      setCategories(catRes.data);
      setSubcategories(subRes.data);
    } catch (error) {
      toast.error('Erro ao carregar catálogo de serviços.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setIsEditing(true);
      setCurrentId(service._id);
      setFormData({ 
        name: service.name, 
        categoryId: service.categoryId || '', 
        subcategoryId: service.subcategoryId || '', 
        basePrice: service.basePrice || '', 
        status: service.status || 'Ativo' 
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', categoryId: '', subcategoryId: '', basePrice: '', status: 'Ativo' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId || !formData.basePrice) {
      return toast.error('Nome, Categoria e Preço Base são obrigatórios.');
    }
    
    try {
      if (isEditing) {
        const { data } = await api.put(`/services/${currentId}`, formData);
        setServices(services.map(s => s._id === currentId ? data : s));
        toast.success('Serviço atualizado!');
      } else {
        const { data } = await api.post('/services', formData);
        setServices([...services, data]);
        toast.success('Serviço criado!');
      }
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar o serviço.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar este serviço do catálogo?')) {
      try {
        await api.delete(`/services/${id}`);
        setServices(services.filter(s => s._id !== id));
        toast.success('Eliminado com sucesso!');
      } catch (error) {
        toast.error('Erro ao eliminar serviço.');
      }
    }
  };

  const getCategoryName = (id) => (Array.isArray(categories) ? categories : []).find(c => c._id === id)?.name || 'Sem Categoria';
  const getSubcategoryName = (id) => (Array.isArray(subcategories) ? subcategories : []).find(s => s._id === id)?.name || '';

  const availableSubcategories = Array.isArray(subcategories) ? subcategories.filter(sub => sub.categoryId === formData.categoryId) : [];

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Serviços</h2>
          <span className="text-muted small">Gestão de catálogo de prestadores de serviço</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Serviço
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Serviço</th>
                  <th className="border-0 text-muted py-3">Categoria & Subcategoria</th>
                  <th className="border-0 text-muted py-3">Preço Base</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-3" />
                      <p className="text-muted m-0 fw-bold">A carregar serviços...</p>
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">Nenhum serviço cadastrado.</td>
                  </tr>
                ) : services.map(service => (
                  <tr key={service._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-1">
                        <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 text-primary-custom shadow-sm" style={{ width: '40px', height: '40px' }}>
                          <FontAwesomeIcon icon={faTools} />
                        </div>
                        <span className="fw-bold text-dark">{service.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{getCategoryName(service.categoryId)}</div>
                      {service.subcategoryId && (
                        <small className="text-muted"><FontAwesomeIcon icon={faTags} className="me-1" /> {getSubcategoryName(service.subcategoryId)}</small>
                      )}
                    </td>
                    <td>
                      <span className="fw-bold text-success fs-5">{Number(service.basePrice).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                    </td>
                    <td>
                      <span className={`badge rounded-pill px-3 py-2 ${service.status === 'Ativo' ? 'bg-success-subtle text-success border border-success border-opacity-25' : 'bg-danger-subtle text-danger border border-danger border-opacity-25'}`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(service)} title="Editar"><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(service._id)} title="Eliminar"><FontAwesomeIcon icon={faTrash} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '550px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Nome do Serviço *</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3 fw-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Mecânica Automóvel" required />
                </div>
                
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Categoria Principal *</label>
                    <select 
                      className="form-select bg-light border-0 py-3 rounded-3" 
                      value={formData.categoryId} 
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value, subcategoryId: ''})} 
                      required
                    >
                      <option value="">Selecione...</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Subcategoria (Opcional)</label>
                    <select 
                      className="form-select bg-light border-0 py-3 rounded-3" 
                      value={formData.subcategoryId} 
                      onChange={(e) => setFormData({...formData, subcategoryId: e.target.value})}
                      disabled={!formData.categoryId || availableSubcategories.length === 0}
                    >
                      <option value="">Selecione...</option>
                      {availableSubcategories.map(sub => (
                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                      ))}
                    </select>
                    {formData.categoryId && availableSubcategories.length === 0 && (
                      <div className="form-text text-warning small mt-1">Nenhuma subcategoria registada para esta categoria.</div>
                    )}
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Preço Base (MT) *</label>
                    <input type="number" className="form-control bg-light border-0 py-3 rounded-3 fw-bold" value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: e.target.value})} placeholder="Ex: 1500" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Estado Operacional</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3 fw-bold" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
                
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Serviço'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .bg-success-subtle { background-color: #d1e7dd !important; }
        .bg-danger-subtle { background-color: #f8d7da !important; }
        .shadow-sm-custom { box-shadow: 0 4px 20px rgba(0,0,0,0.03) !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
