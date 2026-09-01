import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import api from '../../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faMotorcycle, faStore, faPlus, faTrash, faSearch, faPhone, faEnvelope, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

export default function PartnerMembersScreen() {
  const userInfo = useSelector(selectUser) || {};
  const partnerId = userInfo.partnerId || userInfo._id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ drivers: [], sellers: [], totalMembers: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal para associar novo membro
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState('driver'); // 'driver' ou 'seller'
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/partners/${partnerId}/members`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setData(res.data || { drivers: [], sellers: [], totalMembers: 0, members: [] });
    } catch (error) {
      console.error('Erro ao carregar membros da frota:', error);
      toast.error('Erro ao carregar os membros da sua frota.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partnerId && userInfo.token) {
      fetchMembers();
    }
  }, [partnerId, userInfo.token]);

  const handleAssignMember = async (e) => {
    e.preventDefault();
    if (!identifier) {
      toast.warning('Por favor insira o ID, Email ou Telefone.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = assignType === 'driver' 
        ? `/partners/${partnerId}/assign-driver` 
        : `/partners/${partnerId}/assign-seller`;

      const payload = identifier.includes('@') 
        ? { email: identifier }
        : (/^\d+$/.test(identifier) ? { phoneNumber: Number(identifier) } : { userId: identifier });

      const res = await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });

      toast.success(res.data.message || 'Membro associado com sucesso!');
      setShowAssignModal(false);
      setIdentifier('');
      fetchMembers();
    } catch (error) {
      console.error('Erro ao associar membro:', error);
      toast.error(error.response?.data?.message || 'Erro ao associar membro.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Tem a certeza que deseja desvincular '${member.name}' da sua frota?`)) {
      return;
    }

    try {
      const res = await api.delete(`/partners/${partnerId}/remove-member/${member._id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      toast.success(res.data.message || 'Membro desvinculado com sucesso.');
      fetchMembers();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error(error.response?.data?.message || 'Erro ao remover membro.');
    }
  };

  const driversList = data.drivers || [];
  const sellersList = data.sellers || [];
  const totalDriversCount = driversList.length;
  const totalSellersCount = sellersList.length;
  const totalMembersCount = totalDriversCount + totalSellersCount;

  const allMembers = [...driversList, ...sellersList];
  const displayedMembers = allMembers.filter(m => {
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'drivers' && (m.role === 'DRIVER' || m.isDeliveryMan)) || 
                       (activeTab === 'sellers' && (m.role === 'SELLER' || m.isSeller));
    const matchesSearch = !searchTerm || 
                          m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(m.phoneNumber || '').includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="container-fluid py-2">
      {/* Cabeçalho */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 bg-white p-4 rounded-4 shadow-sm border border-light">
        <div>
          <span className="badge px-3 py-2 rounded-pill mb-2" style={{ backgroundColor: 'rgba(138,43,226,0.1)', color: '#8a2be2', fontWeight: 'bold' }}>
            <FontAwesomeIcon icon={faUsers} className="me-2" /> Gestão da Frota
          </span>
          <h3 className="fw-bold m-0 text-dark">Motoristas & Fornecedores</h3>
          <p className="text-muted small m-0 mt-1">
            Gerencie todos os prestadores e estabelecimentos vinculados à sua conta de parceiro.
          </p>
        </div>

        <button 
          onClick={() => setShowAssignModal(true)} 
          className="btn text-white rounded-3 px-4 py-2 fw-bold shadow-sm"
          style={{ backgroundColor: '#8a2be2' }}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Associar Membro
        </button>
      </div>

      {/* Tabs & Pesquisa em Layout Organizado */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
        <div className="card-body p-3 d-flex flex-column flex-lg-row justify-content-between align-items-stretch align-items-lg-center gap-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button 
              className={`btn rounded-3 fw-bold px-3 py-2 transition-all ${activeTab === 'all' ? 'text-white shadow-sm' : 'btn-light text-secondary'}`}
              style={{ backgroundColor: activeTab === 'all' ? '#8a2be2' : '#f8f9fa' }}
              onClick={() => setActiveTab('all')}
            >
              Todos ({totalMembersCount})
            </button>
            <button 
              className={`btn rounded-3 fw-bold px-3 py-2 transition-all ${activeTab === 'drivers' ? 'text-white shadow-sm' : 'btn-light text-secondary'}`}
              style={{ backgroundColor: activeTab === 'drivers' ? '#8a2be2' : '#f8f9fa' }}
              onClick={() => setActiveTab('drivers')}
            >
              <FontAwesomeIcon icon={faMotorcycle} className="me-2 text-info" /> Motoristas ({totalDriversCount})
            </button>
            <button 
              className={`btn rounded-3 fw-bold px-3 py-2 transition-all ${activeTab === 'sellers' ? 'text-white shadow-sm' : 'btn-light text-secondary'}`}
              style={{ backgroundColor: activeTab === 'sellers' ? '#8a2be2' : '#f8f9fa' }}
              onClick={() => setActiveTab('sellers')}
            >
              <FontAwesomeIcon icon={faStore} className="me-2 text-warning" /> Fornecedores ({totalSellersCount})
            </button>
          </div>

          <div className="position-relative flex-grow-1 flex-lg-grow-0" style={{ minWidth: '300px' }}>
            <input 
              type="text" 
              className="form-control rounded-3 ps-5 py-2 border-light bg-light" 
              placeholder="Pesquisar por Nome, Email ou Tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FontAwesomeIcon icon={faSearch} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          </div>
        </div>
      </div>

      {/* Tabela de Membros */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Membro</th>
                  <th>Perfil / Role</th>
                  <th>Contacto</th>
                  <th>Disponibilidade</th>
                  <th>Receita Gerada</th>
                  <th className="text-end pe-4">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">Carregando membros da frota...</td>
                  </tr>
                ) : displayedMembers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">Nenhum membro encontrado.</td>
                  </tr>
                ) : (
                  displayedMembers.map((m) => (
                    <tr key={m._id}>
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle d-flex align-items-center justify-content-center me-3 text-white fw-bold shadow-sm" 
                               style={{ width: '42px', height: '42px', backgroundColor: (m.role === 'DRIVER' || m.isDeliveryMan) ? '#17a2b8' : '#8a2be2' }}>
                            <FontAwesomeIcon icon={(m.role === 'DRIVER' || m.isDeliveryMan) ? faMotorcycle : faStore} />
                          </div>
                          <div>
                            <h6 className="fw-bold m-0 text-dark">{m.name}</h6>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`badge px-3 py-2 rounded-pill ${(m.role === 'DRIVER' || m.isDeliveryMan) ? 'bg-info text-dark' : 'bg-warning text-dark'}`}>
                          {(m.role === 'DRIVER' || m.isDeliveryMan) ? 'Motorista / Prestador' : 'Fornecedor / Loja'}
                        </span>
                      </td>

                      <td>
                        <div className="small">
                          <div><FontAwesomeIcon icon={faPhone} className="me-2 text-muted" />{m.phoneNumber}</div>
                          <div><FontAwesomeIcon icon={faEnvelope} className="me-2 text-muted" />{m.email}</div>
                        </div>
                      </td>

                      <td>
                        {m.isOnline ? (
                          <span className="badge bg-success text-white px-3 py-2 rounded-pill shadow-sm">
                            <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Online / Disponível
                          </span>
                        ) : (
                          <span className="badge bg-secondary text-white px-3 py-2 rounded-pill">
                            Offline / Indisponível
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="fw-bold text-success">
                          {(m.revenue || 0).toLocaleString('pt-PT')} MT
                        </div>
                        <small className="text-muted">{m.completedOps || 0} operações concluídas</small>
                      </td>

                      <td className="text-end pe-4">
                        <button 
                          onClick={() => handleRemoveMember(m)} 
                          className="btn btn-outline-danger btn-sm rounded-3"
                          title="Desvincular da Frota"
                        >
                          <FontAwesomeIcon icon={faTrash} className="me-1" /> Desvincular
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Associar Membro */}
      {showAssignModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
          <div className="bg-white rounded-4 shadow-lg p-4 w-100" style={{ maxWidth: '480px' }}>
            <h5 className="fw-bold mb-3">Associar Novo Membro</h5>
            <form onSubmit={handleAssignMember}>
              <div className="mb-3">
                <label className="form-label small fw-bold">Tipo de Membro</label>
                <select 
                  className="form-select rounded-3" 
                  value={assignType} 
                  onChange={(e) => setAssignType(e.target.value)}
                >
                  <option value="driver">Motorista / Prestador</option>
                  <option value="seller">Fornecedor / Loja</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold">Identificador do Utilizador</label>
                <input 
                  type="text" 
                  className="form-control rounded-3" 
                  placeholder="Insira o ID, Email ou Número de Telefone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <small className="text-muted mt-1 d-block">
                  O utilizador deve estar previamente registado na plataforma.
                </small>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-light rounded-3 fw-bold"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn text-white rounded-3 fw-bold px-4"
                  style={{ backgroundColor: '#8a2be2' }}
                  disabled={submitting}
                >
                  {submitting ? 'Associando...' : 'Confirmar Associação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
