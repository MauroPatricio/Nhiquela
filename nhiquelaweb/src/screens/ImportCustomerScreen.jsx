import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Tabs, Tab, Badge, Table, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faSearch, faCamera, faFileInvoiceDollar, faCheckCircle, faClock, faTimes, faBoxOpen, faPlaneDeparture, faTruckLoading, faFilePdf, faTrash } from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { selectUser } from '../store/features/userSlice';

export default function ImportCustomerScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('request');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const userInfo = useSelector(selectUser);

  useEffect(() => {
    if (!userInfo) {
      toast.info('Faça login para aceder à Importação');
      navigate('/login?redirect=/shop/import');
    }
  }, [userInfo, navigate]);
  
  const [myImports, setMyImports] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);

  const handleDeleteRequest = async (impId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(t('importTable.confirmDelete', 'Tem certeza de que deseja remover este pedido de importação?'))) {
      try {
        await api.delete('/import/requests/' + impId);
        toast.success(t('importTable.deleteSuccess', 'Pedido de importação removido com sucesso!'));
        fetchMyImports();
      } catch (err) {
        toast.error(t('importTable.deleteError', 'Erro ao remover pedido de importação.'));
      }
    }
  };

  const fetchMyImports = async () => {
    try {
      // Assuming api automatically passes the user token/cookie
      const response = await api.get('/import/requests');
      setMyImports(response.data);
    } catch (err) {
      toast.error('Erro ao buscar suas importações.');
    }
  };

  useEffect(() => {
    fetchMyImports();
    api.get('/payment-accounts').then(res => setPaymentAccounts(res.data)).catch(() => {});
  }, []);


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


  const handleDownloadPDF = (imp) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(138, 43, 226); // Brand color #8a2be2
    doc.text('NHIQUELA IMPORT', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Cotação Oficial de Importação', 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID do Pedido: ${imp.id}`, 14, 40);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 46);
    doc.text(`Estimativa de Entrega: ${imp.eta}`, 14, 52);
    
    // Line Separator
    doc.setDrawColor(200);
    doc.line(14, 58, 196, 58);

    // Product Details Table
    doc.autoTable({
      startY: 65,
      head: [['Detalhes do Produto', 'Valor']],
      body: [
        ['Produto Solicitado', imp.product],
        ['País de Origem', imp.origin],
        ['Descrição', imp.description || 'N/A'],
        ['Estado Actual', imp.status],
      ],
      theme: 'grid',
      headStyles: { fillColor: [138, 43, 226] }
    });

    // Costs
    const finalY = doc.lastAutoTable.finalY || 120;
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Resumo de Custos', 14, finalY + 15);
    
    doc.autoTable({
      startY: finalY + 20,
      head: [['Descrição', 'Valor (Estimativa)']],
      body: [
        ['Custos do Produto, Frete & Desalfandegamento', 'Incluído'],
        ['Taxa de Serviço Nhiquela', 'Incluído'],
        ['Custo Total da Cotação', imp.totalCost],
      ],
      theme: 'plain',
      styles: { fontSize: 11 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Nota: O valor apresentado inclui todos os custos necessários até a entrega no destino final.', 14, doc.lastAutoTable.finalY + 15);

    doc.save(`cotacao_${imp.id}.pdf`);
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
    
    if (!imageFile) {
      toast.error('A fotografia do produto é obrigatória para solicitar cotação.');
      return;
    }

    // Recupera userInfo do localStorage se existir, ou usa um ID de teste genérico
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
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
        return;
      }

      // Build payload mapping from form elements
      const payload = {
        customerId: userInfo._id || '64e3c1f2b3b3a2a1a1a1a1a1', // Mock object ID if no user is logged in
        productName: e.target[0].value,
        quantity: e.target[1].value,
        description: e.target[2].value,
        productUrl: e.target[3].value,
        preferredOriginCountry: e.target[4].value,
        shippingMethod: e.target[5].value,
        productImage: uploadedImageUrl
      };

      await api.post('/import/requests', payload);
      toast.success('Pedido de importação enviado com sucesso! A nossa equipa já está a analisar.');
      e.target.reset();
      removeImage();
      fetchMyImports();
      setActiveTab('my-imports');
    } catch (err) {
      toast.error('Erro ao submeter o pedido.');
    }
  };

  return (
    <div className="bg-light min-vh-100 py-5">
      <Container>
        <div className="text-center mb-5">
          <div className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm mb-3" style={{ width: '80px', height: '80px' }}>
            <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '2.5rem', color: '#8a2be2' }} />
          </div>
          <h1 className="fw-black text-dark">Nhiquela Import</h1>
          <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>
            Acesso directo aos maiores mercados do mundo. Diga-nos o que precisa, e nós tratamos de tudo até à sua porta.
          </p>
        </div>

        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Header className="bg-white border-0 pt-4 pb-0 px-4">
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="border-bottom custom-tabs"
            >
              <Tab eventKey="request" title={t("importTable.requestProduct", "Pedir Produto")} />
              <Tab eventKey="my-imports" title={t("importTable.myImports", "Minhas Importações")} />
            </Tabs>
          </Card.Header>
          <Card.Body className="p-4 p-md-5">
            
            {activeTab === 'request' && (
              <Row className="justify-content-center">
                <Col lg={8}>
                  <h4 className="fw-bold mb-4">O que deseja importar?</h4>
                  <Form onSubmit={handleSubmitRequest}>
                    <Row className="g-3">
                      <Col md={8}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Nome do Produto *</Form.Label>
                          <Form.Control type="text" placeholder="Ex: Máquina de fazer gelo 50kg/dia" required className="py-2" />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Quantidade *</Form.Label>
                          <Form.Control type="number" defaultValue={1} min={1} required className="py-2" />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Descrição Detalhada *</Form.Label>
                          <Form.Control as="textarea" rows={3} placeholder="Descreva o produto, cor, voltagem, marca, etc." required />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Link do Produto (Opcional)</Form.Label>
                          <Form.Control type="url" placeholder="https://alibaba.com/..." className="py-2" />
                          <Form.Text className="text-muted">Se viu o produto nalgum site, cole o link aqui para ajudar no sourcing.</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">País de Origem Preferencial</Form.Label>
                          <Form.Select className="py-2" defaultValue="China">
                            <option value="China">🇨🇳 China</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-semibold">Tipo de Envio</Form.Label>
                          <Form.Select className="py-2" defaultValue="AIR">
                            <option value="AIR">✈️ Aéreo (Rápido) — 5 a 7 dias</option>
                            <option value="SEA">🚢 Marítimo (Barato) — 35 a 45 dias</option>
                          </Form.Select>
                          <Form.Text className="text-muted">
                            Aéreo é mais rápido mas tem custo superior. Marítimo é mais económico para volumes maiores.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      
                      {/* Photo Upload Area */}
                      <Col md={12} className="mt-4">
                        <div className="border border-2 border-dashed rounded-4 p-4 text-center position-relative" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="d-none" 
                            ref={fileInputRef} 
                            onChange={handleImageChange}
                          />
                          
                          {imagePreview ? (
                            <div className="position-relative d-inline-block">
                              <img src={imagePreview} alt="Preview" className="img-fluid rounded-3 shadow-sm" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="position-absolute top-0 end-0 rounded-circle m-2 shadow" 
                                style={{ width: '30px', height: '30px', padding: 0 }}
                                onClick={removeImage}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faCamera} className="text-muted fs-2 mb-2" />
                              <h6 className="fw-bold">Adicionar Fotografia *</h6>
                              <p className="text-muted small mb-3">Obrigatório. Ajuda-nos a encontrar exactamente o que procura</p>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                className="rounded-pill px-4"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                Selecionar Imagem
                              </Button>
                            </>
                          )}
                        </div>
                      </Col>

                      <Col md={12} className="mt-4 text-end">
                        <Button type="submit" className="btn text-white px-5 py-3 rounded-pill fw-bold shadow-sm" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }}>
                          <FontAwesomeIcon icon={faSearch} className="me-2" /> Solicitar Cotação
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Col>
              </Row>
            )}

            {activeTab === 'my-imports' && (
              <div>
                <h4 className="fw-bold mb-4">As Suas Importações</h4>
                <div className="table-responsive">
                  <Table hover className="align-middle border-bottom">
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
                      {myImports.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center text-muted py-4">{t('importTable.noImportsFound', 'Nenhuma importação encontrada. Crie o seu primeiro pedido!')}</td>
                        </tr>
                      ) : (
                        myImports.map((imp, idx) => (
                          <tr key={imp._id || idx} style={{ cursor: 'pointer' }} onClick={() => handleShowDetails(imp)}>
                            <td className="fw-bold" style={{ color: '#8a2be2' }}>{imp._id ? imp._id.substring(imp._id.length - 8).toUpperCase() : imp.id}</td>
                            <td className="fw-medium text-dark">{imp.productName || imp.product}</td>
                        <td>{imp.preferredOriginCountry || imp.origin}</td>
                        <td>
                          <Badge bg="light" className="text-dark border rounded-pill px-3 py-2 fw-semibold">
                            {imp.shippingMethod === "SEA" ? t('importTable.sea', 'Marítimo') : t('importTable.air', 'Aéreo')}
                          </Badge>
                        </td>
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
                    <td className="text-end text-nowrap">
                      <Button variant="outline-dark" size="sm" className="rounded-pill px-3 fw-bold me-2" onClick={(e) => { e.stopPropagation(); handleShowDetails(imp); }}>{t('importTable.details', 'Detalhes')}</Button>
                      <Button variant="outline-danger" size="sm" className="rounded-pill px-3 fw-bold" onClick={(e) => handleDeleteRequest(imp._id || imp.id, e)}>
                         <FontAwesomeIcon icon={faTrash} className="me-1" /> {t('importTable.remove', 'Remover')}
                     </Button>
                  </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
            
          </Card.Body>
        </Card>
      </Container>
      
      {/* Detalhes do Pedido (Modal) */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-black text-dark d-flex align-items-center gap-2">
            <FontAwesomeIcon icon={faBoxOpen} className="text-primary-custom" style={{ color: '#8a2be2' }} />
            Detalhes da Importação
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 px-4 pb-4">
          {selectedImport && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                  <h6 className="text-muted mb-1">ID do Pedido</h6>
                  <h4 className="fw-bold m-0" style={{ color: '#8a2be2' }}>{selectedImport._id ? selectedImport._id.substring(selectedImport._id.length - 8).toUpperCase() : selectedImport.id}</h4>
                </div>
                <div className="text-end">
                  <Badge bg="warning" className="rounded-pill px-3 py-2 text-dark shadow-sm">
                    {t(`importStatus.${selectedImport.status}`, selectedImport.status)}
                  </Badge>
                  <div className="mt-2 text-muted small fw-bold">Estimativa: {selectedImport.eta || 'A Calcular'}</div>
                </div>
              </div>

              <Row className="g-4 mb-4">
                <Col md={6}>
                  <Card className="border-0 shadow-sm bg-light h-100">
                    <Card.Body>
                      <h6 className="fw-bold text-dark mb-3">Informações do Produto</h6>
                      <p className="mb-1"><span className="text-muted">Nome:</span> <span className="fw-bold">{selectedImport.productName || selectedImport.product}</span></p>
                      <p className="mb-1"><span className="text-muted">Origem:</span> <span className="fw-bold">{selectedImport.preferredOriginCountry || selectedImport.origin}</span></p>
                      <p className="mb-1"><span className="text-muted">Descrição:</span> {selectedImport.description || 'N/A'}</p>
                      
                      <div className="mt-3 pt-2 border-top">
                        <span className="text-muted small fw-bold d-block mb-2">Fotografia do Produto:</span>
                        {(selectedImport.productImage || selectedImport.image) ? (
                          <div className="bg-white p-2 rounded border d-inline-block shadow-sm">
                            <img 
                              src={(selectedImport.productImage || selectedImport.image).startsWith('http') 
                                ? (selectedImport.productImage || selectedImport.image) 
                                : `${api.defaults.baseURL.replace('/api', '')}${selectedImport.productImage || selectedImport.image}`} 
                              alt="Foto do Produto" 
                              className="img-fluid rounded"
                              style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        ) : (
                          <div className="bg-white p-2 rounded border text-muted small d-flex align-items-center gap-2">
                            <FontAwesomeIcon icon={faBoxOpen} className="text-muted" />
                            <span>Sem fotografia anexada</span>
                          </div>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 shadow-sm bg-light h-100">
                    <Card.Body>
                      <h6 className="fw-bold text-dark mb-3">Resumo de Custos (Cotação)</h6>
                      {selectedQuotation ? (
                        <>
                          <div className="mb-2">
                            {selectedQuotation.productCost > 0 && (
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Custo do Produto:</span>
                                <span>{selectedQuotation.productCost?.toFixed(2)} {selectedQuotation.currency || 'MZN'}</span>
                              </div>
                            )}
                            {selectedQuotation.internationalShipping > 0 && (
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Frete Internacional:</span>
                                <span>{selectedQuotation.internationalShipping?.toFixed(2)} {selectedQuotation.currency || 'MZN'}</span>
                              </div>
                            )}
                            {selectedQuotation.customsEstimated > 0 && (
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Despacho Aduaneiro:</span>
                                <span>{selectedQuotation.customsEstimated?.toFixed(2)} {selectedQuotation.currency || 'MZN'}</span>
                              </div>
                            )}
                            {selectedQuotation.nhiquelaServiceFee > 0 && (
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Comissão Nhiquela:</span>
                                <span>{selectedQuotation.nhiquelaServiceFee?.toFixed(2)} {selectedQuotation.currency || 'MZN'}</span>
                              </div>
                            )}
                          </div>
                          <hr className="my-2 text-muted" />
                          <p className="mb-1 d-flex justify-content-between align-items-center">
                            <span className="text-muted fw-bold">Custo Total:</span> 
                            <span className="fw-bold text-success fs-5">
                              {(selectedQuotation.totalCost || selectedQuotation.totalFinalCost || 0).toLocaleString('pt-PT')} {selectedQuotation.currency || 'MZN'}
                            </span>
                          </p>
                          <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                            <p className="fw-bold small mb-2" style={{ color: '#0369a1' }}>📅 Datas e Prazos</p>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Prazo de Entrega:</span>
                              <span className="fw-bold text-dark">{selectedQuotation.estimatedDeliveryDays ? `${selectedQuotation.estimatedDeliveryDays} dias` : 'A calcular'}</span>
                            </div>
                            {selectedQuotation.estimatedArrivalDate && (
                              <div className="d-flex justify-content-between small mb-1">
                                <span className="text-muted">Data Prevista de Chegada:</span>
                                <span className="fw-bold" style={{ color: '#8a2be2' }}>
                                  {new Date(selectedQuotation.estimatedArrivalDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                            {selectedQuotation.quotationValidUntil && (
                              <div className="d-flex justify-content-between small">
                                <span className="text-muted">Cotação Válida Até:</span>
                                <span className="fw-semibold text-warning-emphasis">
                                  {new Date(selectedQuotation.quotationValidUntil).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-muted small mb-0">
                          Aguardando elaboração da cotação pela equipa.
                        </p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <h6 className="fw-bold text-dark mb-3">Linha do Tempo</h6>
              <div className="timeline-container px-2">
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
                  
                  // Filter out later steps if it was rejected or cancelled
                  if (selectedImport.status === 'REJECTED' || selectedImport.status === 'CANCELLED') {
                     return [
                       { status: t('importStatus.REQUESTED', 'Pedido Recebido'), done: true, date: new Date(selectedImport.createdAt).toLocaleDateString() },
                       { status: selectedImport.status === 'REJECTED' ? t('importStatus.REJECTED', 'Pedido Rejeitado') : t('importStatus.CANCELLED', 'Pedido Cancelado'), done: true, date: new Date(selectedImport.updatedAt).toLocaleDateString() }
                     ].map((step, index, arr) => (
                        <div key={index} className="d-flex mb-3 position-relative">
                          <div className="d-flex flex-column align-items-center me-3">
                            <div className={`rounded-circle d-flex justify-content-center align-items-center shadow-sm z-1`} 
                                 style={{ width: '32px', height: '32px', backgroundColor: '#ef4444', color: 'white' }}>
                              <FontAwesomeIcon icon={faCheckCircle} />
                            </div>
                            {index !== arr.length - 1 && (
                              <div className="bg-secondary opacity-25 flex-grow-1 my-1" style={{ width: '2px', minHeight: '30px' }}></div>
                            )}
                          </div>
                          <div className="pb-3">
                            <h6 className={`fw-bold mb-1 text-dark`}>{step.status}</h6>
                            <small className="text-muted">{step.date}</small>
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
                  <div key={index} className="d-flex mb-3 position-relative">
                    <div className="d-flex flex-column align-items-center me-3">
                      <div className={`rounded-circle d-flex justify-content-center align-items-center shadow-sm z-1`} 
                           style={{ width: '32px', height: '32px', backgroundColor: step.done ? '#8a2be2' : '#e2e8f0', color: step.done ? 'white' : '#94a3b8' }}>
                        {step.done ? <FontAwesomeIcon icon={faCheckCircle} /> : <FontAwesomeIcon icon={faClock} />}
                      </div>
                      {index !== arr.length - 1 && (
                        <div className="bg-secondary opacity-25 flex-grow-1 my-1" style={{ width: '2px', minHeight: '30px' }}></div>
                      )}
                    </div>
                    <div className="pb-3">
                      <h6 className={`fw-bold mb-1 ${step.done ? 'text-dark' : 'text-muted'}`}>{step.status}</h6>
                      <small className="text-muted">{step.date}</small>
                    </div>
                  </div>
                ))})()}
              </div>

              {(selectedImport?.status === 'QUOTATION_READY' || selectedImport?.status === 'SENT') && selectedQuotation && (
                <div className="mt-4 p-4 rounded bg-white border shadow-sm">
                  <h6 className="fw-bold mb-3 text-dark"><FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2 text-primary" />Comprovativo de Pagamento</h6>
                  <p className="text-muted small mb-3">Para aceitar a cotação, por favor realize o pagamento para uma das contas abaixo e anexe o comprovativo.</p>
                  
                  <div className="bg-light p-3 rounded mb-4">
                    <p className="mb-2 fw-bold text-dark" style={{ fontSize: '0.85rem' }}>Dados para Pagamento (Nhiquela Lda)</p>
                    <div className="d-flex flex-column gap-2 small">
                      {paymentAccounts.length > 0 ? paymentAccounts.map((acc, i) => (
                        <div key={acc._id} className={`d-flex justify-content-between ${i < paymentAccounts.length - 1 ? 'border-bottom pb-1 border-secondary border-opacity-25' : ''}`}>
                          <span className="text-muted">{acc.icon} {acc.name}:</span>
                          <div className="text-end">
                            <span className="fw-bold text-dark d-block">{acc.accountNumber}</span>
                            {acc.accountName && <span className="text-muted" style={{fontSize:'0.75rem'}}>{acc.accountName}</span>}
                            {acc.notes && <span className="text-muted fst-italic d-block" style={{fontSize:'0.75rem'}}>{acc.notes}</span>}
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
                    <Form.Label className="small fw-bold text-dark">Anexar Ficheiro (.jpg, .png, .pdf)</Form.Label>
                    <Form.Control type="file" size="sm" accept="image/*,application/pdf" onChange={handlePaymentProofChange} />
                  </Form.Group>
                  {paymentProofFile && <p className="text-success small mt-2 fw-bold mb-0">Ficheiro selecionado: {paymentProofFile.name}</p>}
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 px-4 pb-4">
          <Button variant="outline-dark" className="fw-bold px-4 rounded-pill shadow-sm" onClick={() => handleDownloadPDF(selectedImport)}>
            <FontAwesomeIcon icon={faFilePdf} className="me-2 text-danger" />
            Imprimir / PDF
          </Button>
          <Button variant="light" className="fw-bold px-4 rounded-pill shadow-sm ms-auto" onClick={() => setShowDetails(false)}>
            Fechar
          </Button>
          {(selectedImport?.status === 'QUOTATION_READY' || selectedImport?.status === 'SENT') && selectedQuotation && (
             <Button variant="primary" className="fw-bold px-4 rounded-pill shadow-sm" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} onClick={handleAcceptQuotation}>
               <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2" />
               Aceitar e Criar Ordem
             </Button>
          )}
        </Modal.Footer>
      </Modal>

      <style>{`
        .custom-tabs .nav-link {
          color: #64748b;
          font-weight: 600;
          border: none;
          border-bottom: 3px solid transparent;
          padding: 1rem 1.5rem;
        }
        .custom-tabs .nav-link.active {
          color: #8a2be2;
          background: transparent;
          border-bottom: 3px solid #8a2be2;
        }
        .custom-tabs .nav-link:hover:not(.active) {
          border-bottom: 3px solid #cbd5e1;
        }
      `}</style>
    </div>
  );
}
