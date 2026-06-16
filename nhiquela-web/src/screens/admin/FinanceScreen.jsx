import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillTransfer, faHandHoldingDollar, faPercent, faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';

export default function FinanceScreen() {
  const transactions = [
    { id: 'TRX-9981', amount: '4,500 MZN', date: 'Hoje, 11:45', status: 'Pagamento Retido', supplier: 'Mercado Central (3,600 MZN)', driver: 'João Santos (450 MZN)', platform: '450 MZN' },
    { id: 'TRX-9980', amount: '1,200 MZN', date: 'Ontem, 14:20', status: 'Distribuído', supplier: 'ClimaFrio (1,080 MZN)', driver: '-', platform: '120 MZN' },
    { id: 'TRX-9979', amount: '65,000 MZN', date: '14/06/2026', status: 'Distribuído', supplier: 'SuperTech MZ (61,750 MZN)', driver: 'Mário Silva (0 MZN - Recolha na loja)', platform: '3,250 MZN' },
  ];

  return (
    <div>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h2 className="fw-bold m-0">Financeiro & Split Payment</h2>
          <span className="text-muted small">Visão geral de retenções, comissões e repasses automáticos</span>
        </div>
        <button className="btn btn-outline-primary bg-white">
          <FontAwesomeIcon icon={faPercent} className="me-2" />
          Configurar Comissões
        </button>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3 bg-primary-custom text-white h-100">
            <div className="card-body">
              <h6 className="text-white-50"><FontAwesomeIcon icon={faMoneyBillTransfer} className="me-2" />Receita Total (Dia)</h6>
              <h2 className="fw-bold mt-3">70,700 MZN</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3 h-100">
            <div className="card-body">
              <h6 className="text-muted"><FontAwesomeIcon icon={faClock} className="me-2" />Pagamentos Retidos</h6>
              <h2 className="fw-bold text-warning mt-3">4,500 MZN</h2>
              <small className="text-muted">Aguardando confirmação de entrega</small>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3 h-100">
            <div className="card-body">
              <h6 className="text-muted"><FontAwesomeIcon icon={faHandHoldingDollar} className="me-2" />Comissões da Plataforma</h6>
              <h2 className="fw-bold text-success mt-3">3,820 MZN</h2>
              <small className="text-muted">Líquido arrecadado hoje</small>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-header bg-white border-bottom p-3">
          <h6 className="m-0 fw-bold">Fluxo de Split Payment</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Transação</th>
                  <th className="border-0 text-muted py-3">Valor Total</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3">Repasse Fornecedor</th>
                  <th className="border-0 text-muted py-3">Repasse Motorista</th>
                  <th className="border-0 text-muted py-3">Comissão Nhiquela</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ação</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(trx => (
                  <tr key={trx.id}>
                    <td className="px-4">
                      <div className="fw-bold">{trx.id}</div>
                      <small className="text-muted">{trx.date}</small>
                    </td>
                    <td className="fw-bold">{trx.amount}</td>
                    <td>
                      <span className={`badge rounded-pill ${
                        trx.status === 'Pagamento Retido' ? 'bg-warning text-dark' : 'bg-success'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="text-muted small">{trx.supplier}</td>
                    <td className="text-muted small">{trx.driver}</td>
                    <td className="text-success fw-bold small">{trx.platform}</td>
                    <td className="text-end px-4">
                      {trx.status === 'Pagamento Retido' ? (
                        <button className="btn btn-sm btn-outline-success" title="Confirmar Entrega (Liberar Split)">
                          <FontAwesomeIcon icon={faCheckCircle} /> Liberar
                        </button>
                      ) : (
                        <span className="text-muted small">Concluído</span>
                      )}
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
