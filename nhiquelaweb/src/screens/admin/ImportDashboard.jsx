import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faBoxOpen, faPlane, faFileInvoiceDollar, faCheckCircle, faShippingFast, faEye, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import api, { SOCKET_URL } from '../../api';
import { toast } from 'react-toastify';

export default function ImportDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState({ productCost: '', freight: '', customs: '', eta: '', arrivalDate: '', validUntil: '' });
  const [currentQuotation, setCurrentQuotation] = useState(null);
  const [commissionRate, setCommissionRate] = useState(15);

  const totalBaseCost = (parseFloat(quoteDetails.productCost) || 0) + (parseFloat(quoteDetails.freight) || 0) + (parseFloat(quoteDetails.customs) || 0);
  const margin = totalBaseCost * ((parseFloat(commissionRate) || 0) / 100);
  const finalPrice = totalBaseCost + margin;
  const isQuotationAccepted = currentQuotation?.status === 'ACCEPTED' || (selectedReq && ['ACCEPTED', 'PAYMENT_CONFIRMED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedReq.status));

  const stats = {
    sourcing: requests.filter(r => ['REQUESTED', 'UNDER_REVIEW', 'SOURCING'].includes(r.status)).length || 0,
    pendentes: requests.filter(r => ['QUOTATION_READY', 'QUOTATION_SENT'].includes(r.status)).length || 0,
    pagas: requests.filter(r => ['ACCEPTED', 'PROCESSING', 'SHIPPED'].includes(r.status)).length || 0,
    emTransito: requests.filter(r => ['SHIPPED', 'ARRIVED_AT_CUSTOMS', 'CUSTOMS_CLEARED'].includes(r.status)).length || 0
  };

  const fetchRequests = async () => {
    try {
      const response = await api.get('/import/requests');
      setRequests(response.data);
    } catch (err) {
      toast.error('Erro ao buscar pedidos de importação.');
    }
  };

  useEffect(() => {
    fetchRequests();

    const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });

    socket.on('import_request_updated', (data) => {
      if (data.status === 'ACCEPTED') {
        toast.success('Cotação aceite pelo cliente!');
      } else if (data.status === 'REJECTED') {
        toast.warning('Cotação rejeitada pelo cliente.');
      }
      fetchRequests();
    });

    socket.on('import_request_created', (data) => {
      toast.info('Novo pedido de importação recebido: ' + (data.productName || ''));
      fetchRequests();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este pedido?')) {
      try {
        await api.delete('/import/requests/' + id);
        toast.success('Pedido removido com sucesso!');
        fetchRequests();
      } catch (err) {
        toast.error('Erro ao remover pedido.');
      }
    }
  };

  const handleShowDetails = async (req) => {
    setSelectedReq(req);
    setCurrentQuotation(null);
    setShowQuotationForm(false);
    setQuoteDetails({ productCost: '', freight: '', customs: '', eta: '', arrivalDate: '', validUntil: '' });
    setShowModal(true);

    try {
      const res = await api.get('/import/quotations/request/' + req._id);
      if (res.data) {
        setCurrentQuotation(res.data);
        setQuoteDetails({
          productCost: res.data.productCost || '',
          freight: res.data.internationalShipping || '',
          customs: res.data.customsEstimated || '',
          eta: res.data.estimatedDeliveryDays || '',
          arrivalDate: res.data.estimatedArrivalDate ? new Date(res.data.estimatedArrivalDate).toISOString().split('T')[0] : '',
          validUntil: res.data.quotationValidUntil ? new Date(res.data.quotationValidUntil).toISOString().split('T')[0] : '',
        });
      }
    } catch (err) {
      // 404 means no quotation exists yet
    }
  };

  const getStepIndex = (status) => {
    const s = (status || '').toUpperCase();
    if (['REQUESTED', 'UNDER_REVIEW', 'SOURCING'].includes(s)) return 0;
    if (['QUOTATION_READY', 'QUOTATION_SENT', 'SENT'].includes(s)) return 1;
    if (['ACCEPTED', 'PAYMENT_CONFIRMED', 'PAID'].includes(s)) return 2;
    if (['PURCHASED', 'PROCESSING'].includes(s)) return 3;
    if (['SHIPPED', 'IN_TRANSIT'].includes(s)) return 4;
    if (['ARRIVED_AT_CUSTOMS', 'CUSTOMS_CLEARANCE', 'CUSTOMS_CLEARED', 'RELEASED'].includes(s)) return 5;
    if (['READY_FOR_DELIVERY', 'IN_DELIVERY'].includes(s)) return 6;
    if (['DELIVERED'].includes(s)) return 7;
    return 0;
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedReq) return;
    try {
      await api.put('/import/requests/' + selectedReq._id + '/status', { status: newStatus });
      toast.success('Estado atualizado com sucesso!');
      setSelectedReq({ ...selectedReq, status: newStatus });
      fetchRequests();
    } catch (err) {
      toast.error('Erro ao atualizar estado do pedido.');
    }
  };

  const handleSubmitQuotation = async () => {
    if (isQuotationAccepted) {
      toast.warning('Não é possível editar uma cotação que já foi aceite pelo cliente.');
      return;
    }

    try {
      const payload = {
        requestId: selectedReq._id,
        productCost: parseFloat(quoteDetails.productCost) || 0,
        internationalShipping: parseFloat(quoteDetails.freight) || 0,
        customsEstimated: parseFloat(quoteDetails.customs) || 0,
        estimatedDeliveryDays: parseInt(quoteDetails.eta) || 7,
        estimatedArrivalDate: quoteDetails.arrivalDate || undefined,
        quotationValidUntil: quoteDetails.validUntil || undefined
      };

      if (currentQuotation) {
        await api.put('/import/quotations/' + currentQuotation._id, payload);
        toast.success('Cotação atualizada com sucesso!');
      } else {
        const res = await api.post('/import/quotations', payload);
        setCurrentQuotation(res.data);
        toast.success('Cotação criada e enviada com sucesso!');
      }
      fetchRequests();
      setShowQuotationForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao guardar cotação.');
    }
  };

  return (
    <Container fluid className="py-4 px-md-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Módulo de Importação & Sourcing 📦</h4>
          <p className="text-muted small mb-0">Gestão global de compras na China, Emirados e envio internacional</p>
        </div>
        <Button variant="primary" className="rounded-pill px-4 shadow-sm bg-primary-custom border-0" onClick={() => navigate('/admin/import/orders')}>
          <FontAwesomeIcon icon={faBoxOpen} className="me-2" />
          Ver Ordens de Compra
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 hover-card bg-white">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle p-3 bg-light text-primary me-3">
                <FontAwesomeIcon icon={faGlobe} size="lg" />
              </div>
              <div>
                <h6 className="text-muted small mb-1 fw-bold">Pedidos em Sourcing</h6>
                <h4 className="fw-bold mb-0 text-dark">{stats.sourcing}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 hover-card bg-white">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle p-3 bg-light text-warning me-3">
                <FontAwesomeIcon icon={faFileInvoiceDollar} size="lg" />
              </div>
              <div>
                <h6 className="text-muted small mb-1 fw-bold">Cotações Pendentes</h6>
                <h4 className="fw-bold mb-0 text-dark">{stats.pendentes}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 hover-card bg-white">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle p-3 bg-light text-success me-3">
                <FontAwesomeIcon icon={faCheckCircle} size="lg" />
              </div>
              <div>
                <h6 className="text-muted small mb-1 fw-bold">Cotações Aceites / Pagas</h6>
                <h4 className="fw-bold mb-0 text-dark">{stats.pagas}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 hover-card bg-white">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle p-3 bg-light text-info me-3">
                <FontAwesomeIcon icon={faShippingFast} size="lg" />
              </div>
              <div>
                <h6 className="text-muted small mb-1 fw-bold">Em Trânsito / Alfândega</h6>
                <h4 className="fw-bold mb-0 text-dark">{stats.emTransito}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0 text-dark">Todos os Pedidos de Importação</h6>
          <Badge bg="light" className="text-dark border px-3 py-2 rounded-pill">
            Total: {requests.length}
          </Badge>
        </Card.Header>

        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">ID / Data</th>
                  <th>Cliente</th>
                  <th>Produto Desejado</th>
                  <th>Origem / Envio</th>
                  <th>Estado</th>
                  <th className="text-end pe-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      Nenhum pedido de importação registado até ao momento.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req._id}>
                      <td className="ps-4">
                        <span className="fw-bold text-dark d-block">
                          NQL-IMP-{req._id.substring(req._id.length - 6).toUpperCase()}
                        </span>
                        <small className="text-muted">
                          {new Date(req.createdAt).toLocaleDateString('pt-PT')}
                        </small>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark d-block">{req.customerId?.name || 'Cliente Geral'}</span>
                        <small className="text-muted">{req.customerId?.email}</small>
                        {(req.customerId?.phoneNumber || req.customerId?.phone) && (
                          <small className="text-muted d-block fw-semibold text-primary">
                            📞 {req.customerId?.phoneNumber || req.customerId?.phone}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className="fw-bold text-dark d-block">{req.productName}</span>
                        <small className="text-muted">Qtd: {req.quantity || 1}</small>
                      </td>
                      <td>
                        <Badge bg="secondary" className="me-1">
                          {req.preferredOriginCountry || 'Qualquer'}
                        </Badge>
                        <Badge bg="info">
                          {req.shippingMethod === 'SEA' ? '🚢 Marítimo' : '✈️ Aéreo'}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={
                          req.status === 'ACCEPTED' ? 'success' :
                          req.status === 'QUOTATION_READY' ? 'warning' :
                          req.status === 'SHIPPED' ? 'info' : 'primary'
                        } className="px-3 py-2 rounded-pill">
                          {req.status}
                        </Badge>
                      </td>
                      <td className="text-end pe-4">
                        <Button variant="light" size="sm" className="me-2 rounded-circle text-primary shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => handleShowDetails(req)}>
                          <FontAwesomeIcon icon={faEye} />
                        </Button>
                        <Button variant="light" size="sm" className="rounded-circle text-danger shadow-sm" style={{ width: '35px', height: '35px' }} onClick={(e) => { e.stopPropagation(); handleDelete(req._id); }}>
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <style>{`
        .hover-card { transition: all 0.3s ease; }
        .hover-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .text-primary-custom { color: #8a2be2 !important; }
      `}</style>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">Detalhes do Pedido</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedReq && (
            <React.Fragment>
              <div className="mb-4 p-3 rounded-4 shadow-sm bg-light border">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0 text-dark">Progresso do Pedido de Importação</h6>
                  <Form.Select 
                    size="sm" 
                    style={{ width: 'auto', fontWeight: 'bold' }}
                    value={selectedReq.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                  >
                    <option value="REQUESTED">1. Pedido Submetido</option>
                    <option value="QUOTATION_READY">2. Cotação Pronta</option>
                    <option value="ACCEPTED">3. Pagamento Aceite</option>
                    <option value="PURCHASED">4. Comprado na Origem</option>
                    <option value="SHIPPED">5. Em Trânsito Internacional</option>
                    <option value="CUSTOMS_CLEARED">6. Alfândega Moçambique</option>
                    <option value="READY_FOR_DELIVERY">7. Pronto para Entrega</option>
                    <option value="DELIVERED">8. Entregue ao Cliente</option>
                    <option value="REJECTED">❌ Rejeitado</option>
                    <option value="CANCELLED">🚫 Cancelado</option>
                  </Form.Select>
                </div>
                
                <div className="d-flex justify-content-between align-items-center position-relative mt-3 px-1">
                  {[
                    { label: 'Pedido', icon: '📝' },
                    { label: 'Cotação', icon: '💵' },
                    { label: 'Pago', icon: '✅' },
                    { label: 'Comprado', icon: '🛍️' },
                    { label: 'Trânsito', icon: '✈️' },
                    { label: 'Alfândega', icon: '🏛️' },
                    { label: 'Entrega', icon: '🚚' },
                    { label: 'Entregue', icon: '🎉' },
                  ].map((step, idx) => {
                    const currentIdx = getStepIndex(selectedReq.status);
                    const isDone = currentIdx > idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <div key={idx} className="text-center" style={{ flex: 1, zIndex: 2 }}>
                        <div 
                          className={`mx-auto rounded-circle d-flex align-items-center justify-content-center shadow-sm ${
                            isDone ? 'bg-success text-white' : isCurrent ? 'bg-primary-custom text-white fw-bold border border-2 border-primary' : 'bg-white text-muted border'
                          }`}
                          style={{ width: '34px', height: '34px', fontSize: '13px', transition: 'all 0.3s' }}
                        >
                          {isDone ? '✓' : step.icon}
                        </div>
                        <span className={`d-block mt-1 ${isCurrent ? 'fw-bold text-primary-custom' : isDone ? 'text-success fw-semibold' : 'text-muted'}`} style={{ fontSize: '10px' }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Row>
                <Col md={12} className="mb-3">
                  <h6 className="text-muted fw-bold mb-1">ID do Pedido</h6>
                  <p className="mb-0 fw-semibold text-primary-custom">NQL-IMP-{selectedReq._id.substring(selectedReq._id.length - 6).toUpperCase()}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted fw-bold mb-1">Cliente</h6>
                  <p className="mb-0 fw-semibold">{selectedReq.customerId?.name || 'Desconhecido'}</p>
                  <p className="text-muted small mb-0">{selectedReq.customerId?.email}</p>
                  {(selectedReq.customerId?.phoneNumber || selectedReq.customerId?.phone) && (
                    <p className="text-muted small mb-0 fw-semibold text-primary mt-1">
                      📞 Telefone / Contacto: {selectedReq.customerId?.phoneNumber || selectedReq.customerId?.phone}
                    </p>
                  )}
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted fw-bold mb-1">Produto Desejado</h6>
                  <p className="mb-0">{selectedReq.productName}</p>
                  <p className="text-muted small mb-0">Qtd: {selectedReq.quantity || 1}</p>
                </Col>
                <Col md={12} className="mb-3">
                  <h6 className="text-muted fw-bold mb-1">Descrição</h6>
                  <p className="mb-0 bg-light p-3 rounded">{selectedReq.description || 'Sem descrição.'}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted fw-bold mb-1">Origem Preferencial</h6>
                  <p className="mb-0"><Badge bg="secondary">{selectedReq.preferredOriginCountry || 'Qualquer'}</Badge></p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted fw-bold mb-1">Tipo de Envio</h6>
                  <p className="mb-0">
                    <Badge bg="info">
                      {selectedReq.shippingMethod === 'SEA' ? '🚢 Marítimo (Barato)' : '✈️ Aéreo (Rápido)'}
                    </Badge>
                  </p>
                </Col>

                {selectedReq.productImage && (
                  <Col md={12} className="mb-3">
                    <h6 className="text-muted fw-bold mb-1">Fotografia de Referência</h6>
                    <div className="bg-light p-2 rounded d-inline-block shadow-sm">
                      <img 
                        src={selectedReq.productImage.startsWith('http') ? selectedReq.productImage : api.defaults.baseURL.replace('/api', '') + selectedReq.productImage} 
                        alt="Referência do Produto" 
                        className="img-fluid rounded" 
                        style={{ maxHeight: '250px', objectFit: 'contain' }}
                      />
                    </div>
                  </Col>
                )}
              </Row>
            </React.Fragment>
          )}

          {isQuotationAccepted && (
            <div className="alert alert-success fw-bold text-center mt-3 shadow-sm mb-0 rounded-4">
              Cotação Aceite / Pago pelo Cliente — Edição Desativada
            </div>
          )}

          {showQuotationForm && (
            <div className="mt-4 p-4 rounded-4 shadow-sm" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
              <h6 className="fw-bold mb-3 text-dark">
                {isQuotationAccepted ? 'Cotação Oficial (Aceite - Modo de Leitura)' : 'Preencher Cotação Oficial'}
              </h6>
              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Custo do Produto (MT)</Form.Label>
                      <Form.Control 
                        type="number" 
                        placeholder="Ex: 1500" 
                        value={quoteDetails.productCost}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, productCost: e.target.value })}
                        disabled={isQuotationAccepted}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Frete Internacional (MT)</Form.Label>
                      <Form.Control 
                        type="number" 
                        placeholder="Ex: 500" 
                        value={quoteDetails.freight}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, freight: e.target.value })}
                        disabled={isQuotationAccepted}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Estimativa Alfândega (MT)</Form.Label>
                      <Form.Control 
                        type="number" 
                        placeholder="Ex: 300" 
                        value={quoteDetails.customs}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, customs: e.target.value })}
                        disabled={isQuotationAccepted}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Prazo Estimado (Dias Úteis)</Form.Label>
                      <Form.Control 
                        type="number" 
                        placeholder="Ex: 15" 
                        value={quoteDetails.eta}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, eta: e.target.value })}
                        disabled={isQuotationAccepted}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Custo Base Total:</span>
                    <span>{totalBaseCost.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Margem Nhiquela ({commissionRate}%):</span>
                    <span>{margin.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold text-primary-custom h6 mb-0 pt-2 border-top">
                    <span>Preço Final para Cliente:</span>
                    <span>{finalPrice.toFixed(2)} MT</span>
                  </div>
                </div>

                {!isQuotationAccepted && (
                  <div className="mt-3 text-end">
                    <Button variant="secondary" size="sm" className="me-2" onClick={() => setShowQuotationForm(false)}>
                      Cancelar
                    </Button>
                    <Button variant="primary" size="sm" className="bg-primary-custom border-0" onClick={handleSubmitQuotation}>
                      {currentQuotation ? 'Guardar Cotação' : 'Enviar Cotação'}
                    </Button>
                  </div>
                )}
              </Form>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          {!showQuotationForm && (
            <Button variant="primary" className="bg-primary-custom border-0 rounded-pill px-4" onClick={() => setShowQuotationForm(true)}>
              {currentQuotation ? 'Ver / Editar Cotação' : 'Criar Cotação Oficial'}
            </Button>
          )}
          <Button variant="light" className="rounded-pill px-4" onClick={() => setShowModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
