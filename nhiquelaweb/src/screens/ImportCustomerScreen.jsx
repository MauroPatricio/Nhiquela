import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Tabs, Tab, Badge, Table, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGlobe, faSearch, faCamera, faFileInvoiceDollar, faCheckCircle, 
  faClock, faTimes, faBoxOpen, faPlaneDeparture, faTruckLoading, 
  faFilePdf, faTrash, faArrowRight, faCalendarAlt, faShip, faPlane, faCalculator,
  faBook, faShieldAlt, faTags, faInfoCircle, faCheck
} from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { selectUser } from '../store/features/userSlice';
import { PAUTA_CATEGORIES, PAUTA_GROUPS, getPautaCategoryById } from '../data/pautaAduaneiraData';
import PautaAduaneiraModal from '../components/PautaAduaneiraModal';
import CustomsTariffCalculator from '../components/CustomsTariffCalculator';
import ImportFunnelSimulator from '../components/ImportFunnelSimulator';

// Função oficial de cálculo de importação e desalfandegamento em Moçambique
// Incorpora Lei n.º 17/2022 (Pauta Aduaneira), Lei n.º 22/2022 (IVA) e Lei n.º 19/2022 / Lei 7/2025 (ICE)
export const calculateImportDetails = (
  productCostInput, 
  freightInput = 180, 
  pautalRate = 5, 
  ivaRate = 16, 
  iceRate = 0, 
  nhiquelaRate = 30
) => {
  const vm = Math.max(0, parseFloat(productCostInput) || 0);
  const frete = Math.max(0, parseFloat(freightInput) || 0);
  const pRate = parseFloat(pautalRate !== undefined ? pautalRate : 5);
  const iRate = parseFloat(ivaRate !== undefined ? ivaRate : 16);
  const icRate = parseFloat(iceRate !== undefined ? iceRate : 0);
  const nRate = parseFloat(nhiquelaRate !== undefined ? nhiquelaRate : 30);
  
  // 1. Seguro = (VM + Frete) * 1%
  const seguro = Number(((vm + frete) * 0.01).toFixed(2));
  
  // 2. VA (Valor Aduaneiro / CIF) = VM + Frete + Seguro
  const va = Number((vm + frete + seguro).toFixed(2));
  
  // 3. DA (Direitos Aduaneiros) = VA * Taxa Pautal
  const da = Number((va * (pRate / 100)).toFixed(2));

  // 4. ICE (Imposto sobre Consumos Específicos) = VA * Taxa ICE
  const ice = Number((va * (icRate / 100)).toFixed(2));
  
  // 5. Base do IVA = VA + DA + ICE
  const baseIva = Number((va + da + ice).toFixed(2));
  
  // 6. IVA = Base do IVA * Taxa IVA (16% legal ou 0% Isento)
  const iva = Number((baseIva * (iRate / 100)).toFixed(2));
  
  // 7. Nhiquela = VM * 30%
  const nhiquela = Number((vm * (nRate / 100)).toFixed(2));
  
  // 8. Total de Importação Aduaneira = VA + DA + ICE + IVA
  const totalImportacao = Number((va + da + ice + iva).toFixed(2));
  
  // 9. Total Final = Total de Importação + Nhiquela
  const totalFinal = Number((totalImportacao + nhiquela).toFixed(2));

  return {
    vm,
    frete,
    seguro,
    va,
    da,
    ice,
    baseIva,
    iva,
    nhiquela,
    totalImportacao,
    totalFinal,
    pautalRate: pRate,
    ivaRate: iRate,
    iceRate: icRate
  };
};

