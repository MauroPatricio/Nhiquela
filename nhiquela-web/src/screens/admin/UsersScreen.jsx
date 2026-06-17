import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faEdit, faTrash, faShieldAlt, faUserTie, faUser, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', isAdmin: false, isSeller: false, planId: '' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

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
      planId: user.planId || ''
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

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Gestão Global de Utilizadores</h2>
          <span className="text-muted small">Administre contas, promova vendedores e controle acessos à plataforma</span>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-header bg-white border-0 p-4 pb-0">
          <div className="input-group" style={{ maxWidth: '400px' }}>
            <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
            <input 
              type="text" 
              className="form-control bg-light border-0 py-2" 
              placeholder="Pesquisar por nome ou email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body p-0 mt-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Utilizador</th>
                  <th className="border-0 text-muted py-3">Papel (Role)</th>
                  <th className="border-0 text-muted py-3">Data de Registo</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">A carregar contas de utilizadores...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">Nenhum utilizador encontrado no sistema.</td>
                  </tr>
                ) : filteredUsers.map(user => (
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
                      ) : (
                        <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faUser} className="me-1" /> Cliente</span>
                      )}
                    </td>
                    <td className="text-muted">
                      {user.createdAt ? new Date(user.createdAt._seconds ? user.createdAt._seconds * 1000 : user.createdAt).toLocaleDateString() : 'Desconhecido'}
                    </td>
                    <td className="text-end px-4">
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
                  
                  <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" id="isAdmin" checked={formData.isAdmin} onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})} />
                    <label className="form-check-label fw-bold text-danger" htmlFor="isAdmin">Administrador (Acesso Total)</label>
                  </div>
                  
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="isSeller" checked={formData.isSeller} onChange={(e) => setFormData({...formData, isSeller: e.target.checked})} />
                    <label className="form-check-label fw-bold text-success" htmlFor="isSeller">Vendedor (Pode gerir loja e produtos)</label>
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
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  Salvar Alterações
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
