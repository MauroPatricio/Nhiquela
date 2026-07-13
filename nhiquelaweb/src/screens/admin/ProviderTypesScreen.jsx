import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserTie, faEdit, faTrash, faPlus, faSave, faTimes, faSearch, faUpload, faPowerOff, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';
import { 
  FaStore, FaWrench, FaBroom, FaCar, FaTruck, 
  FaPaintRoller, FaHammer, FaPlug, FaWater, FaTree, FaCut, FaUtensils, FaTshirt, FaLaptop,
  FaMotorcycle, FaShoppingCart, FaBox, FaTruckMoving, FaTruckPickup, FaEllipsisH,
  FaPills, FaClinicMedical, FaFire, FaGasPump, FaTruckLoading, FaShippingFast, FaDolly, FaShuttleVan, FaCarCrash
} from 'react-icons/fa';

const AVAILABLE_ICONS = [
  { id: 'store', component: FaStore, label: 'Loja' },
  { id: 'wrench', component: FaWrench, label: 'Mecânica' },
  { id: 'broom', component: FaBroom, label: 'Limpeza' },
  { id: 'car', component: FaCar, label: 'Carro' },
  { id: 'truck', component: FaTruck, label: 'Transporte' },
  { id: 'paint-roller', component: FaPaintRoller, label: 'Pintura' },
  { id: 'hammer', component: FaHammer, label: 'Construção' },
  { id: 'plug', component: FaPlug, label: 'Eletricidade' },
  { id: 'water', component: FaWater, label: 'Canalização' },
  { id: 'tree', component: FaTree, label: 'Jardinagem' },
  { id: 'cut', component: FaCut, label: 'Beleza' },
  { id: 'utensils', component: FaUtensils, label: 'Comida' },
  { id: 'tshirt', component: FaTshirt, label: 'Roupa' },
  { id: 'laptop', component: FaLaptop, label: 'Eletrónica' },
  { id: 'motorcycle', component: FaMotorcycle, label: 'Mota' },
  { id: 'shopping-cart', component: FaShoppingCart, label: 'Compras' },
  { id: 'box', component: FaBox, label: 'Encomenda' },
  { id: 'truck-moving', component: FaTruckMoving, label: 'Mudança' },
  { id: 'truck-pickup', component: FaTruckPickup, label: 'Reboque' },
  { id: 'car-crash', component: FaCarCrash, label: 'Serviço de Reboque' },
  { id: 'gas-pump', component: FaGasPump, label: 'Gás a Domicílio' },
  { id: 'fire', component: FaFire, label: 'Gás/Fogo' },
  { id: 'truck-loading', component: FaTruckLoading, label: 'Mudanças' },
  { id: 'dolly', component: FaDolly, label: 'Cargas' },
  { id: 'shipping-fast', component: FaShippingFast, label: 'Encomendas Expresso' },
  { id: 'ellipsis-h', component: FaEllipsisH, label: 'Outros' },
  { id: 'pills', component: FaPills, label: 'Farmácia' },
  { id: 'clinic', component: FaClinicMedical, label: 'Clínica' },
];

