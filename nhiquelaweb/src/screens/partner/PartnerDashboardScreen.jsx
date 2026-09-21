import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { selectUser } from '../../store/features/userSlice';
import api from '../../api';
import './PartnerDashboard.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from '@e965/xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStore,
  faCheckCircle,
  faMoneyBillWave,
  faChartLine,
  faFilter,
  faFileExcel,
  faFilePdf,
  faSync,
  faTruck,
  faList,
  faExclamationTriangle,
  faStar,
  faSearch,
  faBoxes,
  faEye,
  faPhone,
  faUser,
  faClock,
  faUserTie,
  faCarSide,
} from '@fortawesome/free-solid-svg-icons';
import { SteeringWheelIcon, DriverPersonIcon } from '../../components/common/CustomIcons';
import { toast } from 'react-toastify';

const statusBadge = (s = '') => {
  const styles = {
    'Entregue': { bg: '#ecfdf5', color: '#047857', border: 'rgba(16,185,129,0.3)' },
    'Finalizado': { bg: '#ecfdf5', color: '#047857', border: 'rgba(16,185,129,0.3)' },
    'Concluido': { bg: '#ecfdf5', color: '#047857', border: 'rgba(16,185,129,0.3)' },
    'Em Transito': { bg: '#eff6ff', color: '#1d4ed8', border: 'rgba(59,130,246,0.3)' },
    'Em Andamento': { bg: '#eff6ff', color: '#1d4ed8', border: 'rgba(59,130,246,0.3)' },
    'A caminho': { bg: '#eff6ff', color: '#1d4ed8', border: 'rgba(59,130,246,0.3)' },
    'Cancelado': { bg: '#fff1f2', color: '#be123c', border: 'rgba(244,63,94,0.3)' },
    'CANCELLED': { bg: '#fff1f2', color: '#be123c', border: 'rgba(244,63,94,0.3)' },
    'Pendente': { bg: '#fffbeb', color: '#b45309', border: 'rgba(245,158,11,0.3)' },
    'PENDING': { bg: '#fffbeb', color: '#b45309', border: 'rgba(245,158,11,0.3)' },
  };

  const current = styles[s] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
      }}
    >
      {s || '-'}
    </span>
  );
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

const fmtMT = (v) =>
  `${Number(v || 0).toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MT`;

const isDriverOnline = (d) => {
  if (!d) return false;
  return (
    d.availability === 'active' ||
    d.isOnline === true ||
    d.status === 'ONLINE' ||
    d.status === 'Disponível' ||
    d.status === 'Em Entrega' ||
    d.online === true
  );
};

