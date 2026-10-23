import React, { useState, useMemo } from 'react';
import { Modal, Form, Table, Badge, Button, InputGroup, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBook, faCheck, faInfoCircle, faExternalLinkAlt, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { PAUTA_CATEGORIES, PAUTA_GROUPS } from '../data/pautaAduaneiraData';

export default function PautaAduaneiraModal({ show, onHide, onSelectCategory, selectedId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos');

  const filteredCategories = useMemo(() => {
    const list = PAUTA_CATEGORIES.filter((item) => {
      const matchesGroup = selectedGroup === 'Todos' || item.group === selectedGroup;
      if (!matchesGroup) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(term) ||
        item.shCode.toLowerCase().includes(term) ||
        item.group.toLowerCase().includes(term) ||
        (item.examples && item.examples.toLowerCase().includes(term)) ||
        (item.exemptNotes && item.exemptNotes.toLowerCase().includes(term))
      );
    });

    // REGRA: Apresentar apenas 5 por padrão quando não houver pesquisa ativa
    if (!searchTerm.trim() && selectedGroup === 'Todos') {
      return list.slice(0, 5);
    }
    return list;
  }, [searchTerm, selectedGroup]);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable className="pauta-modal">
      <Modal.Header closeButton className="border-0 pb-2 bg-light">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge rounded-pill bg-primary px-2.5 py-1.5" style={{ backgroundColor: '#8a2be2' }}>
              <FontAwesomeIcon icon={faBook} className="me-1" /> Legislação Oficial
            </span>
            <span className="text-muted small">República de Moçambique</span>
          </div>
          <Modal.Title className="fw-bold mt-1 text-dark fs-5">
            Tabela de Direitos Pautais, IVA e ICE para Importação
          </Modal.Title>
          <p className="text-muted small mb-0">
            Pauta Aduaneira (Lei n.º 17/2022) • Código do IVA (Lei n.º 22/2022) • ICE (Lei n.º 19/2022 e Lei n.º 7/2025)
          </p>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-2 px-3 px-md-4">
        {/* Barra de Filtros e Pesquisa */}
        <Row className="g-2 mb-3">
          <Col xs={12} md={7}>
            <InputGroup>
              <InputGroup.Text className="bg-white border-end-0">
                <FontAwesomeIcon icon={faSearch} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Pesquisar por produto, código pautal (SH) ou palavra-chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-start-0"
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                  Limpar
                </Button>
              )}
            </InputGroup>
          </Col>

          <Col xs={12} md={5}>
            <Form.Select 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="fw-semibold"
            >
              <option value="Todos">Todas as Categorias ({PAUTA_CATEGORIES.length})</option>
              {PAUTA_GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        {/* Banner Informativo */}
        <div className="alert alert-info py-2 px-3 small rounded-3 mb-2 d-flex align-items-center gap-2">
          <FontAwesomeIcon icon={faInfoCircle} className="flex-shrink-0 text-info fs-5" />
          <div>
            <strong>Regras Oficiais:</strong> O Valor Aduaneiro (CIF) = Mercadoria + Frete + Seguro (1%). 
            Os Direitos Aduaneiros (DA) e ICE incidem sobre o VA. O IVA incide sobre (VA + DA + ICE). Bens com isenção pautal ou de IVA (Lei 22/2022) possuem taxa 0%.
          </div>
        </div>

        {/* Indicador de 5 itens padrão vs pesquisa */}
        <div className="d-flex justify-content-between align-items-center mb-2 px-1 text-muted small">
          {!searchTerm.trim() && selectedGroup === 'Todos' ? (
            <span>A apresentar <strong>5 posições de referência</strong> por padrão. Pesquise pelo nome do produto ou código para filtrar.</span>
          ) : (
            <span>A apresentar <strong>{filteredCategories.length}</strong> posições encontradas.</span>
          )}
          <Badge bg="light" className="text-secondary border">Exibindo: {filteredCategories.length}</Badge>
        </div>

        {/* Tabela de Produtos */}
        <div className="table-responsive border rounded-3 bg-white">
          <Table hover className="align-middle mb-0" style={{ minWidth: '680px' }}>
            <thead className="table-light">
              <tr className="small text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
                <th style={{ width: '130px' }}>Código SH</th>
                <th>Designação da Mercadoria</th>
                <th className="text-center" style={{ width: '90px' }}>DA (%)</th>
                <th className="text-center" style={{ width: '90px' }}>IVA (%)</th>
                <th className="text-center" style={{ width: '90px' }}>ICE (%)</th>
                <th className="text-end" style={{ width: '130px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Nenhum produto ou código pautal encontrado para "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredCategories.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr key={item.id} className={isSelected ? 'table-primary bg-opacity-10' : ''}>
                      <td>
                        <span className="badge bg-light text-dark font-monospace border px-2 py-1">
                          {item.shCode}
                        </span>
                        <div className="text-muted" style={{ fontSize: '10px' }}>{item.group}</div>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{item.name}</div>
                        {item.examples && (
                          <div className="text-muted small" style={{ fontSize: '12px' }}>
                            <em>Exemplos: {item.examples}</em>
                          </div>
                        )}
                        {item.exemptNotes && (
                          <div className="text-success small mt-0.5" style={{ fontSize: '11px' }}>
                            <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
                            {item.exemptNotes}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <Badge 
                          bg={item.daRate === 0 ? 'success' : item.daRate <= 5 ? 'info' : item.daRate <= 10 ? 'warning' : 'danger'}
                          className="px-2 py-1"
                        >
                          {item.daRate}%
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Badge 
                          bg={item.ivaRate === 0 ? 'success' : 'secondary'}
                          className="px-2 py-1"
                        >
                          {item.ivaRate === 0 ? '0% Isento' : `${item.ivaRate}%`}
                        </Badge>
                      </td>
                      <td className="text-center">
                        {item.iceRate > 0 ? (
                          <Badge bg="warning" text="dark" className="px-2 py-1 fw-bold">
                            {item.iceRate}%
                          </Badge>
                        ) : (
                          <span className="text-muted small">Livre</span>
                        )}
                      </td>
                      <td className="text-end">
                        {onSelectCategory ? (
                          <Button
                            variant={isSelected ? 'success' : 'outline-primary'}
                            size="sm"
                            className="rounded-pill px-3 fw-bold"
                            style={!isSelected ? { borderColor: '#8a2be2', color: '#8a2be2' } : {}}
                            onClick={() => {
                              onSelectCategory(item);
                              onHide();
                            }}
                          >
                            <FontAwesomeIcon icon={isSelected ? faCheck : faCheck} className="me-1" />
                            {isSelected ? 'Selecionado' : 'Usar'}
                          </Button>
                        ) : (
                          <span className="badge bg-light text-muted border">Oficial</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-2 bg-light d-flex justify-content-between">
        <div className="text-muted small">
          Total de {filteredCategories.length} classificações pautais disponíveis
        </div>
        <Button variant="secondary" className="rounded-pill px-4" onClick={onHide}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
