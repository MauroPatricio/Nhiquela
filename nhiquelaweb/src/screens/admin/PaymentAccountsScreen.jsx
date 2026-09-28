import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Modal, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUniversity, faPlus, faEdit, faTrash, faToggleOn, faToggleOff,
  faMobileAlt, faCreditCard, faMoneyBillWave, faSave, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

const ACCOUNT_TYPES = [
  { value: 'MPESA', label: '📱 M-Pesa', color: 'danger' },
  { value: 'EMOLA', label: '💳 e-Mola', color: 'warning' },
  { value: 'MKESH', label: '📲 Mkesh', color: 'info' },
  { value: 'BANK', label: '🏦 Banco', color: 'primary' },
  { value: 'OTHER', label: '💰 Outro', color: 'secondary' },
];

const emptyForm = {
  name: '',
  type: 'MPESA',
  accountNumber: '',
  accountName: '',
  bankName: '',
  iban: '',
  notes: '',
  isActive: true,
  displayOrder: 0,
  icon: ''
};

export default function PaymentAccountsScreen() {
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/payment-accounts/all');
      setAccounts(res.data);
    } catch (err) {
      toast.error('Erro ao carregar contas de pagamento.');
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (account) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      type: account.type,
      accountNumber: account.accountNumber,
      accountName: account.accountName || '',
      bankName: account.bankName || '',
      iban: account.iban || '',
      notes: account.notes || '',
      isActive: account.isActive,
      displayOrder: account.displayOrder || 0,
      icon: account.icon || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.accountNumber) {
      toast.error('Nome e número da conta são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      if (editingAccount) {
        await api.put(`/payment-accounts/${editingAccount._id}`, form);
        toast.success('Conta actualizada com sucesso!');
      } else {
        await api.post('/payment-accounts', form);
        toast.success('Conta criada com sucesso!');
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      toast.error('Erro ao guardar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (account) => {
    try {
      await api.put(`/payment-accounts/${account._id}`, { isActive: !account.isActive });
      toast.success(`Conta ${account.isActive ? 'desativada' : 'activada'}.`);
      fetchAccounts();
    } catch (err) {
      toast.error('Erro ao alterar estado.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/payment-accounts/${id}`);
      toast.success('Conta eliminada.');
      setShowDeleteConfirm(null);
      fetchAccounts();
    } catch (err) {
      toast.error('Erro ao eliminar conta.');
    }
  };

  const getTypeBadge = (type) => {
    const found = ACCOUNT_TYPES.find(t => t.value === type);
    return found ? (
      <Badge bg={found.color} className="rounded-pill px-3 py-2">{found.label}</Badge>
    ) : <Badge bg="secondary">{type}</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
            <FontAwesomeIcon icon={faUniversity} className="me-2" style={{ color: '#8a2be2' }} />
            Contas de Pagamento Nhiquela
          </h2>
          <p className="text-muted mb-0">
            Gerencie as contas bancárias e carteiras móveis usadas para receber pagamentos dos clientes.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="rounded-pill px-4 fw-bold shadow-sm"
          style={{ backgroundColor: '#8a2be2', border: 'none' }}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Nova Conta
        </Button>
      </div>

      <Alert variant="info" className="border-0 rounded-3 shadow-sm mb-4">
        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
        As contas <strong>activas</strong> são apresentadas automaticamente aos clientes no <strong>portal web</strong> e na <strong>aplicação mobile</strong> quando precisam de realizar pagamentos para a Nhiquela (importações, pagamentos directos, etc).
      </Alert>

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body className="p-0">
          <Table hover responsive className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4 py-3 fw-semibold text-muted border-0">Nome / Tipo</th>
                <th className="py-3 fw-semibold text-muted border-0">Número da Conta</th>
                <th className="py-3 fw-semibold text-muted border-0">Titular</th>
                <th className="py-3 fw-semibold text-muted border-0">Banco/Notas</th>
                <th className="py-3 fw-semibold text-muted border-0">Estado</th>
                <th className="pe-4 py-3 fw-semibold text-muted border-0 text-end">Acções</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <FontAwesomeIcon icon={faCreditCard} className="mb-2 d-block mx-auto fs-1 text-light" />
                    Nenhuma conta configurada. Clique em "Nova Conta" para começar.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc._id}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{acc.icon} {acc.name}</div>
                      <div className="mt-1">{getTypeBadge(acc.type)}</div>
                    </td>
                    <td>
                      <code className="text-dark fw-bold fs-6">{acc.accountNumber}</code>
                    </td>
                    <td className="text-muted">{acc.accountName || '—'}</td>
                    <td className="text-muted small">
                      {acc.bankName && <div>🏦 {acc.bankName}</div>}
                      {acc.iban && <div>IBAN: {acc.iban}</div>}
                      {acc.notes && <div className="text-muted fst-italic">{acc.notes}</div>}
                    </td>
                    <td>
                      <Button
                        variant="link"
                        className="p-0 text-decoration-none"
                        onClick={() => handleToggleActive(acc)}
                        title={acc.isActive ? 'Clique para desativar' : 'Clique para activar'}
                      >
                        {acc.isActive ? (
                          <span className="text-success fw-bold">
                            <FontAwesomeIcon icon={faToggleOn} className="me-1 fs-5" /> Activa
                          </span>
                        ) : (
                          <span className="text-muted fw-bold">
                            <FontAwesomeIcon icon={faToggleOff} className="me-1 fs-5" /> Inactiva
                          </span>
                        )}
                      </Button>
                    </td>
                    <td className="pe-4 text-end">
                      <Button
                        variant="light"
                        size="sm"
                        className="rounded-circle shadow-sm me-2"
                        style={{ width: '35px', height: '35px' }}
                        title="Editar"
                        onClick={() => handleOpenEdit(acc)}
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-primary" />
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        className="rounded-circle shadow-sm"
                        style={{ width: '35px', height: '35px' }}
                        title="Eliminar"
                        onClick={() => setShowDeleteConfirm(acc)}
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Create / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">
            <FontAwesomeIcon icon={editingAccount ? faEdit : faPlus} className="me-2" style={{ color: '#8a2be2' }} />
            {editingAccount ? 'Editar Conta de Pagamento' : 'Nova Conta de Pagamento'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          <Form onSubmit={handleSave}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Nome da Conta *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex: M-Pesa Nhiquela, Millennium BIM Principal"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="py-2"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Tipo *</Form.Label>
                  <Form.Select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="py-2"
                  >
                    {ACCOUNT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ícone</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="📱"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="py-2 text-center fs-5"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Número / Conta *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex: 84 123 4567 ou 123456789"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    required
                    className="py-2"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Nome do Titular</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex: Nhiquela Lda"
                    value={form.accountName}
                    onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                    className="py-2"
                  />
                </Form.Group>
              </Col>
              {(form.type === 'BANK') && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Nome do Banco</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ex: Millennium BIM, BCI, Standard Bank"
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        className="py-2"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">IBAN (Opcional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="MZ59..."
                        value={form.iban}
                        onChange={(e) => setForm({ ...form, iban: e.target.value })}
                        className="py-2"
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={9}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Notas / Instruções</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Ex: Usar nos comentários o número do pedido de importação"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ordem</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                    className="py-2"
                  />
                  <Form.Text className="text-muted">Posição na lista</Form.Text>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check
                  type="switch"
                  id="isActive"
                  label={form.isActive ? '✅ Conta activa (visível para clientes)' : '⛔ Conta inactiva (não aparece aos clientes)'}
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="fw-semibold"
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="light" onClick={() => setShowModal(false)} className="rounded-pill px-4">
                <FontAwesomeIcon icon={faTimes} className="me-1" /> Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-pill px-4 fw-bold"
                style={{ backgroundColor: '#8a2be2', border: 'none' }}
              >
                <FontAwesomeIcon icon={faSave} className="me-2" />
                {loading ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal show={!!showDeleteConfirm} onHide={() => setShowDeleteConfirm(null)} centered size="sm">
        <Modal.Body className="text-center p-4">
          <FontAwesomeIcon icon={faTrash} className="text-danger mb-3 fs-1" />
          <h5 className="fw-bold">Confirmar Eliminação</h5>
          <p className="text-muted">Deseja mesmo eliminar a conta <strong>{showDeleteConfirm?.name}</strong>?</p>
          <div className="d-flex gap-2 justify-content-center mt-3">
            <Button variant="light" className="rounded-pill px-4" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" className="rounded-pill px-4 fw-bold" onClick={() => handleDelete(showDeleteConfirm._id)}>Eliminar</Button>
          </div>
        </Modal.Body>
      </Modal>

      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
      `}</style>
    </Container>
  );
}
