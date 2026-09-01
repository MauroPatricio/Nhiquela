import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faCheck, faTimes, faSpinner, faHistory, faMotorcycle, faLockOpen } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function DocRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { requestId, driverName }
  const [rejectionReason, setRejectionReason] = useState('');
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    fetchRequests();
    fetchSubcategories();
  }, [filter]);

  const fetchSubcategories = async () => {
    try {
      const { data } = await api.get('/provider-subcategories');
      setSubcategories(data);
    } catch (err) {
      console.error('Erro ao carregar subcategorias', err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/drivers/doc-update-requests?status=${filter}`);
      setRequests(data.requests || []);
    } catch (err) {
      toast.error('Erro ao carregar pedidos de atualização de documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (requestId, decision, reason = '') => {
    setProcessing(requestId);
    try {
      await api.put(`/drivers/doc-update-requests/${requestId}/review`, { decision, rejectionReason: reason });
      toast.success(decision === 'APPROVED' ? '✅ Permissão Concedida!' : '❌ Pedido rejeitado');
      setRejectModal(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao processar pedido');
    } finally {
      setProcessing(null);
    }
  };

  const statusColor = (s) => ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }[s] || 'secondary');
  const statusLabel = (s) => ({ PENDING: '🕐 Pendente', APPROVED: '✅ Aprovado', REJECTED: '❌ Rejeitado' }[s] || s);

  return (
    <div className="animation-fade-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold m-0 text-dark">
            <FontAwesomeIcon icon={faFileAlt} className="me-2 text-primary-custom" />
            Pedidos de Atualização de Documentos
          </h2>
          <span className="text-muted small">Gestão de permissões para motoristas atualizarem a sua documentação e fotos</span>
        </div>
        <button className="btn btn-outline-primary rounded-3" onClick={fetchRequests}>
          <FontAwesomeIcon icon={faHistory} className="me-2" />Atualizar
        </button>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
          <li key={s} className="nav-item">
            <button
              className={`nav-link ${filter === s ? 'active' : 'text-muted'}`}
              style={filter === s ? { background: 'var(--primary-color)' } : {}}
              onClick={() => setFilter(s)}
            >
              {statusLabel(s)}
              {s === 'PENDING' && requests.length > 0 && filter === 'PENDING' && (
                <span className="badge bg-danger ms-2">{requests.length}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="text-center py-5">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom" />
          <p className="mt-3 text-muted">A carregar pedidos...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="card border-0 rounded-4 shadow-sm-custom text-center p-5">
          <FontAwesomeIcon icon={faFileAlt} size="3x" className="text-muted mb-3" />
          <h5 className="text-muted">Nenhum pedido {statusLabel(filter).toLowerCase().replace('🕐 ', '').replace('✅ ', '').replace('❌ ', '')}</h5>
        </div>
      ) : (
        <div className="card border-0 rounded-4 shadow-sm-custom overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Motorista</th>
                  <th className="border-0 text-muted py-3">Tipo de Veículo</th>
                  <th className="border-0 text-muted py-3">Data do Pedido</th>
                  {filter !== 'PENDING' && <th className="border-0 text-muted py-3">Decisão Por</th>}
                  {filter === 'PENDING' && <th className="border-0 text-muted py-3 text-end px-4">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req._id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-light rounded-circle p-2 me-3">
                          <FontAwesomeIcon icon={faMotorcycle} className="text-primary-custom" />
                        </div>
                        <div>
                          <h6 className="m-0 fw-bold">{req.deliverymanId?.name || 'Desconhecido'}</h6>
                          <small className="text-muted">{req.deliverymanId?.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {req.type === 'profile_update' ? (
                        <>
                          <span className="badge bg-warning text-dark border me-2">Mudança de Serviço</span>
                          <div className="small mt-1 text-muted">
                            Novo Serviço: <strong>{subcategories.find(s => s._id === req.updatedFields?.transport_type)?.name || req.updatedFields?.transport_type || 'N/D'}</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="badge bg-light text-dark border">
                            {subcategories.find(s => s._id === req.deliverymanId?.deliveryman?.transport_type)?.name || req.deliverymanId?.deliveryman?.transport_type || 'N/D'}
                          </span>
                          <div className="small mt-1 text-muted">Acesso a Documentos</div>
                        </>
                      )}
                    </td>
                    <td className="text-muted small">
                      {new Date(req.requestedAt).toLocaleString('pt-MZ')}
                    </td>
                    {filter !== 'PENDING' && (
                      <td className="text-muted small">
                        {req.reviewedBy?.name || 'Admin'}
                        <div className="d-block text-danger mt-1">{req.reason}</div>
                      </td>
                    )}
                    {filter === 'PENDING' && (
                      <td className="text-end px-4">
                        <button 
                          className="btn btn-success btn-sm rounded-3 me-2 px-3"
                          onClick={() => handleDecision(req._id, 'APPROVED')}
                          disabled={processing === req._id}
                        >
                          {processing === req._id ? <FontAwesomeIcon icon={faSpinner} spin /> : (
                            req.type === 'profile_update' ? <><FontAwesomeIcon icon={faMotorcycle} className="me-1" /> Aprovar Mudança</> : <><FontAwesomeIcon icon={faLockOpen} className="me-1" /> Permitir Edição</>
                          )}
                        </button>
                        <button 
                          className="btn btn-outline-danger btn-sm rounded-3 px-3"
                          onClick={() => setRejectModal({ requestId: req._id, driverName: req.deliverymanId?.name })}
                          disabled={processing === req._id}
                        >
                          <FontAwesomeIcon icon={faTimes} /> Rejeitar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg">
                <div className="modal-header border-0 bg-light rounded-top-4 pb-0">
                  <h5 className="modal-title fw-bold text-danger">Rejeitar Pedido</h5>
                  <button type="button" className="btn-close" onClick={() => setRejectModal(null)}></button>
                </div>
                <div className="modal-body pt-3">
                  <p className="text-muted">Indique o motivo da rejeição para o pedido de <strong>{rejectModal.driverName}</strong>.</p>
                  <textarea 
                    className="form-control rounded-3 bg-light"
                    rows="3"
                    placeholder="Ex: Não cumpre os requisitos de tempo na plataforma."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  ></textarea>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light rounded-3" onClick={() => setRejectModal(null)}>
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger rounded-3"
                    onClick={() => handleDecision(rejectModal.requestId, 'REJECTED', rejectionReason)}
                    disabled={!rejectionReason.trim()}
                  >
                    Confirmar Rejeição
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
