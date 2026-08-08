import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faIdBadge, faTrash, faEye, faSearch, faSpinner, faMapMarkerAlt, faPlus, faTimes, faSave, faEdit } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function ProvidersScreen() {
  const [providers, setProviders] = useState([]);
  const [providerTypes, setProviderTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    provider_type_id: '',
    categoryId: '',
    status: 'active'
  });

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentProviders,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(providers, 10, ['name', 'providerType']);

  useEffect(() => {
    fetchProviders();
    fetchDropdownData();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data } = await api.get('/providers');
      setProviders(data.providers || []);
    } catch (error) {
      toast.error('Erro ao carregar os provedores.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [ptRes, catRes] = await Promise.all([
        api.get('/provider-types').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] }))
      ]);
      
      const ptData = Array.isArray(ptRes.data) ? ptRes.data : (ptRes.data.providerTypes || []);
      const catData = Array.isArray(catRes.data) ? catRes.data : (catRes.data.categories || []);
      
      setProviderTypes(ptData);
      setCategories(catData);
    } catch (error) {
      console.error('Erro ao carregar dados dos selects');
    }
  };

  const handleOpenModal = (provider = null) => {
    if (provider) {
      setIsEditing(true);
      setCurrentId(provider._id);
      setFormData({
        name: provider.name || '',
        provider_type_id: provider.provider_type_id?._id || '',
        categoryId: provider.categoryId?._id || '',
        status: provider.status || 'active'
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        name: '',
        provider_type_id: '',
        categoryId: '',
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.provider_type_id) {
      return toast.error('Nome e Tipo de Provedor são obrigatórios.');
    }

    try {
      if (isEditing) {
        await api.put(`/providers/${currentId}`, formData);
        toast.success('Provedor atualizado com sucesso!');
      } else {
        await api.post('/providers', formData);
        toast.success('Provedor criado com sucesso!');
      }
      fetchProviders();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao guardar provedor');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este provedor permanentemente?')) {
      try {
        await api.delete(`/providers/${id}`);
        toast.success('Provedor eliminado com sucesso!');
        fetchProviders();
      } catch (error) {
        toast.error('Erro ao eliminar provedor');
      }
    }
  };

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Provedores (Providers)</h2>
          <span className="text-muted small">Lista completa de provedores registados e os seus tipos</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar provedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Provedor
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Provedor</th>
                  <th className="border-0 text-muted py-3">Tipo de Provedor</th>
                  <th className="border-0 text-muted py-3">Categoria</th>
                  <th className="border-0 text-muted py-3">Representante / Dono</th>
                  <th className="border-0 text-muted py-3 text-center">Status</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted"><FontAwesomeIcon icon={faSpinner} spin className="me-2"/> A carregar provedores...</td></tr>
                ) : currentProviders.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">Nenhum provedor encontrado.</td></tr>
                ) : currentProviders.map(provider => (
                  <tr key={provider._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="bg-light rounded-circle border d-flex justify-content-center align-items-center text-muted me-3" style={{width:'45px', height:'45px'}}>
                          <FontAwesomeIcon icon={faStore} />
                        </div>
                        <div>
                          <span className="fw-bold text-dark d-block">{provider.name}</span>
                          <span className="text-muted small">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-danger"/>
                            {provider.location?.province?.name || 'Localização não definida'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-primary-custom text-white fw-bold px-3 py-2 rounded-pill">
                        {provider.provider_type_id?.name || provider.providerType || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="text-dark small">{provider.categoryId?.name || 'N/A'}</span>
                    </td>
                    <td>
                      {provider.userId ? (
                        <>
                          <span className="text-dark small d-block fw-bold">{provider.userId.name}</span>
                          <span className="text-muted" style={{fontSize: '11px'}}>{provider.userId.phoneNumber || provider.userId.email}</span>
                        </>
                      ) : (
                        <span className="text-muted small">Não associado</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`badge rounded-pill px-3 py-2 ${provider.status === 'active' ? 'bg-success-subtle text-success border border-success border-opacity-25' : provider.status === 'suspended' ? 'bg-danger-subtle text-danger border border-danger border-opacity-25' : 'bg-warning-subtle text-warning text-dark border border-warning border-opacity-25'}`}>
                        {provider.status === 'active' ? 'Ativo' : (provider.status === 'suspended' ? 'Suspenso' : 'Pendente')}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(provider)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(provider._id)} title="Eliminar">
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Provedor' : 'Novo Provedor'}</h5>
              <button type="button" className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome do Provedor</label>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0 py-3 rounded-3" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Pastelaria Doces Finos"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Tipo de Provedor</label>
                  <select 
                    className="form-select bg-light border-0 py-3 rounded-3"
                    value={formData.provider_type_id}
                    onChange={(e) => setFormData({...formData, provider_type_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione um Tipo...</option>
                    {providerTypes.map(pt => (
                      <option key={pt._id} value={pt._id}>{pt.name} - {pt.description}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Categoria Principal</label>
                  <select 
                    className="form-select bg-light border-0 py-3 rounded-3"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  >
                    <option value="">Nenhuma / Opcional</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Status</label>
                  <select 
                    className="form-select bg-light border-0 py-3 rounded-3"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Ativo</option>
                    <option value="pending">Pendente</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {isEditing ? 'Guardar Alterações' : 'Registar Provedor'}
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
        .bg-warning-subtle { background-color: #fff3cd !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
