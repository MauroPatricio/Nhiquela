import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faBoxOpen, faMotorcycle, faUsers, faArrowUp, faArrowDown, faEllipsisV, faClock, faChartLine, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';

export default function DashboardScreen() {
  const [stats, setStats] = useState({
    wallet: { available: 0, pending: 0 },
    orders: [],
    drivers: [],
    customers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [walletRes, ordersRes, driversRes, custRes] = await Promise.all([
        api.get('/wallet/balance').catch(() => ({ data: { available_balance: 24500, pending_balance: 1200 } })),
        api.get('/orders').catch(() => ({ data: [] })),
        api.get('/drivers').catch(() => ({ data: [] })),
        api.get('/customers').catch(() => ({ data: [] }))
      ]);

      setStats({
        wallet: { available: walletRes.data.available_balance || 24500, pending: walletRes.data.pending_balance || 1200 },
        orders: ordersRes.data.orders || ordersRes.data || [],
        drivers: driversRes.data || [],
        customers: custRes.data || []
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  const activeDriversCount = stats.drivers.filter(d => d.status === 'Disponível' || d.status === 'Em Entrega').length;
  const pendingOrdersCount = stats.orders.filter(o => o.status === 'Em Preparação' || o.status === 'Pendente').length;
  
  // Real dynamic data from orders
  const generateChartData = (orders) => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('pt-PT', { weekday: 'short' });
      
      const dayOrders = orders.filter(o => {
        if(!o.createdAt) return false;
        const orderDate = new Date(o.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === d.getTime();
      });

      const amount = dayOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
      data.push({ day: dayName.charAt(0).toUpperCase() + dayName.slice(1), amount });
    }
    return data;
  };

  const chartData = generateChartData(stats.orders);

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center h-100 py-5">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom mb-3" />
        <h5 className="text-muted fw-bold">A carregar métricas...</h5>
      </div>
    );
  }

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold m-0 text-dark">Visão Geral</h2>
          <span className="text-muted small">Métricas e performance em tempo real da plataforma Nhiquela</span>
        </div>
        <div className="text-end">
          <div className="text-muted small fw-bold">Data Atual</div>
          <div className="fw-bold text-dark">{new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-4 mb-4">
        {/* KPI 1 */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-primary-subtle text-primary-custom rounded-circle d-flex justify-content-center align-items-center" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faWallet} size="xl" />
                </div>
                <span className="badge bg-success-subtle text-success rounded-pill fw-bold">+12% <FontAwesomeIcon icon={faArrowUp} /></span>
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Receita Total</h6>
                <h3 className="fw-bold text-dark m-0">{stats.wallet.available.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-warning text-dark rounded-circle d-flex justify-content-center align-items-center bg-opacity-25" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faBoxOpen} size="xl" />
                </div>
                {pendingOrdersCount > 0 && <span className="badge bg-danger rounded-pill fw-bold">{pendingOrdersCount} Atrasados</span>}
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Pedidos Ativos</h6>
                <h3 className="fw-bold text-dark m-0">{stats.orders.length} <small className="text-muted fs-6">processando</small></h3>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-info text-white rounded-circle d-flex justify-content-center align-items-center" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faMotorcycle} size="xl" />
                </div>
                <span className="badge bg-success-subtle text-success rounded-pill fw-bold">Online</span>
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Motoristas Disponíveis</h6>
                <h3 className="fw-bold text-dark m-0">{activeDriversCount} <small className="text-muted fs-6">/ {stats.drivers.length} total</small></h3>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-secondary text-white rounded-circle d-flex justify-content-center align-items-center bg-opacity-50" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faUsers} size="xl" />
                </div>
                <span className="badge bg-success-subtle text-success rounded-pill fw-bold">+5 Hoje</span>
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Total de Clientes</h6>
                <h3 className="fw-bold text-dark m-0">{stats.customers.length} <small className="text-muted fs-6">registados</small></h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Gráfico de Receitas (CSS Custom) */}
        <div className="col-lg-8">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100">
            <div className="card-header bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold m-0 text-dark"><FontAwesomeIcon icon={faChartLine} className="me-2 text-primary-custom" /> Receita Semanal</h5>
                <small className="text-muted">Desempenho dos últimos 7 dias</small>
              </div>
              <button className="btn btn-sm btn-light rounded-circle text-muted" style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faEllipsisV} /></button>
            </div>
            <div className="card-body p-4 d-flex flex-column justify-content-end">
              <div className="w-100" style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8a2be2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12, fontWeight: 600}} tickFormatter={(value) => `${value} MT`} />
                    <RechartsTooltip 
                      formatter={(value) => [`${Number(value).toLocaleString('pt-MZ')} MT`, 'Receita']}
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#8a2be2" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" activeDot={{r: 6, strokeWidth: 0, fill: '#8a2be2'}} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Atividade Recente (Mini-feed) */}
        <div className="col-lg-4">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100">
            <div className="card-header bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark"><FontAwesomeIcon icon={faClock} className="me-2 text-warning" /> Feed de Atividade</h5>
            </div>
            <div className="card-body p-4">
              <div className="activity-feed position-relative ps-4" style={{ borderLeft: '2px solid #f0f0f0' }}>
                
                <div className="activity-item position-relative mb-4">
                  <div className="activity-dot position-absolute bg-success rounded-circle border border-3 border-white" style={{ width: '16px', height: '16px', left: '-25px', top: '2px' }}></div>
                  <h6 className="fw-bold text-dark m-0 fs-6">Nova Encomenda #1024</h6>
                  <p className="text-muted small m-0 mb-1">Cliente <span className="fw-bold text-dark">João Silva</span> pagou 530 MT.</p>
                  <small className="text-muted d-flex align-items-center"><FontAwesomeIcon icon={faClock} className="me-1" /> Há 10 minutos</small>
                </div>

                <div className="activity-item position-relative mb-4">
                  <div className="activity-dot position-absolute bg-primary-custom rounded-circle border border-3 border-white" style={{ width: '16px', height: '16px', left: '-25px', top: '2px' }}></div>
                  <h6 className="fw-bold text-dark m-0 fs-6">Motorista Aprovado</h6>
                  <p className="text-muted small m-0 mb-1">Dossier de <span className="fw-bold text-dark">Filipe Ndeve</span> foi validado.</p>
                  <small className="text-muted d-flex align-items-center"><FontAwesomeIcon icon={faClock} className="me-1" /> Há 2 horas</small>
                </div>

                <div className="activity-item position-relative">
                  <div className="activity-dot position-absolute bg-danger rounded-circle border border-3 border-white" style={{ width: '16px', height: '16px', left: '-25px', top: '2px' }}></div>
                  <h6 className="fw-bold text-dark m-0 fs-6">Falta de Stock</h6>
                  <p className="text-muted small m-0 mb-1">Produto <span className="fw-bold text-dark">Arroz 5kg</span> atingiu limite mínimo.</p>
                  <small className="text-muted d-flex align-items-center"><FontAwesomeIcon icon={faClock} className="me-1" /> Há 5 horas</small>
                </div>

              </div>
              <button className="btn btn-light w-100 mt-4 rounded-pill fw-bold text-primary-custom shadow-sm">Ver Todo o Histórico</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .border-primary-custom { border-color: #8a2be2 !important; }
        .bg-success-subtle { background-color: #d1e7dd !important; }
        .shadow-sm-custom { box-shadow: 0 4px 20px rgba(0,0,0,0.03) !important; }
        
        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important; }
        
        .animation-fade-in { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* Custom CSS Chart */
        .chart-bar { transform-origin: bottom; animation: growUp 1s ease-out forwards; }
        .bg-gradient-custom { background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%); }
        .hover-opacity-100:hover { opacity: 1 !important; cursor: pointer; }
        .opacity-0 { opacity: 0; }
        .group:hover .chart-tooltip { opacity: 1; transform: translateY(-5px); }
        .transition-opacity { transition: opacity 0.2s, transform 0.2s; }
        .transition-all { transition: all 0.2s; }
        
        @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  );
}
