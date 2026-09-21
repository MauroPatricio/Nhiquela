import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import api from '../../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faStore,
  faPlus,
  faTrash,
  faSearch,
  faPhone,
  faEnvelope,
  faCheckCircle,
  faKey,
  faLock,
  faCoins,
  faTimes,
  faUserTie,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import { SteeringWheelIcon } from '../../components/common/CustomIcons';
import { toast } from 'react-toastify';
import './FleetOperations.css';

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
        headers: { Authorization: `Bearer ${userInfo.token}` },
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
      const endpoint =
        assignType === 'driver'
          ? `/partners/${partnerId}/assign-driver`
          : `/partners/${partnerId}/assign-seller`;

      const payload = identifier.includes('@')
        ? { email: identifier }
        : /^\d+$/.test(identifier)
        ? { phoneNumber: Number(identifier) }
        : { userId: identifier };

      const res = await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
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
      let res;
      try {
        res = await api.delete(`/partners/${partnerId}/remove-member/${member._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
      } catch (err) {
        res = await api.post(
          `/partners/${partnerId}/remove-member`,
          { memberId: member._id },
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );
      }
      toast.success(res.data?.message || 'Membro desvinculado com sucesso.');
      fetchMembers();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error(error.response?.data?.message || 'Erro ao desvincular membro da frota.');
    }
  };

  const handleResetPassword = async (member) => {
    if (
      window.confirm(
        `ATENÇÃO: Deseja redefinir a palavra-passe de "${member.name}" para o padrão "password123"?\n\nO membro será obrigado a definir uma nova palavra-passe no primeiro acesso à plataforma.`
      )
    ) {
      try {
        const { data } = await api.put(
          `/users/${member._id || member.id}/reset-password`,
          {},
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );
        toast.success(data?.message || `Palavra-passe de ${member.name} redefinida para "password123"!`);
      } catch (error) {
        console.error('Erro ao redefinir palavra-passe:', error);
        toast.error(error.response?.data?.message || 'Erro ao redefinir a palavra-passe do membro.');
      }
    }
  };

  const driversList = Array.isArray(data.drivers) ? data.drivers : [];
  const sellersList = Array.isArray(data.sellers) ? data.sellers : [];
  const totalDriversCount = driversList.length;
  const totalSellersCount = sellersList.length;
  const totalMembersCount = totalDriversCount + totalSellersCount;

  const allMembers = [...driversList, ...sellersList];
  const totalRevenue = allMembers.reduce((sum, m) => sum + (m.revenue || 0), 0);

  const displayedMembers = allMembers.filter((m) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'drivers' && (m.role === 'DRIVER' || m.isDeliveryMan)) ||
      (activeTab === 'sellers' && (m.role === 'SELLER' || m.isSeller));
    const matchesSearch =
      !searchTerm ||
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(m.phoneNumber || '').includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="fleet-ops-wrapper">
      {/* 1. Hero Header */}
      <div className="fleet-hero-header hero-members">
        <div>
          <div className="fleet-hero-badge">
            <FontAwesomeIcon icon={faUsers} /> Gestão da Equipa & Associados
          </div>
          <h1 className="fleet-hero-title">
            <FontAwesomeIcon icon={faUserTie} className="text-purple-400" />
            Minha Equipa & Motoristas
          </h1>
          <p className="fleet-hero-subtitle">
            Coordenação e monitorização de condutores, parceiros e fornecedores vinculados à sua gestão de frota.
          </p>
        </div>
        <div className="fleet-hero-actions">
          <button
            onClick={() => setShowAssignModal(true)}
            className="btn-ops-primary"
          >
            <FontAwesomeIcon icon={faPlus} />
            Associar Novo Membro
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Total de Membros</div>
              <div className="fleet-kpi-value">{totalMembersCount}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7f00ff' }}>
              <FontAwesomeIcon icon={faUsers} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Equipa total alocada</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Motoristas / Estafetas</div>
              <div className="fleet-kpi-value" style={{ color: '#0284c7' }}>{totalDriversCount}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <SteeringWheelIcon size={22} color="#0284c7" />
            </div>
          </div>
          <div className="fleet-kpi-sub">Condutores operacionais</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Fornecedores / Lojas</div>
              <div className="fleet-kpi-value" style={{ color: '#d97706' }}>{totalSellersCount}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <FontAwesomeIcon icon={faStore} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Pontos comerciais vinculados</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Receita Gerada</div>
              <div className="fleet-kpi-value" style={{ color: '#059669' }}>
                {totalRevenue.toLocaleString()}{' '}
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>MT</span>
              </div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <FontAwesomeIcon icon={faCoins} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Volume de produção da equipa</div>
        </div>
      </div>

      {/* 3. Toolbar: Tabs & Pesquisa */}
      <div className="fleet-toolbar-card">
        <div className="fleet-filter-pills">
          <button
            className={`fleet-filter-pill ${activeTab === 'all' ? 'active-all' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todos ({totalMembersCount})
          </button>
          <button
            className={`fleet-filter-pill ${activeTab === 'drivers' ? 'active-all' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            <SteeringWheelIcon size={16} style={{ marginRight: '0.35rem' }} />
            Motoristas ({totalDriversCount})
          </button>
          <button
            className={`fleet-filter-pill ${activeTab === 'sellers' ? 'active-all' : ''}`}
            onClick={() => setActiveTab('sellers')}
          >
            <FontAwesomeIcon icon={faStore} style={{ marginRight: '0.35rem' }} />
            Fornecedores ({totalSellersCount})
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
          <input
            type="text"
            className="fleet-input-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Pesquisar por nome, email ou tel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FontAwesomeIcon
            icon={faSearch}
            style={{
              position: 'absolute',
              top: '50%',
              left: '1rem',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
        </div>
      </div>

      {/* 4. Tabela de Membros */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#64748b' }}>
          A carregar membros da frota...
        </div>
      ) : displayedMembers.length === 0 ? (
        <div className="fleet-table-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', margin: 0 }}>
            Nenhum membro encontrado
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Clique no botão acima para associar motoristas ou fornecedores à sua conta de parceiro.
          </p>
        </div>
      ) : (
        <div className="fleet-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Perfil / Função</th>
                  <th>Contactos</th>
                  <th>Disponibilidade</th>
                  <th>Receita Gerada</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {displayedMembers.map((m) => {
                  const isDriver = m.role === 'DRIVER' || m.isDeliveryMan;
                  return (
                    <tr key={m._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: '800',
                              background: isDriver
                                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                                : 'linear-gradient(135deg, #7f00ff 0%, #6d28d9 100%)',
                              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            {isDriver ? <SteeringWheelIcon size={20} color="#ffffff" /> : <FontAwesomeIcon icon={faStore} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>
                              {m.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              ID: {String(m._id).substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`ops-badge ${isDriver ? 'badge-info' : 'badge-warn'}`}>
                          {isDriver ? 'Motorista / Prestador' : 'Fornecedor / Loja'}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <FontAwesomeIcon icon={faPhone} style={{ color: '#94a3b8', fontSize: '0.7rem' }} />
                            {m.phoneNumber || '—'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', color: '#64748b' }}>
                            <FontAwesomeIcon icon={faEnvelope} style={{ color: '#94a3b8', fontSize: '0.7rem' }} />
                            {m.email || '—'}
                          </div>
                        </div>
                      </td>

                      <td>
                        {m.availability === 'active' || m.isOnline || m.status === 'ONLINE' ? (
                          <span className="ops-badge badge-ok">
                            <FontAwesomeIcon icon={faCheckCircle} /> Online
                          </span>
                        ) : (
                          <span className="ops-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                            <FontAwesomeIcon icon={faCircle} style={{ fontSize: '0.5rem' }} /> Offline
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: '800', color: '#047857', fontSize: '0.88rem' }}>
                          {(m.revenue || 0).toLocaleString()} MT
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {m.completedOps || 0} operações concluídas
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleResetPassword(m)}
                            className="btn-ops-amber"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', borderRadius: '10px' }}
                            title="Redefinir Palavra-passe para o padrão (password123)"
                          >
                            <FontAwesomeIcon icon={faKey} /> Reset Senha
                          </button>
                          <button
                            onClick={() => handleRemoveMember(m)}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '10px',
                              background: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid rgba(225, 29, 72, 0.2)',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                            title="Desvincular da Frota"
                          >
                            <FontAwesomeIcon icon={faTrash} /> Desvincular
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal para Associar Membro */}
      {showAssignModal && (
        <div className="fleet-modal-overlay">
          <div className="fleet-modal-content">
            <div className="fleet-modal-header header-purple">
              <h3 className="fleet-modal-title">
                <FontAwesomeIcon icon={faUsers} /> Associar Novo Membro
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="fleet-modal-close-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="fleet-modal-body">
              <form onSubmit={handleAssignMember} className="fleet-form-grid">
                <div>
                  <label className="fleet-form-label">Tipo de Membro *</label>
                  <select
                    className="fleet-input-control"
                    value={assignType}
                    onChange={(e) => setAssignType(e.target.value)}
                  >
                    <option value="driver">Motorista / Prestador</option>
                    <option value="seller">Fornecedor / Loja</option>
                  </select>
                </div>

                <div>
                  <label className="fleet-form-label">Identificador do Utilizador (ID, Email ou Telefone) *</label>
                  <input
                    type="text"
                    className="fleet-input-control"
                    placeholder="Insira o ID, Email ou Número de Telefone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.4rem', display: 'block' }}>
                    O utilizador deve estar previamente registado na plataforma.
                  </small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-light rounded-3 fw-bold"
                    onClick={() => setShowAssignModal(false)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '14px',
                      background: '#f1f5f9',
                      border: 'none',
                      color: '#475569',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-ops-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'A associar...' : 'Confirmar Associação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

