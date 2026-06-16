import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

export default function ServicesScreen() {
  const services = [
    { id: 'SRV-01', name: 'Limpeza Residencial Profunda', category: 'Limpeza', subcategory: 'Doméstica', price: '1,500 MZN', provider: 'Maria Limpezas', coverage: 'Maputo Cidade', status: 'Ativo' },
    { id: 'SRV-02', name: 'Montagem de Guarda-Fatos', category: 'Carpintaria', subcategory: 'Montagem', price: '800 MZN', provider: 'João Carpinteiro', coverage: 'Maputo e Matola', status: 'Ativo' },
    { id: 'SRV-03', name: 'Reboque Ligeiro 24h', category: 'Transporte', subcategory: 'Reboque', price: '2,500 MZN', provider: 'Auto Socorro MZ', coverage: 'Província de Maputo', status: 'Oculto' },
    { id: 'SRV-04', name: 'Reparação de Ar Condicionado', category: 'Eletricidade', subcategory: 'Manutenção', price: '1,200 MZN', provider: 'ClimaFrio', coverage: 'Maputo Cidade', status: 'Pendente' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">Catálogo de Serviços</h2>
          <span className="text-muted small">Profissionais, preços base e áreas de cobertura</span>
        </div>
        <button className="btn bg-primary-custom text-white">
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Adicionar Serviço
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Serviço</th>
                  <th className="border-0 text-muted py-3">Prestador</th>
                  <th className="border-0 text-muted py-3">Categoria</th>
                  <th className="border-0 text-muted py-3">Preço Base</th>
                  <th className="border-0 text-muted py-3">Cobertura</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id}>
                    <td className="px-4">
                      <div className="fw-bold">{service.name}</div>
                      <small className="text-muted">{service.id}</small>
                    </td>
                    <td>{service.provider}</td>
                    <td>{service.category} <small className="text-muted d-block">{service.subcategory}</small></td>
                    <td className="fw-bold text-primary-custom">{service.price}</td>
                    <td>
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted me-1" />
                      <small>{service.coverage}</small>
                    </td>
                    <td>
                      <span className={`badge rounded-pill ${
                        service.status === 'Ativo' ? 'bg-success' : 
                        service.status === 'Pendente' ? 'bg-warning text-dark' : 'bg-secondary'
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-outline-primary me-2" title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
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
