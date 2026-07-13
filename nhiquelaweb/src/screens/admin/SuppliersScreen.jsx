import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faEdit, faTrash, faPlus, faSave, faTimes, faEye, faMapMarkerAlt, faPhone, faEnvelope, faIdCard, faMoneyBillWave, faImage, faLocationArrow, faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/users/sellers');
      setSuppliers(data.sellers || []);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores da base de dados.');
    } finally {
      setLoading(false);
    }
  };

  const [provinces] = useState([
    'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 
    'Sofala', 'Manica', 'Tete', 'Zambézia', 
    'Nampula', 'Cabo Delgado', 'Niassa'
  ]);
  
  const [establishmentTypes] = useState([
    'Supermercado', 'Mercearia', 'Farmácia', 'Restaurante', 'Loja de Conveniência', 'Talho'
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    representanteNome: '',
    representanteTelefone: '',
    email: '', 
    password: '',
    phoneNumberAccount: '',
    alternativePhoneNumberAccount: '',
    province: '', 
    tipoEstabelecimento: '',
    address: '',
    description: '',
    logo: '',
    latitude: '',
    longitude: '',
    status: 'Ativo' 
  });
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentSuppliers,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(suppliers, 10, ['name', 'representanteNome', 'email', 'representanteTelefone', 'tipoEstabelecimento', 'province']);

  const handleOpenDetails = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  const handleOpenModal = (supplier = null) => {
    if (supplier) {
      setIsEditing(true);
      setCurrentId(supplier._id || supplier.id);
      setFormData({ 
        name: supplier.seller?.name || '', 
        representanteNome: supplier.name || '', 
        representanteTelefone: supplier.phoneNumber || '', 
        email: supplier.email || '', 
        password: '',
        phoneNumberAccount: supplier.seller?.phoneNumberAccount || '', 
        alternativePhoneNumberAccount: supplier.seller?.alternativePhoneNumberAccount || '', 
        province: supplier.seller?.province || '', 
        tipoEstabelecimento: supplier.seller?.tipoEstabelecimento || '', 
        address: supplier.seller?.address || '', 
        description: supplier.seller?.description || '', 
        logo: supplier.seller?.logo || '',
        latitude: supplier.seller?.latitude || '', 
        longitude: supplier.seller?.longitude || '', 
        status: supplier.isBanned ? 'Inativo' : (supplier.isApproved ? 'Ativo' : 'Pendente')
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ 
        name: '', representanteNome: '', representanteTelefone: '', email: '', password: '',
        phoneNumberAccount: '', alternativePhoneNumberAccount: '', province: '', 
        tipoEstabelecimento: '', address: '', description: '', logo: '',
        latitude: '', longitude: '', status: 'Pendente' 
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.representanteNome) {
      return toast.error('Nome da empresa, Email e Nome do Representante são obrigatórios.');
    }
    
    try {
      const payload = {
        name: formData.representanteNome,
        email: formData.email,
        phoneNumber: formData.representanteTelefone,
        password: formData.password,
        isSeller: true,
        seller: {
          name: formData.name,
          logo: formData.logo,
          description: formData.description,
          province: formData.province,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          phoneNumberAccount: formData.phoneNumberAccount,
          alternativePhoneNumberAccount: formData.alternativePhoneNumberAccount,
          tipoEstabelecimento: formData.tipoEstabelecimento
        },
        isApproved: formData.status === 'Ativo',
        isBanned: formData.status === 'Inativo'
      };

      if (isEditing) {
        await api.put(`/users/${currentId}`, payload);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        if(!formData.password) return toast.error('Para novos cadastros a senha inicial � obrigatória.');
        await api.post('/users/signup', payload);
        toast.success('Novo Fornecedor registado com sucesso!');
      }
      fetchSuppliers();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao guardar os dados do fornecedor.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminar este estabelecimento permanentemente?')) {
      try {
        await api.delete(`/users/${id}`);
        toast.success('Eliminado com sucesso!');
        fetchSuppliers();
      } catch (error) {
        toast.error('Erro ao eliminar fornecedor');
      }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocalização não � suportada neste navegador.');
    }
    
    toast.info('A obter localização GPS...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        });
        toast.success('Localização capturada com sucesso!');
      },
      (error) => {
        toast.error('Erro ao obter localização. Verifique as permissões de GPS no seu navegador.');
      }
    );
  };

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Fornecedores & Lojas</h2>
          <span className="text-muted small">Gestão de parceiros, restaurantes, supermercados e pagamentos</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar fornecedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Registar Fornecedor
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Empresa / Loja</th>
                  <th className="border-0 text-muted py-3">Tipo</th>
                  <th className="border-0 text-muted py-3">Província</th>
                  <th className="border-0 text-muted py-3">Representante</th>
                  <th className="border-0 text-muted py-3 text-center">Status</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted"><FontAwesomeIcon icon={faSpinner} spin className="me-2"/> A carregar fornecedores...</td></tr>
                ) : currentSuppliers.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">Nenhum fornecedor encontrado.</td></tr>
                ) : currentSuppliers.map(supplier => (
                  <tr key={supplier._id || supplier.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        {supplier.seller?.logo ? (
                          <img src={supplier.seller.logo} alt={supplier.seller?.name || 'Logo'} className="rounded-circle shadow-sm border me-3" style={{width:'45px', height:'45px', objectFit:'cover'}} />
                        ) : (
                          <div className="bg-light rounded-circle border d-flex justify-content-center align-items-center text-muted me-3" style={{width:'45px', height:'45px'}}>
                            <FontAwesomeIcon icon={faStore} />
                          </div>
                        )}
                        <div>
                          <span className="fw-bold text-dark d-block">{supplier.seller?.name || 'Sem nome empresarial'}</span>
                          <span className="text-muted small">{supplier._id || supplier.id}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge bg-light text-dark border">{supplier.seller?.tipoEstabelecimento || 'N/A'}</span></td>
                    <td><span className="text-muted small fw-bold"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-danger"/>{supplier.seller?.province || 'N/A'}</span></td>
                    <td>
                      <span className="text-dark small d-block fw-bold">{supplier.name}</span>
                      <span className="text-muted" style={{fontSize: '11px'}}>{supplier.phoneNumber}</span>
                    </td>
                    <td className="text-center">
                      <span className={`badge rounded-pill px-3 py-2 ${(!supplier.isBanned && supplier.isApproved) ? 'bg-success-subtle text-success border border-success border-opacity-25' : supplier.isBanned ? 'bg-danger-subtle text-danger border border-danger border-opacity-25' : 'bg-warning-subtle text-warning text-dark border border-warning border-opacity-25'}`}>
                        {supplier.isBanned ? 'Inativo' : (supplier.isApproved ? 'Ativo' : 'Pendente')}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-info me-2 rounded-3 shadow-sm" onClick={() => handleOpenDetails(supplier)} title="Ver Detalhes e Documentos">
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(supplier)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(supplier._id || supplier.id)} title="Eliminar">
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

      {/* Modal Criar/Editar Fornecedor (Atualizado com Base de Dados) */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Fornecedor' : 'Registar Novo Fornecedor (Completo)'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4" style={{ overflowY: 'auto' }}>
              <form onSubmit={handleSave}>
                
                {/* DADOS DO REPRESENTANTE */}
                <h6 className="fw-bold text-primary-custom mb-3 border-bottom pb-2"><FontAwesomeIcon icon={faIdCard} className="me-2"/> Dados do Representante</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Nome e Apelido</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.representanteNome} onChange={(e) => setFormData({...formData, representanteNome: e.target.value})} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Número de Telefone Pessoal</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.representanteTelefone} onChange={(e) => setFormData({...formData, representanteTelefone: e.target.value})} placeholder="Ex: 841234567" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Email de Acesso</label>
                    <input type="email" className="form-control bg-light border-0 py-2 rounded-3" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">{isEditing ? 'Nova Senha (deixe vazio para manter)' : 'Senha de Acesso Inicial'}</label>
                    <input type="password" className="form-control bg-light border-0 py-2 rounded-3" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>

                {/* DETALHES DO ESTABELECIMENTO */}
                <h6 className="fw-bold text-primary-custom mb-3 border-bottom pb-2"><FontAwesomeIcon icon={faStore} className="me-2"/> Detalhes do Estabelecimento</h6>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Nome da Empresa</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Tipo de Estabelecimento</label>
                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.tipoEstabelecimento} onChange={(e) => setFormData({...formData, tipoEstabelecimento: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {establishmentTypes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-bold small text-muted mb-1">Descrição [Especialidade]</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
                  </div>
                </div>

                {/* LOCALIZAÇÃO */}
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Província / Localização</label>
                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label fw-bold small text-muted mb-1">Endereço do Estabelecimento [Rua/Av.]</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
                  </div>
                  <div className="col-12 d-flex justify-content-between align-items-end mt-4 mb-2">
                    <h6 className="fw-bold text-dark m-0">Coordenadas Geográficas</h6>
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill fw-bold" onClick={handleGetLocation}>
                      <FontAwesomeIcon icon={faLocationArrow} className="me-2" /> Obter Minha Localização Atual
                    </button>
                  </div>
                  <div className="col-md-6 mt-0">
                    <label className="form-label fw-bold small text-muted mb-1">Latitude GPS</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} placeholder="Ex: -25.9653" />
                  </div>
                  <div className="col-md-6 mt-0">
                    <label className="form-label fw-bold small text-muted mb-1">Longitude GPS</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} placeholder="Ex: 32.5898" />
                  </div>
                </div>

                {/* FINANCEIRO E PAGAMENTOS */}
                <h6 className="fw-bold text-primary-custom mb-3 border-bottom pb-2"><FontAwesomeIcon icon={faMoneyBillWave} className="me-2"/> Contas para Recebimento</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Telefone da Empresa (M-Pesa 84/85)</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.phoneNumberAccount} onChange={(e) => setFormData({...formData, phoneNumberAccount: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Telefone da Empresa (e-Mola 86/87)</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.alternativePhoneNumberAccount} onChange={(e) => setFormData({...formData, alternativePhoneNumberAccount: e.target.value})} />
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-8">
                    <label className="form-label fw-bold small text-muted mb-1">Logo do Estabelecimento</label>
                    <div className="d-flex align-items-center mt-1 p-2 bg-light rounded-3 border border-dashed">
                       <div className="bg-white p-2 rounded-circle shadow-sm me-3 text-primary-custom d-flex justify-content-center align-items-center" style={{ width: '40px', height: '40px' }}>
                         <FontAwesomeIcon icon={faImage} />
                       </div>
                       <div className="flex-grow-1">
                          <input type="file" className="form-control form-control-sm" accept="image/*" onChange={(e) => {
                            if(e.target.files && e.target.files[0]) {
                              setFormData({...formData, logo: URL.createObjectURL(e.target.files[0])});
                            }
                          }}/>
                       </div>
                    </div>
                    {formData.logo && (
                      <div className="mt-2 position-relative d-inline-block">
                        <img src={formData.logo} alt="Logo Preview" className="rounded-3 border shadow-sm" style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
                        <button type="button" className="btn btn-sm btn-danger rounded-circle position-absolute top-0 start-100 translate-middle" onClick={() => setFormData({...formData, logo: ''})} style={{ width: '20px', height: '20px', padding: 0 }}><FontAwesomeIcon icon={faTimes} style={{fontSize: '10px'}} /></button>
                      </div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Estado Operacional</label>
                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                      <option value="Pendente">Pendente de Aprovação</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Registar Estabelecimento'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalhes (Ficha Completa) */}
      {showDetailsModal && selectedSupplier && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">Ficha de Fornecedor</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowDetailsModal(false)} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            
            <div className="card-body p-4" style={{ overflowY: 'auto', maxHeight: '75vh' }}>
              <div className="text-center mb-4">
                {selectedSupplier.seller?.logo ? (
                  <img src={selectedSupplier.seller.logo} alt={selectedSupplier.seller?.name} className="img-fluid rounded-circle shadow-sm border mb-3" style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
                ) : (
                  <div className="bg-light rounded-circle d-flex justify-content-center align-items-center text-muted border border-dashed mx-auto mb-3" style={{ width: '120px', height: '120px' }}>
                    <FontAwesomeIcon icon={faStore} size="3x" />
                  </div>
                )}
                <h4 className="fw-bold text-dark mb-0">{selectedSupplier.seller?.name}</h4>
                <div className="text-muted small">{selectedSupplier._id || selectedSupplier.id} | {selectedSupplier.seller?.tipoEstabelecimento}</div>
                <div className="mt-2">
                  <span className={`badge rounded-pill px-3 py-2 ${(!selectedSupplier.isBanned && selectedSupplier.isApproved) ? 'bg-success-subtle text-success border border-success border-opacity-25' : selectedSupplier.isBanned ? 'bg-danger-subtle text-danger border border-danger border-opacity-25' : 'bg-warning-subtle text-warning text-dark border border-warning border-opacity-25'}`}>
                    {selectedSupplier.isBanned ? 'Inativo' : (selectedSupplier.isApproved ? 'Ativo' : 'Pendente')}
                  </span>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6 border-end">
                  <h6 className="fw-bold text-muted mb-3 text-uppercase small">Dados da Empresa</h6>
                  <p className="small text-dark mb-2"><strong>Especialidade:</strong> <br/>{selectedSupplier.seller?.description || 'Não especificada'}</p>
                  <p className="small text-dark mb-2"><strong>Endereço:</strong> <br/>{selectedSupplier.seller?.address || 'N/A'}</p>
                  <p className="small text-dark mb-2"><strong>Província:</strong> {selectedSupplier.seller?.province || 'N/A'}</p>
                  <p className="small text-dark mb-0 text-muted" style={{fontSize: '11px'}}>GPS: {selectedSupplier.seller?.latitude}, {selectedSupplier.seller?.longitude}</p>
                </div>
                
                <div className="col-md-6">
                  <h6 className="fw-bold text-muted mb-3 text-uppercase small">Representante & Contactos</h6>
                  <p className="small text-dark mb-2"><FontAwesomeIcon icon={faIdCard} className="text-primary-custom me-2"/> {selectedSupplier.name}</p>
                  <p className="small text-dark mb-2"><FontAwesomeIcon icon={faPhone} className="text-primary-custom me-2"/> {selectedSupplier.phoneNumber}</p>
                  <p className="small text-dark mb-2"><FontAwesomeIcon icon={faEnvelope} className="text-primary-custom me-2"/> {selectedSupplier.email}</p>
                </div>
              </div>

              <div className="bg-light p-3 rounded-4 mb-2 border border-primary border-opacity-25">
                <h6 className="fw-bold text-dark mb-2 border-bottom pb-2"><FontAwesomeIcon icon={faMoneyBillWave} className="text-success me-2"/> Contas de Pagamento</h6>
                <div className="d-flex justify-content-between">
                  <div className="small"><strong>M-Pesa:</strong> {selectedSupplier.seller?.phoneNumberAccount || 'N/A'}</div>
                  <div className="small"><strong>e-Mola:</strong> {selectedSupplier.seller?.alternativePhoneNumberAccount || 'N/A'}</div>
                </div>
              </div>

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
        .border-dashed { border-style: dashed !important; border-color: #ccc !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
