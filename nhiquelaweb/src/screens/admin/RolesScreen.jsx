import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faEdit, faTrash, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

// Lista de permissões disponíveis no sistema
const AVAILABLE_PERMISSIONS = [
  { id: 'manage_users', label: 'Gerir Utilizadores' },
  { id: 'manage_roles', label: 'Gerir Papéis (Roles)' },
  { id: 'manage_products', label: 'Gerir Produtos' },
  { id: 'manage_orders', label: 'Gerir Encomendas' },
  { id: 'manage_settings', label: 'Gerir Configurações' },
  { id: 'view_finance', label: 'Ver Finanças' },
];

export default function RolesScreen() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ _id: null, name: '', description: '', permissions: [] });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data || []);
    } catch (error) {
      toast.error('Erro ao carregar papéis (roles)');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setIsEditing(true);
      setFormData({ 
        _id: role._id, 
        name: role.name, 
        description: role.description || '', 
        permissions: role.permissions || [],
        isSystem: role.isSystem
      });
    } else {
      setIsEditing(false);
      setFormData({ _id: null, name: '', description: '', permissions: [] });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const togglePermission = (permId) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/roles/${formData._id}`, formData);
        toast.success('Papel atualizado com sucesso!');
      } else {
        await api.post('/roles', formData);
        toast.success('Papel criado com sucesso!');
      }
      fetchRoles();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao guardar papel');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('ATENÇÃO: Tem a certeza que deseja eliminar este papel?')) {
      try {
        await api.delete(`/roles/${id}`);
        toast.success('Papel eliminado com sucesso!');
        fetchRoles();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Erro ao eliminar papel');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Gestão de Papéis (Roles)</h2>
          <span className="text-muted small">Crie e defina permissões de acesso dinâmico (RBAC)</span>
        </div>
        <button className="btn btn-primary bg-primary-custom border-0 rounded-pill px-4 shadow-sm" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Papel
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0 mt-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome do Papel</th>
                  <th className="border-0 text-muted py-3">Descrição</th>
                  <th className="border-0 text-muted py-3">Permissões</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">A carregar roles...</td></tr>
                ) : roles.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">Nenhuma role encontrada.</td></tr>
                ) : roles.map(role => (
                  <tr key={role._id}>
                    <td className="px-4 fw-bold text-dark">
                      <FontAwesomeIcon icon={faShieldAlt} className="text-primary-custom me-2" />
                      {role.name}
                      {role.isSystem && <span className="badge bg-danger ms-2">Sistema</span>}
                    </td>
                    <td className="text-muted small">{role.description || '-'}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {role.permissions.map(p => (
                          <span key={p} className="badge bg-light text-dark border">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(role)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(role._id)} disabled={role.isSystem} title={role.isSystem ? "Papel protegido" : "Eliminar"}>
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
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '600px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Papel' : 'Novo Papel'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome da Role *</label>
                  <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required disabled={formData.isSystem} />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                  <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                
                <div className="mb-4 p-3 bg-light rounded-3 border">
                  <h6 className="fw-bold mb-3">Permissões Associadas</h6>
                  <div className="row g-2">
                    {AVAILABLE_PERMISSIONS.map(perm => (
                      <div className="col-12 col-md-6" key={perm.id}>
                        <div className="form-check border rounded-3 p-2 bg-white shadow-sm" style={{ cursor: 'pointer' }}>
                          <input className="form-check-input ms-1 me-2" type="checkbox" id={`perm-${perm.id}`} checked={formData.permissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} />
                          <label className="form-check-label w-100" htmlFor={`perm-${perm.id}`} style={{ cursor: 'pointer' }}>
                            <span className="fw-bold small">{perm.label}</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold shadow-sm">
                  Salvar Alterações
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
