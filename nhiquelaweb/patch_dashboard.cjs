const fs = require('fs');

let c = fs.readFileSync('src/screens/admin/DashboardScreen.jsx', 'utf8');

// Inject calculation variables
const calcVars = `
  const completedTripsCount = stats.orders.filter(o => o.status === 'Entregue' || o.status === 'Concluido').length;
  const inTransitDriversCount = stats.drivers.filter(d => d.status === 'Em Entrega').length;
  const cancelledTripsCount = stats.orders.filter(o => o.status === 'Cancelado').length;
  
  // Calculate driver earnings roughly as 80% if not explicitly set
  const driverEarnings = stats.orders.reduce((sum, order) => sum + Number(order.totalPrice || order.itemsPrice || 0) * 0.8, 0);
`;

c = c.replace(
  "const totalRevenue = stats.orders.reduce((sum, order) => sum + Number(order.totalPrice || order.itemsPrice || 0), 0);",
  "const totalRevenue = stats.orders.reduce((sum, order) => sum + Number(order.totalPrice || order.itemsPrice || 0), 0);\n" + calcVars
);

// We need to inject a second row of KPIs right after the first <div className="row g-4 mb-4">...</div>
const newRow = `
      {/* KPI Row 2 - Novas Metricas Cruciais */}
      <div className="row g-4 mb-4">
        {/* KPI 5: Viagens Concluidas */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-success-subtle text-success rounded-circle d-flex justify-content-center align-items-center" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faCheckCircle} size="xl" />
                </div>
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Viagens Concluídas</h6>
                <h3 className="fw-bold text-dark m-0">{completedTripsCount} <small className="text-muted fs-6">sucesso</small></h3>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 6: Motoristas em Serviço */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-warning text-dark rounded-circle d-flex justify-content-center align-items-center bg-opacity-25" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faMotorcycle} size="xl" />
                </div>
                <span className="badge bg-warning text-dark rounded-pill fw-bold">Em viagem</span>
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Motoristas em Serviço</h6>
                <h3 className="fw-bold text-dark m-0">{inTransitDriversCount} <small className="text-muted fs-6">ativos</small></h3>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 7: Ganhos dos Motoristas */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-info-subtle text-info rounded-circle d-flex justify-content-center align-items-center" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faWallet} size="xl" />
                </div>
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Ganhos de Motoristas</h6>
                <h3 className="fw-bold text-dark m-0">{driverEarnings.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 8: Viagens Canceladas */}
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 hover-lift">
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-danger text-white rounded-circle d-flex justify-content-center align-items-center bg-opacity-75" style={{ width: '55px', height: '55px' }}>
                  <FontAwesomeIcon icon={faBoxOpen} size="xl" />
                </div>
              </div>
              <div>
                <h6 className="text-muted fw-bold mb-1">Viagens Canceladas</h6>
                <h3 className="fw-bold text-dark m-0">{cancelledTripsCount} <small className="text-muted fs-6">falhas</small></h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-4">
`;

c = c.replace(
  '</div>\n\n      <div className="row g-4">',
  '</div>\n' + newRow
);

// Oh wait, there are \r\n vs \n issues on Windows.
// Instead of literal exact replace, I'll use regex.
c = c.replace(
  /<\/div>\s*<div className="row g-4">/,
  '</div>\n' + newRow
);

fs.writeFileSync('src/screens/admin/DashboardScreen.jsx', c, 'utf8');
console.log('Added new KPIs to Dashboard');
