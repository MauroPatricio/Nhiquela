import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWrench,
  faPlus,
  faCheckCircle,
  faExclamationTriangle,
  faClock,
  faCar,
  faTrash,
  faTimes,
  faCheck,
  faShieldAlt,
  faCalendarAlt,
  faTachometerAlt,
  faUser,
  faPhone,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import './FleetOperations.css';

export default function FleetMaintenanceScreen() {
  const { userInfo } = useSelector((state) => state.user);
  const [plans, setPlans] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [createForm, setCreateForm] = useState({
    vehicle: '',
    serviceType: 'troca_oleo',
    customTitle: '',
    intervalKm: 5000,
    intervalDays: 180,
    lastMaintenanceKm: 0,
    lastMaintenanceDate: new Date().toISOString().split('T')[0],
    advanceNoticeKm: 500,
    advanceNoticeDays: 7,
    costMzn: 0,
    serviceProvider: '',
  });

  const [completeForm, setCompleteForm] = useState({
    doneKm: 0,
    doneDate: new Date().toISOString().split('T')[0],
    costMzn: 0,
    serviceProvider: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, vRes] = await Promise.all([
        api.get('/fleet/maintenance', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
        api.get('/fleet/vehicles', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
      ]);
      setPlans(pRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      toast.error('Erro ao carregar manutenções: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.vehicle) return toast.error('Selecione um veículo.');
    try {
      await api.post('/fleet/maintenance', createForm, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success('Plano de manutenção criado com sucesso!');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const openCompleteModal = (plan) => {
    setSelectedPlan(plan);
    setCompleteForm({
      doneKm: plan.vehicle?.currentOdometer || plan.nextMaintenanceKm,
      doneDate: new Date().toISOString().split('T')[0],
      costMzn: plan.costMzn || 0,
      serviceProvider: plan.serviceProvider || '',
    });
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(
        `/fleet/maintenance/${selectedPlan._id}`,
        {
          markCompleted: true,
          doneKm: completeForm.doneKm,
          doneDate: completeForm.doneDate,
          costMzn: completeForm.costMzn,
          serviceProvider: completeForm.serviceProvider,
        },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      toast.success('Manutenção registada como concluída!');
      setShowCompleteModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Deseja remover este plano de manutenção?')) return;
    try {
      await api.delete(`/fleet/maintenance/${id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success('Plano removido com sucesso!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const serviceLabels = {
    troca_oleo: 'Troca de Óleo',
    filtros: 'Troca de Filtros',
    pneus: 'Troca de Pneus / Calibração',
    travoes: 'Sistema de Travões',
    bateria: 'Bateria & Elétrico',
    revisao: 'Revisão Geral',
    inspeccao: 'Inspeção Periódica',
    seguro: 'Renovação de Seguro',
    outros: 'Outros Serviços',
  };

  // KPIs
  const totalPlans = plans.length;
  const overdueCount = plans.filter((p) => p.status === 'VENCIDA').length;
  const upcomingCount = plans.filter((p) => p.status === 'PROXIMA').length;
  const okCount = plans.filter((p) => p.status === 'EM_DIA').length;

  return (
    <div className="fleet-ops-wrapper">
      {/* 1. Hero Header */}
      <div className="fleet-hero-header hero-maintenance">
        <div>
          <div className="fleet-hero-badge">
            <FontAwesomeIcon icon={faShieldAlt} /> Manutenção Preventiva & Preditiva
          </div>
          <h1 className="fleet-hero-title">
            <FontAwesomeIcon icon={faWrench} className="text-amber-400" />
            Planos de Manutenção
          </h1>
          <p className="fleet-hero-subtitle">
            Controlo rigoroso de ciclos de revisão, troca de fluídos, pneus e auditoria preventiva por quilometragem e tempo decorrido.
          </p>
        </div>
        <div className="fleet-hero-actions">
          <button
            onClick={() => {
              if (vehicles.length === 0) return toast.error('Registe um veículo antes de criar um plano.');
              setCreateForm({ ...createForm, vehicle: vehicles[0]._id });
              setShowCreateModal(true);
            }}
            className="btn-ops-amber"
          >
            <FontAwesomeIcon icon={faPlus} />
            Novo Plano de Manutenção
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Total de Planos</div>
              <div className="fleet-kpi-value">{totalPlans}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7f00ff' }}>
              <FontAwesomeIcon icon={faWrench} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Programas ativos na frota</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Planos em Dia</div>
              <div className="fleet-kpi-value" style={{ color: '#059669' }}>{okCount}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Conformidade total</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Atenção / Próximas</div>
              <div className="fleet-kpi-value" style={{ color: '#d97706' }}>{upcomingCount}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <FontAwesomeIcon icon={faClock} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Próximas do limite de km/dias</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Vencidas / Urgentes</div>
              <div className="fleet-kpi-value" style={{ color: '#e11d48' }}>{overdueCount}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#fff1f2', color: '#f43f5e' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Intervenção técnica imediata</div>
        </div>
      </div>

      {/* 3. Tabela de Planos de Manutenção */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          A carregar planos de manutenção...
        </div>
      ) : plans.length === 0 ? (
        <div className="fleet-table-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <FontAwesomeIcon icon={faWrench} style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', margin: 0 }}>
            Nenhum plano de manutenção configurado
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Clique no botão acima para definir revisões e alertas por veículo.
          </p>
        </div>
      ) : (
        <div className="fleet-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>Veículo</th>
                  <th>Serviço</th>
                  <th>Intervalo</th>
                  <th>Última Manutenção</th>
                  <th>Próxima Prevista</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="vehicle-plate-pill">
                          <span className="vehicle-plate-flag" />
                          {p.vehicle?.plateNumber || 'N/A'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {p.vehicle?.brand} {p.vehicle?.model} • Atual: {p.vehicle?.currentOdometer?.toLocaleString()} km
                      </div>
                      {p.vehicle?.assignedDriver ? (
                        <div style={{ marginTop: '0.45rem' }}>
                          <div className="fleet-driver-pill">
                            <div className="fleet-driver-avatar">
                              {p.vehicle.assignedDriver.profileImage ? (
                                <img src={p.vehicle.assignedDriver.profileImage} alt={p.vehicle.assignedDriver.name} />
                              ) : (
                                <span>{p.vehicle.assignedDriver.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}</span>
                              )}
                              <span className={p.vehicle.assignedDriver.isOnline ? 'driver-online-dot' : 'driver-offline-dot'} />
                            </div>
                            <div className="fleet-driver-meta">
                              <span className="fleet-driver-name">{p.vehicle.assignedDriver.name}</span>
                              <div className="fleet-driver-contact">
                                {p.vehicle.assignedDriver.phoneNumber && (
                                  <a href={`tel:${p.vehicle.assignedDriver.phoneNumber}`} title={`Ligar: ${p.vehicle.assignedDriver.phoneNumber}`}>
                                    <FontAwesomeIcon icon={faPhone} style={{ fontSize: '0.6rem', color: '#10b981', marginRight: '0.15rem' }} />
                                    {p.vehicle.assignedDriver.phoneNumber}
                                  </a>
                                )}
                                {p.vehicle.assignedDriver.email && (
                                  <a href={`mailto:${p.vehicle.assignedDriver.email}`} title={`Email: ${p.vehicle.assignedDriver.email}`}>
                                    <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '0.6rem', color: '#6366f1', marginRight: '0.15rem' }} />
                                    {p.vehicle.assignedDriver.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          Sem motorista atribuído
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {serviceLabels[p.serviceType] || p.serviceType}
                      </div>
                      {p.customTitle && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.customTitle}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#334155' }}>
                        {p.intervalKm?.toLocaleString()} km
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.intervalDays} dias</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#334155' }}>
                        {p.lastMaintenanceKm?.toLocaleString()} km
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {p.lastMaintenanceDate ? new Date(p.lastMaintenanceDate).toLocaleDateString('pt-MZ') : '-'}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontWeight: '800',
                          color: p.status === 'VENCIDA' ? '#e11d48' : p.status === 'PROXIMA' ? '#d97706' : '#0f172a',
                        }}
                      >
                        {p.nextMaintenanceKm?.toLocaleString()} km
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {p.nextMaintenanceDate ? new Date(p.nextMaintenanceDate).toLocaleDateString('pt-MZ') : '-'}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`ops-badge ${
                          p.status === 'EM_DIA'
                            ? 'badge-ok'
                            : p.status === 'PROXIMA'
                            ? 'badge-warn'
                            : 'badge-danger'
                        }`}
                      >
                        {p.status === 'EM_DIA' ? (
                          <>
                            <FontAwesomeIcon icon={faCheckCircle} /> Em Dia
                          </>
                        ) : p.status === 'PROXIMA' ? (
                          <>
                            <FontAwesomeIcon icon={faClock} /> Próxima
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faExclamationTriangle} /> VENCIDA
                          </>
                        )}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => openCompleteModal(p)}
                          className="btn-ops-emerald"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', borderRadius: '10px' }}
                        >
                          <FontAwesomeIcon icon={faCheck} /> Concluir
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p._id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            fontSize: '0.85rem',
                          }}
                          title="Eliminar Plano"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Modal de Criar Plano */}
      {showCreateModal && (
        <div className="fleet-modal-overlay">
          <div className="fleet-modal-content">
            <div className="fleet-modal-header header-amber">
              <h3 className="fleet-modal-title">
                <FontAwesomeIcon icon={faWrench} /> Novo Plano de Manutenção
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="fleet-modal-close-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="fleet-modal-body">
              <form onSubmit={handleCreateSubmit} className="fleet-form-grid">
                <div>
                  <label className="fleet-form-label">Veículo da Frota *</label>
                  <select
                    required
                    value={createForm.vehicle}
                    onChange={(e) => setCreateForm({ ...createForm, vehicle: e.target.value })}
                    className="fleet-input-control"
                  >
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.plateNumber} — {v.brand} {v.model} ({v.currentOdometer?.toLocaleString()} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fleet-form-grid fleet-form-grid-2">
                  <div>
                    <label className="fleet-form-label">Tipo de Serviço *</label>
                    <select
                      value={createForm.serviceType}
                      onChange={(e) => setCreateForm({ ...createForm, serviceType: e.target.value })}
                      className="fleet-input-control"
                    >
                      {Object.entries(serviceLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="fleet-form-label">Título Personalizado (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ex: Óleo Castrol 10W40"
                      value={createForm.customTitle}
                      onChange={(e) => setCreateForm({ ...createForm, customTitle: e.target.value })}
                      className="fleet-input-control"
                    />
                  </div>
                </div>

                <div className="fleet-form-grid fleet-form-grid-2">
                  <div>
                    <label className="fleet-form-label">Intervalo em Km *</label>
                    <input
                      type="number"
                      required
                      value={createForm.intervalKm}
                      onChange={(e) => setCreateForm({ ...createForm, intervalKm: Number(e.target.value) })}
                      className="fleet-input-control"
                    />
                  </div>
                  <div>
                    <label className="fleet-form-label">Intervalo em Dias *</label>
                    <input
                      type="number"
                      required
                      value={createForm.intervalDays}
                      onChange={(e) => setCreateForm({ ...createForm, intervalDays: Number(e.target.value) })}
                      className="fleet-input-control"
                    />
                  </div>
                </div>

                <div className="fleet-form-grid fleet-form-grid-2">
                  <div>
                    <label className="fleet-form-label">Km da Última Manutenção</label>
                    <input
                      type="number"
                      value={createForm.lastMaintenanceKm}
                      onChange={(e) => setCreateForm({ ...createForm, lastMaintenanceKm: Number(e.target.value) })}
                      className="fleet-input-control"
                    />
                  </div>
                  <div>
                    <label className="fleet-form-label">Data da Última Manutenção</label>
                    <input
                      type="date"
                      value={createForm.lastMaintenanceDate}
                      onChange={(e) => setCreateForm({ ...createForm, lastMaintenanceDate: e.target.value })}
                      className="fleet-input-control"
                    />
                  </div>
                </div>

                <div className="fleet-form-grid fleet-form-grid-2">
                  <div>
                    <label className="fleet-form-label">Alerta Antecipado (Km)</label>
                    <input
                      type="number"
                      value={createForm.advanceNoticeKm}
                      onChange={(e) => setCreateForm({ ...createForm, advanceNoticeKm: Number(e.target.value) })}
                      className="fleet-input-control"
                    />
                  </div>
                  <div>
                    <label className="fleet-form-label">Alerta Antecipado (Dias)</label>
                    <input
                      type="number"
                      value={createForm.advanceNoticeDays}
                      onChange={(e) => setCreateForm({ ...createForm, advanceNoticeDays: Number(e.target.value) })}
                      className="fleet-input-control"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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
                  <button type="submit" className="btn-ops-amber">
                    Guardar Plano
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal de Concluir Manutenção */}
      {showCompleteModal && selectedPlan && (
        <div className="fleet-modal-overlay">
          <div className="fleet-modal-content">
            <div className="fleet-modal-header header-emerald">
              <h3 className="fleet-modal-title">
                <FontAwesomeIcon icon={faCheckCircle} /> Concluir Manutenção
              </h3>
              <button onClick={() => setShowCompleteModal(false)} className="fleet-modal-close-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="fleet-modal-body">
              <form onSubmit={handleCompleteSubmit} className="fleet-form-grid">
                <div>
                  <label className="fleet-form-label">Quilometragem no Momento da Conclusão (km) *</label>
                  <input
                    type="number"
                    required
                    value={completeForm.doneKm}
                    onChange={(e) => setCompleteForm({ ...completeForm, doneKm: Number(e.target.value) })}
                    className="fleet-input-control"
                    style={{ fontSize: '1rem', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label className="fleet-form-label">Data da Conclusão *</label>
                  <input
                    type="date"
                    required
                    value={completeForm.doneDate}
                    onChange={(e) => setCompleteForm({ ...completeForm, doneDate: e.target.value })}
                    className="fleet-input-control"
                  />
                </div>

                <div>
                  <label className="fleet-form-label">Custo Total (MZN)</label>
                  <input
                    type="number"
                    placeholder="ex: 4500"
                    value={completeForm.costMzn}
                    onChange={(e) => setCompleteForm({ ...completeForm, costMzn: Number(e.target.value) })}
                    className="fleet-input-control"
                  />
                </div>

                <div>
                  <label className="fleet-form-label">Oficina / Fornecedor do Serviço</label>
                  <input
                    type="text"
                    placeholder="ex: Auto Mecânica Central"
                    value={completeForm.serviceProvider}
                    onChange={(e) => setCompleteForm({ ...completeForm, serviceProvider: e.target.value })}
                    className="fleet-input-control"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(false)}
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
                  <button type="submit" className="btn-ops-emerald">
                    Confirmar Conclusão
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

