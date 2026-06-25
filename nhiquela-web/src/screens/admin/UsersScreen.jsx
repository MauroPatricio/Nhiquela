import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faEdit, faTrash, faShieldAlt, faUserTie, faUser, faSearch, faTimes, faEye, faEnvelope, faPhone, faCalendarAlt, faCheckCircle, faBan } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [servicesList, setServicesList] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', isAdmin: false, isSeller: false, isDeliveryMan: false, planId: '', services: [] });
  const [showModal, setShowModal] = useState(false);
  const [selectedUserView, setSelectedUserView] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchPlans();
    fetchServices();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data || []);
    } catch (error) {
      console.warn('Roles não carregadas', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data } = await api.get('/services');
      setServicesList(data || []);
    } catch (error) {
      console.warn('Serviços não carregados', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/plans');
      setPlans(data || []);
    } catch (error) {
      console.warn('Planos não carregados', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Erro ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user) => {
    setIsEditing(true);
    setCurrentId(user._id || user.id);
    setFormData({ 
      name: user.name || '', 
      email: user.email || '', 
      isAdmin: user.isAdmin || false, 
      isSeller: user.isSeller || false,
      isDeliveryMan: user.isDeliveryMan || false,
      roleId: user.roleId ? (typeof user.roleId === 'object' ? user.roleId._id : user.roleId) : '',
      planId: user.planId || '',
      services: user.services || []
    });
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return toast.error('Nome e Email são obrigatórios');
    
    try {
      await api.put(`/users/${currentId}`, formData);
      toast.success('Permissões do utilizador atualizadas com sucesso!');
      fetchUsers();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar utilizador');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('ATENÇÃO: Tem a certeza que deseja eliminar PERMANENTEMENTE esta conta de utilizador do sistema?')) {
      try {
        await api.delete(`/users/${id}`);
        toast.success('Utilizador eliminado do sistema!');
        fetchUsers();
      } catch (error) {
        toast.error('Erro ao eliminar utilizador');
      }
    }
  };

  const handleUpdateStatus = async (user, newStatusObj) => {
    try {
      await api.put(`/users/${user._id || user.id}`, newStatusObj);
      toast.success('Estado do utilizador atualizado com sucesso!');
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao atualizar estado do utilizador');
    }
  };

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentUsers,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(users, 10, ['name', 'email']);

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Gestão Global de Utilizadores</h2>
          <span className="text-muted small">Administre contas, promova vendedores e controle acessos à plataforma</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar utilizador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0 mt-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Utilizador</th>
                  <th className="border-0 text-muted py-3">Papel (Role)</th>
                  <th className="border-0 text-muted py-3">Data de Registo</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">A carregar contas de utilizadores...</td>
                  </tr>
                ) : currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">Nenhum utilizador encontrado no sistema.</td>
                  </tr>
                ) : currentUsers.map(user => (
                  <tr key={user._id || user.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="p-2 bg-primary-subtle rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '45px', height: '45px' }}>
                          <FontAwesomeIcon icon={faUser} size="lg" />
                        </div>
                        <div>
                          <span className="fw-bold text-dark fs-6 d-block">{user.name}</span>
                          <span className="text-muted small">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.isAdmin ? (
                        <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faShieldAlt} className="me-1" /> Administrador</span>
                      ) : user.isSeller ? (
                        <div>
                          <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill mb-1"><FontAwesomeIcon icon={faUserTie} className="me-1" /> Vendedor</span>
                          {user.planId && (
                            <div className="small fw-bold text-warning mt-1">👑 {plans.find(p => p._id === user.planId || p.id === user.planId)?.name || 'Plano Desconhecido'}</div>
                          )}
                        </div>
                      ) : user.isDeliveryMan ? (
                        <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                          <FontAwesomeIcon icon={faUser} className="me-1" /> 
                          Motorista/{(user.deliveryman?.transport_type || user.transport_type) ? (user.deliveryman?.transport_type || user.transport_type).charAt(0).toUpperCase() + (user.deliveryman?.transport_type || user.transport_type).slice(1) : 'Geral'}
                        </span>
                      ) : user.isShopper ? (
                        <span className="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faUser} className="me-1" /> Shopper</span>
                      ) : (
                        <span className="badge px-3 py-2 rounded-pill" style={{ color: '#20c997', backgroundColor: 'rgba(32, 201, 151, 0.1)' }}><FontAwesomeIcon icon={faUser} className="me-1" /> Cliente</span>
                      )}
                      
                      {user.roleId && (
                        <span className="badge bg-dark bg-opacity-10 text-dark px-3 py-2 rounded-pill mt-1 d-block" style={{ width: 'fit-content' }}>
                          <FontAwesomeIcon icon={faShieldAlt} className="me-1" /> {user.roleId.name || 'Papel RBAC'}
                        </span>
                      )}
                    </td>
                    <td className="text-muted">
                      {user.createdAt ? new Date(user.createdAt._seconds ? user.createdAt._seconds * 1000 : user.createdAt).toLocaleDateString() : 'Desconhecido'}
                    </td>
                    <td>
                      {user.isBanned ? (
                        <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faBan} className="me-1" /> Bloqueado</span>
                      ) : !user.isApproved && (user.isSeller || user.isDeliveryMan) ? (
                        <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faTimes} className="me-1" /> Pendente</span>
                      ) : (
                        <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Ativo</span>
                      )}
                    </td>
                    <td className="text-end px-4">
                      {/* Estado Actions */}
                      {user.isBanned ? (
                        <button className="btn btn-sm btn-light text-success me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleUpdateStatus(user, { isBanned: false, isApproved: true })} title="Desbloquear / Reativar">
                          <FontAwesomeIcon icon={faCheckCircle} /> Desbloquear
                        </button>
                      ) : !user.isApproved && (user.isSeller || user.isDeliveryMan) ? (
                        <>
                          <button className="btn btn-sm btn-light text-success me-2 rounded-3 shadow-sm transition-all hover-transform fw-bold" onClick={() => handleUpdateStatus(user, { isApproved: true, isBanned: false })} title="Autorizar">
                            <FontAwesomeIcon icon={faCheckCircle} /> Autorizar
                          </button>
                          <button className="btn btn-sm btn-light text-danger me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleUpdateStatus(user, { isApproved: false, isBanned: true })} title="Rejeitar">
                            <FontAwesomeIcon icon={faTimes} /> Rejeitar
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-sm btn-light text-warning me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleUpdateStatus(user, { isBanned: true, isApproved: false })} title="Bloquear Conta">
                          <FontAwesomeIcon icon={faBan} /> Bloquear
                        </button>
                      )}

                      {/* Outras Actions */}
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => setSelectedUserView(user)} title="Ver Detalhes">
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(user)} title="Editar Permissões">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(user._id || user.id)} title="Eliminar Conta">
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
              <h5 className="fw-bold m-0 text-dark">Editar Permissões da Conta</h5>
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
                    className="form-control bg-light border-0 py-2 rounded-3" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Email</label>
                  <input 
                    type="email" 
                    className="form-control bg-light border-0 py-2 rounded-3" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                
                <div className="mb-4 p-3 bg-light rounded-3 border">
                  <h6 className="fw-bold mb-3">Papel do Utilizador (Roles)</h6>
                  
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark mb-1">Papel Dinâmico (RBAC)</label>
                    <select className="form-select bg-white border py-2 rounded-3" value={formData.roleId} onChange={(e) => setFormData({...formData, roleId: e.target.value})}>
                      <option value="">-- Sem papel dinâmico (Usa permissões antigas) --</option>
                      {roles.map(role => (
                        <option key={role._id} value={role._id}>{role.name} {role.isSystem ? '(Sistema)' : ''}</option>
                      ))}
                    </select>
                    <small className="text-muted d-block mt-1">Substitui as opções abaixo se selecionado.</small>
                  </div>

                  <hr className="my-3 opacity-25" />
                  
                  <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" id="isAdmin" checked={formData.isAdmin} onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})} />
                    <label className="form-check-label fw-bold text-danger" htmlFor="isAdmin">Administrador (Acesso Total) [Legacy]</label>
                  </div>
                  
                  <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" id="isSeller" checked={formData.isSeller} onChange={(e) => setFormData({...formData, isSeller: e.target.checked})} />
                    <label className="form-check-label fw-bold text-success" htmlFor="isSeller">Vendedor (Pode gerir loja e produtos)</label>
                  </div>

                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="isDeliveryMan" checked={formData.isDeliveryMan} onChange={(e) => setFormData({...formData, isDeliveryMan: e.target.checked})} />
                    <label className="form-check-label fw-bold text-primary" htmlFor="isDeliveryMan">Prestador (Pode realizar serviços e entregas)</label>
                  </div>

                  {formData.isSeller && (
                    <div className="mt-3 pt-3 border-top">
                      <label className="form-label fw-bold small text-muted mb-1">Plano de Subscrição</label>
                      <select className="form-select bg-white border py-2 rounded-3" value={formData.planId} onChange={(e) => setFormData({...formData, planId: e.target.value})}>
                        <option value="">-- Sem plano associado --</option>
                        {plans.map(plan => (
                          <option key={plan._id || plan.id} value={plan._id || plan.id}>{plan.name} ({plan.price})</option>
                        ))}
                      </select>
                      <small className="text-muted d-block mt-1">Configure os planos na aba Planos de Subscrição.</small>
                    </div>
                  )}

                  {formData.isDeliveryMan && (
                    <div className="mt-3 pt-3 border-top">
                      <label className="form-label fw-bold text-dark mb-2">Serviços Prestados</label>
                      <div className="row g-2">
                        {servicesList.map(service => (
                          <div className="col-12" key={service._id}>
                            <div className="form-check border rounded-3 p-2 d-flex align-items-center bg-white shadow-sm" style={{ cursor: 'pointer' }}>
                              <input 
                                className="form-check-input ms-1 me-2" 
                                type="checkbox" 
                                id={`srv-${service._id}`} 
                                checked={formData.services.includes(service._id)}
                                onChange={(e) => {
                                  const newServices = e.target.checked 
                                    ? [...formData.services, service._id]
                                    : formData.services.filter(id => id !== service._id);
                                  setFormData({...formData, services: newServices});
                                }}
                              />
                              <label className="form-check-label d-flex align-items-center flex-grow-1" htmlFor={`srv-${service._id}`} style={{ cursor: 'pointer' }}>
                                <div className="rounded-circle d-flex justify-content-center align-items-center me-2 text-white" style={{ width: '25px', height: '25px', backgroundColor: service.color || '#8a2be2', fontSize: '10px' }}>
                                  {service.icon ? service.icon.substring(0, 2).toUpperCase() : 'SV'}
                                </div>
                                <span className="fw-bold small">{service.name}</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      {servicesList.length === 0 && <small className="text-muted d-block mt-1">Nenhum serviço registado no sistema.</small>}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  Salvar Alterações
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalhes */}
      {selectedUserView && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
          style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={() => setSelectedUserView(null)}
        >
          <div 
            className="modal-dialog modal-dialog-centered m-0" 
            style={{ width: '100%', maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card border-0 shadow-lg rounded-4 w-100">
              <div className="card-header bg-white border-bottom-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold m-0 text-dark">Ficha de Utilizador</h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-light rounded-circle text-muted" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedUserView(null); }} 
                  style={{ width: '35px', height: '35px', cursor: 'pointer', zIndex: 1060 }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-primary-subtle text-primary-custom rounded-circle d-flex justify-content-center align-items-center me-3 shadow-sm fw-bold fs-3" style={{ width: '80px', height: '80px' }}>
                    {selectedUserView.name ? selectedUserView.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">{selectedUserView.name}</h4>
                    {selectedUserView.isAdmin ? (
                      <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faShieldAlt} className="me-1" /> Administrador</span>
                    ) : selectedUserView.isSeller ? (
                      <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faUserTie} className="me-1" /> Vendedor</span>
                    ) : selectedUserView.isDeliveryMan ? (
                      <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                        <FontAwesomeIcon icon={faUser} className="me-1" /> 
                        Motorista/{(selectedUserView.deliveryman?.transport_type || selectedUserView.transport_type) ? (selectedUserView.deliveryman?.transport_type || selectedUserView.transport_type).charAt(0).toUpperCase() + (selectedUserView.deliveryman?.transport_type || selectedUserView.transport_type).slice(1) : 'Geral'}
                      </span>
                    ) : selectedUserView.isShopper ? (
                      <span className="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faUser} className="me-1" /> Shopper</span>
                    ) : (
                      <span className="badge px-3 py-2 rounded-pill" style={{ color: '#20c997', backgroundColor: 'rgba(32, 201, 151, 0.1)' }}><FontAwesomeIcon icon={faUser} className="me-1" /> Cliente</span>
                    )}
                    {selectedUserView.roleId && (
                      <span className="badge bg-dark px-3 py-2 rounded-pill ms-2">
                        <FontAwesomeIcon icon={faShieldAlt} className="me-1" /> {selectedUserView.roleId.name || 'Papel Dinâmico'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-light rounded-4 p-3 mb-4 border">
                  {selectedUserView.email && (
                    <div className="d-flex mb-2">
                      <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faEnvelope} /></div>
                      <div className="fw-bold text-dark">{selectedUserView.email}</div>
                    </div>
                  )}
                  {(selectedUserView.phone || selectedUserView.phoneNumber) && (
                    <div className="d-flex mb-2">
                      <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faPhone} /></div>
                      <div className="fw-bold text-dark">{selectedUserView.phone || selectedUserView.phoneNumber}</div>
                    </div>
                  )}
                  {selectedUserView.location && (
                    <div className="d-flex mb-2">
                      <div className="text-muted" style={{width: '30px'}}>📍</div>
                      <div className="fw-bold text-dark">{selectedUserView.location}</div>
                    </div>
                  )}
                  {selectedUserView.rating && (
                    <div className="d-flex mb-2">
                      <div className="text-muted" style={{width: '30px'}}>⭐</div>
                      <div className="fw-bold text-dark">{selectedUserView.rating}</div>
                    </div>
                  )}
                </div>

                <div className="row g-2 mb-4">
                  <div className="col-4">
                    <div className="border rounded-3 p-2 text-center bg-white h-100 shadow-sm">
                      <div className="text-muted small fw-bold mb-1">Pedidos</div>
                      <div className="fw-bold m-0 text-dark fs-5">{selectedUserView.totalOrders || 0}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border rounded-3 p-2 text-center bg-white h-100 shadow-sm">
                      <div className="text-muted small fw-bold mb-1">Concluídos</div>
                      <div className="fw-bold m-0 text-success fs-5">{selectedUserView.completedOrders || 0}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border rounded-3 p-2 text-center bg-white h-100 shadow-sm">
                      <div className="text-muted small fw-bold mb-1">Cancelados</div>
                      <div className="fw-bold m-0 text-danger fs-5">{selectedUserView.cancelledOrders || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="row g-2 mb-4">
                  <div className="col-12">
                    <div className="border rounded-3 p-3 text-center bg-white h-100 shadow-sm">
                      <div className="text-muted small fw-bold mb-1">Membro Desde</div>
                      <div className="fw-bold m-0 text-dark fs-5">
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-muted me-2" />
                        {selectedUserView.createdAt ? new Date(selectedUserView.createdAt._seconds ? selectedUserView.createdAt._seconds * 1000 : selectedUserView.createdAt).toLocaleDateString('pt-PT') : 'Desconhecido'}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-light w-100 fw-bold border py-2" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedUserView(null); }}
                  style={{ cursor: 'pointer', zIndex: 1060, position: 'relative' }}
                >
                  Fechar Detalhes
                </button>
              </div>
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
