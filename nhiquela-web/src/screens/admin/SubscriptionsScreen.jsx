import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCrown, faChartBar, faBuilding, faSearch, faBan } from '@fortawesome/free-solid-svg-icons';

export default function SubscriptionsScreen() {
  const plans = [
    { name: 'Gratuito', limit: 'Até 20 produtos', features: ['Sem destaque'], price: '0 MZN', icon: faCheckCircle },
    { name: 'Básico', limit: 'Até 200 produtos', features: ['Destaque simples'], price: '1,500 MZN/mês', icon: faChartBar },
    { name: 'Premium', limit: 'Ilimitado', features: ['Destaque principal', 'Relatórios avançados'], price: '4,500 MZN/mês', icon: faCrown, highlight: true },
    { name: 'Enterprise', limit: 'Ilimitado', features: ['Tudo do Premium', 'Suporte prioritário'], price: 'Personalizado', icon: faBuilding },
  ];

  const activeSubscriptions = [
    { supplier: 'Mercado Central', plan: 'Premium', joinDate: '01/01/2026', renewDate: '01/07/2026', status: 'Ativo' },
    { supplier: 'SuperTech MZ', plan: 'Enterprise', joinDate: '15/03/2026', renewDate: '15/03/2027', status: 'Ativo' },
    { supplier: 'Loja do Povo', plan: 'Gratuito', joinDate: '10/05/2026', renewDate: '-', status: 'Ativo' },
    { supplier: 'João Carpinteiro', plan: 'Básico', joinDate: '20/04/2026', renewDate: '20/05/2026', status: 'Atrasado' },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0">Gestão de Subscrições</h2>
        <span className="text-muted small">Planos, adesões e controle de cobranças</span>
      </div>

      <div className="row g-4 mb-5">
        {plans.map((plan, idx) => (
          <div className="col-12 col-md-3" key={idx}>
            <div className={`card shadow-sm-custom border-0 rounded-3 h-100 ${plan.highlight ? 'bg-primary-custom text-white' : 'bg-white'}`}>
              <div className="card-body text-center p-4">
                <FontAwesomeIcon icon={plan.icon} size="2x" className={plan.highlight ? 'text-white mb-3' : 'text-primary-custom mb-3'} />
                <h5 className="fw-bold">{plan.name}</h5>
                <h6 className={`fw-bold mb-3 ${plan.highlight ? 'text-white' : 'text-muted'}`}>{plan.price}</h6>
                <hr className={plan.highlight ? 'border-white' : 'border-light'} />
                <ul className="list-unstyled mb-0 small">
                  <li className="mb-2"><strong>Limites:</strong> {plan.limit}</li>
                  {plan.features.map((feat, i) => (
                    <li key={i} className="mb-1"><FontAwesomeIcon icon={faCheckCircle} className="me-2" />{feat}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 fw-bold">Assinaturas Ativas e Histórico</h6>
          <div className="position-relative" style={{ width: '250px' }}>
            <FontAwesomeIcon icon={faSearch} className="position-absolute text-muted" style={{ left: '10px', top: '10px' }} />
            <input type="text" className="form-control form-control-sm bg-light border-0 ps-4" placeholder="Buscar fornecedor..." />
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Fornecedor</th>
                  <th className="border-0 text-muted py-3">Plano</th>
                  <th className="border-0 text-muted py-3">Data Adesão</th>
                  <th className="border-0 text-muted py-3">Renovação</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {activeSubscriptions.map((sub, idx) => (
                  <tr key={idx}>
                    <td className="px-4 fw-bold">{sub.supplier}</td>
                    <td>
                      <span className={`badge rounded-pill ${
                        sub.plan === 'Premium' ? 'bg-primary' : 
                        sub.plan === 'Enterprise' ? 'bg-dark' : 'bg-secondary'
                      }`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td>{sub.joinDate}</td>
                    <td>{sub.renewDate}</td>
                    <td>
                      <span className={`badge rounded-pill ${
                        sub.status === 'Ativo' ? 'bg-success' : 'bg-danger'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-outline-danger me-2" title="Cancelar Assinatura">
                        <FontAwesomeIcon icon={faBan} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
