import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faBan, faPlus, faCheckCircle, faMotorcycle, faCar } from '@fortawesome/free-solid-svg-icons';

export default function DriversScreen() {
  const drivers = [
    { id: 'DRV-001', name: 'Mário Silva', phone: '+258 84 123 4567', doc: '012345678V', licensePlate: 'ABC-123-MC', type: 'Carro', status: 'Ativo' },
    { id: 'DRV-002', name: 'João Santos', phone: '+258 82 987 6543', doc: '987654321M', licensePlate: 'XYZ-987-MP', type: 'Mota', status: 'Em Viagem' },
    { id: 'DRV-003', name: 'Carlos Tembe', phone: '+258 87 555 4444', doc: '555444333C', licensePlate: 'LMN-456-MC', type: 'Carrinha', status: 'Suspenso' },
    { id: 'DRV-004', name: 'Ana Macamo', phone: '+258 84 111 2222', doc: '111222333A', licensePlate: 'QWE-789-MC', type: 'Mota', status: 'Inativo' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">Gestão de Motoristas e Entregadores</h2>
          <span className="text-muted small">Controle de frota, aprovações e bloqueios</span>
        </div>
        <button className="btn bg-primary-custom text-white">
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Novo Motorista
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Nome / Tipo</th>
                  <th className="border-0 text-muted py-3">Telefone</th>
                  <th className="border-0 text-muted py-3">Documento (BI)</th>
                  <th className="border-0 text-muted py-3">Matrícula</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-light rounded-circle p-2 me-3 text-primary-custom">
                          <FontAwesomeIcon icon={driver.type === 'Mota' ? faMotorcycle : faCar} />
                        </div>
                        <div>
                          <div className="fw-bold">{driver.name}</div>
                          <small className="text-muted">{driver.type} • {driver.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{driver.phone}</td>
                    <td>{driver.doc}</td>
                    <td className="fw-bold">{driver.licensePlate}</td>
                    <td>
                      <span className={`badge rounded-pill ${
                        driver.status === 'Ativo' ? 'bg-success' : 
                        driver.status === 'Em Viagem' ? 'bg-primary' : 
                        driver.status === 'Suspenso' ? 'bg-danger' : 'bg-secondary'
                      }`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-outline-success me-2" title="Ativar">
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </button>
                      <button className="btn btn-sm btn-outline-secondary me-2" title="Suspender">
                        <FontAwesomeIcon icon={faBan} />
                      </button>
                      <button className="btn btn-sm btn-outline-primary me-2" title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
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
