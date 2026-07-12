// src/screens/admin/ProviderSubcategoriesScreen.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags, faEdit, faTrash, faPlus, faSave, faTimes, faSearch, faUpload } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';
import { 
  FaStore, FaWrench, FaBroom, FaCar, FaTruck, 
  FaPaintRoller, FaHammer, FaPlug, FaWater, FaTree, FaCut, FaUtensils, FaTshirt, FaLaptop,
  FaMotorcycle, FaShoppingCart, FaBox, FaTruckMoving, FaTruckPickup, FaEllipsisH,
  FaPills, FaClinicMedical, FaFire, FaGasPump, FaTruckLoading, FaShippingFast, FaDolly, FaShuttleVan, FaCarCrash,
  FaTaxi, FaBiking, FaBurn
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
  { id: 'taxi', component: FaTaxi, label: 'Táxi' },
  { id: 'biking', component: FaBiking, label: 'Estafeta (Mota)' },
  { id: 'burn', component: FaBurn, label: 'Botija de Gás' },
];

/**
 * Subcategorias de Tipos de Prestadores
 * Allows managing provider subcategories linked to a provider type.
 * Uses the same visual style as other admin screens for consistency.
 */
export default function ProviderSubcategoriesScreen() {
  // Data
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerTypes, setProviderTypes] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    providerTypeId: '',
    description: '',
    isActive: true,
    iconUrl: '',
    motives: [],
    originFloors: [],
    loadingHelpOptions: [],
    requiresPhotos: false,
    vehicleTypes: [],
    pricingMode: 'AUTO',
  });
  const [iconPreview, setIconPreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Pagination & search
  const {
    currentPage,
    searchQuery,
    setSearchQuery,
    currentData,
    totalPages,
    nextPage,
    prevPage,
    totalItems,
    indexOfFirstItem,
    indexOfLastItem,
  } = usePagination(subcategories, 10, ['name', 'description']);

  // -------------------------------------------------
  // Fetch data
  // -------------------------------------------------
  useEffect(() => {
    fetchSubcategories();
    fetchProviderTypes();
    fetchVehicleTypes();
  }, []);

  const fetchSubcategories = async () => {
    try {
      const { data } = await api.get('/provider-subcategories');
      setSubcategories(data || []);
    } catch (error) {
      toast.error('Erro ao carregar subcategorias');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderTypes = async () => {
    try {
      const { data } = await api.get('/provider-types');
      setProviderTypes(data || []);
    } catch (error) {
      toast.error('Erro ao carregar tipos de prestador');
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const { data } = await api.get('/vehicle-types');
      setVehicleTypes(data || []);
    } catch (error) {
      toast.error('Erro ao carregar tipos de viatura');
    }
  };

  // -------------------------------------------------
  // Modal handling
  // -------------------------------------------------
  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditing(true);
      setCurrentId(item._id || item.id);
      setFormData({
        name: item.name || '',
        providerTypeId: item.providerTypeId?._id || item.providerTypeId || '',
        description: item.description || '',
        isActive: item.isActive !== undefined ? item.isActive : true,
        iconUrl: item.iconUrl || '',
        motives: item.motives || [],
        originFloors: item.originFloors || [],
        loadingHelpOptions: item.loadingHelpOptions || [],
        requiresPhotos: item.requiresPhotos || false,
        vehicleTypes: item.vehicleTypes?.map(v => v._id || v) || [],
        pricingMode: item.pricingMode || 'AUTO',
        order: item.order !== undefined ? item.order : 0,
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        name: '',
        providerTypeId: providerTypes.length > 0 ? providerTypes[0]._id : '',
        description: '',
        isActive: true,
        iconUrl: '',
        motives: [],
        originFloors: [],
        loadingHelpOptions: [],
        requiresPhotos: false,
        vehicleTypes: [],
        pricingMode: 'AUTO',
        order: 0,
      });
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

  // -------------------------------------------------
  // CRUD actions
  // -------------------------------------------------
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('O nome é obrigatório');
    if (!formData.providerTypeId) return toast.error('Selecione um tipo de prestador');
    try {
      if (isEditing) {
        await api.put(`/provider-subcategories/${currentId}`, formData);
        toast.success('Subcategoria atualizada com sucesso!');
      } else {
        await api.post('/provider-subcategories', formData);
        toast.success('Subcategoria criada com sucesso!');
      }
      fetchSubcategories();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar subcategoria');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar esta subcategoria?')) {
      try {
        await api.delete(`/provider-subcategories/${id}`);
        toast.success('Subcategoria eliminada com sucesso!');
        fetchSubcategories();
      } catch (error) {
        toast.error('Erro ao eliminar subcategoria');
      }
    }
  };

  // -------------------------------------------------
  // Render
  // -------------------------------------------------
  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Subcategorias de Tipos de Prestador</h2>
          <span className="text-muted small">Gestão das subcategorias vinculadas a cada tipo de prestador</span>
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
          <button
            className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2"
            onClick={() => handleOpenModal()}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Nova Subcategoria
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Ordem</th>
                  <th className="border-0 text-muted py-3">Nome</th>
                  <th className="border-0 text-muted py-3">Tipo de Prestador</th>
                  <th className="border-0 text-muted py-3">Classificação Base</th>
                  <th className="border-0 text-muted py-3">Tipos de Viatura</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">A carregar...</td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">Nenhuma subcategoria encontrada.</td>
                  </tr>
                ) : (
                  currentData.map(item => (
                    <tr key={item._id || item.id}>
                      <td className="px-4 fw-bold text-primary-custom" style={{ fontSize: '1.2rem' }}>
                        {item.order !== undefined ? item.order : 0}
                      </td>
                      <td>
                        <div className="d-flex align-items-center py-2">
                          <div className="p-2 bg-primary-subtle rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm fs-4 overflow-hidden" style={{ width: '50px', height: '50px' }}>
                            {item.iconUrl && AVAILABLE_ICONS.find(i => i.id === item.iconUrl) ? (
                              (() => {
                                const IconComp = AVAILABLE_ICONS.find(i => i.id === item.iconUrl).component;
                                return <IconComp size={20} />;
                              })()
                            ) : (
                              <FontAwesomeIcon icon={faTags} size="sm" />
                            )}
                          </div>
                          <span className="fw-bold text-dark fs-6">{item.name}</span>
                        </div>
                      </td>
                      <td className="text-muted">
                        {item.providerTypeId?.name || 'N/A'}
                      </td>
                      <td className="text-muted">
                        <span className="badge bg-light text-dark border">
                          {item.providerTypeId?.classificationId?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {item.vehicleTypes && item.vehicleTypes.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {item.vehicleTypes.map(vt => (
                              <span key={vt._id || vt} className="badge bg-secondary-subtle text-secondary border">
                                {vt.name || 'Desconhecido'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small">Nenhum</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge rounded-pill ${item.isActive ? 'bg-success' : 'bg-secondary'}`}>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onNext={nextPage}
            onPrev={prevPage}
            totalItems={totalItems}
            indexOfFirstItem={indexOfFirstItem}
            indexOfLastItem={indexOfLastItem}
          />
        </div>
      </div>

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Subcategoria' : 'Nova Subcategoria'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="card-body p-4" style={{ overflowY: 'auto' }}>
              <form onSubmit={handleSave}>
                <div className="row mb-3">
                  <div className="col-8">
                    <label className="form-label fw-bold small text-muted mb-1">Nome</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-3 rounded-3"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: MiniMercado, Supermercado de Bairro"
                      required
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label fw-bold small text-muted mb-1">Ordem</label>
                    <input
                      type="number"
                      className="form-control bg-light border-0 py-3 rounded-3 fw-bold text-primary-custom"
                      value={formData.order}
                      onChange={e => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
                      min="0"
                      required
                    />
                  </div>
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
                        onClick={() => document.getElementById('iconUploadSub').click()}
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
                      <input type="file" id="iconUploadSub" style={{display: 'none'}} accept="image/*" onChange={handleImageUpload} />
                      
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
                  <label className="form-label fw-bold small text-muted mb-1">Tipo de Prestador</label>
                  <select
                    className="form-select bg-light border-0 py-3 rounded-3"
                    value={formData.providerTypeId}
                    onChange={e => setFormData({ ...formData, providerTypeId: e.target.value })}
                    required
                  >
                    <option value="">Selecione um tipo</option>
                    {providerTypes.map(pt => (
                      <option key={pt._id} value={pt._id}>{pt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-2">Tipos de Viatura Associados (Opcional)</label>
                  <div className="d-flex flex-wrap gap-2">
                    {vehicleTypes.map(vt => {
                      const isSelected = formData.vehicleTypes.includes(vt._id);
                      return (
                        <div
                          key={vt._id}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill px-3 py-1 text-nowrap`}
                          onClick={() => {
                            if (isSelected) {
                              setFormData({ ...formData, vehicleTypes: formData.vehicleTypes.filter(id => id !== vt._id) });
                            } else {
                              setFormData({ ...formData, vehicleTypes: [...formData.vehicleTypes, vt._id] });
                            }
                          }}
                          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <span className="small fw-bold">{vt.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Selecione os tipos de viatura (ex: Ligeiro, Motocicleta) que pertencem a esta subcategoria.</small>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                  <textarea
                    className="form-control bg-light border-0 py-3 rounded-3"
                    rows="2"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da subcategoria"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-2">Motivos</label>
                  {formData.motives.map((motive, index) => (
                    <div key={index} className="d-flex align-items-center mb-2">
                      <input
                        type="text"
                        className="form-control bg-light border-0 py-2 rounded-3 me-2"
                        value={motive}
                        onChange={(e) => {
                          const newMotives = [...formData.motives];
                          newMotives[index] = e.target.value;
                          setFormData({ ...formData, motives: newMotives });
                        }}
                        placeholder="Descreva o motivo"
                      />
                      <button
                        type="button"
                        className="btn btn-light text-danger rounded-3 p-2 d-flex align-items-center justify-content-center"
                        onClick={() => {
                          const newMotives = formData.motives.filter((_, i) => i !== index);
                          setFormData({ ...formData, motives: newMotives });
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary rounded-pill fw-bold mt-1"
                    onClick={() => setFormData({ ...formData, motives: [...formData.motives, ''] })}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Adicionar Motivo
                  </button>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-2">Pisos de Origem (Ex: p/ Mudanças)</label>
                  {formData.originFloors.map((floor, index) => (
                    <div key={index} className="d-flex align-items-center mb-2">
                      <input
                        type="text"
                        className="form-control bg-light border-0 py-2 rounded-3 me-2"
                        value={floor}
                        onChange={(e) => {
                          const newFloors = [...formData.originFloors];
                          newFloors[index] = e.target.value;
                          setFormData({ ...formData, originFloors: newFloors });
                        }}
                        placeholder="Ex: Rés-do-chão, 1.º, etc."
                      />
                      <button
                        type="button"
                        className="btn btn-light text-danger rounded-3 p-2 d-flex align-items-center justify-content-center"
                        onClick={() => {
                          const newFloors = formData.originFloors.filter((_, i) => i !== index);
                          setFormData({ ...formData, originFloors: newFloors });
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary rounded-pill fw-bold mt-1"
                    onClick={() => setFormData({ ...formData, originFloors: [...formData.originFloors, ''] })}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Adicionar Piso
                  </button>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-2">Opções de Ajuda (Ex: Transporte + Carregamento)</label>
                  {formData.loadingHelpOptions.map((opt, index) => (
                    <div key={index} className="d-flex align-items-center mb-2">
                      <input
                        type="text"
                        className="form-control bg-light border-0 py-2 rounded-3 me-2"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...formData.loadingHelpOptions];
                          newOpts[index] = e.target.value;
                          setFormData({ ...formData, loadingHelpOptions: newOpts });
                        }}
                        placeholder="Descreva a opção"
                      />
                      <button
                        type="button"
                        className="btn btn-light text-danger rounded-3 p-2 d-flex align-items-center justify-content-center"
                        onClick={() => {
                          const newOpts = formData.loadingHelpOptions.filter((_, i) => i !== index);
                          setFormData({ ...formData, loadingHelpOptions: newOpts });
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary rounded-pill fw-bold mt-1"
                    onClick={() => setFormData({ ...formData, loadingHelpOptions: [...formData.loadingHelpOptions, ''] })}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Adicionar Opção
                  </button>
                </div>

                  <div className="mb-4">
                    <label className="form-label fw-bold small text-muted mb-2">Modo de Preço</label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="pricingMode"
                          id="pricingModeAuto"
                          value="AUTO"
                          checked={formData.pricingMode === 'AUTO'}
                          onChange={e => setFormData({ ...formData, pricingMode: e.target.value })}
                        />
                        <label className="form-check-label" htmlFor="pricingModeAuto">
                          Calculado pela Plataforma
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="pricingMode"
                          id="pricingModeProvider"
                          value="PROVIDER_DEFINED"
                          checked={formData.pricingMode === 'PROVIDER_DEFINED'}
                          onChange={e => setFormData({ ...formData, pricingMode: e.target.value })}
                        />
                        <label className="form-check-label" htmlFor="pricingModeProvider">
                          Definido pelo Prestador
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.requiresPhotos}
                    onChange={e => setFormData({ ...formData, requiresPhotos: e.target.checked })}
                    id="requiresPhotosCheck"
                  />
                  <label className="form-check-label fw-bold small text-muted ms-2" htmlFor="requiresPhotosCheck">
                    Requer Upload de Fotos
                  </label>
                </div>

                <div className="form-check mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    id="isActiveCheck"
                  />
                  <label className="form-check-label fw-bold small text-muted ms-2" htmlFor="isActiveCheck">
                    Subcategoria Ativa
                  </label>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {isEditing ? 'Guardar Alterações' : 'Criar Subcategoria'}
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
