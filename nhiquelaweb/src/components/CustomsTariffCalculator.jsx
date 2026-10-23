import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Row, Col, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faChevronUp, faChevronDown, faCalculator, faCheck, faFilePdf, faArrowRight, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { PAUTA_CATEGORIES } from '../data/pautaAduaneiraData';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function CustomsTariffCalculator({ onApplyToRequest, defaultCategory = null }) {
  // Inputs de pesquisa
  const [searchCode, setSearchCode] = useState(defaultCategory?.shCode || '85171100');
  const [searchDesc, setSearchDesc] = useState(defaultCategory?.name || '');
  
  // Item pautal selecionado (inicia com o item do screenshot do cliente)
  const [selectedItem, setSelectedItem] = useState(() => {
    return defaultCategory || PAUTA_CATEGORIES[0] || {
      id: 'phones_wired_wireless',
      shCode: '85171100',
      name: 'Aparelhos telefónicos por fio com unidade auscultador-microfone sem fio',
      daRate: 7.5,
      ivaRate: 16,
      iceRate: 0,
      validFrom: '16/03/2011',
      validTo: '31/12/2050',
      taxType: 'Específico',
    };
  });

  // Estado do accordion "Calcular os Impostos"
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Campos do formulário exatamente como na imagem
  const [quantidade, setQuantidade] = useState(1);
  const [fobPrice, setFobPrice] = useState(15106);
  const [frete, setFrete] = useState(40000);
  const [outroValor, setOutroValor] = useState(0);
  const [manualSeguro, setManualSeguro] = useState(153);
  const [isCalculated, setIsCalculated] = useState(true);

  // Cálculo automático do seguro e CIF
  const q = Math.max(1, parseFloat(quantidade) || 1);
  const fobTotal = (Math.max(0, parseFloat(fobPrice) || 0)) * q;
  const vFrete = Math.max(0, parseFloat(frete) || 0);
  const vOutro = Math.max(0, parseFloat(outroValor) || 0);
  
  // Seguro no modelo JUE / Alfândega Moçambique
  const vSeguro = parseFloat(manualSeguro) >= 0 ? parseFloat(manualSeguro) : Math.round((fobTotal + vFrete) * 0.01);
  const cif = Number((fobTotal + vFrete + vSeguro + vOutro).toFixed(2));

  // Cálculos fiscais de Moçambique
  const daRate = selectedItem ? selectedItem.daRate : 7.5;
  const ivaRate = selectedItem ? selectedItem.ivaRate : 16;
  const iceRate = selectedItem ? (selectedItem.iceRate || 0) : 0;

  const vDA = Number((cif * (daRate / 100)).toFixed(2));
  const vICE = Number((cif * (iceRate / 100)).toFixed(2));
  const baseIVA = Number((cif + vDA + vICE).toFixed(2));
  const vIVA = Number((baseIVA * (ivaRate / 100)).toFixed(2));
  const totalImpostos = Number((vDA + vICE + vIVA).toFixed(2));
  const taxaNhiquela = Number((fobTotal * 0.30).toFixed(2));
  const totalChaveNaMao = Number((cif + totalImpostos + taxaNhiquela).toFixed(2));

  // Pesquisar item pautal por código ou descrição
  const handleSearch = () => {
    const termCode = (searchCode || '').trim().replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
    const termDesc = (searchDesc || '').trim().toLowerCase();

    const found = PAUTA_CATEGORIES.find((cat) => {
      const catCodeClean = cat.shCode.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
      if (termCode && (catCodeClean.includes(termCode) || cat.shCode.toLowerCase().includes(termCode))) return true;
      if (termDesc && (cat.name.toLowerCase().includes(termDesc) || (cat.examples && cat.examples.toLowerCase().includes(termDesc)))) return true;
      return false;
    });

    if (found) {
      setSelectedItem(found);
      setSearchCode(found.shCode);
      setSearchDesc(found.name);
    } else {
      // Se não achar exacto, usa o primeiro que contém palavras
      const fallback = PAUTA_CATEGORIES.find(c => 
        (termDesc && c.name.toLowerCase().includes(termDesc.split(' ')[0])) ||
        (termCode && c.shCode.includes(termCode.slice(0, 4)))
      );
      if (fallback) {
        setSelectedItem(fallback);
        setSearchCode(fallback.shCode);
        setSearchDesc(fallback.name);
      }
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('República de Moçambique - Simulação Pautal', 14, 20);
    doc.setFontSize(10);
    doc.text(`Posição Pautal: ${selectedItem?.shCode || ''}`, 14, 28);
    doc.text(`Descrição: ${selectedItem?.name || ''}`, 14, 34);

    const tableRows = [
      ['Valor FOB Factura', `${fobTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Valor do Frete', `${vFrete.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Seguro', `${vSeguro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Outros Encargos', `${vOutro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Valor Aduaneiro Tributável (CIF)', `${cif.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      [`Direitos Aduaneiros (${daRate}%)`, `${vDA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      [`ICE (${iceRate}%)`, `${vICE.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Base de Cálculo do IVA', `${baseIVA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      [`IVA (${ivaRate}% - ${ivaRate === 0 ? 'Isento Lei 22/2022' : 'Geral'})`, `${vIVA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Total de Impostos Aduaneiros', `${totalImpostos.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Taxa de Serviço Nhiquela (30%)', `${taxaNhiquela.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
      ['Total Estimado Chave-na-Mão', `${totalChaveNaMao.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`],
    ];

    doc.autoTable({
      startY: 42,
      head: [['Rubrica / Descrição', 'Valor']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [36, 132, 146] }
    });

    doc.save(`simulacao_pautal_${selectedItem?.shCode || 'import'}.pdf`);
  };

  return (
    <div className="customs-tariff-container bg-white rounded-3 p-3 p-md-4 shadow-sm border mb-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. SEÇÃO DE PESQUISA SUPERIOR (Exata como no print) */}
      <Row className="g-3 align-items-end mb-4">
        <Col xs={12} md={3}>
          <Form.Group>
            <Form.Label className="fw-bold text-dark small mb-1" style={{ fontSize: '13px' }}>
              Código da Posição Pautal
            </Form.Label>
            <Form.Control
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Ex: 85171100 ou 9207.10"
              className="py-2 border-secondary border-opacity-50"
              style={{ fontSize: '14px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Form.Group>
        </Col>

        <Col xs={12} md={7}>
          <Form.Group>
            <Form.Label className="fw-bold text-dark small mb-1" style={{ fontSize: '13px' }}>
              Descrição/ Descrição Comercial do Código da Posição Pautal
            </Form.Label>
            <Form.Control
              type="text"
              value={searchDesc}
              onChange={(e) => setSearchDesc(e.target.value)}
              placeholder="Pianos, incluindo os automáticos; cravos e ou..."
              className="py-2 border-secondary border-opacity-50"
              style={{ fontSize: '14px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Form.Group>
        </Col>

        <Col xs={12} md={2}>
          <Button
            type="button"
            onClick={handleSearch}
            className="w-100 py-2 border-0 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm text-white"
            style={{ backgroundColor: '#f36f21', height: '40px', fontSize: '14px' }}
          >
            <FontAwesomeIcon icon={faSearch} />
            <span>Pesquisa</span>
          </Button>
        </Col>
      </Row>

      {/* 2. INFORMAÇÕES DA POSIÇÃO PAUTAL ENCONTRADA */}
      <div className="mb-3">
        <div className="d-flex flex-wrap align-items-baseline gap-2 mb-1">
          <span className="fw-bold text-dark" style={{ fontSize: '15px' }}>
            Código da Posição Pautal:
          </span>
          <span className="text-secondary fw-semibold font-monospace" style={{ fontSize: '15px' }}>
            {selectedItem?.shCode || '85171100'}
          </span>
          {selectedItem?.group && (
            <Badge bg="light" className="text-muted border ms-1 font-monospace" style={{ fontSize: '11px' }}>
              {selectedItem.group}
            </Badge>
          )}
        </div>

        <div className="text-dark" style={{ fontSize: '14px', lineHeight: '1.4' }}>
          <strong>Descrição:</strong> -- {selectedItem?.name || 'Aparelhos telefónicos por fio com unidade auscultador-microfone sem fio'}
        </div>
      </div>

      {/* 3. TABELA DE TAXAS (Cor Verde-Azulado #248492 idêntica ao original) */}
      <div className="table-responsive mb-4 rounded overflow-hidden border">
        <Table className="mb-0 text-dark align-middle" style={{ fontSize: '13.5px', minWidth: '600px' }}>
          <thead>
            <tr style={{ backgroundColor: '#248492', color: '#ffffff' }}>
              <th className="py-2 px-3 fw-semibold">Nome da Taxa</th>
              <th className="py-2 px-3 fw-semibold">Válido desde</th>
              <th className="py-2 px-3 fw-semibold">Válido até</th>
              <th className="py-2 px-3 fw-semibold">Tipo de taxa</th>
              <th className="py-2 px-3 fw-semibold text-end">Taxa</th>
            </tr>
          </thead>
          <tbody>
            {/* Linha Direitos Aduaneiros */}
            <tr className="border-bottom">
              <td className="py-2.5 px-3 fw-semibold text-dark">Direitos Aduaneiros</td>
              <td className="py-2.5 px-3 text-muted">{selectedItem?.validFrom || '16/03/2011'}</td>
              <td className="py-2.5 px-3 text-muted">{selectedItem?.validTo || '31/12/2050'}</td>
              <td className="py-2.5 px-3">{selectedItem?.taxType || 'Específico'}</td>
              <td className="py-2.5 px-3 fw-bold text-end text-dark">{daRate.toFixed(2)}%</td>
            </tr>

            {/* Linha IVA */}
            <tr className={iceRate > 0 ? 'border-bottom' : ''}>
              <td className="py-2.5 px-3 fw-semibold text-dark">
                IVA {ivaRate === 0 && <span className="badge bg-success ms-1.5" style={{ fontSize: '10px' }}>Isento Lei 22/2022</span>}
              </td>
              <td className="py-2.5 px-3 text-muted">01/02/2013</td>
              <td className="py-2.5 px-3 text-muted">31/12/2050</td>
              <td className="py-2.5 px-3">{selectedItem?.taxType || 'Específico'}</td>
              <td className="py-2.5 px-3 fw-bold text-end text-dark">{ivaRate.toFixed(2)}%</td>
            </tr>

            {/* Linha ICE (se aplicável ao código) */}
            {iceRate > 0 && (
              <tr>
                <td className="py-2.5 px-3 fw-semibold text-dark">
                  ICE (Consumos Específicos - Lei 19/2022)
                </td>
                <td className="py-2.5 px-3 text-muted">01/01/2023</td>
                <td className="py-2.5 px-3 text-muted">31/12/2050</td>
                <td className="py-2.5 px-3">Ad Valorem</td>
                <td className="py-2.5 px-3 fw-bold text-end text-danger">{iceRate.toFixed(2)}%</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* 4. CAIXA "Calcular os Impostos" (Borda azul com acordeão e formulário 2 colunas) */}
      <div 
        className="rounded-3 mb-4 overflow-hidden" 
        style={{ border: '1.5px solid #bdd7ee', backgroundColor: '#ffffff' }}
      >
        {/* Barra de Título Azul com Chevron */}
        <div 
          className="d-flex justify-content-between align-items-center px-3 py-2.5"
          style={{ backgroundColor: '#ebf3fb', cursor: 'pointer' }}
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <span className="fw-bold" style={{ color: '#2b78c5', fontSize: '15px' }}>
            Calcular os Impostos
          </span>
          <FontAwesomeIcon 
            icon={isFormOpen ? faChevronUp : faChevronDown} 
            style={{ color: '#2b78c5', fontSize: '13px' }} 
          />
        </div>

        {/* Formulário em 2 Colunas */}
        {isFormOpen && (
          <div className="p-3 p-md-4">
            <Row className="g-3">
              {/* Coluna da Esquerda */}
              <Col xs={12} md={6}>
                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Label className="mb-0 fw-bold text-dark text-end me-3" style={{ width: '140px', fontSize: '13.5px' }}>
                    Quantidade<span className="text-danger">*</span>:
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="py-1.5 border-secondary border-opacity-50"
                    style={{ maxWidth: '240px', fontSize: '14px' }}
                  />
                </Form.Group>

                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Label className="mb-0 fw-bold text-dark text-end me-3" style={{ width: '140px', fontSize: '13.5px' }}>
                    Valor do frete:
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={frete}
                    onChange={(e) => setFrete(e.target.value)}
                    className="py-1.5 border-secondary border-opacity-50"
                    style={{ maxWidth: '240px', fontSize: '14px' }}
                  />
                </Form.Group>

                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Label className="mb-0 fw-bold text-dark text-end me-3" style={{ width: '140px', fontSize: '13.5px' }}>
                    Outro valor:
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={outroValor || ''}
                    onChange={(e) => setOutroValor(e.target.value)}
                    placeholder=""
                    className="py-1.5 border-secondary border-opacity-50"
                    style={{ maxWidth: '240px', fontSize: '14px' }}
                  />
                </Form.Group>
              </Col>

              {/* Coluna da Direita */}
              <Col xs={12} md={6}>
                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Label className="mb-0 fw-bold text-dark text-end me-3" style={{ width: '160px', fontSize: '13.5px' }}>
                    Valor da Factura Fob<span className="text-danger">*</span>:
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={fobPrice}
                    onChange={(e) => {
                      setFobPrice(e.target.value);
                      // Auto ajusta o seguro em 1% caso o usuário não tenha editado manualmente
                      const newFob = parseFloat(e.target.value) || 0;
                      setManualSeguro(Math.round((newFob + vFrete) * 0.01) || 153);
                    }}
                    className="py-1.5 border-secondary border-opacity-50"
                    style={{ maxWidth: '240px', fontSize: '14px' }}
                  />
                </Form.Group>

                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Label className="mb-0 fw-bold text-dark text-end me-3" style={{ width: '160px', fontSize: '13.5px' }}>
                    Seguros:
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={manualSeguro}
                    onChange={(e) => setManualSeguro(e.target.value)}
                    className="py-1.5 border-secondary border-opacity-50"
                    style={{ maxWidth: '240px', fontSize: '14px' }}
                  />
                </Form.Group>

                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Label className="mb-0 fw-bold text-dark text-end me-3" style={{ width: '160px', fontSize: '13.5px' }}>
                    CIF:
                  </Form.Label>
                  <Form.Control
                    type="text"
                    readOnly
                    value={cif.toFixed(2)}
                    className="py-1.5 bg-light border-secondary border-opacity-25 fw-bold text-dark"
                    style={{ maxWidth: '240px', fontSize: '14px' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Notas Obrigatórias em Vermelho Itálico */}
            <div className="text-center my-2" style={{ fontSize: '12.5px', color: '#ff4d4f', fontStyle: 'italic' }}>
              <div>* indica campos obrigatórios.</div>
              <div>Nota: Isto é uma estimativa e pode não representar valores finais.</div>
            </div>

            {/* Botão Laranja "Calcular" */}
            <div className="text-center mt-3">
              <Button
                type="button"
                onClick={() => setIsCalculated(true)}
                className="px-5 py-2 border-0 fw-bold shadow-sm text-white"
                style={{ backgroundColor: '#f36f21', fontSize: '14px', borderRadius: '4px' }}
              >
                Calcular
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 5. RESULTADOS DO CÁLCULO DETALHADO (Abaixo da caixa de cálculo) */}
      {isCalculated && (
        <div className="p-3 p-md-4 rounded-3 border bg-light">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faCalculator} style={{ color: '#248492' }} />
              <span>Demonstração de Liquidação dos Impostos e Desalfandegamento</span>
            </h6>
            
            <div className="d-flex gap-2">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="rounded-pill px-3"
                onClick={handleDownloadPDF}
              >
                <FontAwesomeIcon icon={faFilePdf} className="me-1.5 text-danger" />
                Baixar PDF
              </Button>
            </div>
          </div>

          <div className="table-responsive bg-white rounded border mb-3">
            <Table className="mb-0 text-dark" style={{ fontSize: '13.5px' }}>
              <thead className="table-light">
                <tr>
                  <th>Descrição da Rubrica</th>
                  <th className="text-center">Base de Incidência</th>
                  <th className="text-center">Taxa Aplicada</th>
                  <th className="text-end">Montante (MT)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Valor da Mercadoria (FOB)</td>
                  <td className="text-center">{quantidade} un.</td>
                  <td className="text-center">-</td>
                  <td className="text-end fw-semibold">{fobTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                <tr>
                  <td>Frete Internacional</td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                  <td className="text-end">{vFrete.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                <tr>
                  <td>Seguro de Carga</td>
                  <td className="text-center">-</td>
                  <td className="text-center">1%</td>
                  <td className="text-end">{vSeguro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                {vOutro > 0 && (
                  <tr>
                    <td>Outros Encargos</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                    <td className="text-end">{vOutro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                  </tr>
                )}
                <tr className="table-light fw-bold" style={{ color: '#248492' }}>
                  <td>Valor Aduaneiro / CIF</td>
                  <td className="text-center">FOB + Frete + Seguro</td>
                  <td className="text-center">-</td>
                  <td className="text-end">{cif.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                <tr>
                  <td>Direitos Aduaneiros (DA)</td>
                  <td className="text-center">{cif.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                  <td className="text-center">{daRate}%</td>
                  <td className="text-end fw-semibold">{vDA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                {iceRate > 0 && (
                  <tr>
                    <td>Imposto sobre Consumos Específicos (ICE)</td>
                    <td className="text-center">{cif.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                    <td className="text-center">{iceRate}%</td>
                    <td className="text-end fw-semibold text-danger">{vICE.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                  </tr>
                )}
                <tr>
                  <td>Base do IVA (CIF + DA{iceRate > 0 ? ' + ICE' : ''})</td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                  <td className="text-end">{baseIVA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                <tr>
                  <td>
                    IVA da Importação
                    {ivaRate === 0 && <span className="badge bg-success ms-2">Isento Lei 22/2022</span>}
                  </td>
                  <td className="text-center">{baseIVA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                  <td className="text-center">{ivaRate}%</td>
                  <td className="text-end fw-semibold">{vIVA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                <tr className="table-warning fw-bold">
                  <td>Total de Imposições Aduaneiras (DA + ICE + IVA)</td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                  <td className="text-end">{totalImpostos.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
                <tr>
                  <td>Taxa de Serviço e Sourcing Nhiquela (30% sobre FOB)</td>
                  <td className="text-center">{fobTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                  <td className="text-center">30%</td>
                  <td className="text-end fw-semibold">{taxaNhiquela.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
                </tr>
              </tbody>
            </Table>
          </div>

          {/* Card Total Chave-na-mão */}
          <div 
            className="p-3.5 rounded-3 text-white mb-3 shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-3"
            style={{ backgroundColor: '#248492' }}
          >
            <div>
              <div className="text-white-50 small text-uppercase fw-bold" style={{ letterSpacing: '0.5px' }}>
                Total Geral Estimado (CIF + Impostos + Serviço Nhiquela)
              </div>
              <h3 className="fw-black mb-0 text-white mt-1">
                {totalChaveNaMao.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
              </h3>
            </div>

            {onApplyToRequest && (
              <Button
                variant="light"
                className="fw-bold px-4 py-2.5 rounded-pill shadow-sm d-flex align-items-center gap-2"
                style={{ color: '#248492' }}
                onClick={() => {
                  onApplyToRequest({
                    category: selectedItem,
                    fobPrice,
                    frete,
                    quantidade,
                    totalEstimated: totalChaveNaMao
                  });
                }}
              >
                <span>Fazer Pedido com Esta Simulação</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </Button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
