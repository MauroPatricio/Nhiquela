import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Modal, Form, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGlobe, faBoxOpen, faPlane, faFileInvoiceDollar, faCheckCircle, 
  faShippingFast, faEye, faTrash, faBook, faShieldAlt, faTags,
  faBullseye, faUserTie, faPhone, faPaperPlane, faCalculator,
  faCoins, faPencilAlt, faCheck
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import api, { SOCKET_URL } from '../../api';
import { toast } from 'react-toastify';
import { PAUTA_CATEGORIES } from '../../data/pautaAduaneiraData';
import PautaAduaneiraModal from '../../components/PautaAduaneiraModal';

export default function ImportDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'leads'
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showPautaModal, setShowPautaModal] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState({ 
    productCost: '', 
    freight: '', 
    customs: '', 
    pautalRate: 5,
    ivaRate: 16,
    iceRate: 0,
    pautaCategory: '',
    pautaShCode: '',
    eta: '', 
    arrivalDate: '', 
    validUntil: '' 
  });
  const [currentQuotation, setCurrentQuotation] = useState(null);
  const [commissionRate, setCommissionRate] = useState(30);
  const [exchangeRateUSD, setExchangeRateUSD] = useState(75.0);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('75.0');
  const [isSavingRate, setIsSavingRate] = useState(false);

  // Cálculos Oficiais de Importação (Moçambique) - Lei 17/2022, Lei 22/2022, Lei 19/2022 e 7/2025
  const vm = parseFloat(quoteDetails.productCost) || 0;
  const freight = parseFloat(quoteDetails.freight) || 0;
  const insurance = Number(((vm + freight) * 0.01).toFixed(2)); // Seguro = (VM + Frete) * 1%
  const va = Number((vm + freight + insurance).toFixed(2)); // VA (Valor Aduaneiro / CIF) = VM + Frete + Seguro
  const pautalRate = parseFloat(quoteDetails.pautalRate !== undefined ? quoteDetails.pautalRate : 5);
  const da = quoteDetails.customs ? parseFloat(quoteDetails.customs) : Number((va * (pautalRate / 100)).toFixed(2));
  const iceRate = parseFloat(quoteDetails.iceRate || 0);
  const iceCost = Number((va * (iceRate / 100)).toFixed(2)); // ICE = VA * iceRate
  const baseIva = Number((va + da + iceCost).toFixed(2)); // Base do IVA = VA + DA + ICE
  const ivaRate = parseFloat(quoteDetails.ivaRate !== undefined ? quoteDetails.ivaRate : 16);
  const iva = Number((baseIva * (ivaRate / 100)).toFixed(2)); // IVA = Base IVA * ivaRate (16% ou 0% Isento)
  const commission = Number((vm * 0.30).toFixed(2)); // Nhiquela = VM * 30%
  const importTotal = Number((va + da + iceCost + iva).toFixed(2)); // Total de Importação = VA + DA + ICE + IVA
  const finalPrice = Number((importTotal + commission).toFixed(2)); // Total Final = Total Importação + Nhiquela
  const isQuotationAccepted = currentQuotation?.status === 'ACCEPTED' || (selectedReq && ['ACCEPTED', 'PAYMENT_CONFIRMED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedReq.status));

  const stats = {
    sourcing: requests.filter(r => ['REQUESTED', 'UNDER_REVIEW', 'SOURCING'].includes(r.status)).length || 0,
    pendentes: requests.filter(r => ['QUOTATION_READY', 'QUOTATION_SENT'].includes(r.status)).length || 0,
    pagas: requests.filter(r => ['ACCEPTED', 'PROCESSING', 'SHIPPED'].includes(r.status)).length || 0,
    emTransito: requests.filter(r => ['SHIPPED', 'ARRIVED_AT_CUSTOMS', 'CUSTOMS_CLEARED'].includes(r.status)).length || 0,
    leadsTotal: leads.length,
    leadsContactados: leads.filter(l => l.status === 'CONTACTO_REGISTADO' || l.status === 'COTACAO_SOLICITADA').length
  };

  const fetchRequests = async () => {
    try {
      const response = await api.get('/import/requests');
      setRequests(response.data);
    } catch (err) {
      toast.error('Erro ao buscar pedidos de importação.');
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await api.get('/import/simulations/admin');
      setLeads(response.data);
    } catch (err) {
      console.error('Erro ao buscar leads do simulador:', err);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const response = await api.get('/import/simulation/exchange-rates');
      if (response.data?.USD?.rate) {
        setExchangeRateUSD(response.data.USD.rate);
        setRateInput(response.data.USD.rate);
      }
    } catch (err) {
      console.error('Erro ao buscar taxas de câmbio:', err);
    }
  };

  const handleUpdateExchangeRate = async () => {
    const num = parseFloat(rateInput);
    if (!num || num <= 0) {
      toast.warning('Insira uma taxa de câmbio válida superior a zero.');
      return;
    }
    setIsSavingRate(true);
    try {
      const res = await api.put('/import/simulation/exchange-rates', {
        currency: 'USD',
        rate: num,
        source: 'Câmbio Oficial Nhiquela'
      });
      setExchangeRateUSD(num);
      setIsEditingRate(false);
      toast.success(res.data?.message || 'Câmbio oficial atualizado com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar taxa de câmbio.');
    } finally {
      setIsSavingRate(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchLeads();
    fetchExchangeRates();

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

    socket.on('new_import_simulation_lead', (data) => {
      toast.info(`🎯 Novo Lead do Simulador: ${data.contactName || 'Visitante'} (${data.productName})`);
      fetchLeads();
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
    
    // Procura classificação pré-selecionada no pedido
    const matchedCategory = PAUTA_CATEGORIES.find(c => c.name === req.pautaCategory || c.shCode === req.pautaShCode);

    setQuoteDetails({ 
      productCost: '', 
      freight: '', 
      customs: '', 
      pautalRate: matchedCategory ? matchedCategory.daRate : 5,
      ivaRate: matchedCategory ? matchedCategory.ivaRate : 16,
      iceRate: matchedCategory ? matchedCategory.iceRate : 0,
      pautaCategory: matchedCategory ? matchedCategory.name : (req.pautaCategory || ''),
      pautaShCode: matchedCategory ? matchedCategory.shCode : (req.pautaShCode || ''),
      eta: '', 
      arrivalDate: '', 
      validUntil: '' 
    });
    setShowModal(true);

    try {
      const res = await api.get('/import/quotations/request/' + req._id);
      if (res.data) {
        setCurrentQuotation(res.data);
        setQuoteDetails({
          productCost: res.data.productCost || '',
          freight: res.data.internationalShipping || '',
          customs: res.data.customsEstimated || '',
          pautalRate: res.data.customsDutyRate !== undefined ? res.data.customsDutyRate : 5,
          ivaRate: res.data.vatRate !== undefined ? res.data.vatRate : 16,
          iceRate: res.data.iceRate !== undefined ? res.data.iceRate : 0,
          pautaCategory: res.data.pautaCategory || req.pautaCategory || '',
          pautaShCode: res.data.pautaShCode || req.pautaShCode || '',
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
        productCost: vm,
        internationalShipping: freight,
        insuranceCost: insurance,
        customsValue: va,
        customsDutyRate: pautalRate,
        customsEstimated: da,
        iceRate: iceRate,
        iceCost: iceCost,
        vatBase: baseIva,
        vatRate: ivaRate,
        vatCost: iva,
        nhiquelaCommissionRate: 30,
        nhiquelaServiceFee: commission,
        importTotalCost: importTotal,
        totalCost: finalPrice,
        pautaCategory: quoteDetails.pautaCategory || '',
        pautaShCode: quoteDetails.pautaShCode || '',
        estimatedDeliveryDays: quoteDetails.eta ? `${quoteDetails.eta} dias` : '7-15 dias',
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

      {/* PAINEL DE CONTROLO DO CÂMBIO OFICIAL NHIQUELA */}
      <Card className="border-0 shadow-sm rounded-4 bg-white p-3 p-md-4 mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle p-3 bg-primary bg-opacity-10 text-primary">
              <FontAwesomeIcon icon={faCoins} size="lg" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h6 className="fw-bold mb-0 text-dark">Câmbio Oficial de Importação (Nhiquela)</h6>
                <Badge bg="success" className="rounded-pill px-2.5 py-1">Ativo no Simulador</Badge>
              </div>
              <small className="text-muted">
                Taxa de conversão oficial utilizada pelo motor fiscal e pelo simulador público para todos os cálculos em Dólares (USD).
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {isEditingRate ? (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="input-group input-group-sm" style={{ width: '200px' }}>
                  <span className="input-group-text bg-light fw-bold text-muted">1 USD =</span>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="1"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="fw-bold text-primary text-center"
                    autoFocus
                  />
                  <span className="input-group-text bg-light fw-bold text-muted">MT</span>
                </div>
                <Button
                  size="sm"
                  variant="success"
                  className="rounded-pill px-3 fw-bold shadow-sm d-inline-flex align-items-center gap-1"
                  disabled={isSavingRate}
                  onClick={handleUpdateExchangeRate}
                >
                  <FontAwesomeIcon icon={faCheck} />
                  {isSavingRate ? 'A guardar...' : 'Guardar'}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  className="rounded-pill px-3"
                  onClick={() => {
                    setRateInput(exchangeRateUSD);
                    setIsEditingRate(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-3 bg-light px-3 py-2 rounded-4 border">
                <div>
                  <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Taxa Atual:</span>
                  <strong className="fs-5 text-dark fw-black">1 USD = {exchangeRateUSD} MT</strong>
                </div>
                <Button
                  size="sm"
                  variant="outline-primary"
                  className="rounded-pill px-3 fw-semibold shadow-sm d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    setRateInput(exchangeRateUSD);
                    setIsEditingRate(true);
                  }}
                >
                  <FontAwesomeIcon icon={faPencilAlt} className="small" />
                  Editar Câmbio
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Header className="bg-white border-0 py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="gap-2">
            <Nav.Item>
              <Nav.Link 
                eventKey="requests" 
                className={`rounded-pill px-4 fw-semibold ${activeTab === 'requests' ? 'bg-primary-custom text-white' : 'text-dark bg-light'}`}
                style={{ cursor: 'pointer' }}
              >
                <FontAwesomeIcon icon={faBoxOpen} className="me-2" />
                Pedidos de Importação ({requests.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                eventKey="leads" 
                className={`rounded-pill px-4 fw-semibold ${activeTab === 'leads' ? 'bg-primary-custom text-white' : 'text-dark bg-light'}`}
                style={{ cursor: 'pointer' }}
              >
                <FontAwesomeIcon icon={faBullseye} className="me-2 text-danger" />
                Leads do Simulador de Captação ({leads.length})
              </Nav.Link>
            </Nav.Item>
          </Nav>
          <Badge bg="light" className="text-muted border px-3 py-2 rounded-pill">
            {activeTab === 'requests' ? `Total Pedidos: ${requests.length}` : `Total Leads: ${leads.length}`}
          </Badge>
        </Card.Header>

        <Card.Body className="p-0">
          {activeTab === 'requests' ? (
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
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="bg-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4">Código / Data</th>
                    <th>Interessado / Empresa</th>
                    <th>Produto Simulado</th>
                    <th>Estimativa Preliminar</th>
                    <th>Estado do Lead</th>
                    <th className="text-end pe-4">Contacto Comercial</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        Nenhuma simulação registada no funil até ao momento.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                      const formattedPhone = cleanPhone.startsWith('258') ? cleanPhone : cleanPhone ? `258${cleanPhone}` : '';
                      const waText = encodeURIComponent(
                        `Olá ${lead.contactName || 'cliente'}! Vimos a sua simulação #${lead.simulationCode} na Nhiquela para importar "${lead.productName}". Como podemos apoiar na cotação formal e validação alfandegária?`
                      );
                      const waLink = formattedPhone ? `https://wa.me/${formattedPhone}?text=${waText}` : null;

                      return (
                        <tr key={lead._id}>
                          <td className="ps-4">
                            <span className="fw-bold text-dark d-block">
                              #{lead.simulationCode}
                            </span>
                            <small className="text-muted">
                              {new Date(lead.createdAt).toLocaleDateString('pt-PT')} {new Date(lead.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">
                              {lead.contactName || <span className="text-muted fst-italic">Não identificado</span>}
                            </div>
                            <div className="small text-muted">
                              {lead.companyName ? (
                                <span>🏢 {lead.companyName} ({lead.importerType === 'EMPRESA' ? 'Empresa' : 'Particular'})</span>
                              ) : (
                                <span>👤 {lead.importerType === 'EMPRESA' ? 'Empresa' : 'Particular'}</span>
                              )}
                            </div>
                            {lead.phone && (
                              <div className="small fw-semibold text-primary">
                                <FontAwesomeIcon icon={faPhone} className="me-1 small" />
                                {lead.phone}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="fw-semibold text-dark d-block">{lead.productName}</span>
                            <div className="d-flex gap-1 align-items-center mt-1">
                              <Badge bg="light" className="text-dark border">
                                {lead.originCountry || 'China'}
                              </Badge>
                              <Badge bg="secondary" className="bg-opacity-10 text-secondary border">
                                {lead.transportType === 'SEA' ? 'Marítimo 🚢' : 'Aéreo ✈️'}
                              </Badge>
                              <Badge bg="light" className="text-muted border">
                                ${lead.estimatedValueUsd} USD
                              </Badge>
                            </div>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">
                              {lead.estimatedRange?.minMzn ? `${lead.estimatedRange.minMzn.toLocaleString()} - ${lead.estimatedRange.maxMzn.toLocaleString()} MT` : 'A calcular'}
                            </div>
                            <small className="text-muted">Câmbio: {lead.estimatedRange?.exchangeRate || exchangeRateUSD || 75.0} MT/USD</small>
                          </td>
                          <td>
                            <Badge bg={
                              lead.status === 'COTACAO_SOLICITADA' ? 'success' :
                              lead.status === 'CONTACTO_REGISTADO' ? 'primary' :
                              lead.status === 'CONVERTIDA' ? 'dark' : 'secondary'
                            } className="px-3 py-2 rounded-pill">
                              {lead.status === 'COTACAO_SOLICITADA' ? 'Cotação Solicitada' :
                               lead.status === 'CONTACTO_REGISTADO' ? 'Contacto Registado' :
                               lead.status === 'CONVERTIDA' ? 'Convertida em Cliente' : 'Simulação Feita'}
                            </Badge>
                          </td>
                          <td className="text-end pe-4">
                            {waLink ? (
                              <a 
                                href={waLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-sm btn-success rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-2 fw-semibold"
                              >
                                <FontAwesomeIcon icon={faWhatsapp} />
                                Falar no WhatsApp
                              </a>
                            ) : (
                              <Badge bg="light" className="text-muted border px-2 py-1">
                                Sem telefone
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          )}
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

                {selectedReq.pautaCategory && (
                  <Col md={12} className="mb-3">
                    <div className="p-2.5 rounded-3 border d-flex align-items-center justify-content-between" style={{ backgroundColor: '#fdf4ff', borderColor: '#f0abfc' }}>
                      <div className="d-flex align-items-center gap-2">
                        <FontAwesomeIcon icon={faTags} className="text-purple" style={{ color: '#8a2be2' }} />
                        <span className="small fw-bold text-dark">Classificação Solicitada:</span>
                        <span className="small text-muted">{selectedReq.pautaCategory}</span>
                      </div>
                      {selectedReq.pautaShCode && (
                        <Badge bg="light" className="text-dark border font-monospace">
                          SH: {selectedReq.pautaShCode}
                        </Badge>
                      )}
                    </div>
                  </Col>
                )}

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
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">
                  {isQuotationAccepted ? 'Cotação Oficial (Aceite - Modo de Leitura)' : 'Preencher Cotação Oficial'}
                </h6>

                {!isQuotationAccepted && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-pill px-3 py-1 fw-bold"
                    style={{ borderColor: '#8a2be2', color: '#8a2be2', fontSize: '0.8rem' }}
                    onClick={() => setShowPautaModal(true)}
                  >
                    <FontAwesomeIcon icon={faBook} className="me-1.5" />
                    Consultar Pauta Aduaneira
                  </Button>
                )}
              </div>

              <Form>
                <Row className="g-3">
                  {/* Seletor Pautal */}
                  <Col md={12}>
                    <div className="p-3 bg-white rounded-3 border">
                      <Form.Label className="small fw-semibold text-muted mb-1">
                        Classificação Pautal Oficial (Moçambique)
                      </Form.Label>
                      <Row className="g-2 align-items-center">
                        <Col md={7}>
                          <Form.Select
                            value={quoteDetails.pautaCategory || ''}
                            onChange={(e) => {
                              const cat = PAUTA_CATEGORIES.find(c => c.name === e.target.value);
                              if (cat) {
                                setQuoteDetails({
                                  ...quoteDetails,
                                  pautaCategory: cat.name,
                                  pautaShCode: cat.shCode,
                                  pautalRate: cat.daRate,
                                  ivaRate: cat.ivaRate,
                                  iceRate: cat.iceRate
                                });
                              }
                            }}
                            disabled={isQuotationAccepted}
                            className="form-select-sm fw-semibold"
                          >
                            <option value="">Selecione uma categoria pautal...</option>
                            {PAUTA_CATEGORIES.map(c => (
                              <option key={c.id} value={c.name}>
                                {c.name} — DA: {c.daRate}% | IVA: {c.ivaRate}%{c.iceRate > 0 ? ` | ICE: ${c.iceRate}%` : ''}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>

                        <Col md={5}>
                          <div className="d-flex flex-wrap gap-1">
                            {quoteDetails.pautaShCode && (
                              <Badge bg="light" className="text-dark border font-monospace">
                                SH: {quoteDetails.pautaShCode}
                              </Badge>
                            )}
                            <Badge bg="info">DA: {pautalRate}%</Badge>
                            <Badge bg={ivaRate === 0 ? 'success' : 'secondary'}>
                              IVA: {ivaRate === 0 ? '0% Isento' : `${ivaRate}%`}
                            </Badge>
                            {iceRate > 0 && <Badge bg="warning" text="dark">ICE: {iceRate}%</Badge>}
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Col>

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
                  
                  {/* Alíquotas configuráveis */}
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Taxa DA (%)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={quoteDetails.pautalRate !== undefined ? quoteDetails.pautalRate : 5}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, pautalRate: e.target.value })}
                        disabled={isQuotationAccepted}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Taxa IVA (%)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={quoteDetails.ivaRate !== undefined ? quoteDetails.ivaRate : 16}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, ivaRate: e.target.value })}
                        disabled={isQuotationAccepted}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Taxa ICE (%)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={quoteDetails.iceRate !== undefined ? quoteDetails.iceRate : 0}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, iceRate: e.target.value })}
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
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">Validade da Cotação</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={quoteDetails.validUntil}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, validUntil: e.target.value })}
                        disabled={isQuotationAccepted}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="mt-3 p-3 bg-white rounded-3 border">
                  <h6 className="fw-bold text-dark mb-2 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    📑 Memória de Cálculo Oficial (Moçambique)
                  </h6>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>1. Valor da Mercadoria (VM):</span>
                    <span className="fw-semibold text-dark">{vm.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>2. Frete Internacional:</span>
                    <span className="fw-semibold text-dark">{freight.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>3. Seguro (1%):</span>
                    <span className="fw-semibold text-dark">{insurance.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small fw-bold text-primary mb-2 pt-1 border-top" style={{ color: '#8a2be2' }}>
                    <span>4. Valor Aduaneiro / CIF (VA):</span>
                    <span>{va.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>5. Direitos Aduaneiros ({pautalRate}%):</span>
                    <span className="fw-semibold text-dark">{da.toFixed(2)} MT</span>
                  </div>
                  {iceCost > 0 && (
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>6. ICE ({iceRate}%):</span>
                      <span className="fw-semibold text-dark">{iceCost.toFixed(2)} MT</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>{iceCost > 0 ? '7' : '6'}. Base de Cálculo do IVA:</span>
                    <span className="fw-semibold text-dark">{baseIva.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>{iceCost > 0 ? '8' : '7'}. IVA da Importação ({ivaRate}%{ivaRate === 0 ? ' - Isento Lei 22/2022' : ''}):</span>
                    <span className="fw-semibold text-dark">{iva.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small fw-bold text-dark mb-2 pt-1 border-top">
                    <span>Total de Importação Aduaneira:</span>
                    <span>{importTotal.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-2">
                    <span>Comissão Nhiquela (30% sobre VM):</span>
                    <span className="fw-semibold text-dark">{commission.toFixed(2)} MT</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold text-success h6 mb-0 pt-2 border-top">
                    <span>Preço Final para Cliente:</span>
                    <span className="fs-5">{finalPrice.toFixed(2)} MT</span>
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

      {/* Modal da Pauta Aduaneira para Admin */}
      <PautaAduaneiraModal
        show={showPautaModal}
        onHide={() => setShowPautaModal(false)}
        selectedId={quoteDetails.pautaCategory}
        onSelectCategory={(category) => {
          setQuoteDetails({
            ...quoteDetails,
            pautaCategory: category.name,
            pautaShCode: category.shCode,
            pautalRate: category.daRate,
            ivaRate: category.ivaRate,
            iceRate: category.iceRate
          });
          toast.success(`Classificação pautal aplicada: ${category.name}`);
        }}
      />
    </Container>
  );
}
