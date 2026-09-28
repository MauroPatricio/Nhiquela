import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faPlus, faSearch, faLink, faEye, faPlane, faShip, faTrash } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';
import { toast } from 'react-toastify';

export default function ImportShipmentsScreen() {
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]); // For dropdown to associate
  const [showModal, setShowModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    shipmentCode: '',
    originCountry: '',
    destinationCountry: 'Moçambique',
    carrier: '',
    shippingMethod: 'SEA',
    trackingNumber: ''
  });

  const [orderToLink, setOrderToLink] = useState('');

  const fetchShipments = async () => {
    try {
      const response = await api.get('/import/shipments');
      setShipments(response.data);
    } catch (err) {
      toast.error('Erro ao buscar cargas.');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/import/orders');
      // Only show orders that are PURCHASED and not yet shipped
      setOrders(response.data.filter(o => o.status === 'PURCHASED' || o.status === 'PAYMENT_CONFIRMED'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShipments();
    fetchOrders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/import/shipments', formData);
      toast.success('Carga criada com sucesso!');
      setShowModal(false);
      fetchShipments();
    } catch (err) {
      toast.error('Erro ao criar carga.');
    }
  };

  const handleLinkOrder = async (e) => {
    e.preventDefault();
    if (!orderToLink) return toast.error('Selecione uma ordem.');
    try {
      await api.post(`/import/shipments/${selectedShipment._id}/orders`, { orderId: orderToLink });
      toast.success('Ordem associada à carga com sucesso!');
      setShowLinkModal(false);
      fetchShipments();
      fetchOrders(); // Refresh orders list
    } catch (err) {
      toast.error('Erro ao associar ordem.');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/import/shipments/${id}`, { status: newStatus });
      toast.success('Estado da carga atualizado!');
      fetchShipments();
    } catch (err) {
      toast.error('Erro ao atualizar estado da carga.');
    }
  };

  const handleDeleteShipment = async (id, code) => {
    if (window.confirm(`Tem certeza que deseja remover a carga "${code}"?`)) {
      try {
        await api.delete(`/import/shipments/${id}`);
        toast.success('Carga removida com sucesso!');
        fetchShipments();
      } catch (err) {
        toast.error('Erro ao remover carga.');
      }
    }
  };

  const filteredShipments = shipments.filter(s => 
    (s.shipmentCode || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.carrier || '').toLowerCase().includes(search.toLowerCase())
  );

  const shipmentStatusMap = {
    CREATED: { label: 'Criada', bg: 'secondary' },
    IN_TRANSIT: { label: 'Em Trânsito', bg: 'info' },
    CUSTOMS_CLEARANCE: { label: 'Na Alfândega', bg: 'warning' },
    ARRIVED: { label: 'Na Alfândega', bg: 'warning' },
    RELEASED: { label: 'Desalfandegado', bg: 'primary' },
    DELIVERED: { label: 'Entregue', bg: 'success' }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
            <FontAwesomeIcon icon={faTruck} className="text-primary-custom me-2" />
            Cargas e Shipments
          </h2>
          <p className="text-muted mb-0">Agrupe ordens em contentores e monitorize o transporte até Moçambique.</p>
        </div>
        <div>
           <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} onClick={() => setShowModal(true)}>
             <FontAwesomeIcon icon={faPlus} className="me-2" />
             Nova Carga
           </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Header className="bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">Lotes em Trânsito</h5>
          <div className="position-relative" style={{ width: '300px' }}>
            <FontAwesomeIcon icon={faSearch} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <Form.Control 
              type="text" 
              placeholder="Pesquisar código da carga..." 
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
                  <th className="fw-semibold border-0 rounded-start">Código</th>
                  <th className="fw-semibold border-0">Método / Transportadora</th>
                  <th className="fw-semibold border-0">Origem</th>
                  <th className="fw-semibold border-0">Ordens</th>
                  <th className="fw-semibold border-0">Estado</th>
                  <th className="fw-semibold border-0 text-end rounded-end">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      Nenhuma carga encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((s) => (
                    <tr key={s._id}>
                      <td className="fw-bold text-dark">{s.shipmentCode}</td>
                      <td>
                        <div>
                           {s.shippingMethod === 'AIR' ? <FontAwesomeIcon icon={faPlane} className="me-2 text-info" /> : <FontAwesomeIcon icon={faShip} className="me-2 text-primary" />}
                           <span className="fw-medium">{s.carrier || 'N/A'}</span>
                        </div>
                        <div className="small text-muted">{s.trackingNumber || 'Sem tracking'}</div>
                      </td>
                      <td>{s.originCountry}</td>
                      <td>
                        <Badge bg="dark" className="rounded-pill">{s.orders?.length || 0}</Badge>
                      </td>
                      <td>
                        <Badge bg={(shipmentStatusMap[s.status] || { bg: 'secondary' }).bg} className="px-3 py-2 rounded-pill shadow-sm">
                          {(shipmentStatusMap[s.status] || { label: s.status }).label}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <Button variant="light" size="sm" className="rounded-circle text-success shadow-sm me-2" style={{ width: '35px', height: '35px' }} title="Associar Ordem" onClick={() => { setSelectedShipment(s); setShowLinkModal(true); }}>
                          <FontAwesomeIcon icon={faLink} />
                        </Button>
                        <Button variant="light" size="sm" className="rounded-circle text-danger shadow-sm me-2" style={{ width: '35px', height: '35px' }} title="Remover Carga" onClick={() => handleDeleteShipment(s._id, s.shipmentCode)}>
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                        <Form.Select 
                          size="sm" 
                          value={s.status} 
                          onChange={(e) => handleUpdateStatus(s._id, e.target.value)}
                          className="d-inline-block w-auto rounded-pill border-light bg-light small fw-bold"
                          style={{ fontSize: '12px' }}
                        >
                          <option value="CREATED">Criada</option>
                          <option value="IN_TRANSIT">Em Trânsito</option>
                          <option value="CUSTOMS_CLEARANCE">Na Alfândega</option>
                          <option value="RELEASED">Desalfandegado</option>
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

      {/* Modal Nova Carga */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">Registar Nova Carga</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="pt-4">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Código da Carga *</Form.Label>
                  <Form.Control required placeholder="Ex: CN-2026-001" value={formData.shipmentCode} onChange={e => setFormData({...formData, shipmentCode: e.target.value})} className="bg-light" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Transportadora</Form.Label>
                  <Form.Control placeholder="Ex: DHL, MSC" value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value})} className="bg-light" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">País de Origem *</Form.Label>
                  <Form.Control required placeholder="Ex: China" value={formData.originCountry} onChange={e => setFormData({...formData, originCountry: e.target.value})} className="bg-light" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Método *</Form.Label>
                  <Form.Select required value={formData.shippingMethod} onChange={e => setFormData({...formData, shippingMethod: e.target.value})} className="bg-light">
                    <option value="SEA">Marítimo (SEA)</option>
                    <option value="AIR">Aéreo (AIR)</option>
                    <option value="LAND">Terrestre (LAND)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Tracking Number</Form.Label>
                  <Form.Control placeholder="..." value={formData.trackingNumber} onChange={e => setFormData({...formData, trackingNumber: e.target.value})} className="bg-light" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={() => setShowModal(false)} className="rounded-pill px-4 fw-bold">Cancelar</Button>
            <Button type="submit" variant="primary" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} className="rounded-pill px-4 fw-bold shadow-sm">Guardar Carga</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Associar Ordem */}
      <Modal show={showLinkModal} onHide={() => setShowLinkModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">Adicionar Ordem à Carga</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleLinkOrder}>
          <Modal.Body className="pt-4">
            <p className="mb-3 text-muted">Selecione uma ordem pendente para ser enviada nesta carga ({selectedShipment?.shipmentCode}):</p>
            <Form.Group>
              <Form.Select required value={orderToLink} onChange={e => setOrderToLink(e.target.value)} className="bg-light py-2">
                <option value="">Selecione a Ordem...</option>
                {orders.map(o => (
                  <option key={o._id} value={o._id}>
                    [{o._id.substring(o._id.length - 8).toUpperCase()}] - {o.customerId?.name} ({o.quotationId?.requestId?.productName})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={() => setShowLinkModal(false)} className="rounded-pill px-4 fw-bold">Cancelar</Button>
            <Button type="submit" variant="success" className="rounded-pill px-4 fw-bold shadow-sm">Associar</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .text-primary-custom { color: #8a2be2 !important; }
      `}</style>
    </Container>
  );
}
