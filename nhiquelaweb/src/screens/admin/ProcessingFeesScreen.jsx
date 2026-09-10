import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar, faEdit, faTrash, faPlus, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function ProcessingFeesScreen() {
  const [fees, setFees] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ 
    serviceType: 'prescription', 
    amount: 0, 
    percentage: 0, 
    exemptForPremium: false, 
    establishment: '',
    isActive: true
  });
  
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentFees,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(fees, 10, ['serviceType']);

  const serviceTypes = [
    { value: 'prescription', label: 'Receita Médica' },
    { value: 'shopping_list', label: 'Lista de Compras' },
    { value: 'special_order', label: 'Pedido Especial' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [feesRes, estRes] = await Promise.all([
        api.get('/processing-fees'),
        api.get('/users?isSeller=true') // Assuming users endpoint can filter sellers, or use /users route logic
      ]);
      setFees(feesRes.data || []);
      // Some sellers might be returned directly in data or data.users
      setEstablishments(estRes.data.users || estRes.data || []);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (fee = null) => {
    if (fee) {
      setIsEditing(true);
      setCurrentId(fee._id);
      setFormData({ 
        serviceType: fee.serviceType || 'prescription', 
        amount: fee.amount || 0, 
        percentage: fee.percentage || 0, 
        exemptForPremium: fee.exemptForPremium || false,
        establishment: fee.establishment?._id || fee.establishment || '',
        isActive: fee.isActive ?? true
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ 
        serviceType: 'prescription', 
        amount: 0, 
        percentage: 0, 
        exemptForPremium: false, 
        establishment: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.establishment) delete payload.establishment;

      if (isEditing) {
        await api.put(`/processing-fees/${currentId}`, payload);
        toast.success('Taxa atualizada com sucesso!');
      } else {
        await api.post('/processing-fees', payload);
        toast.success('Taxa criada com sucesso!');
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao guardar taxa');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar esta taxa?')) {
      try {
        await api.delete(`/processing-fees/${id}`);
        toast.success('Taxa eliminada com sucesso!');
        fetchData();
      } catch (error) {
        toast.error('Erro ao eliminar taxa');
      }
    }
  };

  const getServiceLabel = (value) => {
    return serviceTypes.find(s => s.value === value)?.label || value;
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Taxas de Processamento</h2>
          <span className="text-muted small">Configuração de taxas para pedidos baseados em documentos</span>
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
            Nova Taxa
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Tipo de Serviço</th>
                  <th className="border-0 text-muted py-3">Valor Fixo</th>
                  <th className="border-0 text-muted py-3">Percentagem</th>
                  <th className="border-0 text-muted py-3">Estabelecimento Alvo</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">A carregar...</td>
                  </tr>
                ) : currentFees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">Nenhuma taxa configurada.</td>
                  </tr>
                ) : currentFees.map(fee => (
                  <tr key={fee._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="p-2 bg-primary-subtle rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm fs-5" style={{ width: '45px', height: '45px' }}>
                          <FontAwesomeIcon icon={faFileInvoiceDollar} />
                        </div>
                        <span className="fw-bold text-dark">{getServiceLabel(fee.serviceType)}</span>
                      </div>
                    </td>
                    <td>{fee.amount > 0 ? `${fee.amount.toFixed(2)} MT` : '-'}</td>
                    <td>{fee.percentage > 0 ? `${fee.percentage}%` : '-'}</td>
                    <td>
                      {fee.establishment ? (
                        <span className="badge bg-info text-dark">{fee.establishment.name || fee.establishment.seller?.name || 'Parceiro Específico'}</span>
                      ) : (
                        <span className="badge bg-secondary">Global</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${fee.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {fee.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(fee)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(fee._id)} title="Eliminar">
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Taxa' : 'Nova Taxa de Processamento'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Tipo de Serviço</label>
                  <select 
                    className="form-select bg-light border-0 py-2 rounded-3"
                    value={formData.serviceType}
                    onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                    required
                  >
                    {serviceTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Valor Fixo (MT)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      className="form-control bg-light border-0 py-2 rounded-3" 
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Percentagem (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      className="form-control bg-light border-0 py-2 rounded-3" 
                      value={formData.percentage}
                      onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Estabelecimento (Opcional - Regra Específica)</label>
                  <select 
                    className="form-select bg-light border-0 py-2 rounded-3"
                    value={formData.establishment}
                    onChange={(e) => setFormData({...formData, establishment: e.target.value})}
                  >
                    <option value="">Aplicar Globalmente</option>
                    {establishments.map(est => (
                      <option key={est._id} value={est._id}>{est.seller?.name || est.name}</option>
                    ))}
                  </select>
                </div>

                <div className="row mb-4">
                  <div className="col-6">
                    <div className="form-check mt-2">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="exempt" 
                        checked={formData.exemptForPremium}
                        onChange={(e) => setFormData({...formData, exemptForPremium: e.target.checked})}
                      />
                      <label className="form-check-label small text-muted ms-2" htmlFor="exempt">
                        Isentar Clientes "Excelente"
                      </label>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-check mt-2">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="active" 
                        checked={formData.isActive}
                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      />
                      <label className="form-check-label small text-muted ms-2" htmlFor="active">
                        Taxa Ativa
                      </label>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {isEditing ? 'Guardar Alterações' : 'Criar Taxa'}
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
