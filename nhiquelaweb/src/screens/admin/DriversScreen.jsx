import { useState, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faCar, faEdit, faTrash, faPlus, faSave, faTimes, faIdCard, faEye, faMotorcycle, faTruck, faFileAlt, faImage, faCheckCircle, faPhone, faEnvelope, faMapMarkerAlt, faPalette, faShieldAlt, faExclamationTriangle, faStar, faBoxOpen, faSearch, faSpinner, faDownload } from '@fortawesome/free-solid-svg-icons';

import { toast } from 'react-toastify';

import usePagination from '../../hooks/usePagination';

import PaginationControls from '../../components/Admin/PaginationControls';

import api, { SOCKET_URL } from '../../api';

const getImageUrl = (path) => {
  if (!path) return '';
  let normalizedPath = path.replace(/\\/g, '/');
  
  if (normalizedPath.includes('/uploads/')) {
    normalizedPath = normalizedPath.substring(normalizedPath.indexOf('/uploads/'));
  }
  
  if (normalizedPath.startsWith('http') || normalizedPath.startsWith('data:image')) return normalizedPath;
  const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
  return normalizedPath.startsWith('/') ? `${baseUrl}${normalizedPath}` : `${baseUrl}/${normalizedPath}`;
};




export default function DriversScreen() {

  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [vehicleTypes, setVehicleTypes] = useState([]);

  const [servicesList, setServicesList] = useState([]);



  useEffect(() => {

    fetchDrivers();

    fetchVehicleTypes();

    fetchServicesList();

  }, []);



  const fetchDrivers = async () => {

    try {

      const { data } = await api.get('/drivers');
      const sortedDrivers = (data.drivers || []).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a._id.toString().substring(0, 8), 16) * 1000;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b._id.toString().substring(0, 8), 16) * 1000;
        return dateB - dateA;
      });
      setDrivers(sortedDrivers);

    } catch (error) {

      toast.error('Erro ao carregar motoristas');

    } finally {

      setLoading(false);

    }

  };



  const fetchVehicleTypes = async () => {

    try {

      const [{ data: vTypes }, { data: subCats }] = await Promise.all([

        api.get('/vehicle-types'),

        api.get('/provider-subcategories')

      ]);

      setVehicleTypes([...(vTypes || []), ...(subCats || [])]);

    } catch (error) {

      toast.error('Erro ao carregar tipos de veículo/subcategorias');

    }

  };



  const fetchServicesList = async () => {

    try {

      const { data } = await api.get('/catalog/services');

      setServicesList(data || []);

    } catch (error) {

      console.log('Erro ao carregar serviços', error);

    }

  };

  

  const [isEditing, setIsEditing] = useState(false);

  const [currentId, setCurrentId] = useState(null);

  

  // All fields from a standard mobile driver registration

  const [formData, setFormData] = useState({ 

    name: '', email: '', phone: '', password: '',

    transport_type: '', transport_color: 'Branco', plate: '', 

    licenseNumber: '', idNumber: '', document_type: 'bi',

    status: 'Pendente', vehicle_type_id: '', providedServices: []

  });

  

  const [showModal, setShowModal] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [selectedDriver, setSelectedDriver] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);



  const {

    currentPage, searchQuery, setSearchQuery, currentData: currentDrivers,

    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem

  } = usePagination(drivers, 10, ['name', 'phone', 'email', 'plate', 'province']);



  const handleOpenDetails = (driver) => {

    setSelectedDriver(driver);

    setShowDetailsModal(true);

  };



  const handleOpenModal = (driver = null) => {

    if (driver) {

      setIsEditing(true);

      setCurrentId(driver._id || driver.id);

      

      const mappedServices = driver.deliveryman?.providedServices?.map(s => s.serviceId?._id || s.serviceId) || [];

      

      setFormData({ ...driver, phoneNumber: driver.phoneNumber || driver.phone, password: '', providedServices: mappedServices });

    } else {

      setIsEditing(false);

      setCurrentId(null);

      setFormData({

        name: '', email: '', phoneNumber: '', password: '',

        transport_type: '', transport_color: 'Branco', plate: '', 

        licenseNumber: '', idNumber: '', document_type: 'bi',

        status: 'Pendente', vehicle_type_id: '', providedServices: []

      });

    }

    setShowModal(true);

  };



  const handleCloseModal = () => setShowModal(false);



  const handleSave = async (e) => {

    e.preventDefault();

    if (!formData.name) return toast.error('Nome é obrigatório');

    

    try {

      if (isEditing) {

        await api.put(`/drivers/${currentId}`, formData);

        toast.success('Motorista atualizado!');

      } else {

        await api.post('/drivers', formData);

        toast.success('Motorista registado!');

      }

      fetchDrivers();

      handleCloseModal();

    } catch (error) {

      toast.error('Erro ao guardar motorista');

    }

  };



  const handleDelete = async (id) => {

    if (window.confirm('Eliminar este motorista do sistema?')) {

      try {

        await api.delete(`/drivers/${id}`);

        toast.success('Eliminado com sucesso!');

        fetchDrivers();

      } catch (error) {

        toast.error('Erro ao eliminar');

      }

    }

  };



  const handleServiceToggle = (serviceId) => {

    setFormData(prev => {

      const current = prev.providedServices || [];

      if (current.includes(serviceId)) {

        return { ...prev, providedServices: current.filter(id => id !== serviceId) };

      } else {

        return { ...prev, providedServices: [...current, serviceId] };

      }

    });

  };



  const getVehicleIcon = (type) => {

    const name = getVehicleName(type)?.toLowerCase() || '';

    if (name.includes('motocicleta') || name.includes('moto')) return faMotorcycle;

    if (name.includes('caminhao') || name.includes('caminhão')) return faTruck;

    return faCar;

  };



  const getVehicleName = (typeValue) => {

    if (!typeValue) return 'N/A';

    if (/^[a-fA-F0-9]{24}$/.test(typeValue)) {

      const found = vehicleTypes.find(v => v._id === typeValue || v.id === typeValue);
      return found ? found.name : 'Desconhecido';
    }

    return typeValue;

  };



  const handleUpdateStatus = async (status) => {

    if (!selectedDriver) return;

    try {

      await api.put(`/drivers/${selectedDriver._id || selectedDriver.id}`, { status });

      toast.success(`Motorista ${status === 'Disponível' ? 'Aprovação' : 'Rejeitado'} com sucesso!`);

      setShowDetailsModal(false);

      fetchDrivers();

    } catch (error) {

      toast.error('Erro ao atualizar o status do motorista.');

    }

  };



  const handleUpdateStatusDirect = async (driver, status) => {

    try {

      await api.put(`/drivers/${driver._id || driver.id}`, { status });

      toast.success('Motorista aprovado com sucesso!');

      fetchDrivers();

    } catch (error) {

      toast.error('Erro ao aprovar motorista.');

    }

  };

  const handleInstantBan = async () => {
    if (!selectedDriver) return;
    const reason = window.prompt("Motivo do bloqueio instantâneo?");
    if (!reason) return;

    try {
      await api.post(`/admin-ops/driver/${selectedDriver._id || selectedDriver.id}/instant-ban`, { reason });
      toast.success('Motorista bloqueado com sucesso!');
      setShowDetailsModal(false);
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao bloquear motorista.');
    }
  };

  const handleUnban = async () => {
    if (!selectedDriver) return;
    if (window.confirm("Pretende aceitar a justificação e readmitir o motorista?")) {
      try {
        await api.post(`/admin-ops/driver/${selectedDriver._id || selectedDriver.id}/unban`);
        toast.success('Motorista readmitido com sucesso!');
        setShowDetailsModal(false);
        fetchDrivers();
      } catch (error) {
        toast.error('Erro ao readmitir motorista.');
      }
    }
  };



  return (

    <div className="animation-fade-in pb-5">

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>

          <h2 className="fw-bold m-0 text-dark">Motoristas Parceiros</h2>

          <span className="text-muted small">Validação de contas, frota e documentos enviados via app</span>

        </div>

        <div className="d-flex align-items-center gap-3">

          <div className="position-relative" style={{ width: '250px' }}>

            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">

              <FontAwesomeIcon icon={faSearch} />

            </span>

            <input 

              type="text" 

              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 

              placeholder="Pesquisar motorista..."

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

            />

          </div>

          <button className="btn bg-primary-custom text-white rounded-pill px-4 py-2 shadow-sm fw-bold" onClick={() => handleOpenModal()}>

            <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Motorista

          </button>

        </div>

      </div>



      <div className="card shadow-sm-custom border-0 rounded-4">

        <div className="card-body p-0">

          <div className="table-responsive">

            <table className="table table-hover align-middle m-0">

              <thead className="bg-light">

                <tr>

                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Motorista / Contacto</th>

                  <th className="border-0 text-muted py-3">Avaliação & Entregas</th>

                  <th className="border-0 text-muted py-3">Veículo & Cor</th>

                  <th className="border-0 text-muted py-3">Matrícula</th>

                  <th className="border-0 text-muted py-3">Status / Docs</th>

                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr><td colSpan="6" className="text-center py-5 text-muted"><FontAwesomeIcon icon={faSpinner} spin className="me-2"/> A carregar...</td></tr>

                ) : currentDrivers.length === 0 ? (

                  <tr><td colSpan="6" className="text-center py-5 text-muted">Nenhum motorista encontrado.</td></tr>

                ) : currentDrivers.map(driver => (

                  <tr key={driver._id || driver.id}>

                    <td className="px-4">

                      <div className="d-flex align-items-center py-1">

                        <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 text-primary-custom shadow-sm" style={{ width: '45px', height: '45px' }}>

                          <FontAwesomeIcon icon={faIdCard} size="lg" />

                        </div>

                        <div>

                          <div className="fw-bold text-dark">{driver.name}</div>

                          <small className="text-muted">{driver.phoneNumber || driver.phone}</small>

                        </div>

                      </div>

                    </td>

                    <td>

                      <div className="d-flex flex-column">

                        <div className="fw-bold text-dark">

                          <FontAwesomeIcon icon={faStar} className="text-warning me-1" />

                          {driver.rating || 'Novo'}

                        </div>

                        <small className="text-muted mt-1"><FontAwesomeIcon icon={faBoxOpen} className="me-1" /> {driver.totalDeliveries || 0} entregas</small>



                      </div>

                    </td>

                    <td>

                      <div className="d-flex flex-column">

                        <div className="text-dark fw-bold text-capitalize"><FontAwesomeIcon icon={getVehicleIcon(driver.deliveryman?.transport_type || driver.deliveryman?.providedServices?.[0]?.serviceId)} className="me-2 text-muted" />{getVehicleName(driver.deliveryman?.transport_type || driver.deliveryman?.providedServices?.[0]?.serviceId)}</div>

                        <small className="text-muted"><FontAwesomeIcon icon={faPalette} className="me-1" /> {driver.deliveryman?.transport_color || 'N/A'}</small>

                      </div>

                    </td>

                    <td><span className="fw-bold px-3 py-1 bg-light rounded-2 border text-uppercase">{driver.deliveryman?.transport_registration || '---'}</span></td>

                    <td>

                      <div className="d-flex flex-column align-items-start">

                        {/* Badge de BANIDO — destaque máximo para ação imediata */}
                        {driver.isBanned && (
                          <span className="badge rounded-pill px-3 py-2 mb-1 bg-danger d-flex align-items-center gap-1" title={driver.banReason || 'Conta bloqueada'}>
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            &nbsp;BANIDO
                          </span>
                        )}

                        {/* Badge de Status Normal */}
                        {!driver.isBanned && (
                          <span className={`badge rounded-pill px-3 py-2 mb-1 ${(driver.status || 'Pendente') === 'Disponível' ? 'bg-success' : (driver.status || 'Pendente') === 'Em Entrega' ? 'bg-info' : (driver.status || 'Pendente') === 'Pendente' ? 'bg-warning text-dark' : (driver.status || 'Pendente') === 'Rejeitado' ? 'bg-danger' : 'bg-secondary'}`}>

                          {driver.status || 'Pendente'}

                        </span>
                        )}

                        {(!driver.status || driver.status === 'Pendente') && !driver.isBanned && (

                          <small className="text-danger fw-bold"><FontAwesomeIcon icon={faExclamationTriangle} className="me-1" /> Docs pendentes</small>

                        )}

                        {/* Indicador de justificação pendente */}
                        {driver.isBanned && driver.banAppealJustification && (
                          <small className="text-warning fw-bold mt-1">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                            Justificação recebida
                          </small>
                        )}

                      </div>

                    </td>

                    <td className="text-end px-4">

                      {(!driver.status || driver.status === 'Pendente') && (

                        <button className="btn btn-sm btn-light text-success me-2 rounded-3 shadow-sm fw-bold" onClick={() => handleUpdateStatusDirect(driver, 'Disponível')} title="Aprovar Diretamente">

                          <FontAwesomeIcon icon={faCheckCircle} /> Aprovar

                        </button>

                      )}

                      <button className="btn btn-sm btn-light text-info me-2 rounded-3 shadow-sm" onClick={() => handleOpenDetails(driver)} title="Ver Detalhes e Documentos">

                        <FontAwesomeIcon icon={faEye} /> Detalhes

                      </button>

                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(driver)} title="Editar">

                        <FontAwesomeIcon icon={faEdit} />

                      </button>

                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(driver._id || driver.id)} title="Eliminar">

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



      {/* Modal Criar/Editar */}

      {showModal && (

        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>

          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">

              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Motorista' : 'Novo Motorista'}</h5>

              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>

            </div>

            <div className="card-body p-4" style={{ overflowY: 'auto' }}>

              <form onSubmit={handleSave}>

                <h6 className="fw-bold text-primary-custom mb-3 border-bottom pb-2">Informações Pessoais (Login)</h6>

                <div className="row g-3 mb-3">

                  <div className="col-md-6">

                    <label className="form-label fw-bold small text-muted mb-1">Nome Completo *</label>

                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />

                  </div>

                  <div className="col-md-6">

                    <label className="form-label fw-bold small text-muted mb-1">Email *</label>

                    <input type="email" className="form-control bg-light border-0 py-2 rounded-3" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />

                  </div>

                  <div className="col-md-6">

                    <label className="form-label fw-bold small text-muted mb-1">Telefone *</label>

                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.phoneNumber || formData.phone || ''} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} required />

                  </div>

                  <div className="col-md-6">

                    <label className="form-label fw-bold small text-muted mb-1">{isEditing ? 'Nova Senha (Opcional)' : 'Senha *'}</label>

                    <input type="password" className="form-control bg-light border-0 py-2 rounded-3" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!isEditing} />

                  </div>

                  

                  <div className="col-md-6 mt-4">

                    <label className="form-label fw-bold small text-muted mb-1">Tipo de Documento *</label>

                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.document_type} onChange={(e) => setFormData({...formData, document_type: e.target.value})} required>

                      <option value="bi">Bilhete de Identidade (BI)</option>

                      <option value="passport">Passaporte</option>

                    </select>

                  </div>

                  <div className="col-md-6 mt-4">

                    <label className="form-label fw-bold small text-muted mb-1">Nº do Documento *</label>

                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.idNumber} onChange={(e) => setFormData({...formData, idNumber: e.target.value})} required />

                  </div>

                  <div className="col-md-12">

                    <label className="form-label fw-bold small text-muted mb-1">Nº Carta de Condução *</label>

                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.licenseNumber} onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})} required />

                  </div>

                </div>



                <h6 className="fw-bold text-primary-custom mb-3 mt-4 border-bottom pb-2">Informações do Veículo</h6>

                <div className="row g-3 mb-4">

                  <div className="col-md-4">

                    <label className="form-label fw-bold small text-muted mb-1">Tipo de Veículo (Categoria) *</label>

                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.vehicle_type_id || ''} onChange={(e) => setFormData({...formData, vehicle_type_id: e.target.value})} required>

                      <option value="">Selecione o Veículo</option>

                      {vehicleTypes.map((vType) => (

                        <option key={vType._id || vType.id} value={vType._id || vType.id}>

                          {vType.name} ({vType.basePrice || 0} MT) - {vType.category || 'ligeiro'}

                        </option>

                      ))}

                    </select>

                  </div>

                  <div className="col-md-4">

                    <label className="form-label fw-bold small text-muted mb-1">Cor do Veículo *</label>

                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.transport_color} onChange={(e) => setFormData({...formData, transport_color: e.target.value})} required>

                      <option value="Branco">Branco</option>

                      <option value="Preto">Preto</option>

                      <option value="Prata">Prata</option>

                      <option value="Cinza">Cinza</option>

                      <option value="Azul">Azul</option>

                      <option value="Vermelho">Vermelho</option>

                      <option value="Outra">Outra</option>

                    </select>

                  </div>

                  <div className="col-md-4">

                    <label className="form-label fw-bold small text-muted mb-1">Matrícula/Placa *</label>

                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3 text-uppercase" value={formData.plate} onChange={(e) => setFormData({...formData, plate: e.target.value})} placeholder="Ex: ABC 123 MC" required />

                  </div>

                </div>



                <h6 className="fw-bold text-primary-custom mb-3 mt-4 border-bottom pb-2">Serviços que Presta</h6>

                <div className="bg-light p-3 rounded-3 border mb-4">

                  <div className="row g-2">

                    {servicesList.length === 0 ? (

                      <div className="text-muted small">Nenhum serviço disponível no catálogo.</div>

                    ) : (

                      servicesList.map(srv => (

                        <div key={srv._id} className="col-md-6 col-lg-4">

                          <div className="form-check">

                            <input 

                              className="form-check-input" 

                              type="checkbox" 

                              id={`srv_${srv._id}`}

                              checked={formData.providedServices?.includes(srv._id) || false}

                              onChange={() => handleServiceToggle(srv._id)}

                            />

                            <label className="form-check-label fw-bold small text-dark" htmlFor={`srv_${srv._id}`}>

                              {srv.name}

                            </label>

                          </div>

                        </div>

                      ))

                    )}

                  </div>

                </div>



                <div className="mb-4 bg-light p-3 rounded-3 border">

                  <label className="form-label fw-bold small text-dark mb-1">Status de Operação (Conta)</label>

                  <select className="form-select bg-white border py-3 rounded-3 fw-bold" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>

                    <option value="Pendente">Pendente (Aguardando Verificação de Documentos)</option>

                    <option value="Disponível">Disponível (Ativo e pronto para pedidos)</option>

                    <option value="Em Entrega">Em Entrega</option>

                    <option value="Inativo">Inativo / Suspenso</option>

                  </select>

                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm mt-3">

                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Motorista (Manual)'}

                </button>

              </form>

            </div>

          </div>

        </div>

      )}



      {/* Modal de Detalhes e Documentos (Sincronizado com Mobile) */}

      {showDetailsModal && selectedDriver && (

        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>

          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '850px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>

            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">

              <div>

                 <h5 className="fw-bold m-0 text-dark">Dossier do Motorista</h5>

                 <span className="text-muted small">Validação de Conta e Documentos Uploaded</span>

              </div>

              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowDetailsModal(false)} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>

            </div>

            

            <div className="card-body p-4" style={{ overflowY: 'auto' }}>

              <div className="row mb-4">

                <div className="col-md-3 text-center">

                  {selectedDriver.deliveryman?.photo || selectedDriver.photo ? (

                    <div className="bg-light rounded-4 mx-auto mb-3 overflow-hidden border shadow-sm position-relative" style={{ width: '100%', aspectRatio: '3/4' }}>

                      <img src={getImageUrl(selectedDriver.deliveryman?.photo || selectedDriver.photo)} alt="Selfie" className="w-100 h-100 object-fit-cover" />

                      <div className="position-absolute bottom-0 start-0 w-100 bg-dark bg-opacity-50 text-white small py-1">Selfie</div>

                    </div>

                  ) : (

                    <div className="bg-light rounded-4 mx-auto mb-3 d-flex justify-content-center align-items-center text-muted border border-dashed" style={{ width: '100%', aspectRatio: '3/4' }}>

                      <FontAwesomeIcon icon={faImage} size="3x" />

                    </div>

                  )}

                </div>

                <div className="col-md-9">

                  <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">

                     <div>

                       <h4 className="fw-bold text-dark mb-1">{selectedDriver.name}</h4>

                       <div className="text-muted"><FontAwesomeIcon icon={faEnvelope} className="me-2" />{selectedDriver.email || 'Sem email registado'}</div>

                     </div>

                     <div className="d-flex flex-column align-items-end">

                       <span className={`badge fs-6 rounded-pill px-3 py-2 mb-2 ${selectedDriver.status === 'Disponível' ? 'bg-success' : selectedDriver.status === 'Pendente' ? 'bg-warning text-dark' : selectedDriver.status === 'Rejeitado' ? 'bg-danger' : 'bg-secondary'}`}>

                         {selectedDriver.status}

                       </span>

                       <div className="d-flex align-items-center gap-3">

                         <div className="fw-bold fs-5 text-dark" title="Pontuação/Avaliação dos clientes">

                           <FontAwesomeIcon icon={faStar} className="text-warning me-1" /> {selectedDriver.rating}

                         </div>

                         <div className="fw-bold fs-5 text-secondary" title="Total de Entregas Concluídas">

                           <FontAwesomeIcon icon={faBoxOpen} className="text-primary-custom me-1" /> {selectedDriver.totalDeliveries}

                         </div>

                       </div>

                     </div>

                  </div>

                  

                  <div className="row g-3">

                    <div className="col-sm-6">

                      <div className="text-muted small fw-bold"><FontAwesomeIcon icon={faPhone} className="me-2" />Telefone</div>

                      <div className="fw-bold text-dark">{selectedDriver.phoneNumber || selectedDriver.deliveryman?.phoneNumber}</div>

                    </div>

                    <div className="col-sm-6">

                      <div className="text-muted small fw-bold"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />Localização Base</div>

                      <div className="fw-bold text-dark">{selectedDriver.location || selectedDriver.province || 'N/A'}</div>

                    </div>

                    <div className="col-sm-6">

                      <div className="text-muted small fw-bold"><FontAwesomeIcon icon={faIdCard} className="me-2" />{selectedDriver.deliveryman?.document_type === 'passport' ? 'Passaporte' : 'BI'}</div>

                      <div className="fw-bold text-dark">{selectedDriver.deliveryman?.document_front ? 'Enviado' : 'Não Enviado'}</div>

                    </div>

                    <div className="col-sm-6">

                      <div className="text-muted small fw-bold"><FontAwesomeIcon icon={faFileAlt} className="me-2" />Carta de Condução</div>

                      <div className="fw-bold text-dark">{selectedDriver.deliveryman?.license_front ? 'Enviada' : 'Não Enviada'}</div>

                    </div>

                  </div>

                </div>

              </div>



              <div className="bg-primary-subtle p-3 rounded-4 mb-4 border border-primary-custom shadow-sm">

                <h6 className="fw-bold text-primary-custom mb-3"><FontAwesomeIcon icon={getVehicleIcon(selectedDriver.deliveryman?.transport_type || selectedDriver.deliveryman?.providedServices?.[0]?.serviceId)} className="me-2" />Dados do Veículo</h6>

                <div className="row g-3">

                  <div className="col-4">

                    <div className="text-primary-custom small fw-bold text-uppercase">Tipo</div>

                    <div className="fw-bold text-dark text-capitalize">{getVehicleName(selectedDriver.deliveryman?.transport_type || selectedDriver.deliveryman?.providedServices?.[0]?.serviceId)}</div>

                  </div>

                  <div className="col-4">

                    <div className="text-primary-custom small fw-bold text-uppercase">Cor</div>

                    <div className="fw-bold text-dark"><FontAwesomeIcon icon={faPalette} className="text-muted me-1" /> {selectedDriver.deliveryman?.transport_color || 'N/A'}</div>

                  </div>

                  <div className="col-4">

                    <div className="text-primary-custom small fw-bold text-uppercase">Matrícula</div>

                    <div className="fw-bold px-2 py-1 bg-white text-dark rounded border border-primary-custom d-inline-block mt-1 text-uppercase">{selectedDriver.deliveryman?.transport_registration || 'N/A'}</div>

                  </div>

                </div>

              </div>



              </div>

            {selectedDriver.isBanned && (
              <div className="mb-4 p-3 rounded-4 border border-danger bg-danger bg-opacity-10">
                <h6 className="fw-bold text-danger mb-2"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />Motorista Bloqueado (Instant Ban)</h6>
                <div className="mb-2"><strong>Motivo do Bloqueio:</strong> {selectedDriver.banReason}</div>
                {selectedDriver.banAppealJustification ? (
                  <div className="p-3 bg-white rounded border border-warning shadow-sm">
                    <div className="fw-bold text-warning mb-1">Justificação do Motorista (Apelo):</div>
                    <div className="fst-italic">"{selectedDriver.banAppealJustification}"</div>
                  </div>
                ) : (
                  <div className="text-muted small fst-italic">O motorista ainda não submeteu justificação.</div>
                )}
              </div>
            )}

              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Galeria de Documentos Submetidos (App)</h6>

              <div className="row g-3">

                {/* Reusable function for document cards */}

                {[

                  { key: 'vihicle_picture', label: 'Foto do Veículo', icon: faCar },

                  { key: 'license_front', label: 'Carta de Condução (Frente)', icon: faFileAlt },

                  { key: 'license_back', label: 'Carta de Condução (Verso)', icon: faFileAlt },

                  { key: 'document_front', label: `${selectedDriver.deliveryman?.document_type === 'passport' ? 'Passaporte' : 'BI'} (Frente)`, icon: faIdCard },

                  { key: 'document_back', label: `${selectedDriver.deliveryman?.document_type === 'passport' ? 'Passaporte' : 'BI'} (Verso)`, icon: faIdCard },

                  { key: 'vihicle_logbook', label: 'Livrete', icon: faFileAlt },

                  { key: 'vihicle_inspection', label: 'Inspeção do Veículo', icon: faCheckCircle },

                  { key: 'vihicle_Insurance', label: 'Seguro Automóvel', icon: faShieldAlt },

                  { key: 'Proof_of_Address', label: 'Comprovativo de Morada', icon: faMapMarkerAlt },

                ].map(doc => (

                  <div key={doc.key} className="col-md-6 col-lg-4">

                    <div className={`p-3 rounded-3 border h-100 d-flex flex-column ${selectedDriver.deliveryman?.[doc.key] ? 'bg-white border-success shadow-sm' : 'bg-light border-dashed'}`}>

                      <div className="d-flex justify-content-between align-items-start mb-2">

                        <span className="fw-bold text-dark small lh-sm" style={{flex: 1}}><FontAwesomeIcon icon={doc.icon} className="me-2 text-primary-custom" /> {doc.label}</span>

                        {selectedDriver.deliveryman?.[doc.key] ? <FontAwesomeIcon icon={faCheckCircle} className="text-success ms-2" /> : <span className="badge bg-secondary ms-2" style={{fontSize: '0.65rem'}}>Em falta</span>}

                      </div>

                      <div className="mt-auto pt-2">

                        {selectedDriver.deliveryman?.[doc.key] ? (
                          <div className="d-flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => setSelectedImage(getImageUrl(selectedDriver.deliveryman[doc.key]))} 
                              className="btn btn-sm btn-outline-success flex-grow-1 rounded-3 fw-bold"
                            >
                              <FontAwesomeIcon icon={faEye} className="me-1" /> Ver Imagem
                            </button>
                            <a 
                              href={getImageUrl(selectedDriver.deliveryman[doc.key])} 
                              download={`${doc.label}.jpg`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-sm btn-success rounded-3 fw-bold d-flex align-items-center justify-content-center px-3"
                              title="Baixar Documento"
                            >
                              <FontAwesomeIcon icon={faDownload} />
                            </a>
                          </div>
                        ) : (

                          <button className="btn btn-sm btn-light w-100 rounded-3 text-muted disabled">Não Submetido</button>

                        )}

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

            

            <div className="card-footer bg-white border-top p-4">

              {/* Barra de status atual */}

              <div className="d-flex align-items-center justify-content-between mb-3 p-3 rounded-3 bg-light border">

                <div>

                  <div className="text-muted small fw-bold text-uppercase mb-1">Estado atual da conta</div>

                  <span className={`badge fs-6 rounded-pill px-3 py-2 ${

                    selectedDriver.status === 'Disponível' ? 'bg-success' :

                    selectedDriver.status === 'Pendente' ? 'bg-warning text-dark' :

                    selectedDriver.status === 'Em Entrega' ? 'bg-info' : selectedDriver.status === 'Rejeitado' ? 'bg-danger' : 'bg-secondary'

                  }`}>

                    {selectedDriver.status || 'Pendente'}

                  </span>

                </div>

                <div className="text-muted small text-end">

                  {selectedDriver.status === 'Disponível' && <span className="text-success fw-bold"><FontAwesomeIcon icon={faCheckCircle} className="me-1" />Conta ativa e operacional</span>}

                  {(selectedDriver.status === 'Pendente' || !selectedDriver.status) && <span className="text-warning fw-bold"><FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />Aguarda aprovação dos documentos</span>}

                  {selectedDriver.status === 'Inativo' && <span className="text-danger fw-bold"><FontAwesomeIcon icon={faTimes} className="me-1" />Conta suspensa ou rejeitada</span>}

                </div>

              </div>



              {/* Botões de ação */}

              <div className="d-flex gap-2 flex-wrap">

                <button className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-bold" onClick={() => setShowDetailsModal(false)}>

                  Fechar Dossier

                </button>

                <div className="d-flex gap-2 ms-auto flex-wrap">

                  {selectedDriver.status !== 'Inativo' && (

                    <button

                      className="btn btn-danger rounded-pill px-4 py-2 fw-bold shadow-sm"

                      onClick={() => { if(window.confirm(`Rejeitar e suspender a conta de ${selectedDriver.name}?`)) handleUpdateStatus('Inativo'); }}

                    >

                      <FontAwesomeIcon icon={faTimes} className="me-2" /> Rejeitar / Suspender

                    </button>

                  )}

                  {selectedDriver.status !== 'Disponível' && (

                    <button

                      className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm"

                      onClick={() => handleUpdateStatus('Disponível')}

                    >

                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" /> Aprovar Motorista

                    </button>

                  )}

                  {selectedDriver.status === 'Disponível' && (

                    <button

                      className="btn btn-warning rounded-pill px-4 py-2 fw-bold shadow-sm text-dark"

                      onClick={() => { if(window.confirm(`Colocar a conta de ${selectedDriver.name} em modo Pendente?`)) handleUpdateStatus('Pendente'); }}

                    >

                      <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> Colocar Pendente

                    </button>

                  )}

                  {!selectedDriver.isBanned ? (
                    <button
                      className="btn btn-dark rounded-pill px-4 py-2 fw-bold shadow-sm"
                      onClick={handleInstantBan}
                    >
                      <FontAwesomeIcon icon={faShieldAlt} className="me-2" /> Instant Ban
                    </button>
                  ) : (
                    <button
                      className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm"
                      onClick={handleUnban}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" /> Readmitir (Aceitar Justificação)
                    </button>
                  )}

                </div>

              </div>

            </div>

          </div>

      )}



      {/* Modal Visualizador de Imagem */}

      {selectedImage && (

        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }} onClick={() => setSelectedImage(null)}>

          <div className="position-relative" style={{ maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>

            <button className="btn btn-light rounded-circle position-absolute" style={{ top: '-40px', right: '-40px', width: '40px', height: '40px', zIndex: 1101 }} onClick={() => setSelectedImage(null)}>

              <FontAwesomeIcon icon={faTimes} />

            </button>

            <img src={selectedImage} alt="Visualização do Documento" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />

          </div>

        </div>

      )}



      <style>{`

        .text-primary-custom { color: #8a2be2 !important; }

        .bg-primary-custom { background-color: #8a2be2 !important; }

        .border-primary-custom { border-color: #8a2be2 !important; }

        .bg-primary-subtle { background-color: #f3e8ff !important; }

        .bg-success-subtle { background-color: #d1e7dd !important; }

        .border-dashed { border-style: dashed !important; border-color: #ccc !important; }

        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

      `}</style>

    </div>

  );

}

