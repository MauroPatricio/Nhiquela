import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMotorcycle, faCar, faTruck, faEdit, faTrash, faPlus, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function VehicleTypesScreen() {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      const { data } = await api.get('/vehicle-types');
      setVehicleTypes(data || []);
    } catch (error) {
      toast.error('Erro ao carregar tipos de veículo');
    } finally {
      setLoading(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', iconName: 'faCar', maxWeight: '', status: 'Ativo' });
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentVehicleTypes,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(vehicleTypes, 10, ['name', 'maxWeight', 'status']);

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'faMotorcycle': return faMotorcycle;
      case 'faTruck': return faTruck;
      default: return faCar;
    }
  };

  const handleOpenModal = (vehicle = null) => {
    if (vehicle) {
      setIsEditing(true);
      setCurrentId(vehicle._id || vehicle.id);
      setFormData({ ...vehicle });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', iconName: 'faCar', category: 'ligeiro', basePrice: 0, maxWeight: '', status: 'Ativo' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Nome do tipo de veículo é obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/vehicle-types/${currentId}`, formData);
        toast.success('Tipo de veículo atualizado!');
      } else {
        await api.post('/vehicle-types', formData);
        toast.success('Tipo de veículo criado!');
      }
      fetchVehicleTypes();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar tipo de veículo');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminar este tipo de veículo permanentemente?')) {
      try {
        await api.delete(`/vehicle-types/${id}`);
        toast.success('Eliminado com sucesso!');
        fetchVehicleTypes();
      } catch (error) {
        toast.error('Erro ao eliminar tipo de veículo');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Tipos de Veículo</h2>
          <span className="text-muted small">Gestão de categorias de transporte e capacidades</span>
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
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Tipo
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome do Tipo</th>
                  <th className="border-0 text-muted py-3">Categoria</th>
                  <th className="border-0 text-muted py-3">Taxa Base (MZN)</th>
                  <th className="border-0 text-muted py-3">Peso Máx. (Capacidade)</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">A carregar tipos de veículo...</td></tr>
                ) : currentVehicleTypes.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">Nenhum tipo de veículo encontrado.</td></tr>
                ) : currentVehicleTypes.map(vehicle => (
                  <tr key={vehicle._id || vehicle.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-1">
                        <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 text-primary-custom shadow-sm" style={{ width: '40px', height: '40px' }}>
                          <FontAwesomeIcon icon={getIcon(vehicle.iconName || vehicle.icon)} />
                        </div>
                        <span className="fw-bold text-dark">{vehicle.name}</span>
                      </div>
                    </td>
                    <td><span className="text-muted fw-bold text-capitalize">{vehicle.category || 'ligeiro'}</span></td>
                    <td><span className="text-dark fw-bold">{vehicle.basePrice || 0} MZN</span></td>
                    <td><span className="text-muted fw-bold">{vehicle.capacityKg || vehicle.maxWeight || 'N/A'}</span></td>
                    <td>
                      <span className={`badge rounded-pill ${vehicle.status === 'Ativo' || vehicle.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {vehicle.status || (vehicle.isActive ? 'Ativo' : 'Inativo')}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(vehicle)}><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(vehicle._id || vehicle.id)}><FontAwesomeIcon icon={faTrash} /></button>
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Tipo de Veículo' : 'Novo Tipo de Veículo'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome (ex: Mota, Furgão)</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Categoria</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                      <option value="leve">Leve (Motocicletas, Bicicletas)</option>
                      <option value="ligeiro">Ligeiro (Carros Pequenos, Ligeiros)</option>
                      <option value="pesado">Pesado (Camiões, Furgões grandes)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Taxa Base (MZN)</label>
                    <input type="number" className="form-control bg-light border-0 py-3 rounded-3" value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})} required />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Capacidade de Carga / Peso Máx.</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.maxWeight || formData.capacityKg || ''} onChange={(e) => setFormData({...formData, capacityKg: e.target.value, maxWeight: e.target.value})} placeholder="Ex: 50 kg" />
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Ícone</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.iconName} onChange={(e) => setFormData({...formData, iconName: e.target.value})}>
                      <option value="faMotorcycle">Mota</option>
                      <option value="faCar">Carro</option>
                      <option value="faTruck">Camião/Furgão</option>
                    </select>
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
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Tipo'}
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
