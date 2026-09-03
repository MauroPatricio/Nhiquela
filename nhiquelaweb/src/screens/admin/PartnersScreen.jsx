import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHandshake, faUsers, faStore, faMotorcycle, faSearch, faPlus, 
  faEye, faEdit, faTrash, faSpinner, faTimes, faSave, faCheckCircle, 
  faPhone, faEnvelope, faMapMarkerAlt, faBuilding, faUserPlus, faUserMinus,
  faCamera, faUpload
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function PartnersScreen() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    province: 'Maputo',
    city: 'Maputo',
    commissionPercentage: 10,
    status: 'ACTIVE',
    logoUrl: '',
    profileImage: ''
  });

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
      const url = data.secure_url || data.url;
      setFormData(prev => ({ ...prev, logoUrl: url, profileImage: url }));
      toast.success('Foto de perfil / Logótipo carregado com sucesso!');
    } catch (err) {
      toast.error('Erro ao carregar imagem.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Members Modal state (for inspecting drivers & sellers)
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [membersData, setMembersData] = useState({ drivers: [], sellers: [], totalDrivers: 0, totalSellers: 0 });
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState('drivers'); // 'drivers' or 'sellers'

  // Assign user modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);

  const [provinces, setProvinces] = useState([]);

  useEffect(() => {
    fetchPartners();
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const { data } = await api.get('/provinces?pageSize=100');
      const list = data?.provinces || data || [];
      if (Array.isArray(list) && list.length > 0) {
        setProvinces(list.map(p => typeof p === 'string' ? p : (p.name || p.provincia || p._id)));
      } else {
        setProvinces(['Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 'Manica', 'Tete', 'Zambézia', 'Nampula', 'Niassa', 'Cabo Delgado']);
      }
    } catch (error) {
      console.error('Erro ao buscar províncias:', error);
      setProvinces(['Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 'Manica', 'Tete', 'Zambézia', 'Nampula', 'Niassa', 'Cabo Delgado']);
    }
  };

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/partners');
      setPartners(data || []);
    } catch (error) {
      toast.error('Erro ao carregar lista de parceiros e gestores de frota.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      companyName: '',
      address: '',
      province: 'Maputo',
      city: 'Maputo',
      commissionPercentage: 10,
      status: 'ACTIVE',
      logoUrl: '',
      profileImage: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (partner) => {
    setIsEditing(true);
    setCurrentId(partner._id);
    const photo = partner.logoUrl || partner.profileImage || partner.userId?.profileImage || '';
    setFormData({
      name: partner.name || '',
      email: partner.email || partner.userId?.email || '',
      phone: partner.phone || partner.userId?.phoneNumber || '',
      companyName: partner.companyName || partner.name || '',
      address: partner.address || '',
      province: partner.province || 'Maputo',
      city: partner.city || 'Maputo',
      commissionPercentage: partner.commissionPercentage || 10,
      status: partner.status || 'ACTIVE',
      logoUrl: photo,
      profileImage: photo
    });
    setShowModal(true);
  };

  const handleSavePartner = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/partners/${currentId}`, formData);
        toast.success('Parceiro atualizado com sucesso!');
      } else {
        const { data } = await api.post('/partners', formData);
        toast.success(`Parceiro registado com sucesso! Acesso Web ativado (Email: ${formData.email} | Passe: 12345678)`);
      }
      setShowModal(false);
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao guardar dados do parceiro.');
    }
  };

  const handleDeletePartner = async (id) => {
    if (!window.confirm('Tem a certeza que deseja desativar este parceiro?')) return;
    try {
      await api.delete(`/partners/${id}`);
      toast.success('Parceiro desativado com sucesso.');
      fetchPartners();
    } catch (error) {
      toast.error('Erro ao desativar parceiro.');
    }
  };

  // Inspect associated members (motoristas & fornecedores)
  const handleViewMembers = async (partner) => {
    setSelectedPartner(partner);
    setShowMembersModal(true);
    setLoadingMembers(true);
    try {
      const { data } = await api.get(`/partners/${partner._id}/members`);
      setMembersData(data || { drivers: [], sellers: [], totalDrivers: 0, totalSellers: 0 });
    } catch (error) {
      toast.error('Erro ao carregar membros associados ao parceiro.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Deseja desassociar este membro do parceiro?')) return;
    try {
      await api.post(`/partners/${selectedPartner._id}/remove-member`, { memberId });
      toast.success('Membro desassociado com sucesso.');
      handleViewMembers(selectedPartner);
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao desassociar membro.');
    }
  };

  // Assign user to partner modal
  const handleOpenAssign = async () => {
    setShowAssignModal(true);
    setLoadingUnassigned(true);
    try {
      const roleTarget = activeTab === 'drivers' ? 'DRIVER' : 'SELLER';
      const { data } = await api.get(`/users?role=${roleTarget}`);
      const unassigned = (data.users || data || []).filter(u => !u.partnerId || u.partnerId === null);
      setUnassignedUsers(unassigned);
    } catch (error) {
      toast.error('Erro ao buscar utilizadores disponíveis.');
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleAssignUser = async (userId) => {
    try {
      const endpoint = activeTab === 'drivers' 
        ? `/partners/${selectedPartner._id}/assign-driver`
        : `/partners/${selectedPartner._id}/assign-seller`;
      
      const payload = activeTab === 'drivers' ? { driverId: userId } : { sellerId: userId };
      
      await api.post(endpoint, payload);
      toast.success('Membro associado com sucesso ao parceiro!');
      setShowAssignModal(false);
      handleViewMembers(selectedPartner);
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao associar membro.');
    }
  };

  // Filter partners
  const filteredPartners = partners.filter(p => {
    const term = searchTerm.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const company = (p.companyName || '').toLowerCase();
    const email = (p.email || p.userId?.email || '').toLowerCase();
    const phone = String(p.phone || p.userId?.phoneNumber || '');
    return name.includes(term) || company.includes(term) || email.includes(term) || phone.includes(term);
  });

  const { currentPage, totalPages, pageData = [], currentData = [], goToPage } = usePagination(filteredPartners, 10);
  const activePageData = pageData || currentData || [];

  const totalStoresCount = partners.reduce((acc, p) => acc + (p.totalProviders || p.totalSellers || 0), 0);
  const totalDriversCount = partners.reduce((acc, p) => acc + (p.totalDrivers || 0), 0);

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark m-0">Parceiros & Gestores de Frotas</h2>
          <p className="text-muted mb-0 small">
            Gestão integrada de parceiros comerciais, estabelecimentos e frotas de motoristas associados
          </p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-pill fw-bold shadow-sm" onClick={handleOpenCreate}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Registar Parceiro
        </button>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-4 me-3">
                <FontAwesomeIcon icon={faHandshake} size="2x" />
              </div>
              <div>
                <span className="text-muted small fw-bold text-uppercase">Parceiros Registados</span>
                <h3 className="fw-bold text-dark m-0">{partners.length}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center">
              <div className="bg-success bg-opacity-10 text-success p-3 rounded-4 me-3">
                <FontAwesomeIcon icon={faStore} size="2x" />
              </div>
              <div>
                <span className="text-muted small fw-bold text-uppercase">Fornecedores / Lojas</span>
                <h3 className="fw-bold text-dark m-0">{totalStoresCount}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 text-info p-3 rounded-4 me-3">
                <FontAwesomeIcon icon={faMotorcycle} size="2x" />
              </div>
              <div>
                <span className="text-muted small fw-bold text-uppercase">Motoristas (Frotas)</span>
                <h3 className="fw-bold text-dark m-0">{totalDriversCount}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
        {/* Search Bar */}
        <div className="p-3 border-bottom bg-light bg-opacity-50">
          <div className="input-group" style={{ maxWidth: '400px' }}>
            <span className="input-group-text bg-white border-end-0 rounded-start-pill ps-3">
              <FontAwesomeIcon icon={faSearch} className="text-muted" />
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 rounded-end-pill shadow-none" 
              placeholder="Pesquisar por parceiro, empresa ou contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Empresa / Parceiro</th>
                <th>Contacto</th>
                <th>Localização</th>
                <th>Fornecedores</th>
                <th>Motoristas</th>
                <th>Status</th>
                <th className="text-end pe-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <FontAwesomeIcon icon={faSpinner} spin className="me-2" /> A carregar parceiros...
                  </td>
                </tr>
              ) : activePageData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : (
                activePageData.map((partner) => (
                  <tr key={partner._id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        {partner.logoUrl || partner.profileImage || partner.userId?.profileImage ? (
                          <img 
                            src={partner.logoUrl || partner.profileImage || partner.userId?.profileImage} 
                            alt="Foto do Parceiro" 
                            className="rounded-circle me-3 border shadow-sm" 
                            style={{ width: 44, height: 44, objectFit: 'cover' }} 
                          />
                        ) : (
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold shadow-sm" style={{ width: 44, height: 44 }}>
                            {(partner.name || partner.companyName || 'P').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark">{partner.companyName || partner.name}</div>
                          <div className="small text-muted">{partner.email || partner.userId?.email || 'Sem email'}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="small text-dark fw-semibold">
                        <FontAwesomeIcon icon={faPhone} className="me-1 text-muted" />
                        {partner.phone || partner.userId?.phoneNumber || 'N/A'}
                      </div>
                    </td>

                    <td>
                      <span className="badge bg-light text-dark border">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-danger" />
                        {partner.province || 'Maputo'}
                      </span>
                    </td>

                    <td>
                      <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill fw-bold">
                        <FontAwesomeIcon icon={faStore} className="me-1" />
                        {partner.totalProviders || partner.totalSellers || 0} Fornecedores
                      </span>
                    </td>

                    <td>
                      <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2 rounded-pill fw-bold">
                        <FontAwesomeIcon icon={faMotorcycle} className="me-1" />
                        {partner.totalDrivers || 0} Motoristas
                      </span>
                    </td>

                    <td>
                      {partner.status === 'ACTIVE' || !partner.status ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">Ativo</span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill">Inativo</span>
                      )}
                    </td>

                    <td className="text-end pe-4">
                      <button 
                        className="btn btn-sm btn-outline-primary rounded-pill me-2 shadow-sm"
                        title="Ver Motoristas & Fornecedores Associados"
                        onClick={() => handleViewMembers(partner)}
                      >
                        <FontAwesomeIcon icon={faEye} className="me-1" /> Detalhes & Membros
                      </button>
                      <button 
                        className="btn btn-sm btn-light text-secondary rounded-circle me-1"
                        title="Editar Parceiro"
                        onClick={() => handleOpenEdit(partner)}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                        className="btn btn-sm btn-light text-danger rounded-circle"
                        title="Desativar Parceiro"
                        onClick={() => handleDeletePartner(partner._id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-top bg-light bg-opacity-50">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredPartners.length}
          />
        </div>
      </div>

      {/* Modal Registar/Editar Parceiro */}
      {showModal && (
        <div className="modal show d-block tab-modal-backdrop" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white p-4">
                <h5 className="modal-title fw-bold">
                  <FontAwesomeIcon icon={faHandshake} className="me-2" />
                  {isEditing ? 'Editar Parceiro / Gestor' : 'Registar Novo Parceiro / Gestor'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSavePartner}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Campo Foto de Perfil / Logótipo */}
                    <div className="col-12 text-center mb-2">
                      <label className="form-label fw-bold text-dark small d-block">Foto de Perfil / Logótipo da Empresa</label>
                      <div className="d-flex justify-content-center align-items-center flex-column">
                        <div 
                          className="rounded-circle border border-2 border-primary d-flex justify-content-center align-items-center overflow-hidden position-relative mb-2 shadow-sm"
                          style={{ width: '84px', height: '84px', backgroundColor: '#F8FAFC', cursor: 'pointer' }}
                          onClick={() => document.getElementById('partnerPhotoInput').click()}
                        >
                          {formData.profileImage || formData.logoUrl ? (
                            <img 
                              src={formData.profileImage || formData.logoUrl} 
                              alt="Foto de Perfil" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <FontAwesomeIcon icon={faCamera} size="2x" className="text-secondary" />
                          )}
                          {uploadingImage && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex justify-content-center align-items-center">
                              <FontAwesomeIcon icon={faSpinner} spin className="text-white" />
                            </div>
                          )}
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold"
                          onClick={() => document.getElementById('partnerPhotoInput').click()}
                          disabled={uploadingImage}
                        >
                          <FontAwesomeIcon icon={uploadingImage ? faSpinner : faUpload} spin={uploadingImage} className="me-1" />
                          {formData.profileImage || formData.logoUrl ? 'Alterar Foto' : 'Carregar Foto de Perfil'}
                        </button>
                        <input 
                          type="file" 
                          id="partnerPhotoInput" 
                          className="d-none" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-bold text-dark small">Nome da Empresa / Parceiro</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        required 
                        placeholder="Ex: Frota Central Maputo"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value, name: e.target.value })}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-dark small">Email de Contacto</label>
                      <input 
                        type="email" 
                        className="form-control rounded-3" 
                        required 
                        placeholder="parceiro@exemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-dark small">Telefone / M-Pesa</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        required 
                        placeholder="84XXXXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-dark small">Província</label>
                      <select 
                        className="form-select rounded-3"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      >
                        <option value="">Selecione a Província</option>
                        {provinces.map((prov, idx) => (
                          <option key={idx} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-dark small">% Comissão Plataforma</label>
                      <input 
                        type="number" 
                        className="form-control rounded-3" 
                        min="0"
                        max="100"
                        value={formData.commissionPercentage}
                        onChange={(e) => setFormData({ ...formData, commissionPercentage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">
                    <FontAwesomeIcon icon={faSave} className="me-2" /> Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualização de Membros Associados (Motoristas & Fornecedores) */}
      {showMembersModal && selectedPartner && (
        <div className="modal show d-block tab-modal-backdrop" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-4">
                <div>
                  <h5 className="modal-title fw-bold m-0">
                    <FontAwesomeIcon icon={faBuilding} className="me-2 text-warning" />
                    {selectedPartner.companyName || selectedPartner.name}
                  </h5>
                  <span className="small text-muted">Membros e Frotas Sob Gestão Deste Parceiro</span>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowMembersModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {/* Tabs inside modal */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <ul className="nav nav-pills">
                    <li className="nav-item">
                      <button 
                        className={`nav-link rounded-pill fw-bold me-2 ${activeTab === 'drivers' ? 'active bg-primary' : 'bg-light text-dark'}`}
                        onClick={() => setActiveTab('drivers')}
                      >
                        <FontAwesomeIcon icon={faMotorcycle} className="me-2" />
                        Motoristas ({membersData.totalDrivers || membersData.drivers?.length || 0})
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        className={`nav-link rounded-pill fw-bold ${activeTab === 'sellers' ? 'active bg-success' : 'bg-light text-dark'}`}
                        onClick={() => setActiveTab('sellers')}
                      >
                        <FontAwesomeIcon icon={faStore} className="me-2" />
                        Fornecedores / Lojas ({membersData.totalSellers || membersData.sellers?.length || 0})
                      </button>
                    </li>
                  </ul>

                  <button className="btn btn-sm btn-outline-primary rounded-pill fw-bold" onClick={handleOpenAssign}>
                    <FontAwesomeIcon icon={faUserPlus} className="me-1" />
                    Associar Novo {activeTab === 'drivers' ? 'Motorista' : 'Fornecedor'}
                  </button>
                </div>

                {loadingMembers ? (
                  <div className="text-center py-5">
                    <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary me-2" />
                    <p className="text-muted mt-2">A carregar frotas associadas...</p>
                  </div>
                ) : (
                  <div>
                    {activeTab === 'drivers' ? (
                      membersData.drivers?.length === 0 ? (
                        <div className="text-center py-4 bg-light rounded-3 text-muted">
                          Nenhum motorista associado a este parceiro.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Motorista</th>
                                <th>Contacto</th>
                                <th>Status</th>
                                <th className="text-end">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {membersData.drivers.map(driver => (
                                <tr key={driver._id}>
                                  <td>
                                    <div className="fw-bold text-dark">{driver.name}</div>
                                    <div className="small text-muted">{driver.email}</div>
                                  </td>
                                  <td>{driver.phoneNumber || 'N/A'}</td>
                                  <td>
                                    <span className="badge bg-success-subtle text-success rounded-pill px-3">Ativo</span>
                                  </td>
                                  <td className="text-end">
                                    <button 
                                      className="btn btn-sm btn-outline-danger rounded-pill"
                                      onClick={() => handleRemoveMember(driver._id)}
                                    >
                                      <FontAwesomeIcon icon={faUserMinus} className="me-1" /> Desassociar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      membersData.sellers?.length === 0 ? (
                        <div className="text-center py-4 bg-light rounded-3 text-muted">
                          Nenhum fornecedor ou loja associada a este parceiro.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Fornecedor / Loja</th>
                                <th>Contacto</th>
                                <th>Status</th>
                                <th className="text-end">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {membersData.sellers.map(seller => (
                                <tr key={seller._id}>
                                  <td>
                                    <div className="fw-bold text-dark">{seller.name}</div>
                                    <div className="small text-muted">{seller.email}</div>
                                  </td>
                                  <td>{seller.phoneNumber || 'N/A'}</td>
                                  <td>
                                    <span className="badge bg-success-subtle text-success rounded-pill px-3">Ativo</span>
                                  </td>
                                  <td className="text-end">
                                    <button 
                                      className="btn btn-sm btn-outline-danger rounded-pill"
                                      onClick={() => handleRemoveMember(seller._id)}
                                    >
                                      <FontAwesomeIcon icon={faUserMinus} className="me-1" /> Desassociar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light p-3">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowMembersModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Associar Utilizador Existente */}
      {showAssignModal && (
        <div className="modal show d-block tab-modal-backdrop" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white p-3">
                <h6 className="modal-title fw-bold">
                  Associar {activeTab === 'drivers' ? 'Motorista' : 'Fornecedor'} Sem Parceiro
                </h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAssignModal(false)}></button>
              </div>

              <div className="modal-body p-3">
                <input 
                  type="text"
                  className="form-control rounded-pill mb-3"
                  placeholder="Pesquisar utilizador..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                />

                {loadingUnassigned ? (
                  <div className="text-center py-4 text-muted">
                    <FontAwesomeIcon icon={faSpinner} spin className="me-2" /> A carregar utilizadores sem parceiro...
                  </div>
                ) : (
                  <div className="list-group max-vh-50 overflow-auto">
                    {unassignedUsers
                      .filter(u => (u.name || '').toLowerCase().includes(assignSearch.toLowerCase()) || String(u.phoneNumber || '').includes(assignSearch))
                      .map(u => (
                        <div key={u._id} className="list-group-item d-flex justify-content-between align-items-center p-3">
                          <div>
                            <div className="fw-bold text-dark">{u.name}</div>
                            <div className="small text-muted">{u.email} | {u.phoneNumber}</div>
                          </div>
                          <button 
                            className="btn btn-sm btn-primary rounded-pill px-3"
                            onClick={() => handleAssignUser(u._id)}
                          >
                            <FontAwesomeIcon icon={faUserPlus} className="me-1" /> Associar
                          </button>
                        </div>
                      ))}
                    {unassignedUsers.length === 0 && (
                      <div className="text-center py-4 text-muted">Nenhum utilizador livre encontrado.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light p-2">
                <button type="button" className="btn btn-sm btn-secondary rounded-pill px-3" onClick={() => setShowAssignModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
