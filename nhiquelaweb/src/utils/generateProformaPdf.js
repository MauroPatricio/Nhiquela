import { jsPDF as JsPdfClass } from 'jspdf';
import defaultJsPDF from 'jspdf';
import autoTableFn, { applyPlugin, autoTable as namedAutoTable } from 'jspdf-autotable';

const JsPDF = typeof JsPdfClass === 'function' ? JsPdfClass : (typeof defaultJsPDF === 'function' ? defaultJsPDF : defaultJsPDF.jsPDF);
const runAutoTable = (doc, options) => {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else if (typeof autoTableFn === 'function') {
    autoTableFn(doc, options);
  } else if (typeof namedAutoTable === 'function') {
    namedAutoTable(doc, options);
  }
};

try {
  if (typeof applyPlugin === 'function') {
    applyPlugin(JsPDF);
  }
} catch (err) {
  // Plugin already applied
}

/**
 * Gera a Factura Proforma em PDF no formato oficial da Nhiquela Serviços & Consultoria
 * seguindo com rigor o layout e os detalhes apresentados no modelo de referência.
 *
 * @param {Object} options
 * @param {string} options.simulationCode Código de referência (#NQL-SIM-XXXX)
 * @param {Object} options.customer Dados do cliente (nome, empresa, telefone, email, etc.)
 * @param {Object} options.product Dados da mercadoria (nome, descrição, quantidade, preço, etc.)
 * @param {Object} options.tariffItem Posição pautal selecionada (código SH, taxas DA, IVA)
 * @param {Object} options.calculationResult Resultado detalhado do motor fiscal
 */
