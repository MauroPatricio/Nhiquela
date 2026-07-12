import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faCheckCircle, faTimes, faSearch, faEye, faPlus, faTrash, faRobot, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api, { SOCKET_URL } from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function DocumentOrdersValidationScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [validationItems, setValidationItems] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingDriversCount, setPendingDriversCount] = useState(0);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentOrders,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(orders, 10, ['serviceType', 'status', 'user.name']);

  useEffect(() => {
    fetchOrders();
    fetchPendingDrivers();
  }, []);

  const fetchPendingDrivers = async () => {
    try {
      const { data } = await api.get('/drivers');
      const pending = (data.drivers || []).filter(d => !d.status || d.status === 'Pendente');
      setPendingDriversCount(pending.length);
    } catch (error) {
      console.log('Erro ao carregar motoristas pendentes');
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/document-order');
      // Filter only those that need validation or are being validated by current operator
      const pending = data.filter(o => o.status === 'Pendente de Validação' || o.status === 'Em Validação');
      setOrders(pending);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const openValidation = (order) => {
    setSelectedOrder(order);
    setValidationItems(order.validationItems && order.validationItems.length > 0 
      ? order.validationItems 
      : [{ originalItemName: '', productName: '', quantity: 1, unitPrice: 0, availability: 'available', notes: '' }]
    );
    setShowValidationModal(true);
  };

  const closeValidation = () => {
    setShowValidationModal(false);
    setSelectedOrder(null);
  };

  const handleAddItem = () => {
    setValidationItems([...validationItems, { originalItemName: '', productName: '', quantity: 1, unitPrice: 0, availability: 'available', notes: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...validationItems];
    newItems.splice(index, 1);
    setValidationItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...validationItems];
    newItems[index][field] = value;
    setValidationItems(newItems);
  };

  const handleSaveValidation = async () => {
    // Basic validation
    for (let i=0; i<validationItems.length; i++) {
        if (!validationItems[i].productName) return toast.error(`O item ${i+1} precisa de um nome válido.`);
    }

    try {
      await api.put(`/document-order/${selectedOrder._id}/validate`, {
        validationItems
      });
      toast.success('Pedido validado com sucesso. O cliente será notificado para pagar.');
      fetchOrders();
      closeValidation();
    } catch (error) {
      toast.error('Erro ao submeter validação');
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Validação de Documentos</h2>
          <span className="text-muted small">Receitas e Listas de Compras a aguardar análise do Operador</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {pendingDriversCount > 0 && (
        <div className="alert bg-warning bg-opacity-10 border border-warning rounded-4 mb-4 d-flex justify-content-between align-items-center shadow-sm">
          <div>
            <h6 className="fw-bold text-dark mb-1"><FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2" /> Validação de Contas de Motoristas</h6>
            <span className="text-muted small">Existem <strong>{pendingDriversCount}</strong> motoristas com documentos enviados através da aplicação a aguardar a sua aprovação.</span>
          </div>
          <a href="/admin/drivers" className="btn btn-warning fw-bold text-dark rounded-pill px-4 shadow-sm">
            Validar Motoristas
          </a>
        </div>
      )}

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">ID Pedido / Data</th>
                  <th className="border-0 text-muted py-3">Cliente</th>
                  <th className="border-0 text-muted py-3">Tipo</th>
                  <th className="border-0 text-muted py-3">Estabelecimento Desejado</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">A carregar...</td>
                  </tr>
                ) : currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">Sem pedidos pendentes. Excelente trabalho! ??</td>
                  </tr>
                ) : currentOrders.map(order => (
                  <tr key={order._id}>
                    <td className="px-4">
                      <span className="fw-bold text-dark d-block">#{order._id.substring(order._id.length - 6)}</span>
                      <span className="text-muted small">{new Date(order.createdAt).toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="fw-bold">{order.user?.name || 'Desconhecido'}</span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {order.serviceType === 'prescription' ? 'Receita Médica' : order.serviceType === 'shopping_list' ? 'Lista de Compras' : 'Especial'}
                      </span>
                    </td>
                    <td>
                      {order.autoAssignEstablishment ? (
                        <span className="badge bg-primary-subtle text-primary-custom">Automático</span>
                      ) : (
                        <span className="fw-bold">{order.preferredEstablishment?.seller?.name || order.preferredEstablishment?.name || '-'}</span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-warning text-dark">{order.status}</span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm bg-primary-custom text-white rounded-pill px-3 shadow-sm transition-all hover-transform" onClick={() => openValidation(order)}>
                        <FontAwesomeIcon icon={faEye} className="me-2" />
                        Validar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls 
            currentPage={currentPage} totalPages={totalPages} 
            onNext={nextPage} onPrev={prevPage} 
            totalItems={totalItems} indexOfFirstItem={indexOfFirstItem} indexOfLastItem={indexOfLastItem}
          />
        </div>
      </div>

      {/* Full-Screen Validation Split View */}
      {showValidationModal && selectedOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-light" style={{ zIndex: 1060, overflowY: 'hidden' }}>
          
          {/* Header */}
          <div className="bg-white shadow-sm p-3 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold m-0 text-dark">Validação de Pedido #{selectedOrder._id.substring(selectedOrder._id.length - 6)}</h5>
              <span className="text-muted small">Cliente: {selectedOrder.user?.name} | Tipo: {selectedOrder.serviceType}</span>
            </div>
            <button className="btn btn-light rounded-circle text-muted" onClick={closeValidation} style={{ width: '40px', height: '40px' }}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Split View Content */}
          <div className="row g-0 h-100">
            {/* Left Side: Document Viewer */}
            <div className="col-md-6 h-100 border-end position-relative" style={{ backgroundColor: '#e9ecef', overflowY: 'auto' }}>
                <div className="p-3">
                  <span className="badge bg-dark mb-2">Documento Anexado</span>
                  {selectedOrder.documentPath ? (
                    selectedOrder.documentPath.endsWith('.pdf') ? (
                        <iframe src={`${SOCKET_URL}/${selectedOrder.documentPath.replace('\\', '/')}`} width="100%" height="800px" title="Documento" className="rounded shadow-sm border-0" />
                    ) : (
                        <img src={`${SOCKET_URL}/${selectedOrder.documentPath.replace('\\', '/')}`} alt="Documento" className="img-fluid rounded shadow-sm" />
                    )
                  ) : (
                      <div className="text-center p-5 text-muted">
                          <FontAwesomeIcon icon={faFileAlt} size="3x" className="mb-3" />
                          <p>Nenhum documento anexado.</p>
                      </div>
                  )}
                </div>
            </div>

            {/* Right Side: Cart Builder */}
            <div className="col-md-6 h-100 bg-white" style={{ overflowY: 'auto', paddingBottom: '100px' }}>
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold text-dark m-0">Construção do Carrinho</h5>
                  <button className="btn btn-outline-primary btn-sm rounded-pill" onClick={handleAddItem}>
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Adicionar Item Manual
                  </button>
                </div>

                {/* AI / OCR Placeholder Box */}
                {selectedOrder.extractedData && (
                  <div className="alert alert-info border-0 rounded-4 mb-4 d-flex align-items-start">
                    <FontAwesomeIcon icon={faRobot} className="me-3 mt-1 fs-5" />
                    <div>
                      <strong>Sugestão da IA (OCR):</strong> A inteligência artificial encontrou potenciais items neste documento.
                      <button className="btn btn-sm btn-info text-white d-block mt-2 rounded-pill">Preencher Automaticamente</button>
                    </div>
                  </div>
                )}

                {validationItems.map((item, index) => (
                  <div key={index} className="card shadow-sm border-0 rounded-3 mb-3 bg-light">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="fw-bold small text-muted">Item #{index + 1}</span>
                        <button className="btn btn-sm text-danger p-0" onClick={() => handleRemoveItem(index)}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                      
                      <div className="row g-2 mb-2">
                        <div className="col-md-6">
                          <label className="form-label small text-muted mb-1">Nome Escrito no Doc.</label>
                          <input type="text" className="form-control form-control-sm border-0" value={item.originalItemName} onChange={(e) => handleItemChange(index, 'originalItemName', e.target.value)} placeholder="Ex: Paracetamol 500mg" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small text-muted mb-1">Nome Finalizado (Sistema)</label>
                          <input type="text" className="form-control form-control-sm border-0" value={item.productName} onChange={(e) => handleItemChange(index, 'productName', e.target.value)} placeholder="Nome exato do produto" required />
                        </div>
                      </div>

                      <div className="row g-2 mb-2">
                        <div className="col-md-3">
                          <label className="form-label small text-muted mb-1">Qtd.</label>
                          <input type="number" min="1" className="form-control form-control-sm border-0" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small text-muted mb-1">Preço Unit. (MT)</label>
                          <input type="number" min="0" step="0.01" className="form-control form-control-sm border-0" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="col-md-5">
                          <label className="form-label small text-muted mb-1">Disponibilidade</label>
                          <select className="form-select form-select-sm border-0" value={item.availability} onChange={(e) => handleItemChange(index, 'availability', e.target.value)}>
                            <option value="available">Disponível</option>
                            <option value="substituted">Substituto Sugerido</option>
                            <option value="unavailable">Em Falta</option>
                          </select>
                        </div>
                      </div>

                      {item.availability === 'substituted' && (
                        <div className="mb-2">
                          <label className="form-label small text-muted mb-1 text-warning">Qual o Substituto?</label>
                          <input type="text" className="form-control form-control-sm border-0 border-warning border-start border-3" value={item.substituteProduct || ''} onChange={(e) => handleItemChange(index, 'substituteProduct', e.target.value)} placeholder="Nome do produto substituto" />
                        </div>
                      )}

                      <div>
                        <input type="text" className="form-control form-control-sm border-0 bg-white" value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} placeholder="Notas para o cliente ou Shopper (Opcional)" />
                      </div>
                    </div>
                  </div>
                ))}

                {validationItems.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    <p>O carrinho está vazio. Adicione os itens lendo o documento ao lado.</p>
                  </div>
                )}
                
                {/* Total Preview */}
                <div className="alert bg-primary-subtle border-0 rounded-4 mt-4 d-flex justify-content-between align-items-center">
                    <div>
                        <span className="text-muted d-block small">Subtotal do Carrinho</span>
                        <h4 className="m-0 text-primary-custom fw-bold">
                            {validationItems.reduce((acc, it) => acc + ((it.unitPrice || 0) * (it.quantity || 1)), 0).toFixed(2)} MT
                        </h4>
                    </div>
                    <button className="btn bg-primary-custom text-white px-4 rounded-pill shadow-sm" onClick={handleSaveValidation}>
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        Concluir Validação
                    </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .text-primary-custom { color: #8a2be2 !important; }
        .hover-transform:hover { transform: translateY(-3px); }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
