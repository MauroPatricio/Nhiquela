import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api';
import './FleetDashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faWrench,
  faGasPump,
  faExclamationTriangle,
  faCheckCircle,
  faPlus,
  faTachometerAlt,
  faChartLine,
  faChartBar,
  faPieChart,
  faShieldAlt,
  faArrowTrendUp,
  faChevronRight,
  faRoad,
  faPhone,
  faUser,
  faSyncAlt,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

export default function FleetDashboardScreen() {
  const { userInfo } = useSelector((state) => state.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fleet/dashboard', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #d1fae5', borderTopColor: '#059669', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>A carregar métricas da frota...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '24px', textAlign: 'center' }}>
        <div style={{ width: '50px', height: '50px', background: '#ffe4e6', color: '#e11d48', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>
          <FontAwesomeIcon icon={faCircleExclamation} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#881337', marginBottom: '0.5rem' }}>Erro ao Carregar Dashboard</h3>
        <p style={{ fontSize: '0.85rem', color: '#9f1239', marginBottom: '1.5rem' }}>{error}</p>
        <button
          onClick={fetchDashboard}
          className="btn-fleet-primary"
          style={{ padding: '0.6rem 1.5rem', cursor: 'pointer' }}
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const { summary, recentAlerts, vehicles, charts } = data;

  const trendData = charts?.consumptionAndKmTrend || [];
  const efficiencyData = charts?.vehicleEfficiencyData || [];
  const costDistData = charts?.costDistribution || [];
  const maintenanceDistData = charts?.maintenanceStatusDistribution || [];

  return (
    <div className="fleet-dashboard-wrapper">
      {/* 1. Executive Luxury Header */}
      <div className="fleet-hero-header">
        <div>
          <div className="fleet-hero-badge">
            <span className="fleet-pulse-dot"></span>
            Centro de Operações de Frota
          </div>
          <h1 className="fleet-hero-title">
            <span className="fleet-hero-icon-box">
              <FontAwesomeIcon icon={faCar} />
            </span>
            Gestão de Frota - Dashboard KPIs
          </h1>
          <p className="fleet-hero-subtitle">
            Análise preditiva de percursos, consumo por veículo e distribuição estratégica de custos da frota.
          </p>
        </div>

        <div className="fleet-hero-actions">
          <Link to="/partner/fleet/vehicles" className="btn-fleet-primary">
            <FontAwesomeIcon icon={faPlus} />
            <span>Gerir Veículos</span>
          </Link>
          <Link to="/partner/fleet/fuel" className="btn-fleet-glass">
            <FontAwesomeIcon icon={faGasPump} style={{ color: '#34d399' }} />
            <span>Registar Abastecimento</span>
          </Link>
        </div>
      </div>

      {/* 2. Modern 4 KPI Cards Grid */}
      <div className="fleet-kpi-grid">
        {/* Veículos Operacionais */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Veículos Operacionais</div>
              <div className="fleet-kpi-value-row">
                <h3 className="fleet-kpi-value">{summary.operationalVehicles}</h3>
                <span className="fleet-kpi-unit">/ {summary.totalVehicles}</span>
              </div>
            </div>
            <div className="fleet-kpi-icon-wrap icon-wrap-emerald">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
          </div>
          <div className="fleet-kpi-bottom">
            <span className="fleet-pill-badge pill-emerald">
              <span className="fleet-pulse-dot" style={{ width: 5, height: 5 }}></span>
              {summary.totalVehicles > 0
                ? `${Math.round((summary.operationalVehicles / summary.totalVehicles) * 100)}% da frota ativa`
                : 'Sem veículos'}
            </span>
            <FontAwesomeIcon icon={faShieldAlt} style={{ color: '#cbd5e1', fontSize: '0.8rem' }} />
          </div>
        </div>

        {/* Manutenções Vencidas */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Manutenções Vencidas</div>
              <div className="fleet-kpi-value-row">
                <h3 className="fleet-kpi-value" style={{ color: summary.overdueMaintenance > 0 ? '#e11d48' : '#0f172a' }}>
                  {summary.overdueMaintenance}
                </h3>
              </div>
            </div>
            <div className={`fleet-kpi-icon-wrap ${summary.overdueMaintenance > 0 ? 'icon-wrap-rose' : 'icon-wrap-rose-muted'}`}>
              <FontAwesomeIcon icon={faWrench} />
            </div>
          </div>
          <div className="fleet-kpi-bottom">
            <span className={`fleet-pill-badge ${summary.overdueMaintenance > 0 ? 'pill-rose' : 'pill-slate'}`}>
              {summary.upcomingMaintenance} manutenções próximas
            </span>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#cbd5e1', fontSize: '0.8rem' }} />
          </div>
        </div>

        {/* Combustível (Últimos 30 Dias) */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Combustível (30 Dias)</div>
              <div className="fleet-kpi-value-row">
                <h3 className="fleet-kpi-value">{summary.totalFuelLiters.toLocaleString()}</h3>
                <span className="fleet-kpi-unit">L</span>
              </div>
            </div>
            <div className="fleet-kpi-icon-wrap icon-wrap-teal">
              <FontAwesomeIcon icon={faGasPump} />
            </div>
          </div>
          <div className="fleet-kpi-bottom">
            <span className="fleet-pill-badge pill-teal">
              {summary.totalFuelCost.toLocaleString()} MZN
            </span>
            <FontAwesomeIcon icon={faArrowTrendUp} style={{ color: '#cbd5e1', fontSize: '0.8rem' }} />
          </div>
        </div>

        {/* Consumo Médio */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Consumo Médio</div>
              <div className="fleet-kpi-value-row">
                <h3 className="fleet-kpi-value">{summary.avgL100km}</h3>
                <span className="fleet-kpi-unit">L/100km</span>
              </div>
            </div>
            <div className="fleet-kpi-icon-wrap icon-wrap-amber">
              <FontAwesomeIcon icon={faTachometerAlt} />
            </div>
          </div>
          <div className="fleet-kpi-bottom">
            <span className="fleet-pill-badge pill-amber">
              {summary.avgCostPerKm} MZN / km
            </span>
            <FontAwesomeIcon icon={faRoad} style={{ color: '#cbd5e1', fontSize: '0.8rem' }} />
          </div>
        </div>
      </div>

      {/* 3. Decision Charts Section */}
      <div className="fleet-charts-grid">
        {/* GRÁFICO 1: Evolução Temporal de Percursos (Km) e Consumo */}
        <div className="fleet-card">
          <div className="fleet-card-header">
            <div className="fleet-card-title-box">
              <div className="fleet-card-icon" style={{ background: '#f0fdfa', color: '#0d9488' }}>
                <FontAwesomeIcon icon={faChartLine} />
              </div>
              <div>
                <h2 className="fleet-card-title">Evolução de Percursos (Km) & Consumo (L/100km)</h2>
                <p className="fleet-card-subtitle">Deteção de oscilações e consumo atípico nos percursos</p>
              </div>
            </div>
          </div>
          <div className="fleet-chart-container">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      fontSize: '12px',
                      padding: '10px 14px',
                    }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '8px' }} iconType="circle" />
                  <Area yAxisId="left" type="monotone" dataKey="kmDriven" name="Km Percorridos" stroke="#0D9488" fillOpacity={1} fill="url(#colorKm)" strokeWidth={2.5} dot={{ r: 3, fill: '#0D9488' }} />
                  <Area yAxisId="right" type="monotone" dataKey="l100km" name="Consumo (L/100km)" stroke="#F59E0B" fill="none" strokeWidth={2.5} dot={{ r: 3, fill: '#F59E0B' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="fleet-empty-chart">
                <div className="fleet-empty-icon">
                  <FontAwesomeIcon icon={faChartLine} />
                </div>
                <h4 className="fleet-empty-title">Sem dados suficientes</h4>
                <p className="fleet-empty-desc">Registe abastecimentos e viagens para gerar o histórico temporal.</p>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: Comparativo de Eficiência por Veículo (Consumo Real vs Alvo) */}
        <div className="fleet-card">
          <div className="fleet-card-header">
            <div className="fleet-card-title-box">
              <div className="fleet-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                <FontAwesomeIcon icon={faChartBar} />
              </div>
              <div>
                <h2 className="fleet-card-title">Eficiência por Veículo: Real vs Alvo (L/100km)</h2>
                <p className="fleet-card-subtitle">Identifica os veículos com desempenho inferior ao configurado</p>
              </div>
            </div>
          </div>
          <div className="fleet-chart-container">
            {efficiencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="plateNumber" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      fontSize: '12px',
                      padding: '10px 14px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '8px' }} iconType="circle" />
                  <Bar dataKey="realL100km" name="Consumo Real (L/100km)" fill="#10B981" radius={[8, 8, 0, 0]} barSize={24} />
                  <Bar dataKey="targetL100km" name="Meta Configurada (L/100km)" fill="#CBD5E1" radius={[8, 8, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="fleet-empty-chart">
                <div className="fleet-empty-icon">
                  <FontAwesomeIcon icon={faChartBar} />
                </div>
                <h4 className="fleet-empty-title">Nenhum veículo com histórico</h4>
                <p className="fleet-empty-desc">Adicione veículos e registos de combustível para calibrar a meta.</p>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 3: Distribuição Estratégica dos Custos (Combustível vs Manutenção) */}
        <div className="fleet-card">
          <div className="fleet-card-header">
            <div className="fleet-card-title-box">
              <div className="fleet-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                <FontAwesomeIcon icon={faPieChart} />
              </div>
              <div>
                <h2 className="fleet-card-title">Distribuição de Custos (Combustível vs Manutenção)</h2>
                <p className="fleet-card-subtitle">Origem dos custos operacionais da frota</p>
              </div>
            </div>
          </div>
          <div className="fleet-chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {costDistData.reduce((acc, curr) => acc + curr.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={costDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {costDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value.toLocaleString()} MZN`, 'Despesa']}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="fleet-empty-chart">
                <div className="fleet-empty-icon">
                  <FontAwesomeIcon icon={faPieChart} />
                </div>
                <h4 className="fleet-empty-title">Sem registo de despesas</h4>
                <p className="fleet-empty-desc">Custos de abastecimento e manutenção serão agregados aqui.</p>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 4: Saúde e Estado da Manutenção da Frota */}
        <div className="fleet-card">
          <div className="fleet-card-header">
            <div className="fleet-card-title-box">
              <div className="fleet-card-icon" style={{ background: '#fff1f2', color: '#e11d48' }}>
                <FontAwesomeIcon icon={faWrench} />
              </div>
              <div>
                <h2 className="fleet-card-title">Saúde da Frota (Estado das Manutenções)</h2>
                <p className="fleet-card-subtitle">Planos em dia vs intervenções urgentes</p>
              </div>
            </div>
          </div>
          <div className="fleet-chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {maintenanceDistData.reduce((acc, curr) => acc + curr.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={maintenanceDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {maintenanceDistData.map((entry, index) => (
                      <Cell key={`cell-m-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="fleet-empty-chart">
                <div className="fleet-empty-icon">
                  <FontAwesomeIcon icon={faWrench} />
                </div>
                <h4 className="fleet-empty-title">Nenhum plano cadastrado</h4>
                <p className="fleet-empty-desc">Cadastre planos preventivos para monitorizar o desgaste da frota.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: Alerts & Vehicles */}
      <div className="fleet-bottom-grid">
        {/* Alertas Recentes / Anomalias */}
        <div className="fleet-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="fleet-card-title-box">
              <div className="fleet-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <div>
                <h2 className="fleet-card-title">Alertas & Anomalias de Operação</h2>
                <p className="fleet-card-subtitle">Incidentes e anomalias de telemetria pendentes</p>
              </div>
            </div>
            <Link
              to="/partner/fleet/alerts"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '0.4rem 0.85rem', borderRadius: '9999px', textDecoration: 'none' }}
            >
              Ver Todos ({summary.pendingAlertsCount})
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.65rem' }} />
            </Link>
          </div>

          {recentAlerts && recentAlerts.length > 0 ? (
            <div>
              {recentAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`fleet-alert-item ${alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'alert-critical' : 'alert-warning'}`}
                >
                  <div className="fleet-alert-icon">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fleet-alert-header">
                      <h4 className="fleet-alert-title">{alert.title}</h4>
                      <span className={`fleet-pill-badge ${alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'pill-rose' : 'pill-amber'}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="fleet-alert-msg">{alert.message}</p>
                    <span className="fleet-alert-time">
                      {new Date(alert.createdAt).toLocaleString('pt-MZ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="fleet-empty-chart" style={{ height: '220px' }}>
              <div className="fleet-empty-icon" style={{ background: '#ecfdf5', color: '#059669', fontSize: '1.4rem', width: '52px', height: '52px' }}>
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <h4 className="fleet-empty-title" style={{ fontSize: '0.9rem', color: '#1e293b' }}>Tudo em Conformidade!</h4>
              <p className="fleet-empty-desc">Nenhum alerta de anomalia crítica ou manutenção pendente no momento.</p>
            </div>
          )}
        </div>

        {/* Resumo Rápido da Frota */}
        <div className="fleet-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="fleet-card-title-box">
                <div className="fleet-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <FontAwesomeIcon icon={faCar} />
                </div>
                <div>
                  <h2 className="fleet-card-title">Frota de Veículos</h2>
                  <p className="fleet-card-subtitle">Estado e odómetro por unidade</p>
                </div>
              </div>
              <Link to="/partner/fleet/vehicles" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textDecoration: 'none' }}>
                Gerir
              </Link>
            </div>

            <div className="fleet-scroll-container">
              {vehicles && vehicles.length > 0 ? (
                vehicles.map((v) => (
                  <div key={v._id} className="fleet-vehicle-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                        <div className="fleet-plate-badge">{v.plateNumber}</div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                          {v.type}
                        </span>
                      </div>
                      <div className="fleet-vehicle-name">
                        {v.brand} {v.model} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({v.year})</span>
                      </div>
                      <div className="fleet-vehicle-odo" style={{ marginTop: '0.2rem' }}>
                        Odómetro: <strong>{v.currentOdometer?.toLocaleString()} km</strong>
                      </div>
                      {v.assignedDriver && (
                        <div style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            {v.assignedDriver.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>
                            {v.assignedDriver.name}
                          </span>
                          {v.assignedDriver.phoneNumber && (
                            <a href={`tel:${v.assignedDriver.phoneNumber}`} title={`Ligar: ${v.assignedDriver.phoneNumber}`} style={{ color: '#10b981', fontSize: '0.65rem', marginLeft: '0.2rem' }}>
                              <FontAwesomeIcon icon={faPhone} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <span
                        className={`fleet-status-pill ${
                          v.status === 'Operacional'
                            ? 'status-operational'
                            : v.status === 'Em Manutenção'
                            ? 'status-maintenance'
                            : 'status-inactive'
                        }`}
                      >
                        <span
                          className="fleet-pulse-dot"
                          style={{
                            width: 5,
                            height: 5,
                            backgroundColor: v.status === 'Operacional' ? '#10b981' : v.status === 'Em Manutenção' ? '#f59e0b' : '#94a3b8',
                            boxShadow: 'none',
                          }}
                        ></span>
                        {v.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="fleet-empty-chart" style={{ height: '180px', padding: '1.5rem', textAlign: 'center' }}>
                  <FontAwesomeIcon icon={faCar} style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.5rem' }} />
                  <p className="fleet-empty-title" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', margin: '0 0 0.5rem 0' }}>
                    Nenhum veículo registado
                  </p>
                  <Link
                    to="/partner/fleet/vehicles"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#ecfdf5',
                      color: '#047857',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    <FontAwesomeIcon icon={faSyncAlt} />
                    <span>Sincronizar Motoristas / Adicionar</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Link
              to="/partner/fleet/vehicles"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: '#059669', textDecoration: 'none' }}
            >
              Ver todos os veículos
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.65rem' }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