export default function ProviderTypesScreen() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [classifications, setClassifications] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', classificationId: '', description: '', isActive: true, iconUrl: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentTypes,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(types, 10, ['name', 'description']);

  useEffect(() => {
    fetchTypes();
    fetchClassifications();
  }, []);

  const fetchClassifications = async () => {
    try {
      const { data } = await api.get('/provider-classifications');
      setClassifications(data.filter(c => c.isActive) || []);
    } catch (error) {
      toast.error('Erro ao carregar classificações');
    }
  };

  const toggleActive = async (type) => {
    try {
      const updatedData = { ...type, isActive: !type.isActive };
      await api.put(`/provider-types/${type._id || type.id}`, updatedData);
      toast.success(`Estado do tipo "${type.name}" atualizado!`);
      fetchTypes();
    } catch (error) {
      toast.error('Erro ao atualizar estado.');
    }
  };


  const fetchTypes = async () => {
    try {
      const { data } = await api.get('/provider-types');
      setTypes(data || []);
    } catch (error) {
      toast.error('Erro ao carregar tipos de prestador');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type = null) => {
    if (type) {
      setIsEditing(true);
      setCurrentId(type._id || type.id);
      setFormData({ 
        name: type.name || '', 
        classificationId: type.classificationId?._id || type.classificationId || '',
        description: type.description || '', 
        isActive: type.isActive !== undefined ? type.isActive : true,
        iconUrl: type.iconUrl || ''
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', classificationId: classifications.length > 0 ? classifications[0]._id : '', description: '', isActive: true, iconUrl: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);
    setUploadingImage(true);
    try {
      const { data } = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, iconUrl: data.secure_url });
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
  e.preventDefault();
  if (!formData.name) return toast.error('O nome é obrigatório');

  try {

    if (isEditing) {
      await api.put(`/provider-types/${currentId}`, formData);
      toast.success('Tipo atualizado com sucesso!');
    } else {
      await api.post('/provider-types', formData);
      toast.success('Tipo criado com sucesso!');
    }
    fetchTypes();
    handleCloseModal();
  } catch (error) {
    toast.error('Erro ao guardar tipo de prestador');
  }
};

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar este tipo de prestador?')) {
      try {
        await api.delete(`/provider-types/${id}`);
        toast.success('Tipo eliminado com sucesso!');
        fetchTypes();
      } catch (error) {
        toast.error('Erro ao eliminar tipo');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Tipos de Prestador</h2>
          <span className="text-muted small">Gestão das categorias de prestadores (BUSINESS / SERVICE)</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Novo Tipo
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
                  <th className="border-0 text-muted py-3">Classificação Base</th>
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
                ) : currentTypes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">Nenhum tipo encontrado.</td>
                  </tr>
                ) : currentTypes.map(type => (
                  <tr key={type._id || type.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="p-2 bg-primary-subtle rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm fs-4 overflow-hidden" style={{ width: '50px', height: '50px', position: 'relative' }}>
                          {type.iconUrl && type.iconUrl.startsWith('http') ? (
                            <img src={type.iconUrl} alt={type.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
                          ) : type.iconUrl && AVAILABLE_ICONS.find(i => i.id === type.iconUrl) ? (
                            (() => {
                              const IconComp = AVAILABLE_ICONS.find(i => i.id === type.iconUrl).component;
                              return <IconComp size={20} />;
                            })()
                          ) : (
                            <FontAwesomeIcon icon={faUserTie} size="sm" />
                          )}
                        </div>
                        <span className="fw-bold text-dark fs-6">{type.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-info text-white fw-bold px-3 py-2 rounded-pill`}>
                        {type.classificationId?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="text-muted">{type.description || 'Sem descrição'}</td>
                    <td>
                      <span className={`badge ${type.isActive ? 'bg-success' : 'bg-danger'} px-3 py-2 rounded-pill`}>
                        {type.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button 
                        className={`btn btn-sm ${type.isActive ? 'btn-light text-warning' : 'btn-light text-success'} rounded-3 shadow-sm transition-all hover-transform me-2`} 
                        onClick={() => toggleActive(type)} 
                        title={type.isActive ? "Inativar" : "Ativar"}
                      >
                        <FontAwesomeIcon icon={type.isActive ? faPowerOff : faCheckCircle} />
                      </button>
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(type)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(type._id || type.id)} title="Eliminar">
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Tipo' : 'Novo Tipo de Prestador'}</h5>
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
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Supermercados, Estética..."
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-2">Ícone ou Imagem</label>
                  <div className="bg-white border p-3 rounded-3 shadow-sm" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <div className="d-flex flex-wrap gap-2">
                      {/* Botão de Upload */}
                      <button
                        type="button"
                        className="btn btn-outline-primary d-flex flex-column align-items-center justify-content-center p-2 transition-all"
                        style={{ width: '60px', height: '60px', borderRadius: '12px' }}
                        onClick={() => document.getElementById('iconUpload').click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faUpload} size="lg" className="mb-1" />
                          </>
                        )}
                      </button>
                      <input type="file" id="iconUpload" style={{display: 'none'}} accept="image/*" onChange={handleImageUpload} />
                      
                      {/* Imagem Customizada */}
                      {formData.iconUrl && formData.iconUrl.startsWith('http') && (
                        <div className="position-relative" style={{ width: '60px', height: '60px' }}>
                          <img src={formData.iconUrl} alt="Icon" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '2px solid #8a2be2' }} />
                        </div>
                      )}

                      {AVAILABLE_ICONS.map(iconObj => {
                        const IconComp = iconObj.component;
                        const isSelected = formData.iconUrl === iconObj.id;
                        return (
                          <button
                            key={iconObj.id}
                            type="button"
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-outline-secondary'} d-flex flex-column align-items-center justify-content-center p-2 transition-all`}
                            style={{ width: '60px', height: '60px', borderRadius: '12px', borderWidth: isSelected ? '2px' : '1px' }}
                            onClick={() => setFormData({ ...formData, iconUrl: iconObj.id })}
                            title={iconObj.label}
                          >
                            <IconComp size={22} className={isSelected ? 'text-white' : 'text-secondary'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Classificação Base</label>
                  <select 
                    className="form-select bg-light border-0 py-3 rounded-3"
                    value={formData.classificationId}
                    onChange={(e) => setFormData({...formData, classificationId: e.target.value})}
                    required
                  >
                    <option value="">Selecione uma classificação</option>
                    {classifications.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                  <textarea 
                    className="form-control bg-light border-0 py-3 rounded-3" 
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição do tipo"
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
                    Tipo de Prestador Ativo
                  </label>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {isEditing ? 'Guardar Alterações' : 'Criar Tipo'}
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