export default function ImportCustomerScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('simulator');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados para Categoria Pautal & Modal de Pauta
  const [showPautaModal, setShowPautaModal] = useState(false);
  const [pautaModalTarget, setPautaModalTarget] = useState('simulator'); // 'simulator' ou 'request'
  const [selectedRequestCategory, setSelectedRequestCategory] = useState(PAUTA_CATEGORIES[4]); // Maquinaria comercial padrão
  
  // Estados para o Simulador de Custos Oficial
  const [simVm, setSimVm] = useState(15105.75);
  const [simFrete, setSimFrete] = useState(180);
  const [simTaxaPautal, setSimTaxaPautal] = useState(5);
  const [simIvaRate, setSimIvaRate] = useState(16);
  const [simIceRate, setSimIceRate] = useState(0);
  const [selectedSimCategory, setSelectedSimCategory] = useState(PAUTA_CATEGORIES[4]);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = useSelector(selectUser);

  // A rota /shop/import agora é pública (simulador e informações abertas a todos)
  // O utilizador só precisará de autenticação ao submeter pedidos ou consultar o histórico

  useEffect(() => {
    if (location.state?.prefill) {
      const p = location.state.prefill;
      if (p.category) {
        setSelectedRequestCategory(p.category);
        setSelectedSimCategory(p.category);
      }
      setActiveTab('simulator');
      toast.info('Dados da simulação pautal aplicados.');
    }
  }, [location.state]);
  
  const [myImports, setMyImports] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);

  const handleDeleteRequest = async (impId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(t('importTable.confirmDelete', 'Tem certeza de que deseja remover este pedido de importação?'))) {
      try {
        await api.delete('/import/requests/' + impId);
        toast.success(t('importTable.deleteSuccess', 'Pedido de importação removido com sucesso!'));
        setShowDetails(false);
        fetchMyImports();
      } catch (err) {
        toast.error(t('importTable.deleteError', 'Erro ao remover pedido de importação.'));
      }
    }
  };

  const fetchMyImports = async () => {
    if (!userInfo) return;
    try {
      const response = await api.get('/import/requests');
      setMyImports(response.data || []);
    } catch (err) {
      console.warn('Erro ao carregar importações do utilizador:', err);
    }
  };

  useEffect(() => {
    if (userInfo) {
      fetchMyImports();
    }
    api.get('/payment-accounts').then(res => setPaymentAccounts(res.data)).catch(() => {});
  }, [userInfo]);

  const handleShowDetails = async (imp) => {
    setSelectedImport(imp);
    setSelectedQuotation(null);
    setShowDetails(true);

    if (imp.status === 'QUOTATION_READY' || imp.status === 'ACCEPTED' || imp.status === 'SENT') {
      try {
        const res = await api.get(`/import/quotations/request/${imp._id}`);
        setSelectedQuotation(res.data);
      } catch (err) {
        console.error('Erro ao buscar cotação', err);
      }
    }
  };

  const handleDownloadPDF = (imp, quot) => {
    if (!imp) return;
    const doc = new jsPDF();
    const q = quot || selectedQuotation;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(138, 43, 226); // Brand color #8a2be2
    doc.text('NHIQUELA IMPORTAÇÕES', 14, 20);
    
    doc.setFontSize(13);
    doc.setTextColor(40);
    doc.text('Cotação Oficial de Importação & Desalfandegamento', 14, 28);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID do Pedido: ${imp._id ? imp._id.substring(imp._id.length - 8).toUpperCase() : (imp.id || 'N/A')}`, 14, 38);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 44);
    doc.text(`Estimativa de Entrega: ${imp.estimatedDeliveryDays ? `${imp.estimatedDeliveryDays} dias` : (imp.eta || 'A calcular')}`, 14, 50);
    
    // Line Separator
    doc.setDrawColor(200);
    doc.line(14, 55, 196, 55);

    // Product Details Table
    doc.autoTable({
      startY: 60,
      head: [['Detalhes do Pedido', 'Especificação']],
      body: [
        ['Produto Solicitado', imp.productName || imp.product || 'N/A'],
        ['Quantidade', String(imp.quantity || 1)],
        ['País de Origem', imp.preferredOriginCountry || imp.origin || 'N/A'],
        ['Tipo de Envio', imp.shippingMethod === 'SEA' ? 'Marítimo' : 'Aéreo'],
        ['Estado Actual', imp.status || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [138, 43, 226] }
    });

    const finalY = doc.lastAutoTable.finalY || 105;
    
    // Memória de Cálculo Oficial
    const c = calculateImportDetails(
      q?.productCost || (typeof imp.totalCost === 'number' ? imp.totalCost : 0),
      q?.internationalShipping || 180,
      q?.customsDutyRate || 5,
      q?.nhiquelaCommissionRate || 30
    );

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Memória de Cálculo e Resumo Financeiro (Moçambique)', 14, finalY + 12);
    
    doc.autoTable({
      startY: finalY + 16,
      head: [['Rubrica / Discriminação de Custos', 'Valor']],
      body: [
        ['1. Valor da Mercadoria', `${c.vm.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['2. Frete Internacional', `${c.frete.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['3. Seguro', `${c.seguro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['4. Valor Aduaneiro / CIF', `${c.va.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['5. Direitos Aduaneiros', `${c.da.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['6. Base de Cálculo do IVA', `${c.baseIva.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['7. IVA da Importação', `${c.iva.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['8. Total de Custos de Importação', `${c.totalImportacao.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['9. Taxa de Serviço Nhiquela', `${c.nhiquela.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
        ['VALOR TOTAL A PAGAR', `${(q?.totalCost || c.totalFinal).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`]
      ],
      theme: 'grid',
      styles: { fontSize: 9.5 },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] }
    });

    doc.setFontSize(8.5);
    doc.setTextColor(120);
    doc.text('Nota: O valor apresentado inclui mercadoria, frete, seguro, despacho aduaneiro e entrega no destino final.', 14, (doc.lastAutoTable.finalY || 220) + 10);

    doc.save(`cotacao_${imp._id ? imp._id.substring(imp._id.length - 8).toUpperCase() : 'importacao'}.pdf`);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentProofFile(file);
    }
  };

  const handleAcceptQuotation = async () => {
    if (!selectedQuotation) return;
    if (!paymentProofFile) {
      toast.error('Por favor, anexe o comprovativo de pagamento.');
      return;
    }

    try {
      let uploadedProofUrl = null;
      if (paymentProofFile) {
        const formData = new FormData();
        formData.append('image', paymentProofFile);
        
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(err => api.post('/upload/local', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }));
        
        if (uploadRes && uploadRes.data) {
           uploadedProofUrl = uploadRes.data.url || uploadRes.data.secure_url || uploadRes.data;
        }
      }

      const payload = {
        paymentProof: typeof uploadedProofUrl === 'string' ? uploadedProofUrl : null
      };

      await api.post(`/import/quotations/${selectedQuotation._id}/accept`, payload);
      toast.success('Cotação aceite com sucesso!');
      setShowDetails(false);
      setPaymentProofFile(null);
      fetchMyImports();
    } catch (error) {
      toast.error('Erro ao aceitar cotação.');
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (!userInfo) {
      toast.info('Por favor, inicie sessão para submeter o seu pedido de importação.');
      navigate('/login?redirect=/shop/import');
      return;
    }

    if (!imageFile) {
      toast.error('A fotografia do produto é obrigatória para solicitar cotação.');
      return;
    }

    const localUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    setSubmitting(true);
    
    try {
      let uploadedImageUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(err => api.post('/upload/local', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }));
        
        if (uploadRes && uploadRes.data) {
          uploadedImageUrl = uploadRes.data.url || uploadRes.data.secure_url || uploadRes.data;
        }
      }

      if (!uploadedImageUrl) {
        toast.error('Erro ao carregar a imagem do produto. Por favor tente novamente.');
        setSubmitting(false);
        return;
      }

      const form = e.target;
      const payload = {
        customerId: localUser._id || userInfo?._id || '64e3c1f2b3b3a2a1a1a1a1a1',
        productName: form.productName ? form.productName.value : form[0]?.value,
        quantity: form.quantity ? Number(form.quantity.value) : 1,
        description: form.description ? form.description.value : form[2]?.value,
        productUrl: form.productUrl ? form.productUrl.value : '',
        preferredOriginCountry: form.preferredOriginCountry ? form.preferredOriginCountry.value : 'China',
        shippingMethod: form.shippingMethod ? form.shippingMethod.value : 'AIR',
        pautaCategory: selectedRequestCategory?.name || '',
        pautaShCode: selectedRequestCategory?.shCode || '',
        productImage: uploadedImageUrl
      };

      await api.post('/import/requests', payload);
      toast.success('Pedido de importação enviado com sucesso! A nossa equipa já está a analisar.');
      form.reset();
      removeImage();
      fetchMyImports();
      setActiveTab('my-imports');
    } catch (err) {
      toast.error('Erro ao submeter o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderShippingBadge = (method) => {
    const isSea = method === 'SEA';
    return (
      <Badge 
        bg="light" 
        className="text-dark border rounded-pill px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1"
        style={{ fontSize: '0.75rem' }}
      >
        <FontAwesomeIcon icon={isSea ? faShip : faPlane} className={isSea ? 'text-primary' : 'text-purple'} style={{ color: isSea ? '#0284c7' : '#8a2be2' }} />
        <span>{isSea ? t('importTable.sea', 'Marítimo') : t('importTable.air', 'Aéreo')}</span>
      </Badge>
    );
  };

  return (
    <div className="bg-light min-vh-100 py-3 py-sm-4 py-md-5 w-100" style={{ overflowX: 'hidden' }}>
      <Container className="px-2 px-sm-3 px-md-4">
        {/* Header Hero */}
        <div className="text-center mb-4 mb-md-5">
          <div 
            className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm mb-3" 
            style={{ width: '64px', height: '64px' }}
          >
            <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '2rem', color: '#8a2be2' }} />
          </div>
          <h1 className="fw-black text-dark fs-2 fs-md-1 mb-2">Nhiquela Importações</h1>
          <p className="text-muted mx-auto fs-6 px-2 mb-0" style={{ maxWidth: '600px', lineHeight: '1.5' }}>
            Acesso directo aos maiores mercados do mundo. Diga-nos o que precisa, e nós tratamos de tudo até à sua porta.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
          <Card.Header className="bg-white border-0 pt-3 pt-md-4 pb-0 px-2 px-sm-3 px-md-4">
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="border-bottom custom-tabs"
            >
              <Tab 
                eventKey="simulator" 
                title={
                  <span className="d-flex align-items-center justify-content-center gap-1.5">
                    <FontAwesomeIcon icon={faCalculator} style={{ color: '#8a2be2' }} />
                    <span>Simulador de direitos</span>
                  </span>
                } 
              />
              <Tab 
                eventKey="my-imports" 
                title={
                  <span>
                    {t("importTable.myImports", "Minhas Importações")}
                    {myImports.length > 0 && (
                      <span className="badge rounded-pill bg-secondary bg-opacity-25 text-dark ms-2" style={{ fontSize: '0.72rem' }}>
                        {myImports.length}
                      </span>
                    )}
                  </span>
                } 
              />
            </Tabs>
          </Card.Header>
          
          <Card.Body className="p-3 p-sm-4 p-md-5">
            {activeTab === 'request' && (
              <Row className="justify-content-center">
                <Col xs={12} lg={9} xl={8}>
                  <div className="mb-4">
                    <h4 className="fw-bold mb-1 fs-5 fs-md-4">O que deseja importar?</h4>
                    <p className="text-muted small mb-0">Preencha os detalhes e receba a cotação com custos alfandegários e frete incluídos.</p>
                  </div>

                  <Form onSubmit={handleSubmitRequest}>
                    <Row className="g-3">
                      {/* Classificação Pautal Aduaneira */}
                      <Col xs={12}>
                        <div className="p-3 rounded-4 mb-2 border" style={{ backgroundColor: '#fcfaff', borderColor: '#e9d5ff' }}>
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge rounded-pill px-2.5 py-1.5" style={{ backgroundColor: '#8a2be2', color: '#fff' }}>
                                <FontAwesomeIcon icon={faTags} className="me-1" /> Classificação Pautal (Moçambique)
                              </span>
                              <span className="text-muted small">Para cálculo de DA, IVA e ICE</span>
                            </div>

                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="rounded-pill px-3 py-1 fw-bold border-1"
                              style={{ borderColor: '#8a2be2', color: '#8a2be2', fontSize: '0.8rem' }}
                              onClick={() => {
                                setPautaModalTarget('request');
                                setShowPautaModal(true);
                              }}
                            >
                              <FontAwesomeIcon icon={faBook} className="me-1.5" />
                              Ver Tabela de Direitos Pautais
                            </Button>
                          </div>

                          <Row className="g-2 align-items-center">
                            <Col xs={12} md={7}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold text-muted mb-1">Tipo de Mercadoria / Categoria</Form.Label>
                                <Form.Select
                                  value={selectedRequestCategory?.id || ''}
                                  onChange={(e) => {
                                    const cat = PAUTA_CATEGORIES.find(c => c.id === e.target.value);
                                    if (cat) setSelectedRequestCategory(cat);
                                  }}
                                  className="form-control-mobile fw-semibold"
                                >
                                  {PAUTA_CATEGORIES.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} — DA: {c.daRate}% | IVA: {c.ivaRate}%{c.iceRate > 0 ? ` | ICE: ${c.iceRate}%` : ''}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>

                            <Col xs={12} md={5}>
                              <div className="d-flex flex-wrap gap-1.5 mt-md-4 pt-md-1">
                                <Badge bg="light" className="text-dark border font-monospace px-2 py-1.5">
                                  SH: {selectedRequestCategory?.shCode}
                                </Badge>
                                <Badge bg={selectedRequestCategory?.daRate === 0 ? 'success' : 'info'} className="px-2 py-1.5">
                                  DA: {selectedRequestCategory?.daRate}%
                                </Badge>
                                <Badge bg={selectedRequestCategory?.ivaRate === 0 ? 'success' : 'secondary'} className="px-2 py-1.5">
                                  IVA: {selectedRequestCategory?.ivaRate === 0 ? '0% Isento' : `${selectedRequestCategory?.ivaRate}%`}
                                </Badge>
                                {selectedRequestCategory?.iceRate > 0 && (
                                  <Badge bg="warning" text="dark" className="px-2 py-1.5 fw-bold">
                                    ICE: {selectedRequestCategory?.iceRate}%
                                  </Badge>
                                )}
                              </div>
                            </Col>
                          </Row>

                          {selectedRequestCategory?.exemptNotes && (
                            <div className="mt-2 text-success small d-flex align-items-center gap-1.5" style={{ fontSize: '11.5px' }}>
                              <FontAwesomeIcon icon={faShieldAlt} />
                              <span>{selectedRequestCategory.exemptNotes}</span>
                            </div>
                          )}
                        </div>
                      </Col>

                      <Col xs={12} md={8}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small">Nome do Produto *</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="productName"
                            placeholder="Ex: Máquina de fazer gelo 50kg/dia" 
                            required 
                            className="py-2.5 rounded-3 form-control-mobile" 
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small">Quantidade *</Form.Label>
                          <Form.Control 
                            type="number" 
                            name="quantity"
                            defaultValue={1} 
                            min={1} 
                            required 
                            className="py-2.5 rounded-3 form-control-mobile" 
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small">Descrição Detalhada *</Form.Label>
                          <Form.Control 
                            as="textarea" 
                            name="description"
                            rows={3} 
                            placeholder="Descreva o produto, cor, voltagem, marca, modelo, etc." 
                            required 
                            className="rounded-3 form-control-mobile" 
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small">Link do Produto (Opcional)</Form.Label>
                          <Form.Control 
                            type="url" 
                            name="productUrl"
                            placeholder="https://alibaba.com/..." 
                            className="py-2.5 rounded-3 form-control-mobile" 
                          />
                          <Form.Text className="text-muted small">Se viu o produto nalgum site, cole o link aqui para ajudar no sourcing.</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small">País de Origem Preferencial</Form.Label>
                          <Form.Select name="preferredOriginCountry" className="py-2.5 rounded-3 form-control-mobile" defaultValue="China">
                            <option value="China">🇨🇳 China</option>
                            <option value="Emirados Árabes Unidos (Dubai)">🇦🇪 Emirados Árabes Unidos (Dubai)</option>
                            <option value="África do Sul">🇿🇦 África do Sul</option>
                            <option value="Turquia">🇹🇷 Turquia</option>
                            <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold small">Tipo de Envio</Form.Label>
                          <Form.Select name="shippingMethod" className="py-2.5 rounded-3 form-control-mobile" defaultValue="AIR">
                            <option value="AIR">✈️ Aéreo (Rápido) — 5 a 7 dias</option>
                            <option value="SEA">🚢 Marítimo (Económico) — 35 a 45 dias</option>
                          </Form.Select>
                          <Form.Text className="text-muted small d-block mt-1">
                            Aéreo é mais rápido. Marítimo é mais económico para volumes maiores.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      
                      {/* Photo Upload Area */}
                      <Col xs={12} className="mt-3 mt-md-4">
                        <div 
                          className="border border-2 border-dashed rounded-4 p-3 p-sm-4 text-center position-relative" 
                          style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
                        >
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="d-none" 
                            ref={fileInputRef} 
                            onChange={handleImageChange}
                          />
                          
                          {imagePreview ? (
                            <div className="position-relative d-inline-block mw-100">
                              <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="img-fluid rounded-3 shadow-sm" 
                                style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }} 
                              />
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="position-absolute top-0 end-0 rounded-circle m-1 m-sm-2 shadow" 
                                style={{ width: '32px', height: '32px', padding: 0 }}
                                onClick={removeImage}
                                title="Remover imagem"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          ) : (
                            <div className="py-2">
                              <div 
                                className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm mb-2" 
                                style={{ width: '54px', height: '54px' }}
                              >
                                <FontAwesomeIcon icon={faCamera} className="fs-4" style={{ color: '#8a2be2' }} />
                              </div>
                              <h6 className="fw-bold mb-1 fs-6">Adicionar Fotografia *</h6>
                              <p className="text-muted small mb-3 px-2">Obrigatório. Ajuda-nos a encontrar exactamente o que procura</p>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                className="rounded-pill px-4 py-2 fw-semibold"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                Selecionar Imagem
                              </Button>
                            </div>
                          )}
                        </div>
                      </Col>

                      <Col xs={12} className="mt-4 text-center text-md-end">
                        <Button 
                          type="submit" 
                          disabled={submitting}
                          className="btn text-white w-100 w-md-auto px-4 px-md-5 py-3 rounded-pill fw-bold shadow-sm d-inline-flex align-items-center justify-content-center gap-2" 
                          style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }}
                        >
                          <FontAwesomeIcon icon={faSearch} />
                          <span>{submitting ? 'A enviar pedido...' : 'Solicitar Cotação'}</span>
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Col>
              </Row>
            )}

            {activeTab === 'simulator' && (
              <Row className="justify-content-center">
                <Col xs={12} lg={11} xl={10}>
                  <ImportFunnelSimulator 
                    onStartQuoteRequest={() => setActiveTab('request')}
                  />
                </Col>
              </Row>
            )}

            {activeTab === 'my-imports' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 mb-md-4">
                  <h4 className="fw-bold m-0 fs-5 fs-md-4">As Suas Importações</h4>
                  <Button 
                    variant="link" 
                    className="p-0 text-decoration-none small fw-bold" 
                    style={{ color: '#8a2be2' }}
                    onClick={fetchMyImports}
                  >
                    Actualizar
                  </Button>
                </div>

                {!userInfo ? (
                  <div className="text-center py-5 px-3 bg-white rounded-4 border my-3 shadow-sm">
                    <div 
                      className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle shadow-sm mb-3" 
                      style={{ width: '64px', height: '64px' }}
                    >
                      <FontAwesomeIcon icon={faBoxOpen} style={{ fontSize: '1.8rem', color: '#8a2be2' }} />
                    </div>
                    <h5 className="fw-bold text-dark mb-2">Acompanhe as suas Importações</h5>
                    <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: '440px' }}>
                      Inicie sessão na sua conta para consultar o histórico dos seus pedidos, cotações alfandegárias e prazos de entrega.
                    </p>
                    <Button 
                      variant="primary" 
                      className="rounded-pill px-4 py-2 fw-bold text-white shadow-sm"
                      style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }}
                      onClick={() => navigate('/login?redirect=/shop/import')}
                    >
                      Iniciar Sessão
                    </Button>
                  </div>
                ) : myImports.length === 0 ? (
                  <div className="text-center py-5 px-3 bg-light rounded-4 border border-dashed my-3">
                    <div 
                      className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm mb-3" 
                      style={{ width: '64px', height: '64px' }}
                    >
                      <FontAwesomeIcon icon={faBoxOpen} style={{ fontSize: '1.8rem', color: '#94a3b8' }} />
                    </div>
                    <h6 className="fw-bold text-dark mb-1">{t('importTable.noImportsFound', 'Nenhuma importação encontrada')}</h6>
                    <p className="text-muted small mb-3">Ainda não submeteu nenhum pedido de importação.</p>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="rounded-pill px-4 py-2 fw-bold text-white shadow-sm"
                      style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }}
                      onClick={() => setActiveTab('simulator')}
                    >
                      Fazer Nova Simulação
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* MOBILE CARD VIEW: Visible only on < 768px (Phones) */}
                    <div className="d-block d-md-none">
                      {myImports.map((imp, idx) => {
                        const code = imp._id ? imp._id.substring(imp._id.length - 8).toUpperCase() : (imp.id || `IMP-${idx}`);
                        return (
                          <div 
                            key={imp._id || idx} 
                            className="bg-white border rounded-4 p-3 mb-3 shadow-sm position-relative import-card-mobile"
                            onClick={() => handleShowDetails(imp)}
                          >
                            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                              <span 
                                className="badge rounded-pill px-2.5 py-1.5 fw-bold" 
                                style={{ backgroundColor: '#f3e8ff', color: '#8a2be2', fontSize: '0.78rem' }}
                              >
                                #{code}
                              </span>
                              <Badge bg="warning" className="rounded-pill px-2.5 py-1.5 shadow-sm text-dark font-size-xs">
                                <FontAwesomeIcon icon={faClock} className="me-1" />
                                {t(`importStatus.${imp.status}`, imp.status)}
                              </Badge>
                            </div>

                            <h6 className="fw-bold text-dark mb-2 text-truncate-2" style={{ lineHeight: '1.4' }}>
                              {imp.productName || imp.product}
                            </h6>

                            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                              {renderShippingBadge(imp.shippingMethod)}
                              <span className="badge bg-light text-muted border rounded-pill px-2.5 py-1.5" style={{ fontSize: '0.75rem' }}>
                                🌍 {imp.preferredOriginCountry || imp.origin || 'China'}
                              </span>
                            </div>

                            <div className="bg-light p-2.5 rounded-3 mb-3 small">
                              <div className="d-flex justify-content-between text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                                <span>Data do Pedido:</span>
                                <span className="fw-semibold text-dark">
                                  {imp.createdAt ? new Date(imp.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </span>
                              </div>
                              <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                                <span>Estimativa de Entrega:</span>
                                <span className="fw-semibold text-dark">
                                  {imp.estimatedDeliveryDays ? `${imp.estimatedDeliveryDays} dias` : (imp.eta || 'A calcular')}
                                </span>
                              </div>
                              {imp.estimatedArrivalDate && (
                                <div className="d-flex justify-content-between text-purple mt-1 fw-semibold" style={{ fontSize: '0.75rem', color: '#8a2be2' }}>
                                  <span>Previsão de Chegada:</span>
                                  <span>📅 {new Date(imp.estimatedArrivalDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
                                </div>
                              )}
                            </div>

                            <div className="d-flex gap-2 align-items-center pt-1" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="outline-dark" 
                                size="sm" 
                                className="rounded-pill py-2 flex-grow-1 fw-bold small"
                                onClick={() => handleShowDetails(imp)}
                              >
                                {t('importTable.details', 'Ver Detalhes')}
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                className="rounded-pill py-2 px-3 fw-bold small"
                                onClick={(e) => handleDeleteRequest(imp._id || imp.id, e)}
                                title={t('importTable.remove', 'Remover')}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* TABLE VIEW: Visible only on md and up (>= 768px - Tablets & Desktop) */}
                    <div className="d-none d-md-block table-responsive">
                      <Table hover className="align-middle border-bottom mb-0">
                        <thead className="table-light text-muted">
                          <tr>
                            <th className="fw-semibold border-0 rounded-start">{t("importTable.code", "Código")}</th>
                            <th className="fw-semibold border-0">{t("importTable.product", "Produto")}</th>
                            <th className="fw-semibold border-0">{t("importTable.origin", "Origem")}</th>
                            <th className="fw-semibold border-0">{t("importTable.shippingMethod", "Tipo de Envio")}</th>
                            <th className="fw-semibold border-0">{t("importTable.status", "Estado")}</th>
                            <th className="fw-semibold border-0">{t("importTable.orderDate", "Data do Pedido")}</th>
                            <th className="fw-semibold border-0">{t("importTable.estimatedArrival", "Prazo / Chegada")}</th>
                            <th className="fw-semibold border-0 text-end rounded-end">{t("importTable.action", "Acção")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myImports.map((imp, idx) => (
                            <tr key={imp._id || idx} style={{ cursor: 'pointer' }} onClick={() => handleShowDetails(imp)}>
                              <td className="fw-bold" style={{ color: '#8a2be2' }}>
                                {imp._id ? imp._id.substring(imp._id.length - 8).toUpperCase() : imp.id}
                              </td>
                              <td className="fw-medium text-dark">{imp.productName || imp.product}</td>
                              <td>{imp.preferredOriginCountry || imp.origin}</td>
                              <td>{renderShippingBadge(imp.shippingMethod)}</td>
                              <td>
                                <Badge bg="warning" className="rounded-pill px-3 py-2 shadow-sm text-dark">
                                  <FontAwesomeIcon icon={faClock} className="me-1" /> {t(`importStatus.${imp.status}`, imp.status)}
                                </Badge>
                              </td>
                              <td>
                                <div className="small">
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Pedido em</div>
                                  <div className="fw-semibold text-dark">
                                    {imp.createdAt ? new Date(imp.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="small">
                                  {imp.estimatedDeliveryDays ? (
                                    <div className="fw-semibold text-dark">{imp.estimatedDeliveryDays} dias</div>
                                  ) : (
                                    <span className="text-muted fst-italic">A calcular</span>
                                  )}
                                  {imp.estimatedArrivalDate && (
                                    <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600, marginTop: 2 }}>
                                      📅 {new Date(imp.estimatedArrivalDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="outline-dark" 
                                  size="sm" 
                                  className="rounded-pill px-3 fw-bold me-2" 
                                  onClick={() => handleShowDetails(imp)}
                                >
                                  {t('importTable.details', 'Detalhes')}
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm" 
                                  className="rounded-pill px-3 fw-bold" 
                                  onClick={(e) => handleDeleteRequest(imp._id || imp.id, e)}
                                >
                                  <FontAwesomeIcon icon={faTrash} className="me-1" /> {t('importTable.remove', 'Remover')}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
      
      {/* Detalhes do Pedido (Modal Responsivo) */}
      <Modal 
        show={showDetails} 
        onHide={() => setShowDetails(false)} 
        size="lg" 
        centered 
        dialogClassName="modal-responsive"
      >
        <Modal.Header closeButton className="border-0 pb-0 px-3 px-sm-4 pt-3 pt-sm-4">
          <Modal.Title className="fw-black text-dark fs-5 fs-sm-4 d-flex align-items-center gap-2">
            <FontAwesomeIcon icon={faBoxOpen} style={{ color: '#8a2be2' }} />
            <span>Detalhes da Importação</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="pt-3 px-3 px-sm-4 pb-3 pb-sm-4">
          {selectedImport && (
            <>
              {/* Header Info Status */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-3 border-bottom">
                <div>
                  <span className="text-muted small d-block">ID do Pedido</span>
                  <h4 className="fw-bold m-0" style={{ color: '#8a2be2' }}>
                    #{selectedImport._id ? selectedImport._id.substring(selectedImport._id.length - 8).toUpperCase() : selectedImport.id}
                  </h4>
                </div>
                <div className="text-sm-end">
                  <Badge bg="warning" className="rounded-pill px-3 py-2 text-dark shadow-sm">
                    {t(`importStatus.${selectedImport.status}`, selectedImport.status)}
                  </Badge>
                  <div className="mt-1 text-muted small fw-bold">
                    Estimativa: {selectedImport.eta || 'A Calcular'}
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <Row className="g-3 mb-3 mb-md-4">
                <Col xs={12} md={6}>
                  <Card className="border-0 shadow-sm bg-light h-100 rounded-3">
                    <Card.Body className="p-3">
                      <h6 className="fw-bold text-dark mb-3 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                        📦 Informações do Produto
                      </h6>
                      <div className="small">
                        <p className="mb-1.5"><span className="text-muted">Nome:</span> <span className="fw-bold text-dark">{selectedImport.productName || selectedImport.product}</span></p>
                        <p className="mb-1.5"><span className="text-muted">Origem:</span> <span className="fw-bold text-dark">{selectedImport.preferredOriginCountry || selectedImport.origin || 'China'}</span></p>
                        <p className="mb-1.5"><span className="text-muted">Envio:</span> <span className="fw-bold text-dark">{selectedImport.shippingMethod === 'SEA' ? '🚢 Marítimo' : '✈️ Aéreo'}</span></p>
                        <p className="mb-2"><span className="text-muted">Descrição:</span> <span className="text-dark">{selectedImport.description || 'N/A'}</span></p>
                      </div>
                      
                      <div className="mt-2 pt-2 border-top">
                        <span className="text-muted small fw-bold d-block mb-2">Fotografia do Produto:</span>
                        {(selectedImport.productImage || selectedImport.image) ? (
                          <div className="bg-white p-2 rounded-3 border d-inline-block shadow-sm mw-100 text-center">
                            <img 
                              src={(selectedImport.productImage || selectedImport.image).startsWith('http') 
                                ? (selectedImport.productImage || selectedImport.image) 
                                : `${api.defaults.baseURL.replace('/api', '')}${selectedImport.productImage || selectedImport.image}`} 
                              alt="Foto do Produto" 
                              className="img-fluid rounded"
                              style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        ) : (
                          <div className="bg-white p-2 rounded-3 border text-muted small d-flex align-items-center gap-2">
                            <FontAwesomeIcon icon={faBoxOpen} className="text-muted" />
                            <span>Sem fotografia anexada</span>
                          </div>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col xs={12} md={6}>
                  <Card className="border-0 shadow-sm bg-light h-100 rounded-3">
                    <Card.Body className="p-3">
                      <h6 className="fw-bold text-dark mb-3 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                        💰 Resumo de Custos (Cotação Oficial)
                      </h6>
                      {selectedQuotation ? (() => {
                        const c = calculateImportDetails(
                          selectedQuotation.productCost,
                          selectedQuotation.internationalShipping,
                          selectedQuotation.customsDutyRate || 5,
                          selectedQuotation.nhiquelaCommissionRate || 30
                        );
                        return (
                          <div>
                            <div className="mb-2 small">
                              <div className="d-flex justify-content-between text-muted mb-1">
                                <span>1. Valor da Mercadoria:</span>
                                <span className="fw-semibold text-dark">{c.vm.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between text-muted mb-1">
                                <span>2. Frete Internacional:</span>
                                <span className="fw-semibold text-dark">{c.frete.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between text-muted mb-1">
                                <span>3. Seguro:</span>
                                <span className="fw-semibold text-dark">{c.seguro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between fw-bold text-primary mb-2 pt-1 border-top" style={{ color: '#8a2be2' }}>
                                <span>4. Valor Aduaneiro / CIF (VA):</span>
                                <span>{c.va.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between text-muted mb-1">
                                <span>5. Direitos Aduaneiros :</span>
                                <span className="fw-semibold text-dark">{c.da.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between text-muted mb-1">
                                <span>6. Base de Cálculo do IVA :</span>
                                <span className="fw-semibold text-dark">{c.baseIva.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between text-muted mb-1">
                                <span>7. IVA da Importação:</span>
                                <span className="fw-semibold text-dark">{c.iva.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between fw-bold text-dark mb-2 pt-1 border-top">
                                <span>Total de Importação:</span>
                                <span>{c.totalImportacao.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="d-flex justify-content-between text-muted mb-2">
                                <span>8. Taxa de Serviço Nhiquela:</span>
                                <span className="fw-semibold text-dark">{c.nhiquela.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                            </div>
                            <hr className="my-2 text-muted" />
                            <div className="mb-2 d-flex justify-content-between align-items-center flex-wrap gap-1">
                              <span className="text-muted fw-bold small">Custo Total Oficial:</span> 
                              <span className="fw-bold text-success fs-5">
                                {(selectedQuotation.totalCost || c.totalFinal).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {selectedQuotation.currency || 'MZN'}
                              </span>
                            </div>

                          <div className="mt-3 p-2.5 rounded-3" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                            <p className="fw-bold small mb-2" style={{ color: '#0369a1' }}>📅 Datas e Prazos</p>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Prazo de Entrega:</span>
                              <span className="fw-bold text-dark">{selectedQuotation.estimatedDeliveryDays ? `${selectedQuotation.estimatedDeliveryDays} dias` : 'A calcular'}</span>
                            </div>
                            {selectedQuotation.estimatedArrivalDate && (
                              <div className="d-flex justify-content-between small mb-1 flex-wrap gap-1">
                                <span className="text-muted">Previsão Chegada:</span>
                                <span className="fw-bold" style={{ color: '#8a2be2' }}>
                                  {new Date(selectedQuotation.estimatedArrivalDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                            {selectedQuotation.quotationValidUntil && (
                              <div className="d-flex justify-content-between small flex-wrap gap-1">
                                <span className="text-muted">Válida Até:</span>
                                <span className="fw-semibold text-warning-emphasis">
                                  {new Date(selectedQuotation.quotationValidUntil).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
                        <div className="text-center py-4">
                          <FontAwesomeIcon icon={faClock} className="text-muted mb-2 fs-3" />
                          <p className="text-muted small mb-0">
                            A equipa está a negociar e calcular os melhores preços de fornecedores.
                          </p>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Timeline */}
              <h6 className="fw-bold text-dark mb-3 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                🚀 Linha do Tempo
              </h6>
              <div className="timeline-container px-1 mb-3">
                {(() => {
                  const steps = [
                    { key: 'REQUESTED', label: t('importStatus.REQUESTED', 'Pedido Recebido') },
                    { key: 'QUOTATION_READY', label: 'Cotação Pronta' },
                    { key: 'ACCEPTED', label: t('importStatus.ACCEPTED', 'Pagamento em Processamento') },
                    { key: 'SHIPPED', label: 'Em Trânsito Internacional' },
                    { key: 'ARRIVED_AT_CUSTOMS', label: 'Desalfandegamento' },
                    { key: 'READY_FOR_DELIVERY', label: 'Pronto para Entrega' },
                    { key: 'DELIVERED', label: t('importStatus.DELIVERED', 'Entregue') }
                  ];
                  
                  const progression = ['REQUESTED', 'UNDER_REVIEW', 'SOURCING', 'QUOTATION_READY', 'QUOTATION_SENT', 'ACCEPTED', 'PROCESSING', 'SHIPPED', 'ARRIVED_AT_CUSTOMS', 'CUSTOMS_CLEARED', 'READY_FOR_DELIVERY', 'DELIVERED'];
                  const currentIndex = progression.indexOf(selectedImport.status);
                  
                  if (selectedImport.status === 'REJECTED' || selectedImport.status === 'CANCELLED') {
                     return [
                       { status: t('importStatus.REQUESTED', 'Pedido Recebido'), done: true, date: new Date(selectedImport.createdAt).toLocaleDateString() },
                       { status: selectedImport.status === 'REJECTED' ? t('importStatus.REJECTED', 'Pedido Rejeitado') : t('importStatus.CANCELLED', 'Pedido Cancelado'), done: true, date: new Date(selectedImport.updatedAt).toLocaleDateString() }
                     ].map((step, index, arr) => (
                        <div key={index} className="d-flex mb-2.5 position-relative">
                          <div className="d-flex flex-column align-items-center me-2.5 me-sm-3">
                            <div className="rounded-circle d-flex justify-content-center align-items-center shadow-sm z-1" 
                                 style={{ width: '28px', height: '28px', minWidth: '28px', backgroundColor: '#ef4444', color: 'white', fontSize: '0.8rem' }}>
                              <FontAwesomeIcon icon={faCheckCircle} />
                            </div>
                            {index !== arr.length - 1 && (
                              <div className="bg-secondary opacity-25 flex-grow-1 my-1" style={{ width: '2px', minHeight: '24px' }}></div>
                            )}
                          </div>
                          <div className="pb-2">
                            <h6 className="fw-bold mb-0 text-dark small">{step.status}</h6>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>{step.date}</small>
                          </div>
                        </div>
                     ));
                  }

                  const timeline = steps.map(step => {
                    const stepIndex = progression.indexOf(step.key);
                    return {
                      status: step.label,
                      date: currentIndex >= stepIndex ? new Date(selectedImport.updatedAt).toLocaleDateString() : t('importTable.pending', 'Pendente'),
                      done: currentIndex >= stepIndex
                    };
                  });

                  return timeline.map((step, index, arr) => (
                    <div key={index} className="d-flex mb-2.5 position-relative">
                      <div className="d-flex flex-column align-items-center me-2.5 me-sm-3">
                        <div 
                          className="rounded-circle d-flex justify-content-center align-items-center shadow-sm z-1" 
                          style={{ 
                            width: '28px', 
                            height: '28px', 
                            minWidth: '28px',
                            backgroundColor: step.done ? '#8a2be2' : '#e2e8f0', 
                            color: step.done ? 'white' : '#94a3b8',
                            fontSize: '0.8rem'
                          }}
                        >
                          {step.done ? <FontAwesomeIcon icon={faCheckCircle} /> : <FontAwesomeIcon icon={faClock} />}
                        </div>
                        {index !== arr.length - 1 && (
                          <div className="bg-secondary opacity-25 flex-grow-1 my-1" style={{ width: '2px', minHeight: '24px' }}></div>
                        )}
                      </div>
                      <div className="pb-2">
                        <h6 className={`fw-bold mb-0 small ${step.done ? 'text-dark' : 'text-muted'}`}>{step.status}</h6>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>{step.date}</small>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Payment Proof Form if quotation ready */}
              {(selectedImport?.status === 'QUOTATION_READY' || selectedImport?.status === 'SENT') && selectedQuotation && (
                <div className="mt-3 p-3 p-sm-4 rounded-3 bg-white border shadow-sm">
                  <h6 className="fw-bold mb-2 text-dark fs-6 d-flex align-items-center gap-2">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-primary" />
                    <span>Comprovativo de Pagamento</span>
                  </h6>
                  <p className="text-muted small mb-3">
                    Para aceitar a cotação, realize o pagamento para uma das contas abaixo e anexe o comprovativo.
                  </p>
                  
                  <div className="bg-light p-3 rounded-3 mb-3">
                    <p className="mb-2 fw-bold text-dark small">Dados para Pagamento (Nhiquela Lda)</p>
                    <div className="d-flex flex-column gap-2 small">
                      {paymentAccounts.length > 0 ? paymentAccounts.map((acc, i) => (
                        <div key={acc._id} className={`d-flex justify-content-between flex-wrap gap-1 ${i < paymentAccounts.length - 1 ? 'border-bottom pb-2 border-secondary border-opacity-25' : ''}`}>
                          <span className="text-muted">{acc.icon} {acc.name}:</span>
                          <div className="text-end">
                            <span className="fw-bold text-dark d-block">{acc.accountNumber}</span>
                            {acc.accountName && <span className="text-muted d-block" style={{fontSize:'0.72rem'}}>{acc.accountName}</span>}
                            {acc.notes && <span className="text-muted fst-italic d-block" style={{fontSize:'0.72rem'}}>{acc.notes}</span>}
                          </div>
                        </div>
                      )) : (
                        <>
                          <div className="d-flex justify-content-between border-bottom pb-1 border-secondary border-opacity-25">
                            <span className="text-muted">M-Pesa:</span>
                            <span className="fw-bold text-dark">84 123 4567</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Millennium BIM:</span>
                            <span className="fw-bold text-dark">123456789</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Form.Group>
                    <Form.Label className="small fw-bold text-dark mb-1">Anexar Ficheiro (.jpg, .png, .pdf)</Form.Label>
                    <Form.Control 
                      type="file" 
                      size="sm" 
                      accept="image/*,application/pdf" 
                      onChange={handlePaymentProofChange} 
                      className="form-control-mobile"
                    />
                  </Form.Group>
                  {paymentProofFile && (
                    <p className="text-success small mt-2 fw-bold mb-0">
                      ✓ Ficheiro: {paymentProofFile.name}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0 px-3 px-sm-4 pb-3 pb-sm-4">
          <div className="d-flex flex-column flex-sm-row gap-2 w-100 justify-content-between align-items-stretch align-items-sm-center">
            {/* Left Actions */}
            <div className="d-flex gap-2 order-2 order-sm-1">
              <Button 
                variant="outline-danger" 
                size="sm"
                className="fw-bold px-3 py-2 rounded-pill flex-grow-1 flex-sm-grow-0" 
                onClick={() => handleDeleteRequest(selectedImport?._id || selectedImport?.id)}
              >
                <FontAwesomeIcon icon={faTrash} className="me-1.5" />
                {t('importTable.remove', 'Remover')}
              </Button>
              <Button 
                variant="outline-dark" 
                size="sm"
                className="fw-bold px-3 py-2 rounded-pill flex-grow-1 flex-sm-grow-0" 
                onClick={() => handleDownloadPDF(selectedImport)}
              >
                <FontAwesomeIcon icon={faFilePdf} className="me-1.5 text-danger" />
                PDF
              </Button>
            </div>

            {/* Right Actions */}
            <div className="d-flex gap-2 order-1 order-sm-2 ms-sm-auto">
              <Button 
                variant="light" 
                size="sm"
                className="fw-bold px-4 py-2 rounded-pill flex-grow-1 flex-sm-grow-0" 
                onClick={() => setShowDetails(false)}
              >
                Fechar
              </Button>
              {(selectedImport?.status === 'QUOTATION_READY' || selectedImport?.status === 'SENT') && selectedQuotation && (
                <Button 
                  variant="primary" 
                  size="sm"
                  className="fw-bold px-4 py-2 rounded-pill shadow-sm text-white flex-grow-1 flex-sm-grow-0" 
                  style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} 
                  onClick={handleAcceptQuotation}
                >
                  <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-1.5" />
                  Aceitar e Criar Ordem
                </Button>
              )}
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Modal Oficial de Consulta da Pauta Aduaneira */}
      <PautaAduaneiraModal
        show={showPautaModal}
        onHide={() => setShowPautaModal(false)}
        selectedId={pautaModalTarget === 'simulator' ? selectedSimCategory?.id : selectedRequestCategory?.id}
        onSelectCategory={(category) => {
          if (pautaModalTarget === 'simulator') {
            setSelectedSimCategory(category);
            setSimTaxaPautal(category.daRate);
            setSimIvaRate(category.ivaRate);
            setSimIceRate(category.iceRate);
            toast.success(`Classificação aplicada: ${category.name}`);
          } else {
            setSelectedRequestCategory(category);
            toast.success(`Classificação selecionada: ${category.name}`);
          }
        }}
      />

      {/* Scoped Styles for ultra responsiveness */}
      <style>{`
        .custom-tabs {
          display: flex;
          flex-wrap: nowrap;
          border-bottom: 2px solid #f1f5f9;
        }
        .custom-tabs .nav-item {
          flex: 1 1 33.333%;
          text-align: center;
        }
        .custom-tabs .nav-link {
          width: 100%;
          color: #64748b;
          font-weight: 600;
          border: none;
          border-bottom: 3px solid transparent;
          padding: 0.9rem 0.4rem;
          font-size: 0.92rem;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .custom-tabs .nav-link.active {
          color: #8a2be2;
          background: transparent;
          border-bottom: 3px solid #8a2be2;
          font-weight: 700;
        }
        .custom-tabs .nav-link:hover:not(.active) {
          border-bottom: 3px solid #cbd5e1;
          color: #1e293b;
        }

        .import-card-mobile {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .import-card-mobile:active {
          transform: scale(0.99);
          background-color: #faf5ff;
        }

        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 576px) {
          .custom-tabs .nav-link {
            font-size: 0.76rem !important;
            padding: 0.65rem 0.1rem !important;
            letter-spacing: -0.2px;
          }
          .form-control-mobile {
            font-size: 16px !important; /* Prevents auto-zoom in iOS Safari */
          }
          .modal-responsive {
            margin: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
