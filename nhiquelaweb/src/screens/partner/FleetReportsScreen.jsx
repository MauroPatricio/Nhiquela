import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar,
  faGasPump,
  faWrench,
  faUser,
  faCar,
  faFilter,
  faPrint,
  faMoneyBillWave,
  faTachometerAlt,
  faCoins,
  faFileContract,
  faCalendarAlt,
  faPhone,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import './FleetOperations.css';

export default function FleetReportsScreen() {
  const { userInfo } = useSelector((state) => state.user);
  const [reports, setReports] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  const fetchVehicles = async () => {
    try {
      const { data } = await api.get('/fleet/vehicles', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (vehicleId) params.append('vehicleId', vehicleId);

      const { data } = await api.get(`/fleet/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setReports(data);
    } catch (err) {
      toast.error('Erro ao carregar relatórios: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchReports();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fleet-ops-wrapper" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      {/* 1. Hero Header */}
      <div className="fleet-hero-header hero-reports d-print-none">
        <div>
          <div className="fleet-hero-badge">
            <FontAwesomeIcon icon={faFileContract} /> Auditoria Executiva & Custos
          </div>
          <h1 className="fleet-hero-title">
            <FontAwesomeIcon icon={faChartBar} className="text-purple-400" />
            Relatórios e Auditoria de Frota
          </h1>
          <p className="fleet-hero-subtitle">
            Consolidado analítico de combustível por veículo e condutor, apuramento de custo real por quilómetro e histórico global de manutenções.
          </p>
        </div>
        <div className="fleet-hero-actions">
          <button
            onClick={handlePrint}
            className="btn-ops-glass"
          >
            <FontAwesomeIcon icon={faPrint} />
            Imprimir / Exportar PDF
          </button>
        </div>
      </div>

      {/* 2. Filtros de Pesquisa */}
      <div className="fleet-toolbar-card d-print-none">
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem', width: '100%' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label className="fleet-form-label">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="fleet-input-control"
            />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label className="fleet-form-label">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="fleet-input-control"
            />
          </div>
          <div style={{ flex: '1 1 240px' }}>
            <label className="fleet-form-label">Filtrar por Veículo</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="fleet-input-control"
            >
              <option value="">Todos os Veículos da Frota</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.plateNumber} — {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              type="submit"
              className="btn-ops-primary"
              style={{ padding: '0.75rem 1.4rem' }}
            >
              <FontAwesomeIcon icon={faFilter} />
              Aplicar Filtros
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#64748b' }}>
          A consolidar dados e a gerar relatórios executivos...
        </div>
      ) : !reports ? (
        <div className="fleet-table-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <FontAwesomeIcon icon={faChartBar} style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', margin: 0 }}>
            Sem dados para apresentar
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Ajuste o intervalo de datas ou selecione outra viatura.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* 3. Cards Globais de Custo */}
          <div className="fleet-kpi-grid">
            <div className="fleet-kpi-card" style={{ borderLeft: '5px solid #0d9488' }}>
              <div className="fleet-kpi-top">
                <div>
                  <div className="fleet-kpi-label" style={{ color: '#0d9488' }}>Custo Total Combustível</div>
                  <div className="fleet-kpi-value" style={{ color: '#0f766e' }}>
                    {reports.summaryCosts.totalFuelCost?.toLocaleString()}{' '}
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>MT</span>
                  </div>
                </div>
                <div className="fleet-kpi-icon-wrap" style={{ background: '#f0fdfa', color: '#0d9488' }}>
                  <FontAwesomeIcon icon={faGasPump} />
                </div>
              </div>
              <div className="fleet-kpi-sub">Total acumulado em abastecimentos</div>
            </div>

            <div className="fleet-kpi-card" style={{ borderLeft: '5px solid #f59e0b' }}>
              <div className="fleet-kpi-top">
                <div>
                  <div className="fleet-kpi-label" style={{ color: '#d97706' }}>Custo Total Manutenção</div>
                  <div className="fleet-kpi-value" style={{ color: '#b45309' }}>
                    {reports.summaryCosts.totalMaintenanceCost?.toLocaleString()}{' '}
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>MT</span>
                  </div>
                </div>
                <div className="fleet-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                  <FontAwesomeIcon icon={faWrench} />
                </div>
              </div>
              <div className="fleet-kpi-sub">Total em revisões e reparações</div>
            </div>

            <div
              className="fleet-kpi-card"
              style={{
                background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)',
                color: '#ffffff',
                border: '1px solid rgba(127, 0, 255, 0.3)',
              }}
            >
              <div className="fleet-kpi-top">
                <div>
                  <div className="fleet-kpi-label" style={{ color: '#a78bfa' }}>Despesa Total Operacional</div>
                  <div className="fleet-kpi-value" style={{ color: '#34d399' }}>
                    {reports.summaryCosts.grandTotalCost?.toLocaleString()}{' '}
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>MT</span>
                  </div>
                </div>
                <div className="fleet-kpi-icon-wrap" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#34d399' }}>
                  <FontAwesomeIcon icon={faCoins} />
                </div>
              </div>
              <div className="fleet-kpi-sub" style={{ color: '#cbd5e1' }}>Combustível + Manutenção</div>
            </div>
          </div>

          {/* 4. Relatório 1: Combustível por Veículo */}
          <div className="fleet-table-card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="fleet-kpi-icon-wrap" style={{ background: '#f0fdfa', color: '#0d9488', width: '38px', height: '38px' }}>
                <FontAwesomeIcon icon={faGasPump} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Consumo de Combustível por Veículo
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Desempenho energético e custo real por quilómetro</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="fleet-table">
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Veículo</th>
                    <th>Litros Totais</th>
                    <th>Custo Total (MT)</th>
                    <th>Km Percorridos</th>
                    <th>Consumo Médio</th>
                    <th>Custo / Km</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.fuelByVehicle.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        Sem abastecimentos registados no período.
                      </td>
                    </tr>
                  ) : (
                    reports.fuelByVehicle.map((item) => (
                      <tr key={item.vehicleId}>
                        <td>
                          <span className="vehicle-plate-pill">
                            <span className="vehicle-plate-flag" />
                            {item.plateNumber}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>
                            {item.brand} {item.model}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '800', color: '#0d9488' }}>{item.totalLiters} L</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.totalCost?.toLocaleString()} MT</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '700', color: '#334155' }}>{item.totalKm} km</span>
                        </td>
                        <td>
                          <span className="ops-badge badge-warn">
                            {item.avgL100km} L/100km
                          </span>
                        </td>
                        <td>
                          <span className="ops-badge badge-info">
                            {item.costPerKm} MT/km
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Relatório 2: Combustível por Motorista */}
          <div className="fleet-table-card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="fleet-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981', width: '38px', height: '38px' }}>
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Combustível por Condutor / Motorista
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Apuramento de abastecimentos realizados por membro da equipa</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="fleet-table">
                <thead>
                  <tr>
                    <th>Motorista</th>
                    <th>Litros Totais</th>
                    <th>Custo Total (MT)</th>
                    <th>Km Percorridos</th>
                    <th>Custo / Km</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.fuelByDriver.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        Nenhum registo por motorista encontrado.
                      </td>
                    </tr>
                  ) : (
                    reports.fuelByDriver.map((item) => (
                      <tr key={item.driverId || Math.random()}>
                        <td>
                          <div className="fleet-driver-pill">
                            <div className="fleet-driver-avatar">
                              {item.driverPhoto ? (
                                <img src={item.driverPhoto} alt={item.driverName} />
                              ) : (
                                <span>{item.driverName?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}</span>
                              )}
                            </div>
                            <div className="fleet-driver-meta">
                              <span className="fleet-driver-name">{item.driverName}</span>
                              <div className="fleet-driver-contact">
                                {item.driverPhone && (
                                  <a href={`tel:${item.driverPhone}`} title={`Ligar: ${item.driverPhone}`}>
                                    <FontAwesomeIcon icon={faPhone} style={{ fontSize: '0.6rem', color: '#10b981', marginRight: '0.15rem' }} />
                                    {item.driverPhone}
                                  </a>
                                )}
                                {item.driverEmail && (
                                  <a href={`mailto:${item.driverEmail}`} title={`Email: ${item.driverEmail}`}>
                                    <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '0.6rem', color: '#6366f1', marginRight: '0.15rem' }} />
                                    {item.driverEmail}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: '800', color: '#0d9488' }}>{item.totalLiters} L</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '800', color: '#0f172a' }}>{item.totalCost?.toLocaleString()} MT</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '700', color: '#334155' }}>{item.totalKm} km</span>
                        </td>
                        <td>
                          <span className="ops-badge badge-info">
                            {item.costPerKm} MT/km
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Relatório 3: Histórico de Manutenção */}
          <div className="fleet-table-card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="fleet-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b', width: '38px', height: '38px' }}>
                <FontAwesomeIcon icon={faWrench} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Histórico de Manutenções e Intervenções Técnicas
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Registo das manutenções executadas e fornecedores de serviço</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="fleet-table">
                <thead>
                  <tr>
                    <th>Veículo / Motorista</th>
                    <th>Serviço</th>
                    <th>Última Realizada</th>
                    <th>Custo (MT)</th>
                    <th>Oficina / Prestador</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.maintenanceHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        Nenhuma intervenção técnica no período.
                      </td>
                    </tr>
                  ) : (
                    reports.maintenanceHistory.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="vehicle-plate-pill">
                              <span className="vehicle-plate-flag" />
                              {m.vehicle?.plateNumber || 'N/A'}
                            </span>
                          </div>
                          {m.vehicle?.assignedDriver && (
                            <div style={{ marginTop: '0.35rem' }}>
                              <div className="fleet-driver-pill" style={{ padding: '0.2rem 0.5rem' }}>
                                <div className="fleet-driver-avatar" style={{ width: 20, height: 20, fontSize: '0.6rem' }}>
                                  {m.vehicle.assignedDriver.profileImage ? (
                                    <img src={m.vehicle.assignedDriver.profileImage} alt={m.vehicle.assignedDriver.name} />
                                  ) : (
                                    <span>{m.vehicle.assignedDriver.name?.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="fleet-driver-name" style={{ fontSize: '0.72rem' }}>
                                  {m.vehicle.assignedDriver.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>
                            {m.customTitle || m.serviceType}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#334155' }}>
                            {m.lastMaintenanceKm?.toLocaleString()} km
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {m.lastMaintenanceDate ? new Date(m.lastMaintenanceDate).toLocaleDateString('pt-MZ') : '—'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: '800', color: '#0f172a' }}>
                            {m.costMzn?.toLocaleString()} MT
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#475569', fontWeight: '600' }}>{m.serviceProvider || '—'}</span>
                        </td>
                        <td>
                          <span
                            className={`ops-badge ${
                              m.status === 'EM_DIA'
                                ? 'badge-ok'
                                : m.status === 'PROXIMA'
                                ? 'badge-warn'
                                : 'badge-danger'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