export function generateProformaPdf({
  simulationCode = 'NQL-SIM-DEMO',
  customer = {},
  product = {},
  tariffItem = null,
  calculationResult = null
}) {
  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2); // 182mm

  // Paleta de Cores Corporativas (Nhiquela / Modelo Proforma)
  const primaryNavy = [42, 75, 124]; // #2A4B7C (Cabeçalhos das caixas e tabela)
  const proformaBlue = [80, 130, 185]; // #5082B9 (Título FACTURA PROFORMA)
  const darkText = [30, 35, 42];
  const mutedText = [95, 105, 115];
  const borderLight = [205, 215, 225];

  // Extração de dados financeiros e de cálculo
  const rateToMzn = Number(calculationResult?.metadata?.exchangeRateToMzn) || 75.0;
  const currency = product.currency || 'USD';
  const qty = Math.max(1, parseInt(product.quantity) || 1);
  const unitPriceCurr = parseFloat(product.unitPrice) || 0;
  const unitPriceMzn = unitPriceCurr * rateToMzn;

  const goodsMzn = calculationResult?.goodsSummary?.totalGoodsValueMzn || (qty * unitPriceMzn);
  const freightMzn = calculationResult?.logisticsSummary?.freightMzn || (goodsMzn * 0.20);
  const insuranceMzn = calculationResult?.logisticsSummary?.insuranceMzn || ((goodsMzn + freightMzn) * 0.01);
  const customsDutyMzn = calculationResult?.taxSummary?.customsDuty?.amountMzn || 0;
  const vatMzn = calculationResult?.taxSummary?.vat?.amountMzn || 0;
  const tsaFeeMzn = calculationResult?.taxSummary?.customsServicesFee?.amountMzn || 2500;
  const kudumbaFeeMzn = 0;
  const terminalHandlingMzn = 0;
  const customsBrokerFeeMzn = 0;
  const domesticTransportMzn = 0;
  const nhiquelaFeeMzn = calculationResult?.commercialSummary?.nhiquelaServiceFeeMzn || Math.round(goodsMzn * 0.08);

  const totalCostMzn = calculationResult?.grandTotal?.totalCostMzn || (goodsMzn + freightMzn + insuranceMzn + customsDutyMzn + vatMzn + tsaFeeMzn + nhiquelaFeeMzn);
  const totalCostUsd = (totalCostMzn / rateToMzn);

  const shCode = tariffItem?.shCode || calculationResult?.taxSummary?.shCode || 'Pendente de Conferência';
  const daRate = tariffItem?.daRate !== undefined ? tariffItem.daRate : (calculationResult?.taxSummary?.customsDuty?.rate || 5);
  const ivaRate = tariffItem?.ivaRate !== undefined ? tariffItem.ivaRate : (calculationResult?.taxSummary?.vat?.rate || 16);
  const isVatExempt = tariffItem?.isExempt || ivaRate === 0;

  // Datas
  const today = new Date();
  const validityDate = new Date();
  validityDate.setDate(today.getDate() + 7);

  const formatDate = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // ========================================================
  // 1. CABEÇALHO SUPERIOR (EMPRESA + TÍTULO FACTURA PROFORMA)
  // ========================================================
  let currentY = 14;

  // Lado Esquerdo: Identificação Nhiquela
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...darkText);
  doc.text('Nhiquela Serviços', marginX, currentY);
  doc.text('& Consultoria, LDA', marginX, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text('Av/Rua da Malhangalene Nº11 3º Andar', marginX, currentY + 11);
  doc.text('Contactos: +258 85 360 0036 / 84 000 0000', marginX, currentY + 15);
  doc.text('nhiquelaservicos@gmail.com', marginX, currentY + 19);
  doc.text('NUIT: 401581928', marginX, currentY + 23);
  doc.text('Maputo - Moçambique', marginX, currentY + 27);
  doc.text('www.nhiquelaservicos.com', marginX, currentY + 31);

  // Lado Direito: Título "FACTURA PROFORMA" + Caixa de Metadados
  const rightBoxX = 126;
  const rightBoxWidth = pageWidth - marginX - rightBoxX; // 70mm

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...proformaBlue);
  doc.text('FACTURA PROFORMA', rightBoxX, currentY + 4);

  // Mini-tabela de Metadados
  const metaStartY = currentY + 8;
  const metaRowHeight = 6;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.2);

  // Retângulo geral
  doc.rect(rightBoxX, metaStartY, rightBoxWidth, metaRowHeight * 4);

  // Linhas divisórias horizontais
  for (let i = 1; i < 4; i++) {
    doc.line(rightBoxX, metaStartY + (i * metaRowHeight), rightBoxX + rightBoxWidth, metaStartY + (i * metaRowHeight));
  }
  // Linha divisória vertical
  doc.line(rightBoxX + 32, metaStartY, rightBoxX + 32, metaStartY + (metaRowHeight * 4));

  const metaFields = [
    { label: 'Data', val: formatDate(today) },
    { label: 'Data de Validade', val: formatDate(validityDate) },
    { label: 'Factura #', val: simulationCode.replace('NQL-SIM-', '') || '21' },
    { label: 'ID do Cliente', val: customer.phone ? String(customer.phone).slice(-6) : 'NQL-CLI' }
  ];

  metaFields.forEach((item, idx) => {
    const yRow = metaStartY + (idx * metaRowHeight) + 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedText);
    doc.text(item.label, rightBoxX + 2, yRow);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(item.val, rightBoxX + 34, yRow);
  });

  // ========================================================
  // 2. CAIXAS DE EXPEDIÇÃO & LOGÍSTICA, FOTO DO PRODUTO E CLIENTE
  // ========================================================
  currentY = 49;
  const boxHeight = 28;

  const originText = product.originCountry || 'China';
  const destCity = product.destinationCity || customer.city || 'Maputo';
  const destText = `${destCity} - Moçambique`;
  const transportMode = product.transportType === 'AIR' ? 'Aéreo Expresso (5 a 7 dias)' : 'Marítimo (35 a 45 dias)';
  const entryPoint = product.entryPort || (product.transportType === 'AIR' ? 'Aeroporto de Maputo' : 'Porto de Maputo');

  const rawImage = product.productImage || product.image;
  const hasImage = Boolean(rawImage && typeof rawImage === 'string' && (rawImage.startsWith('data:image') || rawImage.startsWith('http') || rawImage.startsWith('blob:')));

  let logisticsBoxX = marginX;
  let logisticsBoxWidth = 82;
  let clientBoxX = 100;
  let clientBoxWidth = pageWidth - marginX - clientBoxX; // 96mm

  if (hasImage) {
    logisticsBoxWidth = 74;
    const imageBoxX = marginX + logisticsBoxWidth + 3; // 14 + 74 + 3 = 91mm
    const imageBoxWidth = 28;
    clientBoxX = imageBoxX + imageBoxWidth + 3; // 91 + 28 + 3 = 122mm
    clientBoxWidth = pageWidth - marginX - clientBoxX; // 210 - 14 - 122 = 74mm

    // Caixa 2B: FOTO DO PRODUTO (Centro)
    doc.setFillColor(...primaryNavy);
    doc.rect(imageBoxX, currentY, imageBoxWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('FOTO PRODUTO', imageBoxX + 2, currentY + 4);

    doc.setDrawColor(...borderLight);
    doc.rect(imageBoxX, currentY + 5.5, imageBoxWidth, boxHeight - 5.5);

    try {
      let format = 'JPEG';
      if (rawImage.includes('png') || rawImage.includes('PNG')) format = 'PNG';
      else if (rawImage.includes('webp') || rawImage.includes('WEBP')) format = 'WEBP';
      doc.addImage(rawImage, format, imageBoxX + 2, currentY + 6.5, imageBoxWidth - 4, boxHeight - 7.5);
    } catch (errImg) {
      console.warn('Aviso ao desenhar imagem do produto:', errImg);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(...mutedText);
      doc.text('Imagem Anexa', imageBoxX + 3, currentY + 15);
    }
  }

  // Caixa 2A: EXPEDIÇÃO & LOGÍSTICA (Lado Esquerdo)
  doc.setFillColor(...primaryNavy);
  doc.rect(logisticsBoxX, currentY, logisticsBoxWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EXPEDIÇÃO & LOGÍSTICA', logisticsBoxX + 3, currentY + 4);

  doc.setDrawColor(...borderLight);
  doc.rect(logisticsBoxX, currentY + 5.5, logisticsBoxWidth, boxHeight - 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  let lY = currentY + 9.5;
  doc.text(`[País de Origem] - ${originText}`, logisticsBoxX + 3, lY);
  lY += 4;
  doc.text(`[Destino Final] - ${destText}`, logisticsBoxX + 3, lY);
  lY += 4;
  doc.text(`[Modal de Envio] - ${transportMode}`, logisticsBoxX + 3, lY);
  lY += 4;
  doc.text(`[Entrada Aduaneira] - ${entryPoint}`, logisticsBoxX + 3, lY);
  lY += 4;
  doc.text(`[Câmbio Aplicado] - 1 ${currency} = ${Number(rateToMzn).toFixed(2)} MT`, logisticsBoxX + 3, lY);

  // Caixa 2C: DADOS DO CLIENTE
  doc.setFillColor(...primaryNavy);
  doc.rect(clientBoxX, currentY, clientBoxWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DADOS DO CLIENTE', clientBoxX + 3, currentY + 4);

  // Corpo da Caixa CLIENTE (borda e conteúdo)
  doc.setDrawColor(...borderLight);
  doc.rect(clientBoxX, currentY + 5.5, clientBoxWidth, boxHeight - 5.5);

  const clientName = customer.name || 'Cliente Particular';
  const clientCompany = customer.company ? customer.company : (customer.name ? 'Particular' : 'DDJ LAW');
  const clientAddress = customer.city ? `${customer.city} - Moçambique` : `${destCity} - Moçambique`;
  const clientPhone = customer.phone ? String(customer.phone) : 'Pendente';
  const clientNuit = customer.nuit || '-';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  let cY = currentY + 9.5;
  doc.text(`[Nome] - ${clientName}`, clientBoxX + 3, cY);
  cY += 4;
  doc.text(`[Nome da Empresa] - ${clientCompany}`, clientBoxX + 3, cY);
  cY += 4;
  doc.text(`[Endereço] - ${clientAddress}`, clientBoxX + 3, cY);
  cY += 4;
  doc.text(`[Contacto / WhatsApp] - ${clientPhone}`, clientBoxX + 3, cY);
  cY += 4;
  doc.text(`[NUIT] - ${clientNuit}`, clientBoxX + 3, cY);

  // ========================================================
  // 3. TABELA PRINCIPAL DE SERVIÇOS E MERCADORIA
  // ========================================================
  const tableStartY = currentY + boxHeight + 3;

  const transportLabel = product.transportType === 'AIR'
    ? 'Envio Aéreo Rápido (5-7 dias)'
    : 'Envio Marítimo Económico (35-45 dias)';

  const tableBody = [
    [
      '#1',
      'Mercadoria (FOB)',
      `${product.name || 'Produto de Importação'}\n${product.description ? product.description.substring(0, 95) : 'Importação e Fornecimento verificado'}\nOrigem: ${originText} | Destino: ${destText}`,
      String(qty),
      `${unitPriceMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      isVatExempt ? 'Isento' : `${ivaRate}%`,
      `${goodsMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      '#2',
      'Frete Internacional',
      `Frete de transporte internacional (${transportLabel})\nRota: ${originText} até ${destText}`,
      '1',
      `${freightMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '-',
      `${freightMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      '#3',
      'Seguro Internacional',
      'Seguro de transporte internacional de mercadorias\nTaxa estatutária aduaneira sobre CIF (1%)',
      '1',
      `${insuranceMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '-',
      `${insuranceMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      '#4',
      'Encargos Aduaneiros',
      `Liquidação de Direitos Pautais (DA ${daRate}%)\nCódigo SH: ${shCode}\nTaxa de Processamento Eletrónico JUE/TSA`,
      '1',
      `${(customsDutyMzn + tsaFeeMzn).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      isVatExempt ? 'Isento' : 'Incluso',
      `${(customsDutyMzn + tsaFeeMzn).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ],
    [
      '#5',
      'Assessoria Nhiquela',
      'Serviço integrado de Sourcing na Origem, Inspeção do Fornecedor e Acompanhamento Alfandegário Chave-na-Mão',
      '1',
      `${nhiquelaFeeMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '-',
      `${nhiquelaFeeMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]
  ];

  runAutoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [['NÚMERO\nDA PEÇA', 'SERVIÇO', 'DESCRIÇÃO', 'QTD', 'UNITÁRIO', 'IVA', 'TOTAL']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2
    },
    styles: {
      fontSize: 7.5,
      textColor: darkText,
      lineColor: borderLight,
      lineWidth: 0.2,
      valign: 'middle',
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 64 },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalTableY = (doc.lastAutoTable?.finalY || 135) + 3;

  // ========================================================
  // 4. SEÇÃO INFERIOR: TERMOS DE VENDA (ESQ) & TOTAIS (DIR)
  // ========================================================
  const boxLeftWidth = 98;
  const boxRightX = marginX + boxLeftWidth + 4; // 116mm
  const boxRightWidth = pageWidth - marginX - boxRightX; // 80mm

  // --- LADO ESQUERDO: TERMOS DE VENDA E OUTROS COMENTÁRIOS ---
  doc.setFillColor(...primaryNavy);
  doc.rect(marginX, finalTableY, boxLeftWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('TERMOS DE VENDA E OUTROS COMENTÁRIOS', marginX + 3, finalTableY + 4);

  const termsBoxHeight = 52;
  doc.setDrawColor(...borderLight);
  doc.rect(marginX, finalTableY + 5.5, boxLeftWidth, termsBoxHeight - 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);

  let tY = finalTableY + 10;
  doc.text('Cotação válida por 7 (sete) dias após a sua emissão.', marginX + 3, tY);
  tY += 4.5;
  doc.text('Os pagamentos poderão ser efectuados por transações bancárias', marginX + 3, tY);
  tY += 4;
  doc.text('para a seguinte conta oficial:', marginX + 3, tY);
  tY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Nome: Nhiquela Serviços e Consultoria SU Lda', marginX + 3, tY);
  tY += 4.5;
  doc.text('Banco: BCI  |  Conta Nº: 26266610710001', marginX + 3, tY);
  tY += 4.5;
  doc.text(`Câmbio oficial de referência: ${rateToMzn} MT / USD`, marginX + 3, tY);

  tY += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  doc.text('Nota: Valor final sujeito à liquidação de direitos e taxas aduaneiras', marginX + 3, tY);
  tY += 3.5;
  doc.text('na data da emissão do Documento Único (D.U.) pelas Alfândegas.', marginX + 3, tY);

  // --- LADO DIREITO: RESUMO DISCRIMINADO & TOTAIS ---
  const summaryRows = [
    { label: 'Subtotal (FOB)', val: `${goodsMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'Frete Internacional', val: `${freightMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'Seguro de Carga', val: `${insuranceMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'Direitos Pautais (DA)', val: `${customsDutyMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'IVA Alfandegário', val: isVatExempt ? 'Isento' : `${vatMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'Processamento JUE/TSA', val: `${tsaFeeMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'Assessoria Nhiquela', val: `${nhiquelaFeeMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
  ];

  let sY = finalTableY;
  const sRowH = 4.8;

  summaryRows.forEach((r, idx) => {
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.15);
    doc.rect(boxRightX, sY + (idx * sRowH), boxRightWidth, sRowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...mutedText);
    doc.text(r.label, boxRightX + 2, sY + (idx * sRowH) + 3.4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(r.val, boxRightX + boxRightWidth - 2, sY + (idx * sRowH) + 3.4, { align: 'right' });
  });

  // Linha de Destaque: TOTAL GERAL
  const totalRowY = sY + (summaryRows.length * sRowH) + 1;
  doc.setFillColor(245, 247, 250);
  doc.rect(boxRightX, totalRowY, boxRightWidth, 8, 'F');
  doc.setDrawColor(...primaryNavy);
  doc.setLineWidth(0.4);
  doc.rect(boxRightX, totalRowY, boxRightWidth, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryNavy);
  doc.text('TOTAL', boxRightX + 2, totalRowY + 5.3);

  doc.setFontSize(9.5);
  doc.setTextColor(...darkText);
  doc.text(`${totalCostMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`, boxRightX + boxRightWidth - 2, totalRowY + 5.3, { align: 'right' });

  // Sub-linha de Moeda & Dólar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...mutedText);
  doc.text(`Moeda: MZN (Metical)  |  ~ $${totalCostUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, boxRightX + 2, totalRowY + 11.5);

  // ========================================================
  // 5. CAIXA INFERIOR: ADDITIONAL DETAILS & ASSINATURAS
  // ========================================================
  const addDetailsY = finalTableY + termsBoxHeight + 3;

  doc.setFillColor(...primaryNavy);
  doc.rect(marginX, addDetailsY, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ADDITIONAL DETAILS', marginX + 3, addDetailsY + 4);

  const addBoxHeight = 35;
  doc.setDrawColor(...borderLight);
  doc.rect(marginX, addDetailsY + 5.5, contentWidth, addBoxHeight - 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);

  let aY = addDetailsY + 10;
  const col1X = marginX + 3;
  const col2X = marginX + 95;

  doc.text(`País de Origem: [ ${product.originCountry || 'China'} ]`, col1X, aY);
  doc.text(`Porto de Embarcação: [ Guangzhou / Shenzhen / Xangai ]`, col2X, aY);
  aY += 4.5;
  doc.text(`Porto de Descarga: [ Porto de ${customer.city || 'Maputo'} / Aeroporto ]`, col1X, aY);
  doc.text(`Razão da Exportação: Comercial / Revenda / Uso Próprio`, col2X, aY);
  aY += 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  doc.text('Certifico que o acima exposto é verdadeiro e correto, de acordo com o meu conhecimento.', col1X, aY);

  aY += 7;
  // Linha de Assinatura
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  doc.text('x __________________________________________________', col1X, aY);
  doc.text('Data: _____ / _____ / _________', col2X + 25, aY);

  aY += 4;
  doc.text(`[Nome: ${clientName}]`, col1X, aY);
  doc.text('[Nhiquela Serviços & Consultoria SU Lda]', col2X + 25, aY);
  aY += 3.5;
  doc.text(`[Companhia: ${clientCompany}]`, col1X, aY);

  // Download do PDF com nome padronizado
  const fileName = `Factura_Proforma_${simulationCode || 'Nhiquela'}.pdf`;
  try {
    doc.save(fileName);
  } catch (errSave) {
    // Fallback para ambientes de teste
  }
  return fileName;
}
