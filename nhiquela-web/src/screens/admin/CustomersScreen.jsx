import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faBan, faCheckCircle, faEnvelope, faPhone, faCalendarAlt, faShoppingBag, faSpinner, faSearch, faTrash, faUserShield, faEye, faTimes, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers');
      setCustomers(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Não foi possível carregar a lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = customer.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
    const confirmMessage = newStatus === 'Bloqueado' 
      ? `Tem a certeza que deseja BLOQUEAR o cliente ${customer.name}? Ele não poderá fazer mais compras.`
      : `Deseja DESBLOQUEAR o cliente ${customer.name}?`;
      
    if (window.confirm(confirmMessage)) {
      try {
        await api.put(`/customers/${customer._id}`, { status: newStatus });
        setCustomers(customers.map(c => c._id === customer._id ? { ...c, status: newStatus } : c));
        toast.success(`Conta do cliente ${newStatus.toLowerCase()} com sucesso!`);
      } catch (error) {
        toast.error('Erro ao alterar estado do cliente.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza absoluta que deseja eliminar esta conta? Esta ação é irreversível.')) {
      try {
        await api.delete(`/customers/${id}`);
        setCustomers(customers.filter(c => c._id !== id));
        toast.success('Cliente eliminado do sistema.');
      } catch (error) {
        toast.error('Erro ao eliminar cliente.');
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Gestão de Clientes</h2>
          <span className="text-muted small">Controlo de utilizadores da aplicação, histórico e acessos</span>
        </div>
        <div className="position-relative" style={{ width: '300px' }}>
          <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
            <FontAwesomeIcon icon={faSearch} />
          </span>
          <input 
            type="text" 
            className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
            placeholder="Pesquisar por nome ou nº..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Cliente / Contacto</th>
                  <th className="border-0 text-muted py-3">Histórico de Compras</th>
                  <th className="border-0 text-muted py-3">Membro Desde</th>
                  <th className="border-0 text-muted py-3">Estado da Conta</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações Segurança</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-3" />
                      <p className="text-muted m-0 fw-bold">A carregar clientes...</p>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <div className="bg-light d-inline-flex p-4 rounded-circle mb-3 shadow-sm text-primary-custom">
                         <FontAwesomeIcon icon={faUsers} size="2x" />
                      </div>
                      <p className="m-0 fw-bold">Nenhum cliente encontrado.</p>
                    </td>
                  </tr>
                ) : filteredCustomers.map(customer => (
                  <tr key={customer._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="bg-primary-subtle text-primary-custom rounded-circle d-flex justify-content-center align-items-center me-3 shadow-sm fw-bold fs-5" style={{ width: '45px', height: '45px' }}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{customer.name}</div>
                          <div className="text-muted small"><FontAwesomeIcon icon={faPhone} className="me-1" /> {customer.phone}</div>
                          {customer.email && <div className="text-muted small"><FontAwesomeIcon icon={faEnvelope} className="me-1" /> {customer.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="bg-light rounded p-2 me-2 text-dark border"><FontAwesomeIcon icon={faShoppingBag} /></div>
                        <div>
                          <span className="fw-bold fs-5 text-dark">{customer.totalOrders || 0}</span>
                          <span className="text-muted small ms-1">encomendas</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-dark fw-bold"><FontAwesomeIcon icon={faCalendarAlt} className="text-muted me-2" />
                        {new Date(customer.joinedAt || Date.now()).toLocaleDateString('pt-PT')}
                      </div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill px-3 py-2 ${customer.status === 'Ativo' ? 'bg-success-subtle text-success border border-success border-opacity-25' : 'bg-danger-subtle text-danger border border-danger border-opacity-25'}`}>
                        <FontAwesomeIcon icon={customer.status === 'Ativo' ? faCheckCircle : faBan} className="me-1" />
                        {customer.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom rounded-3 shadow-sm me-2 border" onClick={() => setSelectedCustomer(customer)} title="Ver Detalhes">
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button 
                        className={`btn btn-sm me-2 rounded-3 shadow-sm fw-bold ${customer.status === 'Ativo' ? 'btn-outline-danger' : 'btn-success'}`}
                        onClick={() => handleToggleStatus(customer)}
                        title={customer.status === 'Ativo' ? "Bloquear Conta" : "Desbloquear Conta"}
                      >
                        <FontAwesomeIcon icon={customer.status === 'Ativo' ? faBan : faUserShield} className="me-1" />
                        {customer.status === 'Ativo' ? 'Bloquear' : 'Desbloquear'}
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(customer._id)} title="Eliminar Definitivamente">
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

      {/* Modal Ver Detalhes */}
      {selectedCustomer && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">Ficha de Cliente</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedCustomer(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-primary-subtle text-primary-custom rounded-circle d-flex justify-content-center align-items-center me-3 shadow-sm fw-bold fs-3" style={{ width: '80px', height: '80px' }}>
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">{selectedCustomer.name}</h4>
                    <span className={`badge rounded-pill px-3 py-2 ${selectedCustomer.status === 'Ativo' ? 'bg-success-subtle text-success border border-success border-opacity-25' : 'bg-danger-subtle text-danger border border-danger border-opacity-25'}`}>
                      <FontAwesomeIcon icon={selectedCustomer.status === 'Ativo' ? faCheckCircle : faBan} className="me-1" />
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>

                <div className="bg-light rounded-4 p-3 mb-3 border">
                  <div className="d-flex mb-2">
                    <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faPhone} /></div>
                    <div className="fw-bold text-dark">{selectedCustomer.phone}</div>
                  </div>
                  {selectedCustomer.email && (
                    <div className="d-flex mb-2">
                      <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faEnvelope} /></div>
                      <div className="fw-bold text-dark">{selectedCustomer.email}</div>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="d-flex">
                      <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faMapMarkerAlt} /></div>
                      <div className="fw-bold text-dark">{selectedCustomer.address}</div>
                    </div>
                  )}
                </div>

                <div className="row g-2 mb-4">
                  <div className="col-6">
                    <div className="border rounded-3 p-3 text-center bg-white h-100">
                      <div className="text-muted small fw-bold mb-1">Total de Compras</div>
                      <h4 className="fw-bold m-0 text-primary-custom">{selectedCustomer.totalOrders || 0}</h4>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded-3 p-3 text-center bg-white h-100">
                      <div className="text-muted small fw-bold mb-1">Membro Desde</div>
                      <div className="fw-bold m-0 text-dark fs-5">{new Date(selectedCustomer.joinedAt || Date.now()).toLocaleDateString('pt-PT')}</div>
                    </div>
                  </div>
                </div>

                <button type="button" className="btn btn-light w-100 fw-bold border py-2" onClick={() => setSelectedCustomer(null)}>
                  Fechar Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .bg-success-subtle { background-color: #d1e7dd !important; }
        .bg-danger-subtle { background-color: #f8d7da !important; }
        .shadow-sm-custom { box-shadow: 0 4px 20px rgba(0,0,0,0.03) !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
