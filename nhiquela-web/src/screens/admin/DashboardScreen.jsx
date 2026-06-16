import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faBoxOpen, faCar, faChartLine, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

export default function DashboardScreen() {
  const stats = [
    { title: 'Total de Clientes', value: '1,204', icon: faUsers, color: 'text-primary' },
    { title: 'Fornecedores', value: '85', icon: faBoxOpen, color: 'text-success' },
    { title: 'Motoristas', value: '42', icon: faCar, color: 'text-warning' },
    { title: 'Receita do Dia', value: '85,400 MZN', icon: faMoneyBillWave, color: 'text-danger' },
  ];

  return (
    <div>
      <h2 className="mb-4 fw-bold">Dashboard</h2>
      
      <div className="row g-4 mb-4">
        {stats.map((stat, idx) => (
          <div className="col-12 col-sm-6 col-lg-3" key={idx}>
            <div className="card shadow-sm-custom border-0 rounded-3">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="text-muted mb-2">{stat.title}</h6>
                  <h3 className="fw-bold m-0">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-circle bg-light ${stat.color}`}>
                  <FontAwesomeIcon icon={stat.icon} size="lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <div className="card shadow-sm-custom border-0 rounded-3 h-100">
            <div className="card-header bg-white border-0 pt-4 pb-0">
              <h5 className="fw-bold">Visão Geral de Vendas</h5>
            </div>
            <div className="card-body d-flex align-items-center justify-content-center bg-light m-3 rounded">
              <span className="text-muted"><FontAwesomeIcon icon={faChartLine} className="me-2"/> Gráfico de Vendas (Placeholder)</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3 h-100">
            <div className="card-header bg-white border-0 pt-4 pb-0">
              <h5 className="fw-bold">Últimos Incidentes</h5>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item px-0 text-muted">Atraso na entrega #1029</li>
                <li className="list-group-item px-0 text-muted">Produto incorreto #1030</li>
                <li className="list-group-item px-0 text-muted">Reclamação #1031</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