export default function PartnerDashboardScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const isReportsView = location.pathname.includes('/reports');
  const userInfo = useSelector(selectUser) || {};
  const partnerId = userInfo.partnerId || userInfo._id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [members, setMembers] = useState({ drivers: [], sellers: [] });
  const [recentTrips, setRecentTrips] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberKpis, setMemberKpis] = useState(null);
  const [memberKpisLoading, setMemberKpisLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('viagens');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${userInfo.token}` };
      const membersRes = await api.get(`/partners/${partnerId}/members`, { headers });
      const membersData = membersRes.data || { drivers: [], sellers: [] };
      setMembers(membersData);

      const qp = new URLSearchParams();
      if (startDate) qp.append('startDate', startDate);
      if (endDate) qp.append('endDate', endDate);
      if (selectedDriver) qp.append('driverId', selectedDriver);
      if (selectedSeller) qp.append('sellerId', selectedSeller);
      if (selectedStatus && selectedStatus !== 'Todos') qp.append('status', selectedStatus);

      const dashRes = await api.get(`/partners/${partnerId}/dashboard?${qp}`, { headers });
      setData(dashRes.data);

      const allTrips = [];
      const allOrders = [];
      const drivers = membersData.drivers || [];
      await Promise.allSettled(
        drivers.slice(0, 15).map(async (driver) => {
          try {
            const kRes = await api.get(`/partners/members/${driver._id}/kpis`, { headers });
            (kRes.data?.recentOrders || []).forEach((r) => {
              const item = { ...r, _memberName: driver.name };
              if (r.origin || r.type === 'requestService' || r.deliveryStops) allTrips.push(item);
              else allOrders.push(item);
            });
          } catch {
            /* silent */
          }
        })
      );
      allTrips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentTrips(allTrips);
      setRecentOrders(allOrders);
    } catch (err) {
      toast.error('Nao foi possivel carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  }, [partnerId, userInfo.token, startDate, endDate, selectedDriver, selectedSeller, selectedStatus]);

  useEffect(() => {
    if (partnerId && userInfo.token) fetchDashboardData();
  }, [partnerId, userInfo.token]);

  // Real-time socket listener for driver online/offline availability changes
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    const handleDriverUpdate = (payload) => {
      if (!payload || !payload.driverId) return;
      setMembers((prev) => {
        if (!prev || !prev.drivers) return prev;
        let found = false;
        const updatedDrivers = prev.drivers.map((drv) => {
          if (String(drv._id) === String(payload.driverId)) {
            found = true;
            const newAvailability =
              payload.availability !== undefined
                ? payload.availability
                : payload.isOnline
                ? 'active'
                : 'inactive';
            const newIsOnline =
              payload.isOnline !== undefined ? payload.isOnline : newAvailability === 'active';
            const newStatus = payload.status || (newIsOnline ? 'ONLINE' : 'OFFLINE');
            return {
              ...drv,
              availability: newAvailability,
              isOnline: newIsOnline,
              status: newStatus,
            };
          }
          return drv;
        });
        return { ...prev, drivers: updatedDrivers };
      });
    };

    socket.on('driver_availability_updated', handleDriverUpdate);
    socket.on('driver_status_updated', handleDriverUpdate);
    socket.on('fleet_location_update', handleDriverUpdate);
    socket.on('fleet_tracking_started', handleDriverUpdate);
    socket.on('fleet_tracking_stopped', handleDriverUpdate);

    return () => {
      socket.off('driver_availability_updated', handleDriverUpdate);
      socket.off('driver_status_updated', handleDriverUpdate);
      socket.off('fleet_location_update', handleDriverUpdate);
      socket.off('fleet_tracking_started', handleDriverUpdate);
      socket.off('fleet_tracking_stopped', handleDriverUpdate);
      socket.disconnect();
    };
  }, []);

  const openMemberDetail = async (member) => {
    setSelectedMember(member);
    setMemberKpis(null);
    setMemberKpisLoading(true);
    try {
      const res = await api.get(`/partners/members/${member._id}/kpis`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setMemberKpis(res.data);
    } catch {
      toast.error('Erro ao carregar detalhes.');
    } finally {
      setMemberKpisLoading(false);
    }
  };

  const exportClientSide = (format) => {
    const reportData = (recentTrips || []).concat(recentOrders || []).map((item) => ({
      ID: item.code || item._id,
      Data: fmtDate(item.createdAt),
      Tipo: item.type === 'requestService' || item.origin ? 'Viagem' : 'Pedido Loja',
      Cliente: item.user?.name || item.clientName || item.customer?.name || item.userName || 'N/A',
      Associado: item._memberName || item.deliveryman?.name || 'N/A',
      Origem: item.origin || item.pickupAddress?.address || 'N/A',
      Destino: item.destination || item.deliveryAddress?.address || 'N/A',
      Valor: Number(item.totalPrice || item.addressPrice || item.finalAgreedPrice || 0),
      Estado: item.status || 'N/A',
    }));

    if (format === 'excel' || format === 'xls') {
      const worksheet = XLSX.utils.json_to_sheet(
        reportData.length ? reportData : [{ Informacao: 'Nenhum registo encontrado com os filtros selecionados.' }]
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio');
      XLSX.writeFile(workbook, `relatorio_parceiro_${Date.now()}.xlsx`);
      toast.success('Relatório Excel gerado com sucesso!');
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Relatório Operacional do Parceiro', 14, 20);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, 14, 28);

      const tableColumn = ['ID', 'Data', 'Tipo', 'Cliente', 'Associado', 'Valor (MT)', 'Estado'];
      const tableRows = reportData.map((r) => [
        String(r.ID).slice(-8),
        r.Data,
        r.Tipo,
        r.Cliente,
        r.Associado,
        `${r.Valor.toFixed(2)} MT`,
        r.Estado,
      ]);

      if (doc.autoTable) {
        doc.autoTable({
          startY: 35,
          head: [tableColumn],
          body: tableRows.length ? tableRows : [['-', '-', 'Sem dados', '-', '-', '-']],
          theme: 'striped',
          headStyles: { fillColor: [138, 43, 226] },
        });
      }
      doc.save(`relatorio_parceiro_${Date.now()}.pdf`);
      toast.success('Relatório PDF gerado com sucesso!');
    }
  };

  const handleExport = async (format) => {
    try {
      toast.info(`A gerar relatório em formato ${format.toUpperCase()}...`);
      const qp = new URLSearchParams({ format });
      if (startDate) qp.append('startDate', startDate);
      if (endDate) qp.append('endDate', endDate);
      if (selectedDriver) qp.append('driverId', selectedDriver);
      if (selectedSeller) qp.append('sellerId', selectedSeller);
      if (selectedStatus && selectedStatus !== 'Todos') qp.append('status', selectedStatus);

      const response = await api.get(`/partners/${partnerId}/reports/export?${qp}`, {
        responseType: 'blob',
      });

      if (response.data && response.data.size > 0) {
        const blob = new Blob([response.data], {
          type:
            format === 'pdf'
              ? 'application/pdf'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `relatorio_parceiro_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('Relatório descarregado com sucesso!');
        return;
      }
      exportClientSide(format);
    } catch (error) {
      console.warn('Exportação por API falhou, a alternar para exportação local:', error);
      exportClientSide(format);
    }
  };

  const rawKpis = data?.kpis || {
    totalDrivers: 0,
    onlineDrivers: 0,
    totalSellers: 0,
    totalOrders: 0,
    completedOrders: 0,
    completedTrips: 0,
    completedStoreOrders: 0,
    inProgressOrders: 0,
    cancelledOrders: 0,
    rejectedOrders: 0,
    acceptanceRate: 100,
    completionRate: 100,
    cancellationRate: 0,
    tripsRevenue: 0,
    storeRevenue: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    netAmount: 0,
    averageRating: 5.0,
  };

  const currentOnlineCount = (members.drivers || []).filter(isDriverOnline).length;
  const kpis = {
    ...rawKpis,
    onlineDrivers: (members.drivers && members.drivers.length > 0) ? currentOnlineCount : rawKpis.onlineDrivers,
    totalDrivers: (members.drivers && members.drivers.length > 0) ? members.drivers.length : rawKpis.totalDrivers,
  };

  const filtered = (list) =>
    list.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (r.code || '').toLowerCase().includes(q) ||
        (r._memberName || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q) ||
        (r.destination || r.deliveryAddress?.address || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="partner-dash-wrapper">
      {/* 1. EXECUTIVE HEADER */}
      <div className="partner-dash-header">
        <div>
          <div className="partner-dash-badge">
            <FontAwesomeIcon icon={isReportsView ? faFilePdf : faChartLine} />
            {isReportsView ? 'Exportação de Relatórios' : 'Painel do Parceiro'}
          </div>
          <h1 className="partner-dash-title">
            {isReportsView ? 'Relatórios & Exportação' : data?.partnerName || userInfo.name || 'Parceiro'}
          </h1>
          <p className="partner-dash-subtitle">
            {isReportsView
              ? 'Filtre e exporte relatórios detalhados da sua frota e fornecedores em formato Excel ou PDF.'
              : 'Visibilidade total das viagens, pedidos e desempenho dos associados.'}
          </p>
        </div>

        <div className="partner-dash-actions">
          <button onClick={fetchDashboardData} className="btn-partner-glass" disabled={loading}>
            <FontAwesomeIcon icon={faSync} spin={loading} />
            <span>Atualizar</span>
          </button>
          <button onClick={() => handleExport('excel')} className="btn-partner-glass">
            <FontAwesomeIcon icon={faFileExcel} style={{ color: '#10b981' }} />
            <span>Excel</span>
          </button>
          <button onClick={() => handleExport('pdf')} className="btn-partner-purple">
            <FontAwesomeIcon icon={faFilePdf} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* 2. FILTROS MODERNOS */}
      <div className="partner-filter-card">
        <div className="partner-filter-title">
          <FontAwesomeIcon icon={faFilter} style={{ color: '#8a2be2' }} />
          <span>Filtros Operacionais</span>
        </div>
        <div className="partner-filter-grid">
          <div className="partner-field-wrap">
            <label>Data Inicial</label>
            <input
              type="date"
              className="partner-field-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="partner-field-wrap">
            <label>Data Final</label>
            <input
              type="date"
              className="partner-field-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="partner-field-wrap">
            <label>Motorista</label>
            <select
              className="partner-field-control"
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              <option value="">Todos</option>
              {members.drivers?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="partner-field-wrap">
            <label>Fornecedor</label>
            <select
              className="partner-field-control"
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <option value="">Todos</option>
              {members.sellers?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="partner-field-wrap">
            <label>Estado</label>
            <select
              className="partner-field-control"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {['Todos', 'Entregue', 'Em Transito', 'Cancelado', 'Pendente'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button onClick={fetchDashboardData} disabled={loading} className="btn-filter-apply">
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '4px solid #ede9fe',
              borderTopColor: '#8a2be2',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          ></div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>A carregar dados operacionais...</p>
        </div>
      ) : (
        <>
          {/* 3. KPI CARDS */}
          {!isReportsView && (
            <div className="partner-kpi-grid">
              {/* Facturação */}
              <div className="partner-kpi-card">
                <div className="partner-kpi-top">
                  <div>
                    <div className="partner-kpi-label">Facturação (Receita Total)</div>
                    <h3 className="partner-kpi-value">{fmtMT(kpis.totalRevenue)}</h3>
                  </div>
                  <div className="partner-kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7f00ff' }}>
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                  </div>
                </div>
                <div className="partner-kpi-sub">
                  Comissão Plataforma: <strong>{fmtMT(kpis.totalCommissions)}</strong>
                </div>
              </div>

              {/* Serviços Realizados */}
              <div className="partner-kpi-card">
                <div className="partner-kpi-top">
                  <div>
                    <div className="partner-kpi-label">Serviços Realizados</div>
                    <h3 className="partner-kpi-value">{kpis.completedTrips}</h3>
                  </div>
                  <div className="partner-kpi-icon-wrap" style={{ background: '#fdf4ff', color: '#c026d3' }}>
                    <SteeringWheelIcon size={22} color="#c026d3" />
                  </div>
                </div>
                <div className="partner-kpi-sub">
                  Receita Viagens: <strong>{fmtMT(kpis.tripsRevenue)}</strong>
                </div>
              </div>

              {/* Entregas Concluídas (Gradient Emerald) */}
              <div className="partner-kpi-card kpi-card-gradient">
                <div className="partner-kpi-top">
                  <div>
                    <div className="partner-kpi-label">Entregas Concluídas</div>
                    <h3 className="partner-kpi-value">{kpis.completedStoreOrders}</h3>
                  </div>
                  <div className="partner-kpi-icon-wrap" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                </div>
                <div className="partner-kpi-sub" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  Receita Entregas: <strong style={{ color: '#ffffff' }}>{fmtMT(kpis.storeRevenue)}</strong>
                </div>
              </div>

              {/* Motoristas Ativos */}
              <div className="partner-kpi-card">
                <div className="partner-kpi-top">
                  <div>
                    <div className="partner-kpi-label">Motoristas Activos</div>
                    <h3 className="partner-kpi-value">{kpis.onlineDrivers}</h3>
                  </div>
                  <div className="partner-kpi-icon-wrap" style={{ background: '#f0fdfa', color: '#0d9488' }}>
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                </div>
                <div className="partner-kpi-sub">
                  Total de associados: <strong>{kpis.totalDrivers}</strong>
                </div>
              </div>

              {/* Viaturas Utilizadas */}
              <div className="partner-kpi-card">
                <div className="partner-kpi-top">
                  <div>
                    <div className="partner-kpi-label">Viaturas Utilizadas</div>
                    <h3 className="partner-kpi-value">{kpis.activeVehicles || kpis.onlineDrivers}</h3>
                  </div>
                  <div className="partner-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <FontAwesomeIcon icon={faTruck} />
                  </div>
                </div>
                <div className="partner-kpi-sub">
                  Veículos em rota hoje
                </div>
              </div>

              {/* Entregas em Atraso */}
              <div className="partner-kpi-card">
                <div className="partner-kpi-top">
                  <div>
                    <div className="partner-kpi-label">Entregas em Atraso</div>
                    <h3 className="partner-kpi-value" style={{ color: (kpis.delayedOrders || 0) > 0 ? '#e11d48' : '#0f172a' }}>
                      {kpis.delayedOrders || 0}
                    </h3>
                  </div>
                  <div
                    className="partner-kpi-icon-wrap"
                    style={{
                      background: (kpis.delayedOrders || 0) > 0 ? '#fff1f2' : '#f1f5f9',
                      color: (kpis.delayedOrders || 0) > 0 ? '#e11d48' : '#64748b',
                    }}
                  >
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                  </div>
                </div>
                <div className="partner-kpi-sub">
                  {(kpis.delayedOrders || 0) > 0 ? (
                    <span style={{ color: '#e11d48', fontWeight: 700 }}>Em Risco de Incumprimento</span>
                  ) : (
                    'Sem atrasos reportados'
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. DISTRIBUIÇÃO OPERACIONAL */}
          <div className="partner-perf-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Distribuição Operacional & Desempenho por Período
              </h4>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
                {kpis.completionRate}% Eficácia
              </span>
            </div>

            <div className="partner-perf-grid">
              <div className="perf-stat-box">
                <span className="perf-stat-badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                  Concluídos
                </span>
                <h4 className="perf-stat-value">{kpis.completedOrders}</h4>
              </div>
              <div className="perf-stat-box">
                <span className="perf-stat-badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                  Pendentes / Em Rota
                </span>
                <h4 className="perf-stat-value">{kpis.inProgressOrders}</h4>
              </div>
              <div className="perf-stat-box">
                <span className="perf-stat-badge" style={{ background: '#fff1f2', color: '#be123c' }}>
                  Cancelados
                </span>
                <h4 className="perf-stat-value">{kpis.cancelledOrders}</h4>
              </div>
              <div className="perf-stat-box">
                <span className="perf-stat-badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                  Rejeitadas
                </span>
                <h4 className="perf-stat-value">{kpis.rejectedOrders}</h4>
              </div>
            </div>

            <div className="partner-progress-track">
              <div className="partner-progress-bar" style={{ width: `${kpis.completionRate}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 600 }}>
              <span>Taxa de Conclusão: {kpis.completionRate}%</span>
              <span>{kpis.completedOrders} concluídos de {kpis.totalOrders} totais</span>
            </div>
          </div>

          {/* 5. TABS & DATA TABLES */}
          <div className="partner-tabs-card">
            <div className="partner-tabs-header">
              <div className="partner-tab-pills">
                {[
                  { key: 'viagens', label: `Viagens (${recentTrips.length})`, customIcon: <SteeringWheelIcon size={15} style={{ marginRight: '0.35rem' }} /> },
                  { key: 'pedidos', label: `Pedidos (${recentOrders.length})`, icon: faBoxes },
                  { key: 'motoristas', label: `Motoristas (${members.drivers?.length || 0})`, customIcon: <DriverPersonIcon size={15} style={{ marginRight: '0.35rem' }} /> },
                  { key: 'fornecedores', label: `Fornecedores (${members.sellers?.length || 0})`, icon: faStore },
                ].map((t) => (
                  <button
                    key={t.key}
                    className={`partner-tab-btn ${activeTab === t.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.customIcon ? t.customIcon : <FontAwesomeIcon icon={t.icon} style={{ marginRight: '0.35rem' }} />}
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="partner-search-box">
                <FontAwesomeIcon icon={faSearch} style={{ color: '#94a3b8' }} />
                <input
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* TAB: VIAGENS */}
            {activeTab === 'viagens' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="partner-table">
                  <thead>
                    <tr>
                      <th>Ref.</th>
                      <th>Cliente</th>
                      <th>Motorista</th>
                      <th>Origem</th>
                      <th>Destino</th>
                      <th>Paragens</th>
                      <th>Preço</th>
                      <th>Estado</th>
                      <th>Data</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered(recentTrips).length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          Nenhuma viagem encontrada.
                        </td>
                      </tr>
                    ) : (
                      filtered(recentTrips).map((t, i) => (
                        <tr key={t._id || i}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              {t.code || t._id?.slice(-6) || '-'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {t.user?.name || t.clientName || t.customer?.name || t.userName || 'Cliente'}
                          </td>
                          <td style={{ fontWeight: 600 }}>{t._memberName || t.deliveryman?.name || '-'}</td>
                          <td style={{ maxWidth: 140, color: '#64748b' }}>{t.origin || t.originDetails?.address || '-'}</td>
                          <td style={{ maxWidth: 140, color: '#64748b' }}>
                            {t.destination || t.destinationDetails?.address || t.deliveryAddress?.address || '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {t.deliveryStops?.length > 0 || t.stops?.length > 0 ? (
                              <span style={{ background: '#ede9fe', color: '#7f00ff', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                                {t.deliveryStops?.length || t.stops?.length} paragens
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>-</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 800, color: '#059669' }}>
                            {fmtMT(t.deliveryPrice || t.finalAgreedPrice || t.addressPrice)}
                          </td>
                          <td>{statusBadge(t.status)}</td>
                          <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{fmtDate(t.createdAt)}</td>
                          <td>
                            <button
                              onClick={() => navigate(`/partner/orders/${t._id || 'NQ-2026-00851'}`)}
                              className="btn-track-order"
                            >
                              Rastrear
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: PEDIDOS */}
            {activeTab === 'pedidos' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="partner-table">
                  <thead>
                    <tr>
                      <th>Ref.</th>
                      <th>Associado</th>
                      <th>Cliente</th>
                      <th>Produtos</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered(recentOrders).length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          Nenhum pedido encontrado.
                        </td>
                      </tr>
                    ) : (
                      filtered(recentOrders).map((o, i) => (
                        <tr key={o._id || i}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              {o.code || o._id?.slice(-6) || '-'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{o._memberName || '-'}</td>
                          <td style={{ color: '#64748b' }}>{o.user?.name || o.clientName || '-'}</td>
                          <td>
                            {o.orderItems?.length || '-'} {o.orderItems?.length === 1 ? 'item' : 'itens'}
                          </td>
                          <td style={{ fontWeight: 800, color: '#059669' }}>{fmtMT(o.totalPrice || o.itemsPrice)}</td>
                          <td>{statusBadge(o.status)}</td>
                          <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{fmtDate(o.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: MOTORISTAS */}
            {activeTab === 'motoristas' && (
              <div style={{ padding: '1.5rem' }}>
                {(members.drivers || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Nenhum motorista associado.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {members.drivers.map((driver) => (
                      <div
                        key={driver._id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '18px',
                          padding: '1.25rem',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #8a2be2 0%, #7f00ff 100%)',
                              color: '#ffffff',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                            }}
                          >
                            {driver.name?.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{driver.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              <FontAwesomeIcon icon={faPhone} style={{ marginRight: '0.25rem' }} />
                              {driver.phoneNumber || '-'}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              background: isDriverOnline(driver) ? '#ecfdf5' : '#f1f5f9',
                              color: isDriverOnline(driver) ? '#047857' : '#64748b',
                              border: `1px solid ${isDriverOnline(driver) ? 'rgba(16,185,129,0.3)' : '#cbd5e1'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: isDriverOnline(driver) ? '#10b981' : '#94a3b8',
                                boxShadow: isDriverOnline(driver) ? '0 0 6px #10b981' : 'none',
                              }}
                            />
                            {isDriverOnline(driver) ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        {driver.rating && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                            <FontAwesomeIcon icon={faStar} style={{ color: '#f59e0b', marginRight: '0.25rem' }} />
                            {driver.rating}
                          </div>
                        )}

                        <button
                          onClick={() => openMemberDetail(driver)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(138,43,226,0.2)',
                            background: 'rgba(138,43,226,0.08)',
                            color: '#7f00ff',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          <FontAwesomeIcon icon={faEye} style={{ marginRight: '0.35rem' }} />
                          Ver Viagens e KPIs
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: FORNECEDORES */}
            {activeTab === 'fornecedores' && (
              <div style={{ padding: '1.5rem' }}>
                {(members.sellers || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Nenhum fornecedor associado.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {members.sellers.map((seller) => (
                      <div
                        key={seller._id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '18px',
                          padding: '1.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: '#fef3c7',
                              color: '#b45309',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                            }}
                          >
                            {seller.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{seller.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              <FontAwesomeIcon icon={faPhone} style={{ marginRight: '0.25rem' }} />
                              {seller.phoneNumber || '-'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => openMemberDetail(seller)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(245,158,11,0.3)',
                            background: 'rgba(245,158,11,0.1)',
                            color: '#b45309',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          <FontAwesomeIcon icon={faEye} style={{ marginRight: '0.35rem' }} />
                          Ver Pedidos e KPIs
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL DETALHE MEMBRO */}
      {selectedMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedMember(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #7f00ff 0%, #059669 100%)',
                padding: '1.5rem 1.75rem',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>{selectedMember.name}</h4>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {selectedMember.role || (selectedMember.isDeliveryMan ? 'Motorista' : 'Fornecedor')}
                  {selectedMember.phoneNumber && ` · ${selectedMember.phoneNumber}`}
                </span>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.75rem' }}>
              {memberKpisLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                  A carregar dados do membro...
                </div>
              ) : memberKpis ? (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    {[
                      { label: 'Total Operações', value: memberKpis.kpis?.totalOrders || 0, color: '#7f00ff' },
                      { label: 'Concluídas', value: memberKpis.kpis?.completedOrders || 0, color: '#059669' },
                      { label: 'Canceladas', value: memberKpis.kpis?.cancelledOrders || 0, color: '#e11d48' },
                      { label: 'Receita Gerada', value: fmtMT(memberKpis.kpis?.revenue), color: '#0d9488' },
                      { label: 'Taxa Conclusão', value: `${memberKpis.kpis?.completionRate || 0}%`, color: '#f59e0b' },
                    ].map((k, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '1rem',
                          background: '#f8fafc',
                          borderRadius: '16px',
                          border: '1px solid #f1f5f9',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: '0.2rem' }}>
                          {k.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <h5 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                    <FontAwesomeIcon icon={faList} style={{ marginRight: '0.4rem', color: '#7f00ff' }} />
                    Operações Recentes ({memberKpis.recentOrders?.length || 0})
                  </h5>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="partner-table">
                      <thead>
                        <tr>
                          <th>Ref.</th>
                          <th>Destino / Cliente</th>
                          <th>Paragens</th>
                          <th>Preço</th>
                          <th>Estado</th>
                          <th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(memberKpis.recentOrders || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                              Sem operações recentes.
                            </td>
                          </tr>
                        ) : (
                          (memberKpis.recentOrders || []).map((op, i) => (
                            <tr key={op._id || i}>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                  {op.code || op._id?.slice(-6)}
                                </span>
                              </td>
                              <td style={{ color: '#475569' }}>
                                {op.destination ||
                                  op.destinationDetails?.address ||
                                  op.deliveryAddress?.address ||
                                  op.user?.name ||
                                  '-'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {op.deliveryStops?.length > 0 ? (
                                  <span style={{ background: '#ede9fe', color: '#7f00ff', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                                    {op.deliveryStops.length}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td style={{ fontWeight: 800, color: '#059669' }}>
                                {fmtMT(op.deliveryPrice || op.finalAgreedPrice || op.totalPrice || op.addressPrice)}
                              </td>
                              <td>{statusBadge(op.status)}</td>
                              <td style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{fmtDate(op.createdAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#e11d48' }}>
                  <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                  <p>Erro ao carregar dados do membro.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}