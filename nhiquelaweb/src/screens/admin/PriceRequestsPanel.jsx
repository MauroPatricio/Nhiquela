import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign, faCheck, faTimes, faClock, faMotorcycle, faSpinner, faHistory } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function PriceRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { requestId, driverName }
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/drivers/price-requests?status=${filter}`);
      setRequests(data.requests || []);
    } catch (err) {
      toast.error('Erro ao carregar pedidos de preço');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (requestId, decision, reason = '') => {
    setProcessing(requestId);
    try {
      await api.put(`/drivers/price-requests/${requestId}/review`, { decision, rejectionReason: reason });
      toast.success(decision === 'APPROVED' ? '✅ Pedido aprovado!' : '❌ Pedido rejeitado');
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
            <FontAwesomeIcon icon={faDollarSign} className="me-2 text-primary-custom" />
            Pedidos de Preço Personalizado
          </h2>
          <span className="text-muted small">Gestão de pedidos de alteração de preço dos motoristas</span>
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
          <FontAwesomeIcon icon={faDollarSign} size="3x" className="text-muted mb-3" />
          <h5 className="text-muted">Nenhum pedido {statusLabel(filter).toLowerCase().replace('🕐 ', '').replace('✅ ', '').replace('❌ ', '')}</h5>
        </div>
      ) : (
        <div className="card border-0 rounded-4 shadow-sm-custom overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Motorista</th>
                  <th className="border-0 text-muted py-3">Preço Atual (MT)</th>
                  <th className="border-0 text-muted py-3">Preço Solicitado (MT)</th>
                  <th className="border-0 text-muted py-3">Data</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3">Info</th>
                  {filter === 'PENDING' && <th className="border-0 text-muted py-3 rounded-end-4">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req._id} className="border-bottom">
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="bg-primary-subtle rounded-circle d-flex justify-content-center align-items-center" style={{ width: 40, height: 40, minWidth: 40 }}>
                          <FontAwesomeIcon icon={faMotorcycle} className="text-primary-custom" />
                        </div>
                        <div>
                          <div className="fw-bold text-dark small">{req.deliverymanId?.name || '—'}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{req.deliverymanId?.deliveryman?.transport_type || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="fw-semibold text-muted">
                        {(req.previousPrice ?? 0).toLocaleString('pt-MZ')} MT
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="fw-bold text-dark">
                        {(req.requestedPrice ?? 0).toLocaleString('pt-MZ')} MT
                      </span>
                    </td>
                    <td className="py-3 text-muted small">
                      {new Date(req.requestedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3">
                      <span className={`badge bg-${statusColor(req.status)}-subtle text-${statusColor(req.status)} rounded-pill px-3 py-2 fw-semibold`}>
                        {statusLabel(req.status)}
                      </span>
                    </td>
                    <td className="py-3">
                      {req.status === 'REJECTED' && req.reason && (
                        <span className="text-danger small" title={req.reason}>
                          ⚠️ {req.reason.length > 30 ? req.reason.slice(0, 30) + '…' : req.reason}
                        </span>
                      )}
                      {req.status === 'APPROVED' && req.reviewedBy && (
                        <span className="text-muted small">Admin: {req.reviewedBy.name}</span>
                      )}
                    </td>
                    {filter === 'PENDING' && (
                      <td className="py-3">
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-success btn-sm rounded-3 fw-semibold px-3"
                            disabled={processing === req._id}
                            onClick={() => handleDecision(req._id, 'APPROVED')}
                          >
                            {processing === req._id ? <FontAwesomeIcon icon={faSpinner} spin /> : <><FontAwesomeIcon icon={faCheck} className="me-1" />Aprovar</>}
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm rounded-3 fw-semibold px-3"
                            disabled={processing === req._id}
                            onClick={() => { setRejectModal({ requestId: req._id, driverName: req.deliverymanId?.name }); setRejectionReason(''); }}
                          >
                            <FontAwesomeIcon icon={faTimes} className="me-1" />Rejeitar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal && (
        <div className="modal d-flex align-items-center justify-content-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="card border-0 rounded-4 shadow p-4" style={{ maxWidth: 480, width: '100%' }}>
            <h5 className="fw-bold mb-1">❌ Rejeitar Pedido</h5>
            <p className="text-muted small mb-3">Motorista: <strong>{rejectModal.driverName}</strong></p>
            <label className="form-label fw-semibold">Motivo da Rejeição <span className="text-danger">*</span></label>
            <textarea
              className="form-control rounded-3 mb-3"
              rows={3}
              placeholder="Ex: Preço muito acima da média do mercado..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-light rounded-3" onClick={() => setRejectModal(null)}>Cancelar</button>
              <button
                className="btn btn-danger rounded-3 fw-semibold"
                disabled={!rejectionReason.trim() || processing}
                onClick={() => handleDecision(rejectModal.requestId, 'REJECTED', rejectionReason)}
              >
                {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
