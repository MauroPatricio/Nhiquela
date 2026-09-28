import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Table, Button, Form, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoice, faSearch, faEye, faTruck, faCheckCircle, faMoneyBillWave, faTruckLoading } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';
import { toast } from 'react-toastify';

export default function ImportOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await api.get('/import/orders');
      setOrders(response.data);
    } catch (err) {
      toast.error('Erro ao buscar ordens de importação.');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/import/orders/${id}/status`, { status: newStatus });
      toast.success('Estado atualizado com sucesso!');
      fetchOrders();
      if (selectedOrder && selectedOrder._id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      toast.error('Erro ao atualizar estado.');
    }
  };

  const handleSendToDelivery = async (id) => {
    try {
      await api.post(`/import/orders/${id}/local-delivery`);
      toast.success('Enviado para a frota local Nhiquela Delivery!');
      fetchOrders();
    } catch (err) {
      toast.error('Erro ao enviar para entrega.');
    }
  };

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleRegisterPayment = async () => {
    if (!paymentAmount || isNaN(paymentAmount)) return toast.error('Valor inválido');
    
    try {
      // Simplification: updating payment status directly for demonstration
      await api.put(`/import/orders/${selectedOrder._id}/status`, { 
        paymentStatus: 'PAID',
        status: 'PROCESSING'
      });
      toast.success('Pagamento registado com sucesso!');
      setPaymentAmount('');
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      toast.error('Erro ao registar pagamento.');
    }
  };

  const filteredOrders = orders.filter(o => 
    (o.customerId?.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (o.quotationId?.requestId?.productName || '').toLowerCase().includes(search.toLowerCase()) ||
    o._id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PENDING':
      case 'PAYMENT_PENDING': return <Badge bg="warning" text="dark">Pendente Pagamento</Badge>;
      case 'PAYMENT_CONFIRMED': return <Badge bg="success">Pago</Badge>;
      case 'PURCHASE_PENDING': return <Badge bg="info">Por Comprar</Badge>;
      case 'PURCHASED': return <Badge bg="primary">Comprado na Origem</Badge>;
      case 'SHIPPED': 
      case 'IN_TRANSIT': return <Badge bg="secondary">Em Trânsito Internacional</Badge>;
      case 'ARRIVED_MOZAMBIQUE':
      case 'ARRIVED_AT_CUSTOMS':
      case 'CUSTOMS': return <Badge bg="warning" text="dark">Na Alfândega</Badge>;
      case 'READY_FOR_DELIVERY': return <Badge bg="info">Pronto a Entregar</Badge>;
      case 'IN_DELIVERY': return <Badge bg="primary">Em Entrega Local</Badge>;
      case 'DELIVERED': return <Badge bg="success">Entregue</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
            <FontAwesomeIcon icon={faFileInvoice} className="text-primary-custom me-2" />
            Ordens de Importação
          </h2>
          <p className="text-muted mb-0">Monitorização e acompanhamento de compras internacionais e transporte.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Header className="bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">Ordens Activas</h5>
          <div className="position-relative" style={{ width: '300px' }}>
            <FontAwesomeIcon icon={faSearch} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <Form.Control 
              type="text" 
              placeholder="Pesquisar cliente ou produto..." 
              className="rounded-pill border-light ps-5 shadow-sm bg-light"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card.Header>
        <Card.Body className="px-4 pb-4">
          <div className="table-responsive mt-3">
            <Table hover className="align-middle border-bottom border-light">
              <thead className="table-light text-muted">
                <tr>
                  <th className="fw-semibold border-0 rounded-start">ID Ordem</th>
                  <th className="fw-semibold border-0">Cliente</th>
                  <th className="fw-semibold border-0">Produto</th>
                  <th className="fw-semibold border-0">Pagamento</th>
                  <th className="fw-semibold border-0">Estado</th>
                  <th className="fw-semibold border-0 text-end rounded-end">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      Nenhuma ordem de importação encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o._id}>
                      <td className="fw-bold text-dark">
                        {o._id.substring(o._id.length - 8).toUpperCase()}
                      </td>
                      <td className="text-muted">
                        <div className="fw-medium text-dark">{o.customerId?.name || 'Sem nome'}</div>
                        <div className="small">{o.customerId?.phone || ''}</div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{o.quotationId?.requestId?.productName || 'N/A'}</div>
                        <div className="small text-muted">{o.quotationId?.totalFinalCost || 0} MZN</div>
                      </td>
                      <td>
                         <Badge bg={o.paymentStatus === 'PAID' ? 'success' : 'warning'} className="px-3 py-2 rounded-pill shadow-sm bg-opacity-75">
                          {o.paymentStatus === 'PAID' ? 'Pago' : o.paymentStatus === 'PENDING_VERIFICATION' ? 'Em Verificação' : 'Pendente'}
                        </Badge>
                      </td>
                      <td>
                        {getStatusBadge(o.status)}
                      </td>
                      <td className="text-end">
                        <Button variant="light" size="sm" className="rounded-circle text-primary shadow-sm me-2" style={{ width: '35px', height: '35px' }} title="Ver Detalhes" onClick={() => handleOpenDetails(o)}>
                          <FontAwesomeIcon icon={faEye} />
                        </Button>
                        {o.status === 'READY_FOR_DELIVERY' && (
                          <Button variant="light" size="sm" className="rounded-circle text-info shadow-sm me-2" style={{ width: '35px', height: '35px' }} title="Enviar para Frota Local (Nhiquela Delivery)" onClick={() => handleSendToDelivery(o._id)}>
                            <FontAwesomeIcon icon={faTruckLoading} />
                          </Button>
                        )}
                        <Form.Select 
                          size="sm" 
                          value={o.status} 
                          onChange={(e) => handleUpdateStatus(o._id, e.target.value)}
                          className="d-inline-block w-auto rounded-pill border-light bg-light small fw-bold"
                          style={{ fontSize: '12px' }}
                        >
                          <option value="PAYMENT_PENDING">Pendente Pagamento</option>
                          <option value="PURCHASED">Comprado na Origem</option>
                          <option value="SHIPPED">Em Trânsito</option>
                          <option value="ARRIVED_AT_CUSTOMS">Na Alfândega</option>
                          <option value="READY_FOR_DELIVERY">Pronto p/ Entrega</option>
                          <option value="IN_DELIVERY">Em Entrega Local</option>
                          <option value="DELIVERED">Entregue</option>
                        </Form.Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">Detalhes da Ordem de Importação</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {selectedOrder && (
            <>
              <div className="d-flex justify-content-between mb-4">
                <div>
                  <h6 className="text-muted mb-1">ID da Ordem</h6>
                  <h4 className="fw-bold" style={{ color: '#8a2be2' }}>{selectedOrder._id.substring(selectedOrder._id.length - 8).toUpperCase()}</h4>
                </div>
                <div className="text-end">
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>
              
              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <h6 className="fw-bold mb-3">Cliente</h6>
                    <p className="mb-1"><span className="text-muted">Nome:</span> {selectedOrder.customerId?.name || 'N/A'}</p>
                    <p className="mb-1"><span className="text-muted">Telefone:</span> {selectedOrder.customerId?.phone || 'N/A'}</p>
                    <p className="mb-0"><span className="text-muted">Email:</span> {selectedOrder.customerId?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <h6 className="fw-bold mb-3">Produto</h6>
                    <p className="mb-1"><span className="text-muted">Nome:</span> {selectedOrder.quotationId?.requestId?.productName || 'N/A'}</p>
                    <p className="mb-1"><span className="text-muted">Quantidade:</span> {selectedOrder.quotationId?.requestId?.quantity || 1}</p>
                    <p className="mb-0"><span className="text-muted">Total Final:</span> <span className="fw-bold text-success">{selectedOrder.quotationId?.totalFinalCost} MZN</span></p>
                    {selectedOrder.quotationId?.requestId?.productImage && (
                      <div className="mt-2 pt-2 border-top">
                        <span className="text-muted small fw-bold d-block mb-1">Imagem do Produto:</span>
                        <img 
                          src={selectedOrder.quotationId.requestId.productImage.startsWith('http') 
                            ? selectedOrder.quotationId.requestId.productImage 
                            : `${api.defaults.baseURL.replace('/api', '')}${selectedOrder.quotationId.requestId.productImage}`} 
                          alt="Produto" 
                          className="img-fluid rounded border bg-white p-1" 
                          style={{ maxHeight: '100px', objectFit: 'contain' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-light p-3 rounded-3">
                <h6 className="fw-bold mb-3"><FontAwesomeIcon icon={faMoneyBillWave} className="me-2 text-success" /> Dados de Pagamento</h6>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <p className="mb-1"><span className="text-muted">Estado Actual:</span> <Badge bg={selectedOrder.paymentStatus === 'PAID' ? 'success' : 'warning'}>{selectedOrder.paymentStatus}</Badge></p>
                    <p className="mb-0"><span className="text-muted">Valor Total da Ordem:</span> {selectedOrder.quotationId?.totalFinalCost} MZN</p>
                  </div>
                </div>

                {selectedOrder.paymentProof && (
                  <div className="mb-3 bg-white p-2 rounded border">
                    <p className="text-muted small fw-bold mb-2">Comprovativo Anexado pelo Cliente:</p>
                    <img 
                      src={selectedOrder.paymentProof.startsWith('http') ? selectedOrder.paymentProof : `${api.defaults.baseURL.replace('/api', '')}${selectedOrder.paymentProof}`} 
                      alt="Comprovativo de Pagamento" 
                      className="img-fluid rounded"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                    <div className="mt-2 text-end">
                      <a href={selectedOrder.paymentProof.startsWith('http') ? selectedOrder.paymentProof : `${api.defaults.baseURL.replace('/api', '')}${selectedOrder.paymentProof}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">Abrir em Nova Aba</a>
                    </div>
                  </div>
                )}
                
                {selectedOrder.paymentStatus !== 'PAID' && (
                  <div className="d-flex gap-2">
                    <Form.Control type="number" placeholder="Valor recebido" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    <Button variant="success" className="px-4 fw-bold" onClick={handleRegisterPayment}>Registar</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={() => setShowModal(false)} className="rounded-pill px-4 fw-bold">Fechar</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .text-primary-custom { color: #8a2be2 !important; }
      `}</style>
    </Container>
  );
}
