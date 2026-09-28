import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIndustry, faPlus, faEdit, faTrash, faSearch, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';
import { toast } from 'react-toastify';

export default function ImportSuppliersScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    _id: '',
    companyName: '',
    country: '',
    contactName: '',
    email: '',
    phone: '',
    platform: 'Outro',
    website: '',
    notes: ''
  });

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/import/suppliers');
      setSuppliers(response.data);
    } catch (err) {
      toast.error('Erro ao buscar fornecedores internacionais.');
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenModal = (supplier = null) => {
    if (supplier) {
      setIsEditing(true);
      setFormData({
        _id: supplier._id,
        companyName: supplier.companyName,
        country: supplier.country,
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        platform: supplier.platform || 'Outro',
        website: supplier.website || '',
        notes: supplier.notes || ''
      });
    } else {
      setIsEditing(false);
      setFormData({
        _id: '',
        companyName: '',
        country: '',
        contactName: '',
        email: '',
        phone: '',
        platform: 'Outro',
        website: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/import/suppliers/${formData._id}`, formData);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await api.post('/import/suppliers', formData);
        toast.success('Novo fornecedor internacional registado!');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      toast.error('Erro ao guardar o fornecedor.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este fornecedor?')) {
      try {
        await api.delete(`/import/suppliers/${id}`);
        toast.success('Fornecedor removido com sucesso!');
        fetchSuppliers();
      } catch (err) {
        toast.error('Erro ao remover fornecedor.');
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.companyName.toLowerCase().includes(search.toLowerCase()) || 
    s.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
            <FontAwesomeIcon icon={faIndustry} className="text-primary-custom me-2" />
            Fornecedores Internacionais
          </h2>
          <p className="text-muted mb-0">Gestão do directório de fabricantes e fábricas exclusivas do Nhiquela Import.</p>
        </div>
        <div>
           <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} onClick={() => handleOpenModal()}>
             <FontAwesomeIcon icon={faPlus} className="me-2" />
             Novo Fornecedor
           </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Header className="bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">Directório de Fornecedores</h5>
          <div className="position-relative" style={{ width: '300px' }}>
            <FontAwesomeIcon icon={faSearch} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <Form.Control 
              type="text" 
              placeholder="Procurar empresa ou país..." 
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
                  <th className="fw-semibold border-0 rounded-start">Empresa</th>
                  <th className="fw-semibold border-0">País</th>
                  <th className="fw-semibold border-0">Plataforma</th>
                  <th className="fw-semibold border-0">Contacto / Email</th>
                  <th className="fw-semibold border-0 text-end rounded-end">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      Nenhum fornecedor encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup._id} className="transition-all" style={{ cursor: 'default' }}>
                      <td className="fw-bold text-dark">
                        {sup.companyName}
                        {sup.website && (
                          <a href={sup.website} target="_blank" rel="noreferrer" className="ms-2 text-primary-custom" title="Visitar Website">
                            <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" />
                          </a>
                        )}
                      </td>
                      <td>
                        <Badge bg="light" text="dark" className="border shadow-sm px-3 py-2 rounded-pill">
                          {sup.country}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg="secondary" className="px-3 py-2 rounded-pill shadow-sm bg-opacity-75">
                          {sup.platform}
                        </Badge>
                      </td>
                      <td className="text-muted">
                        <div className="fw-medium text-dark">{sup.contactName || '--'}</div>
                        <div className="small">{sup.email || '--'}</div>
                      </td>
                      <td className="text-end">
                        <Button variant="light" size="sm" className="rounded-circle text-primary shadow-sm me-2" style={{ width: '35px', height: '35px' }} onClick={() => handleOpenModal(sup)}>
                          <FontAwesomeIcon icon={faEdit} />
                        </Button>
                        <Button variant="light" size="sm" className="rounded-circle text-danger shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => handleDelete(sup._id)}>
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

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">
            {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor Internacional'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="pt-4">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Nome da Empresa / Fábrica *</Form.Label>
                  <Form.Control type="text" required placeholder="Ex: Guangzhou Tech Co." value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="border-0 shadow-sm bg-light" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">País de Origem *</Form.Label>
                  <Form.Select required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="border-0 shadow-sm bg-light">
                    <option value="">Selecione...</option>
                    <option value="China">China</option>
                    <option value="África do Sul">África do Sul</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Emirados Árabes">Emirados Árabes Unidos</option>
                    <option value="Outro">Outro</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Pessoa de Contacto</Form.Label>
                  <Form.Control type="text" placeholder="Ex: Sr. Lee" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="border-0 shadow-sm bg-light" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Email</Form.Label>
                  <Form.Control type="email" placeholder="email@fornecedor.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="border-0 shadow-sm bg-light" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Telefone / WhatsApp</Form.Label>
                  <Form.Control type="text" placeholder="+86 123 456..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="border-0 shadow-sm bg-light" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Plataforma Principal</Form.Label>
                  <Form.Select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="border-0 shadow-sm bg-light">
                    <option value="Alibaba">Alibaba</option>
                    <option value="1688">1688</option>
                    <option value="Made-in-China">Made-in-China</option>
                    <option value="Global Sources">Global Sources</option>
                    <option value="Fornecedor directo">Fornecedor Directo (Sem plataforma)</option>
                    <option value="Outro">Outro</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Website da Empresa ou Link da Loja</Form.Label>
                  <Form.Control type="url" placeholder="https://..." value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="border-0 shadow-sm bg-light" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Condições / Observações</Form.Label>
                  <Form.Control as="textarea" rows={3} placeholder="MOQ baixo, bons preços de shipping, etc..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="border-0 shadow-sm bg-light" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={() => setShowModal(false)} className="rounded-pill px-4 fw-bold">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" style={{ backgroundColor: '#8a2be2', borderColor: '#8a2be2' }} className="rounded-pill px-4 fw-bold shadow-sm">
              {isEditing ? 'Salvar Alterações' : 'Guardar Fornecedor'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .hover-card { transition: all 0.3s ease; }
        .hover-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .text-primary-custom { color: #8a2be2 !important; }
      `}</style>
    </Container>
  );
}
