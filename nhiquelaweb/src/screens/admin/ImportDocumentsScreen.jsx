import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faUpload, faFileInvoice, faSearch, faTrash, faDownload, faFilePdf, faImage } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';
import { toast } from 'react-toastify';

export default function ImportDocumentsScreen() {
  const [documents, setDocuments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    importOrderId: '',
    type: 'INVOICE',
    fileName: ''
  });
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/import/documents');
      setDocuments(response.data);
    } catch (err) {
      toast.error('Erro ao buscar documentos.');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/import/orders');
      setOrders(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchOrders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.importOrderId || !formData.type || !formData.fileName) {
      return toast.warning('Preencha todos os campos obrigatórios.');
    }
    
    try {
      // Em ambiente real, anexaríamos o ficheiro via FormData para upload (S3, Cloudinary).
      // Aqui usamos os dados de mock para persistência no banco.
      await api.post('/import/documents', formData);
      toast.success('Documento arquivado com sucesso!');
      setShowModal(false);
      setFormData({ importOrderId: '', type: 'INVOICE', fileName: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err) {
      toast.error('Erro ao arquivar documento.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este documento permanentemente?')) {
      try {
        await api.delete(`/import/documents/${id}`);
        toast.success('Documento removido.');
        fetchDocuments();
      } catch (err) {
        toast.error('Erro ao remover documento.');
      }
    }
  };

  const filteredDocs = documents.filter(d => 
    (d.fileName || '').toLowerCase().includes(search.toLowerCase()) || 
    (d.importOrderId?._id || '').toLowerCase().includes(search.toLowerCase())
  );

  const getDocIcon = (type) => {
    switch (type) {
      case 'INVOICE': return <FontAwesomeIcon icon={faFileInvoice} className="text-primary" />;
      case 'PAYMENT_PROOF': return <FontAwesomeIcon icon={faImage} className="text-success" />;
      case 'PACKING_LIST': return <FontAwesomeIcon icon={faFolderOpen} className="text-warning" />;
      default: return <FontAwesomeIcon icon={faFilePdf} className="text-danger" />;
    }
  };

  const getDocTypeBadge = (type) => {
    switch (type) {
      case 'INVOICE': return 'Fatura Proforma/Comercial';
      case 'PACKING_LIST': return 'Packing List';
      case 'PAYMENT_PROOF': return 'Comprovativo Pagamento';
      case 'SHIPPING_DOCUMENT': return 'Bill of Lading / Airway Bill';
      case 'CUSTOMS_DOCUMENT': return 'Despacho Aduaneiro';
      case 'RECEIPT': return 'Recibo';
      default: return 'Outro Documento';
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
            <FontAwesomeIcon icon={faFolderOpen} className="text-primary-custom me-2" />
            Gestão de Documentos
          </h2>
          <p className="text-muted mb-0">Arquivo digital de faturas, packing lists e despachos alfandegários.</p>
        </div>
        <div>
           <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} onClick={() => setShowModal(true)}>
             <FontAwesomeIcon icon={faUpload} className="me-2" />
             Novo Documento
           </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Header className="bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">Arquivo Digital</h5>
          <div className="position-relative" style={{ width: '300px' }}>
            <FontAwesomeIcon icon={faSearch} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <Form.Control 
              type="text" 
              placeholder="Pesquisar documento ou ID..." 
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
                  <th className="fw-semibold border-0 rounded-start">Ficheiro</th>
                  <th className="fw-semibold border-0">Tipo de Documento</th>
                  <th className="fw-semibold border-0">Ordem Associada</th>
                  <th className="fw-semibold border-0">Data</th>
                  <th className="fw-semibold border-0 text-end rounded-end">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      Nenhum documento arquivado.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((d) => (
                    <tr key={d._id}>
                      <td className="fw-bold text-dark">
                        <div className="d-flex align-items-center">
                          <div className="me-3 fs-4">
                            {getDocIcon(d.type)}
                          </div>
                          <div>
                            <div>{d.fileName}</div>
                            <small className="text-muted">PDF / Imagem</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge bg="light" text="dark" className="border shadow-sm px-3 py-2 rounded-pill">
                          {getDocTypeBadge(d.type)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg="secondary" className="px-3 py-2 rounded-pill shadow-sm bg-opacity-75">
                          {d.importOrderId?._id ? d.importOrderId._id.substring(d.importOrderId._id.length - 8).toUpperCase() : 'N/A'}
                        </Badge>
                      </td>
                      <td className="text-muted">
                        {new Date(d.createdAt).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="text-end">
                        <a href={d.fileUrl} target="_blank" rel="noreferrer">
                          <Button variant="light" size="sm" className="rounded-circle text-primary shadow-sm me-2" style={{ width: '35px', height: '35px' }} title="Descarregar">
                            <FontAwesomeIcon icon={faDownload} />
                          </Button>
                        </a>
                        <Button variant="light" size="sm" className="rounded-circle text-danger shadow-sm" style={{ width: '35px', height: '35px' }} title="Remover" onClick={() => handleDelete(d._id)}>
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

      {/* Modal Upload Documento */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">Arquivar Novo Documento</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="pt-4">
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Ordem de Importação *</Form.Label>
                  <Form.Select required value={formData.importOrderId} onChange={e => setFormData({...formData, importOrderId: e.target.value})} className="bg-light py-2">
                    <option value="">Selecione a Ordem...</option>
                    {orders.map(o => (
                      <option key={o._id} value={o._id}>
                        [{o._id.substring(o._id.length - 8).toUpperCase()}] - {o.customerId?.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Tipo de Documento *</Form.Label>
                  <Form.Select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="bg-light">
                    <option value="INVOICE">Fatura</option>
                    <option value="PACKING_LIST">Packing List</option>
                    <option value="PAYMENT_PROOF">Comprovativo de Pagamento</option>
                    <option value="SHIPPING_DOCUMENT">Documento de Transporte</option>
                    <option value="CUSTOMS_DOCUMENT">Despacho Aduaneiro</option>
                    <option value="RECEIPT">Recibo</option>
                    <option value="OTHER">Outro</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Nome do Ficheiro *</Form.Label>
                  <Form.Control required placeholder="Ex: Invoice_ABC.pdf" value={formData.fileName} onChange={e => setFormData({...formData, fileName: e.target.value})} className="bg-light" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Ficheiro (PDF/JPG/PNG) *</Form.Label>
                  <Form.Control type="file" ref={fileInputRef} required className="bg-light" onChange={e => {
                      if(e.target.files.length > 0 && !formData.fileName) {
                          setFormData({...formData, fileName: e.target.files[0].name});
                      }
                  }} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={() => setShowModal(false)} className="rounded-pill px-4 fw-bold">Cancelar</Button>
            <Button type="submit" variant="primary" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} className="rounded-pill px-4 fw-bold shadow-sm">
              <FontAwesomeIcon icon={faUpload} className="me-2" /> Fazer Upload
            </Button>
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
