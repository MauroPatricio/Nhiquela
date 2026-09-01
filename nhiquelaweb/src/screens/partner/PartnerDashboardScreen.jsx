import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import api from '../../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMotorcycle, faStore, faCheckCircle,
  faMoneyBillWave, faChartLine, faFilter, faFileExcel,
  faFilePdf, faSync, faPercent, faTruck, faList,
  faExclamationTriangle, faStar, faSearch, faBoxes, faEye, faPhone
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

const statusBadge = (s = '') => {
  const map = {
    'Entregue': 'success', 'Finalizado': 'success', 'Concluido': 'success',
    'Em Transito': 'primary', 'Em Andamento': 'primary', 'A caminho': 'primary',
    'Cancelado': 'danger', 'CANCELLED': 'danger',
    'Rejeitado': 'secondary', 'Pendente': 'warning', 'PENDING': 'warning',
  };
  return <span className={`badge bg-${map[s] || 'secondary'} px-2 py-1`}>{s || '-'}</span>;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-';
const fmtMT = (v) => `${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits:2, maximumFractionDigits:2 })} MT`;

export default function PartnerDashboardScreen() {
  const userInfo  = useSelector(selectUser) || {};
  const partnerId = userInfo.partnerId || userInfo._id;

  const [loading, setLoading]       = useState(true);
  const [data, setData]             = useState(null);
  const [members, setMembers]       = useState({ drivers: [], sellers: [] });
  const [recentTrips, setRecentTrips]   = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [search, setSearch]         = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberKpis, setMemberKpis]         = useState(null);
  const [memberKpisLoading, setMemberKpisLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState('viagens');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${userInfo.token}` };
      const membersRes = await api.get(`/partners/${partnerId}/members`, { headers });
      const membersData = membersRes.data || { drivers: [], sellers: [] };
      setMembers(membersData);

      const qp = new URLSearchParams();
      if (startDate) qp.append('startDate', startDate);
      if (endDate)   qp.append('endDate', endDate);
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
            (kRes.data?.recentOrders || []).forEach(r => {
              const item = { ...r, _memberName: driver.name };
              if (r.origin || r.type === 'requestService' || r.deliveryStops) allTrips.push(item);
              else allOrders.push(item);
            });
          } catch { /* silent */ }
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

  const openMemberDetail = async (member) => {
    setSelectedMember(member);
    setMemberKpis(null);
    setMemberKpisLoading(true);
    try {
      const res = await api.get(`/partners/members/${member._id}/kpis`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setMemberKpis(res.data);
    } catch { toast.error('Erro ao carregar detalhes.'); }
    finally { setMemberKpisLoading(false); }
  };

  const handleExport = (format) => {
    const qp = new URLSearchParams({ format });
    if (startDate) qp.append('startDate', startDate);
    if (endDate)   qp.append('endDate', endDate);
    if (selectedDriver) qp.append('driverId', selectedDriver);
    if (selectedSeller) qp.append('sellerId', selectedSeller);
    if (selectedStatus && selectedStatus !== 'Todos') qp.append('status', selectedStatus);
    const url = `${api.defaults.baseURL}/partners/${partnerId}/reports/export?${qp}`;
    format === 'pdf' || format === 'html' ? window.open(url, '_blank') : (window.location.href = url);
  };

  const kpis = data?.kpis || {
    totalDrivers:0, onlineDrivers:0, totalSellers:0, totalOrders:0,
    completedOrders:0, completedTrips:0, completedStoreOrders:0,
    inProgressOrders:0, cancelledOrders:0, rejectedOrders:0,
    acceptanceRate:100, completionRate:100, cancellationRate:0,
    tripsRevenue:0, storeRevenue:0, totalRevenue:0,
    totalCommissions:0, netAmount:0, averageRating:5.0
  };

  const filtered = (list) => list.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.code||'').toLowerCase().includes(q) ||
           (r._memberName||'').toLowerCase().includes(q) ||
           (r.status||'').toLowerCase().includes(q) ||
           (r.destination||r.deliveryAddress?.address||'').toLowerCase().includes(q);
  });

  return (
    <div className="container-fluid py-3 bg-light min-vh-100">
      {/* CABECALHO */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 bg-white p-4 rounded-4 shadow-sm gap-3">
        <div>
          <span className="badge px-3 py-2 rounded-pill mb-2"
                style={{ backgroundColor:'rgba(138,43,226,0.1)', color:'#8a2be2', fontWeight:'bold' }}>
            <FontAwesomeIcon icon={faChartLine} className="me-2" /> Painel do Parceiro
          </span>
          <h3 className="fw-bold m-0 text-dark">{data?.partnerName || userInfo.name || 'Parceiro'}</h3>
          <p className="text-muted small m-0 mt-1">
            Visibilidade total das viagens, pedidos e desempenho dos associados.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button onClick={fetchDashboardData} className="btn btn-outline-secondary rounded-3 px-3" disabled={loading}>
            <FontAwesomeIcon icon={faSync} spin={loading} className="me-2" /> Atualizar
          </button>
          <button onClick={() => handleExport('excel')} className="btn btn-outline-success rounded-3 px-3">
            <FontAwesomeIcon icon={faFileExcel} className="me-2" /> XLS
          </button>
          <button onClick={() => handleExport('pdf')} className="btn text-white rounded-3 px-3"
                  style={{ backgroundColor:'#8a2be2' }}>
            <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <h6 className="fw-bold mb-3 text-dark">
            <FontAwesomeIcon icon={faFilter} className="me-2 text-primary" /> Filtros
          </h6>
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-bold text-muted">Data Inicial</label>
              <input type="date" className="form-control rounded-3" value={startDate}
                     onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-bold text-muted">Data Final</label>
              <input type="date" className="form-control rounded-3" value={endDate}
                     onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-bold text-muted">Motorista</label>
              <select className="form-select rounded-3" value={selectedDriver}
                      onChange={e => setSelectedDriver(e.target.value)}>
                <option value="">Todos</option>
                {members.drivers?.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-bold text-muted">Fornecedor</label>
              <select className="form-select rounded-3" value={selectedSeller}
                      onChange={e => setSelectedSeller(e.target.value)}>
                <option value="">Todos</option>
                {members.sellers?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-bold text-muted">Estado</label>
              <select className="form-select rounded-3" value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}>
                {['Todos','Entregue','Em Transito','Cancelado','Pendente'].map(s =>
                  <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-2 d-flex align-items-end">
              <button onClick={fetchDashboardData} disabled={loading}
                      className="btn w-100 text-white rounded-3 fw-bold"
                      style={{ backgroundColor:'#8a2be2' }}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color:'#8a2be2' }} role="status" />
          <p className="text-muted mt-3">A carregar dados...</p>
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="row g-3 mb-4">
            {[
              { label:'Receita Total', value: fmtMT(kpis.totalRevenue), icon: faMoneyBillWave, color:'#8a2be2', bg:'rgba(138,43,226,0.1)', sub:`Comissao: ${fmtMT(kpis.totalCommissions)}` },
              { label:'Lucro Liquido', value: fmtMT(kpis.netAmount), icon: faCheckCircle, gradient: true, sub:`Apos ${fmtMT(kpis.totalCommissions)} de comissao` },
              { label:'Viagens Concluidas', value: kpis.completedTrips, icon: faMotorcycle, color:'#8a2be2', bg:'rgba(138,43,226,0.1)', sub:`Receita: ${fmtMT(kpis.tripsRevenue)}` },
              { label:'Pedidos de Loja', value: kpis.completedStoreOrders, icon: faStore, color:'#ffc107', bg:'rgba(255,193,7,0.15)', sub:`Receita: ${fmtMT(kpis.storeRevenue)}` },
              { label:'Motoristas na Frota', value: `${kpis.onlineDrivers} Online`, icon: faTruck, color:'#17a2b8', bg:'rgba(23,162,184,0.1)', sub:`${kpis.totalDrivers} associados` },
              { label:'Taxa de Conclusao', value: `${kpis.completionRate}%`, icon: faPercent, color:'#28a745', bg:'rgba(40,167,69,0.1)', sub:`${kpis.completedOrders} de ${kpis.totalOrders}` },
            ].map((k, i) => (
              <div key={i} className="col-12 col-sm-6 col-xl-4">
                <div className={`card border-0 shadow-sm rounded-4 h-100 ${k.gradient ? '' : 'bg-white'}`}
                     style={k.gradient ? { background:'linear-gradient(135deg,#2b8a3e,#1e5e2a)', color:'#fff' } : {}}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className={`text-uppercase small fw-bold ${k.gradient ? 'opacity-75' : 'text-muted'}`}>{k.label}</span>
                      <div className="rounded-circle d-flex align-items-center justify-content-center"
                           style={{ width:48, height:48, backgroundColor: k.gradient ? 'rgba(255,255,255,0.2)' : k.bg, color: k.gradient ? '#fff' : k.color }}>
                        <FontAwesomeIcon icon={k.icon} style={{ fontSize:'1.2rem' }} />
                      </div>
                    </div>
                    <h2 className={`fw-bold mb-1 ${k.gradient ? '' : 'text-dark'}`}>{k.value}</h2>
                    <small className={k.gradient ? 'opacity-75' : 'text-muted'}>{k.sub}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DISTRIBUICAO OPERACIONAL */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-4 text-dark">Distribuicao Operacional</h6>
              <div className="row g-3 mb-3">
                {[
                  { label:'Concluidas', value: kpis.completedOrders, cls:'success' },
                  { label:'Em Andamento', value: kpis.inProgressOrders, cls:'primary' },
                  { label:'Canceladas', value: kpis.cancelledOrders, cls:'danger' },
                  { label:'Rejeitadas', value: kpis.rejectedOrders, cls:'secondary' },
                ].map((s, i) => (
                  <div key={i} className="col-6 col-md-3">
                    <div className="p-3 rounded-3 border bg-light text-center">
                      <span className={`badge bg-${s.cls} mb-2 px-3 py-1`}>{s.label}</span>
                      <h4 className="fw-bold text-dark m-0">{s.value}</h4>
                    </div>
                  </div>
                ))}
              </div>
              <div className="progress rounded-pill" style={{ height:10 }}>
                <div className="progress-bar bg-success rounded-pill" style={{ width:`${kpis.completionRate}%` }} />
              </div>
              <div className="d-flex justify-content-between small text-muted mt-1">
                <span>Taxa de conclusao: {kpis.completionRate}%</span>
                <span>{kpis.completedOrders} / {kpis.totalOrders}</span>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4 pb-0">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <ul className="nav nav-pills gap-2 flex-wrap">
                  {[
                    { key:'viagens',      label:`Viagens (${recentTrips.length})`,               icon: faMotorcycle },
                    { key:'pedidos',      label:`Pedidos (${recentOrders.length})`,              icon: faBoxes },
                    { key:'motoristas',   label:`Motoristas (${members.drivers?.length || 0})`,  icon: faTruck },
                    { key:'fornecedores', label:`Fornecedores (${members.sellers?.length || 0})`, icon: faStore },
                  ].map(t => (
                    <li key={t.key} className="nav-item">
                      <button
                        className={`nav-link rounded-3 fw-bold ${activeTab === t.key ? 'active' : ''}`}
                        style={activeTab === t.key ? { backgroundColor:'#8a2be2', color:'#fff' } : { color:'#555' }}
                        onClick={() => setActiveTab(t.key)}
                      >
                        <FontAwesomeIcon icon={t.icon} className="me-2" />{t.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="input-group" style={{ maxWidth:260 }}>
                  <span className="input-group-text bg-white"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
                  <input className="form-control border-start-0" placeholder="Pesquisar..."
                         value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              {/* VIAGENS */}
              {activeTab === 'viagens' && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Ref.</th><th>Motorista</th><th>Origem</th><th>Destino</th>
                        <th>Paragens</th><th>Preco</th><th>Estado</th><th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered(recentTrips).length === 0
                        ? <tr><td colSpan={8} className="text-center py-4 text-muted">Nenhuma viagem encontrada.</td></tr>
                        : filtered(recentTrips).map((t, i) => (
                          <tr key={t._id || i}>
                            <td><span className="badge bg-light text-dark border">{t.code || t._id?.slice(-6) || '-'}</span></td>
                            <td className="fw-bold small">{t._memberName || t.deliveryman?.name || '-'}</td>
                            <td className="small text-muted" style={{ maxWidth:140 }}>{t.origin || t.originDetails?.address || '-'}</td>
                            <td className="small text-muted" style={{ maxWidth:140 }}>{t.destination || t.destinationDetails?.address || t.deliveryAddress?.address || '-'}</td>
                            <td className="text-center">
                              {t.deliveryStops?.length > 0
                                ? <span className="badge" style={{ backgroundColor:'#A855F7', color:'#fff' }}>{t.deliveryStops.length} paragens</span>
                                : <span className="text-muted small">-</span>}
                            </td>
                            <td className="fw-bold text-success small">{fmtMT(t.deliveryPrice || t.finalAgreedPrice || t.addressPrice)}</td>
                            <td>{statusBadge(t.status)}</td>
                            <td className="small text-muted">{fmtDate(t.createdAt)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PEDIDOS */}
              {activeTab === 'pedidos' && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr><th>Ref.</th><th>Associado</th><th>Cliente</th><th>Produtos</th><th>Total</th><th>Estado</th><th>Data</th></tr>
                    </thead>
                    <tbody>
                      {filtered(recentOrders).length === 0
                        ? <tr><td colSpan={7} className="text-center py-4 text-muted">Nenhum pedido encontrado.</td></tr>
                        : filtered(recentOrders).map((o, i) => (
                          <tr key={o._id || i}>
                            <td><span className="badge bg-light text-dark border">{o.code || o._id?.slice(-6) || '-'}</span></td>
                            <td className="fw-bold small">{o._memberName || '-'}</td>
                            <td className="small text-muted">{o.user?.name || o.clientName || '-'}</td>
                            <td className="small">{o.orderItems?.length || '-'} {o.orderItems?.length === 1 ? 'item' : 'itens'}</td>
                            <td className="fw-bold text-success small">{fmtMT(o.totalPrice || o.itemsPrice)}</td>
                            <td>{statusBadge(o.status)}</td>
                            <td className="small text-muted">{fmtDate(o.createdAt)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MOTORISTAS */}
              {activeTab === 'motoristas' && (
                <div className="p-4">
                  {(members.drivers || []).length === 0
                    ? <div className="text-center py-4 text-muted">Nenhum motorista associado.</div>
                    : <div className="row g-3">
                        {members.drivers.map(driver => (
                          <div key={driver._id} className="col-12 col-md-6 col-xl-4">
                            <div className="card border-0 shadow-sm rounded-4 h-100">
                              <div className="card-body p-4">
                                <div className="d-flex align-items-center gap-3 mb-3">
                                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                                       style={{ width:48, height:48, backgroundColor:'#8a2be2', fontSize:'1.1rem' }}>
                                    {driver.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="fw-bold text-dark">{driver.name}</div>
                                    <div className="small text-muted">
                                      <FontAwesomeIcon icon={faPhone} className="me-1" />{driver.phoneNumber || '-'}
                                    </div>
                                  </div>
                                  <span className={`ms-auto badge ${driver.isOnline || driver.status === 'ONLINE' ? 'bg-success' : 'bg-secondary'}`}>
                                    {driver.isOnline || driver.status === 'ONLINE' ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                                {driver.rating && (
                                  <div className="small text-muted mb-3">
                                    <FontAwesomeIcon icon={faStar} className="me-1 text-warning" />{driver.rating}
                                  </div>
                                )}
                                <button className="btn btn-sm w-100 rounded-3 fw-bold"
                                        style={{ backgroundColor:'rgba(138,43,226,0.1)', color:'#8a2be2' }}
                                        onClick={() => openMemberDetail(driver)}>
                                  <FontAwesomeIcon icon={faEye} className="me-2" /> Ver Viagens e KPIs
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {/* FORNECEDORES */}
              {activeTab === 'fornecedores' && (
                <div className="p-4">
                  {(members.sellers || []).length === 0
                    ? <div className="text-center py-4 text-muted">Nenhum fornecedor associado.</div>
                    : <div className="row g-3">
                        {members.sellers.map(seller => (
                          <div key={seller._id} className="col-12 col-md-6 col-xl-4">
                            <div className="card border-0 shadow-sm rounded-4 h-100">
                              <div className="card-body p-4">
                                <div className="d-flex align-items-center gap-3 mb-3">
                                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                       style={{ width:48, height:48, backgroundColor:'rgba(255,193,7,0.2)', color:'#856404', fontSize:'1.1rem' }}>
                                    {seller.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="fw-bold text-dark">{seller.name}</div>
                                    <div className="small text-muted">
                                      <FontAwesomeIcon icon={faPhone} className="me-1" />{seller.phoneNumber || '-'}
                                    </div>
                                  </div>
                                </div>
                                <button className="btn btn-sm w-100 rounded-3 fw-bold"
                                        style={{ backgroundColor:'rgba(255,193,7,0.15)', color:'#856404' }}
                                        onClick={() => openMemberDetail(seller)}>
                                  <FontAwesomeIcon icon={faEye} className="me-2" /> Ver Pedidos e KPIs
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL DETALHE MEMBRO */}
      {selectedMember && (
        <div className="modal fade show d-block" style={{ backgroundColor:'rgba(0,0,0,0.5)' }}
             onClick={() => setSelectedMember(null)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable"
               onClick={e => e.stopPropagation()}>
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0 p-4"
                   style={{ background:'linear-gradient(135deg,#8a2be2,#6a1ab2)', color:'#fff' }}>
                <div>
                  <h5 className="modal-title fw-bold mb-1">{selectedMember.name}</h5>
                  <small className="opacity-75">
                    {selectedMember.role || (selectedMember.isDeliveryMan ? 'Motorista' : 'Fornecedor')}
                    {selectedMember.phoneNumber && ` · ${selectedMember.phoneNumber}`}
                  </small>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={() => setSelectedMember(null)} />
              </div>

              <div className="modal-body p-4">
                {memberKpisLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border" style={{ color:'#8a2be2' }} />
                    <p className="text-muted mt-2">A carregar...</p>
                  </div>
                ) : memberKpis ? (
                  <>
                    <div className="row g-3 mb-4">
                      {[
                        { label:'Total Operacoes', value: memberKpis.kpis?.totalOrders || 0, color:'#8a2be2' },
                        { label:'Concluidas', value: memberKpis.kpis?.completedOrders || 0, color:'#28a745' },
                        { label:'Canceladas', value: memberKpis.kpis?.cancelledOrders || 0, color:'#dc3545' },
                        { label:'Receita Gerada', value: fmtMT(memberKpis.kpis?.revenue), color:'#17a2b8' },
                        { label:'Taxa Conclusao', value: `${memberKpis.kpis?.completionRate || 0}%`, color:'#fd7e14' },
                      ].map((k, i) => (
                        <div key={i} className="col-6 col-md-4">
                          <div className="p-3 rounded-3 border text-center bg-light">
                            <div className="fw-bold" style={{ color: k.color, fontSize:'1.3rem' }}>{k.value}</div>
                            <div className="small text-muted">{k.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h6 className="fw-bold text-dark mb-3">
                      <FontAwesomeIcon icon={faList} className="me-2" />
                      Operacoes Recentes ({memberKpis.recentOrders?.length || 0})
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover align-middle">
                        <thead className="table-light">
                          <tr><th>Ref.</th><th>Destino / Cliente</th><th>Paragens</th><th>Preco</th><th>Estado</th><th>Data</th></tr>
                        </thead>
                        <tbody>
                          {(memberKpis.recentOrders || []).length === 0
                            ? <tr><td colSpan={6} className="text-center py-3 text-muted">Sem operacoes recentes.</td></tr>
                            : (memberKpis.recentOrders || []).map((op, i) => (
                              <tr key={op._id || i}>
                                <td><span className="badge bg-light text-dark border">{op.code || op._id?.slice(-6)}</span></td>
                                <td className="small">{op.destination || op.destinationDetails?.address || op.deliveryAddress?.address || op.user?.name || '-'}</td>
                                <td className="text-center">
                                  {op.deliveryStops?.length > 0
                                    ? <span className="badge" style={{ backgroundColor:'#A855F7', color:'#fff' }}>{op.deliveryStops.length} paragens</span>
                                    : <span className="text-muted small">-</span>}
                                </td>
                                <td className="fw-bold text-success small">{fmtMT(op.deliveryPrice || op.finalAgreedPrice || op.totalPrice || op.addressPrice)}</td>
                                <td>{statusBadge(op.status)}</td>
                                <td className="small text-muted">{fmtDate(op.createdAt)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-danger py-3">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="mb-2" />
                    <p>Erro ao carregar dados.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}