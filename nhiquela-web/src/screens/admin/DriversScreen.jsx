import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faEdit, faTrash, faPlus, faSave, faTimes, faIdCard, faEye, faMotorcycle, faTruck, faFileAlt, faImage, faCheckCircle, faPhone, faEnvelope, faMapMarkerAlt, faPalette, faShieldAlt, faExclamationTriangle, faStar, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

export default function DriversScreen() {
  const [drivers, setDrivers] = useState([
    { 
      id: 1, name: 'Armando Cossa', email: 'armando@email.com', phone: '841234567', province: 'Maputo Cidade',
      transport_type: 'carro', transport_color: 'Prata', plate: 'ACF 123 MC', 
      licenseNumber: 'L-12345678', idNumber: '1100223344M', document_type: 'bi',
      status: 'Disponível', rating: '4.8', totalDeliveries: 142,
      documents: { photo: true, vihicle_picture: true, license_front: true, license_back: true, document_front: true, document_back: true, vihicle_inspection: false, vihicle_Insurance: false, Proof_of_Address: true }
    },
    { 
      id: 2, name: 'Filipe Ndeve', email: 'filipe.n@email.com', phone: '829876543', province: 'Maputo Província',
      transport_type: 'motocicleta', transport_color: 'Preto', plate: 'MM 456', 
      licenseNumber: 'L-98765432', idNumber: '0900887766M', document_type: 'bi',
      status: 'Em Entrega', rating: '4.5', totalDeliveries: 89,
      documents: { photo: true, vihicle_picture: true, license_front: true, license_back: true, document_front: true, document_back: true, vihicle_inspection: true, vihicle_Insurance: true, Proof_of_Address: true }
    },
    { 
      id: 3, name: 'José Matlombe', email: 'jose.m@email.com', phone: '861112233', province: 'Gaza',
      transport_type: 'caminhao', transport_color: 'Branco', plate: 'AHD 990 MC', 
      licenseNumber: 'L-44556677', idNumber: '0400556677M', document_type: 'passport',
      status: 'Pendente', rating: 'Novo', totalDeliveries: 0,
      documents: { photo: false, vihicle_picture: false, license_front: true, license_back: false, document_front: false, document_back: false, vihicle_inspection: false, vihicle_Insurance: false, Proof_of_Address: false }
    },
  ]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // All fields from a standard mobile driver registration
  const [formData, setFormData] = useState({ 
    name: '', email: '', phone: '', password: '',
    transport_type: 'motocicleta', transport_color: 'Branco', plate: '', 
    licenseNumber: '', idNumber: '', document_type: 'bi',
    status: 'Pendente' 
  });
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const handleOpenDetails = (driver) => {
    setSelectedDriver(driver);
    setShowDetailsModal(true);
  };

  const handleOpenModal = (driver = null) => {
    if (driver) {
      setIsEditing(true);
      setCurrentId(driver.id);
      setFormData({ ...driver });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ 
        name: '', email: '', phone: '', password: '',
        transport_type: 'motocicleta', transport_color: 'Branco', plate: '', 
        licenseNumber: '', idNumber: '', document_type: 'bi',
        status: 'Pendente' 
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.plate) return toast.error('Nome e Matrícula são obrigatórios');
    
    if (isEditing) {
      setDrivers(drivers.map(d => d.id === currentId ? { ...d, ...formData } : d));
      toast.success('Motorista atualizado!');
    } else {
      const newDriver = { 
        id: Date.now(), 
        ...formData, 
        documents: { photo: false, vihicle_picture: false, license_front: false, license_back: false, document_front: false, document_back: false, vihicle_inspection: false, vihicle_Insurance: false, Proof_of_Address: false } // Default for new
      };
      setDrivers([newDriver, ...drivers]);
      toast.success('Motorista registado!');
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Eliminar este motorista do sistema?')) {
      setDrivers(drivers.filter(d => d.id !== id));
      toast.success('Eliminado com sucesso!');
    }
  };

  const getVehicleIcon = (type) => {
    if (type === 'motocicleta') return faMotorcycle;
    if (type === 'caminhao') return faTruck;
    return faCar;
  };

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Motoristas Parceiros</h2>
          <span className="text-muted small">Validação de contas, frota e documentos enviados via app</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Motorista
        </button>
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
                {drivers.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">Nenhum motorista cadastrado.</td></tr>
                ) : drivers.map(driver => (
                  <tr key={driver.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-1">
                        <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 text-primary-custom shadow-sm" style={{ width: '45px', height: '45px' }}>
                          <FontAwesomeIcon icon={faIdCard} size="lg" />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{driver.name}</div>
                          <small className="text-muted">{driver.phone}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <div className="fw-bold text-dark">
                          <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                          {driver.rating}
                        </div>
                        <small className="text-muted mt-1"><FontAwesomeIcon icon={faBoxOpen} className="me-1" /> {driver.totalDeliveries} entregas</small>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <div className="text-dark fw-bold text-capitalize"><FontAwesomeIcon icon={getVehicleIcon(driver.transport_type)} className="me-2 text-muted" />{driver.transport_type}</div>
                        <small className="text-muted"><FontAwesomeIcon icon={faPalette} className="me-1" /> {driver.transport_color}</small>
                      </div>
                    </td>
                    <td><span className="fw-bold px-3 py-1 bg-light rounded-2 border text-uppercase">{driver.plate}</span></td>
                    <td>
                      <div className="d-flex flex-column align-items-start">
                        <span className={`badge rounded-pill px-3 py-2 mb-1 ${driver.status === 'Disponível' ? 'bg-success' : driver.status === 'Em Entrega' ? 'bg-info' : driver.status === 'Pendente' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                          {driver.status}
                        </span>
                        {driver.status === 'Pendente' && (
                          <small className="text-danger fw-bold"><FontAwesomeIcon icon={faExclamationTriangle} className="me-1" /> Docs pendentes</small>
                        )}
                      </div>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-info me-2 rounded-3 shadow-sm" onClick={() => handleOpenDetails(driver)} title="Ver Detalhes e Documentos">
                        <FontAwesomeIcon icon={faEye} /> Detalhes
                      </button>
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(driver)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(driver.id)} title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
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
                    <label className="form-label fw-bold small text-muted mb-1">Tipo de Transporte *</label>
                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.transport_type} onChange={(e) => setFormData({...formData, transport_type: e.target.value})} required>
                      <option value="motocicleta">Motocicleta</option>
                      <option value="carro">Carro</option>
                      <option value="caminhao">Caminhão</option>
                      <option value="outro">Outro</option>
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
                  {selectedDriver.documents?.photo ? (
                    <div className="bg-light rounded-4 mx-auto mb-3 overflow-hidden border shadow-sm position-relative" style={{ width: '100%', aspectRatio: '3/4' }}>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedDriver.name}`} alt="Selfie" className="w-100 h-100 object-fit-cover" />
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
                       <span className={`badge fs-6 rounded-pill px-3 py-2 mb-2 ${selectedDriver.status === 'Disponível' ? 'bg-success' : selectedDriver.status === 'Pendente' ? 'bg-warning text-dark' : 'bg-danger'}`}>
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
                      <div className="fw-bold text-dark">{selectedDriver.phone}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted small fw-bold"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />Localização Base</div>
                      <div className="fw-bold text-dark">{selectedDriver.province || 'N/A'}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted small fw-bold"><FontAwesomeIcon icon={faIdCard} className="me-2" />{selectedDriver.document_type === 'passport' ? 'Passaporte' : 'BI'}</div>
                      <div className="fw-bold text-dark">{selectedDriver.idNumber}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted small fw-bold"><FontAwesomeIcon icon={faFileAlt} className="me-2" />Carta de Condução</div>
                      <div className="fw-bold text-dark">{selectedDriver.licenseNumber}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary-subtle p-3 rounded-4 mb-4 border border-primary-custom shadow-sm">
                <h6 className="fw-bold text-primary-custom mb-3"><FontAwesomeIcon icon={getVehicleIcon(selectedDriver.transport_type)} className="me-2" />Dados do Veículo</h6>
                <div className="row g-3">
                  <div className="col-4">
                    <div className="text-primary-custom small fw-bold text-uppercase">Tipo</div>
                    <div className="fw-bold text-dark text-capitalize">{selectedDriver.transport_type}</div>
                  </div>
                  <div className="col-4">
                    <div className="text-primary-custom small fw-bold text-uppercase">Cor</div>
                    <div className="fw-bold text-dark"><FontAwesomeIcon icon={faPalette} className="text-muted me-1" /> {selectedDriver.transport_color}</div>
                  </div>
                  <div className="col-4">
                    <div className="text-primary-custom small fw-bold text-uppercase">Matrícula</div>
                    <div className="fw-bold px-2 py-1 bg-white text-dark rounded border border-primary-custom d-inline-block mt-1 text-uppercase">{selectedDriver.plate}</div>
                  </div>
                </div>
              </div>

              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Galeria de Documentos Submetidos (App)</h6>
              <div className="row g-3">
                {/* Reusable function for document cards */}
                {[
                  { key: 'vihicle_picture', label: 'Foto do Veículo', icon: faCar },
                  { key: 'license_front', label: 'Carta de Condução (Frente)', icon: faFileAlt },
                  { key: 'license_back', label: 'Carta de Condução (Verso)', icon: faFileAlt },
                  { key: 'document_front', label: `${selectedDriver.document_type === 'passport' ? 'Passaporte' : 'BI'} (Frente)`, icon: faIdCard },
                  { key: 'document_back', label: `${selectedDriver.document_type === 'passport' ? 'Passaporte' : 'BI'} (Verso)`, icon: faIdCard },
                  { key: 'vihicle_inspection', label: 'Inspeção do Veículo', icon: faCheckCircle },
                  { key: 'vihicle_Insurance', label: 'Seguro Automóvel', icon: faShieldAlt },
                  { key: 'Proof_of_Address', label: 'Comprovativo de Morada', icon: faMapMarkerAlt },
                ].map(doc => (
                  <div key={doc.key} className="col-md-6 col-lg-4">
                    <div className={`p-3 rounded-3 border h-100 d-flex flex-column ${selectedDriver.documents?.[doc.key] ? 'bg-white border-success shadow-sm' : 'bg-light border-dashed'}`}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="fw-bold text-dark small lh-sm" style={{flex: 1}}><FontAwesomeIcon icon={doc.icon} className="me-2 text-primary-custom" /> {doc.label}</span>
                        {selectedDriver.documents?.[doc.key] ? <FontAwesomeIcon icon={faCheckCircle} className="text-success ms-2" /> : <span className="badge bg-secondary ms-2" style={{fontSize: '0.65rem'}}>Em falta</span>}
                      </div>
                      <div className="mt-auto pt-2">
                        {selectedDriver.documents?.[doc.key] ? (
                          <button className="btn btn-sm btn-outline-success w-100 rounded-3 fw-bold"><FontAwesomeIcon icon={faEye} className="me-1" /> Ver Imagem</button>
                        ) : (
                          <button className="btn btn-sm btn-light w-100 rounded-3 text-muted disabled">Não Submetido</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card-footer bg-light border-top p-4 d-flex gap-3">
              <button className="btn btn-outline-secondary flex-grow-1 py-3 rounded-pill fw-bold" onClick={() => setShowDetailsModal(false)}>
                Fechar Dossier
              </button>
              {selectedDriver.status === 'Pendente' && (
                <button className="btn btn-success flex-grow-1 py-3 rounded-pill fw-bold shadow-sm" onClick={() => {
                  toast.success('Documentos validados! Motorista Aprovado e Ativado na App.');
                  setShowDetailsModal(false);
                }}>
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" /> Validar Documentos & Aprovar
                </button>
              )}
            </div>
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
