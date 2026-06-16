import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSearch, faCommentDots } from '@fortawesome/free-solid-svg-icons';

export default function IncidentsScreen() {
  const incidents = [
    { id: 'INC-1029', type: 'Atraso', ref: 'Pedido #49281', customer: 'João Silva', date: 'Hoje, 10:30', status: 'Aberto' },
    { id: 'INC-1030', type: 'Produto incorreto', ref: 'Pedido #49200', customer: 'Maria Santos', date: 'Ontem, 15:45', status: 'Em análise' },
    { id: 'INC-1031', type: 'Comportamento inadequado', ref: 'Viagem #8812', customer: 'Carlos Macamo', date: '14/06/2026', status: 'Resolvido' },
    { id: 'INC-1032', type: 'Entrega não realizada', ref: 'Pedido #49102', customer: 'Ana Tembe', date: '12/06/2026', status: 'Encerrado' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">Gestão de Incidentes</h2>
          <span className="text-muted small">Workflow de resolução de problemas</span>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {['Aberto', 'Em análise', 'Resolvido', 'Encerrado'].map((status, idx) => (
          <div className="col-6 col-md-3" key={idx}>
            <div className={`card border-0 shadow-sm-custom text-center py-3 ${status === 'Aberto' ? 'bg-danger text-white' : 'bg-white'}`}>
              <h4 className="fw-bold m-0">{incidents.filter(i => i.status === status).length}</h4>
              <small className={status === 'Aberto' ? 'text-white-50' : 'text-muted'}>{status}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 fw-bold">Lista de Ocorrências</h6>
          <div className="position-relative" style={{ width: '250px' }}>
            <FontAwesomeIcon icon={faSearch} className="position-absolute text-muted" style={{ left: '10px', top: '10px' }} />
            <input type="text" className="form-control form-control-sm bg-light border-0 ps-4" placeholder="Pesquisar incidente..." />
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Ticket</th>
                  <th className="border-0 text-muted py-3">Tipo</th>
                  <th className="border-0 text-muted py-3">Referência</th>
                  <th className="border-0 text-muted py-3">Cliente</th>
                  <th className="border-0 text-muted py-3">Data</th>
                  <th className="border-0 text-muted py-3">Fase</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(incident => (
                  <tr key={incident.id}>
                    <td className="px-4 fw-bold">{incident.id}</td>
                    <td>{incident.type}</td>
                    <td className="text-primary-custom fw-bold" style={{ cursor: 'pointer' }}>{incident.ref}</td>
                    <td>{incident.customer}</td>
                    <td className="text-muted small">{incident.date}</td>
                    <td>
                      <span className={`badge rounded-pill ${
                        incident.status === 'Aberto' ? 'bg-danger' : 
                        incident.status === 'Em análise' ? 'bg-warning text-dark' : 
                        incident.status === 'Resolvido' ? 'bg-success' : 'bg-secondary'
                      }`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-outline-primary me-2" title="Ver Detalhes/Responder">
                        <FontAwesomeIcon icon={faCommentDots} />
                      </button>
                      {incident.status !== 'Encerrado' && (
                        <button className="btn btn-sm btn-outline-success" title="Avançar Fase">
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
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
