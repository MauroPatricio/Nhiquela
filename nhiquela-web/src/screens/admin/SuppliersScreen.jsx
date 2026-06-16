import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faBan, faEdit, faSpinner, faBuilding } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/users');
      // Filtra os utilizadores para mostrar apenas os que têm "isSeller" (Vendedores/Fornecedores)
      const sellerUsers = data.filter(user => user.isSeller);
      setSuppliers(sellerUsers);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0">Fornecedores Conectados (MongoDB)</h2>
        <span className="text-muted small">Gestão de aprovação de estabelecimentos e vendedores cadastrados</span>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Estabelecimento / Email</th>
                  <th className="border-0 text-muted py-3">Telefone</th>
                  <th className="border-0 text-muted py-3">Endereço (Província)</th>
                  <th className="border-0 text-muted py-3">Estado da Loja</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-2" />
                      <p className="text-muted m-0">Carregando usuários do MongoDB...</p>
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">Nenhum fornecedor encontrado no banco.</td>
                  </tr>
                ) : suppliers.map(supplier => (
                  <tr key={supplier._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center">
                        {supplier.seller && supplier.seller.logo ? (
                          <img src={supplier.seller.logo} alt="Logo" className="rounded-circle me-3" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                        ) : (
                          <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 text-primary-custom" style={{ width: '40px', height: '40px' }}>
                            <FontAwesomeIcon icon={faBuilding} />
                          </div>
                        )}
                        <div>
                          <div className="fw-bold">{supplier.seller?.name || supplier.name}</div>
                          <small className="text-muted">{supplier.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{supplier.seller?.phoneNumberAccount || supplier.phoneNumber}</td>
                    <td>{supplier.seller?.province || 'Não informado'}</td>
                    <td>
                      <span className={`badge rounded-pill ${
                        supplier.isSeller ? 'bg-success' : 'bg-warning text-dark'
                      }`}>
                        {supplier.isSeller ? 'Ativo' : 'Pendente'}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-outline-success me-2" title="Aprovar/Ativar">
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </button>
                      <button className="btn btn-sm btn-outline-secondary me-2" title="Suspender">
                        <FontAwesomeIcon icon={faBan} />
                      </button>
                      <button className="btn btn-sm btn-outline-primary" title="Editar Informações">
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
