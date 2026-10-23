// CustomsTaxEngine.js
// Motor Fiscal e de Liquidação Aduaneira de Moçambique
// Em conformidade com:
// - Lei n.º 17/2022 e Lei n.º 8/2025 (Pauta Aduaneira da República de Moçambique)
// - Lei n.º 22/2022 e Lei n.º 7/2025 (Código do IVA - Regime Aduaneiro)
// - Lei n.º 19/2022 e Lei n.º 7/2025 (Código do ICE - Imposto sobre Consumos Específicos)
// - Decreto n.º 56/2011 (Regulamento do Desembaraço Aduaneiro e Janela Única Eletrónica - JUE)

export const CURRENCY_RATES = {
  USD: { rate: 75.00, name: 'Dólar Americano', source: 'Câmbio Oficial Nhiquela', date: '2026-01-15' },
  ZAR: { rate: 4.10, name: 'Rand Sul-Africano', source: 'Câmbio Oficial Nhiquela', date: '2026-01-15' },
  EUR: { rate: 81.50, name: 'Euro', source: 'Câmbio Oficial Nhiquela', date: '2026-01-15' },
  CNY: { rate: 10.40, name: 'Yuan Chinês', source: 'Câmbio Oficial Nhiquela', date: '2026-01-15' },
  MZN: { rate: 1.00, name: 'Metical Moçambicano', source: 'Moeda Nacional', date: '2026-01-15' }
};

// Custos operacionais portuários e de terminal de referência em Moçambique
export const DOMESTIC_RATES = {
  TSA_JUE_FEE: 2500, // Taxa de Serviços Aduaneiros e Processamento JUE (Decreto 56/2011)
  KUDUMBA_SCANNER_FEE: 3200, // Taxa de Inspeção não-intrusiva / Varredura Kudumba
  TERMINAL_HANDLING_SEA: 4500, // Manuseamento de Carga Portuária (Porto de Maputo/Beira/Nacala)
  TERMINAL_HANDLING_AIR: 2800, // Terminal de Carga Aérea (Aeroporto de Mavalane/Beira)
  CUSTOMS_BROKER_FEE: 6500, // Honorários de Despacho Aduaneiro / Câmara de Despachantes
  LOCAL_TRANSPORT: {
    Maputo: 1500,
    Matola: 2200,
    Beira: 4500,
    Nampula: 6500,
    Tete: 7000,
    Pemba: 8000,
    Quelimane: 6000,
    Chimoio: 5000,
    Nacala: 6500,
    Inhambane: 4000,
    Outra: 5000
  }
};

class CustomsTaxEngine {
  /**
   * Atualiza a taxa de câmbio de uma moeda (para edição administrativa)
   */
  static setExchangeRate(currency = 'USD', rate, source = 'Câmbio Oficial Nhiquela') {
    const curr = (currency || 'USD').toUpperCase();
    if (CURRENCY_RATES[curr]) {
      CURRENCY_RATES[curr].rate = Number(rate);
      CURRENCY_RATES[curr].source = source;
      CURRENCY_RATES[curr].date = new Date().toISOString().split('T')[0];
      return CURRENCY_RATES[curr];
    }
    return null;
  }

  /**
   * Retorna as taxas de câmbio ativas
   */
  static getExchangeRates() {
    return { ...CURRENCY_RATES };
  }

  /**
   * Executa a determinação e liquidação de todos os encargos fiscais e logísticos
   * @param {Object} input
   */
  static calculate(input = {}) {
    const {
      currency = 'USD',
      quantity = 1,
      unitPrice = 0,
      totalGoodsValue = 0,
      freightOption = 'NEED_NHIQUELA', // 'HAS_QUOTE' | 'HAS_ESTIMATE' | 'NEED_NHIQUELA'
      freightValue = 0,
      insuranceOption = 'NEED_NHIQUELA', // 'HAS_QUOTE' | 'NEED_NHIQUELA'
      insuranceValue = 0,
      otherOriginCosts = 0,
      transportType = 'SEA', // 'SEA' | 'AIR' | 'ROAD'
      destinationCity = 'Maputo',
      tariffItem = null,
      customsDutyRateOverride = null,
      ivaRateOverride = null,
      iceRateOverride = null,
      isExemptOverride = null,
      importerType = 'company',
      exchangeRate: inputExchangeRate = null
    } = input;

    const currInfo = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
    const rateToMzn = inputExchangeRate && Number(inputExchangeRate) > 0 ? Number(inputExchangeRate) : currInfo.rate;

    // 1. Determinação do Valor da Mercadoria (VM / FOB)
    const qty = Math.max(1, parseInt(quantity) || 1);
    let vmInCurrency = 0;

    if (totalGoodsValue && Number(totalGoodsValue) > 0) {
      vmInCurrency = Number(totalGoodsValue);
    } else {
      vmInCurrency = (Number(unitPrice) || 0) * qty;
    }

    const vmInMzn = Number((vmInCurrency * rateToMzn).toFixed(2));

    // 2. Determinação do Frete Internacional
    let freightInMzn = 0;
    let freightStatus = 'CONFIRMED';

    if (freightOption === 'HAS_QUOTE' && Number(freightValue) > 0) {
      freightInMzn = Number((Number(freightValue) * rateToMzn).toFixed(2));
      freightStatus = 'CONFIRMED';
    } else if (freightOption === 'HAS_ESTIMATE' && Number(freightValue) > 0) {
      freightInMzn = Number((Number(freightValue) * rateToMzn).toFixed(2));
      freightStatus = 'ESTIMATED';
    } else {
      // Estimativa prudente conforme modalidade (Marítimo: ~18% a 22%, Aéreo: ~32% a 40%)
      const freightRatio = transportType === 'AIR' ? 0.35 : transportType === 'ROAD' ? 0.12 : 0.20;
      freightInMzn = Number((vmInMzn * freightRatio).toFixed(2));
      freightStatus = 'PENDING_NHIQUELA_QUOTE';
    }

    // 3. Determinação do Seguro de Transporte Internacional
    // Regra Aduaneira de Moçambique: Se o importador não apresentar apólice de seguro individual,
    // a Alfândega aplica a taxa teórica de 1% sobre (VM + Frete) para determinação do CIF.
    let insuranceInMzn = 0;
    let insuranceStatus = 'CONFIRMED';

    if (insuranceOption === 'HAS_QUOTE' && Number(insuranceValue) > 0) {
      insuranceInMzn = Number((Number(insuranceValue) * rateToMzn).toFixed(2));
      insuranceStatus = 'CONFIRMED';
    } else {
      insuranceInMzn = Number(((vmInMzn + freightInMzn) * 0.01).toFixed(2));
      insuranceStatus = 'ESTIMATED_STATUTORY_1_PERCENT';
    }

    // Outros custos incorridos na origem (embalagem especial, taxas portuárias de origem)
    const otherCostsInMzn = Number(((Number(otherOriginCosts) || 0) * rateToMzn).toFixed(2));

    // 4. Valor Aduaneiro (VA / CIF) = VM + Frete + Seguro + Outros
    // Base legal: Acordo sobre o Valor Aduaneiro da OMC e Legislação Aduaneira Moçambicana
    const customsValue = Number((vmInMzn + freightInMzn + insuranceInMzn + otherCostsInMzn).toFixed(2));

    // 5. Determinação das Taxas Fiscais Aplicáveis
    let daRate = 5;
    let ivaRate = 16;
    let iceRate = 0;
    let isExempt = false;
    let exemptionBasis = '';
    let legalBasis = 'Pauta Aduaneira Geral (Lei n.º 8/2025)';
    let shCode = tariffItem?.shCode || '8413.70.00';
    let officialDescription = tariffItem?.description || 'Classificação preliminar sob consulta';

    if (tariffItem) {
      daRate = tariffItem.daRate !== undefined ? tariffItem.daRate : 5;
      ivaRate = tariffItem.ivaRate !== undefined ? tariffItem.ivaRate : 16;
      iceRate = tariffItem.iceRate !== undefined ? tariffItem.iceRate : 0;
      isExempt = !!tariffItem.isExempt;
      exemptionBasis = tariffItem.exemptionBasis || '';
      legalBasis = tariffItem.legalBasis || legalBasis;
    }

    // Overrides se explicitados pelo despachante ou utilizador
    if (customsDutyRateOverride !== null && customsDutyRateOverride !== undefined) {
      daRate = Number(customsDutyRateOverride);
    }
    if (ivaRateOverride !== null && ivaRateOverride !== undefined) {
      ivaRate = Number(ivaRateOverride);
    }
    if (iceRateOverride !== null && iceRateOverride !== undefined) {
      iceRate = Number(iceRateOverride);
    }
    if (isExemptOverride !== null && isExemptOverride !== undefined) {
      isExempt = !!isExemptOverride;
    }

    // 6. Cálculo dos Direitos Aduaneiros (DA)
    // Base de incidência: Valor Aduaneiro (CIF)
    const customsDuty = Number((customsValue * (daRate / 100)).toFixed(2));

    // 7. Cálculo do Imposto sobre Consumos Específicos (ICE)
    // Base legal: Lei n.º 19/2022 e Lei n.º 7/2025 (Tabela I)
    // Base de incidência: Valor Aduaneiro
    const ice = Number((customsValue * (iceRate / 100)).toFixed(2));

    // 8. Base de Cálculo do IVA na Importação
    // Base legal: Artigo 17.º do Código do IVA de Moçambique
    // Base Tributável do IVA = VA (CIF) + Direitos Aduaneiros (DA) + ICE + Outras taxas aduaneiras
    const vatBase = Number((customsValue + customsDuty + ice).toFixed(2));

    // 9. Cálculo do IVA
    const effectiveIvaRate = isExempt ? 0 : ivaRate;
    const vat = Number((vatBase * (effectiveIvaRate / 100)).toFixed(2));

    // 10. Taxas Aduaneiras e Portuárias Oficiais
    const tsaJueFee = DOMESTIC_RATES.TSA_JUE_FEE;
    const kudumbaFee = DOMESTIC_RATES.KUDUMBA_SCANNER_FEE;
    const terminalHandling = transportType === 'AIR' ? DOMESTIC_RATES.TERMINAL_HANDLING_AIR : DOMESTIC_RATES.TERMINAL_HANDLING_SEA;
    const customsBrokerFee = DOMESTIC_RATES.CUSTOMS_BROKER_FEE;
    const domesticDeliveryFee = DOMESTIC_RATES.LOCAL_TRANSPORT[destinationCity] || DOMESTIC_RATES.LOCAL_TRANSPORT.Maputo;

    // Total de Impostos Legais Obrigatórios (Cobrados pelo Estado / AT)
    const totalGovernmentTaxes = Number((customsDuty + ice + vat + tsaJueFee).toFixed(2));

    // Total de Custos Operacionais e Portuários (Terminais, Varredura e Despachante)
    const totalOperationalHandling = Number((kudumbaFee + terminalHandling + customsBrokerFee + domesticDeliveryFee).toFixed(2));

    // 11. Serviço de Sourcing e Assessoria Nhiquela (Apresentado separadamente com transparência)
    // Margem de gestão completa, auditoria de fornecedor na China e coordenação porta-a-porta: 20% sobre o VM
    const nhiquelaServiceFee = Number((vmInMzn * 0.20).toFixed(2));

    // Total Global Estimado da Importação
    const totalImportCostMzn = Number((vmInMzn + freightInMzn + insuranceInMzn + otherCostsInMzn + totalGovernmentTaxes + totalOperationalHandling + nhiquelaServiceFee).toFixed(2));

    // Custo Estimado por Unidade
    const costPerUnitMzn = Number((totalImportCostMzn / qty).toFixed(2));
    const costPerUnitCurrency = Number((costPerUnitMzn / rateToMzn).toFixed(2));

    return {
      metadata: {
        calculationDate: new Date().toISOString(),
        currencyUsed: currency,
        exchangeRateToMzn: rateToMzn,
        exchangeRateSource: currInfo.source,
        exchangeRateDate: currInfo.date
      },
      goodsSummary: {
        quantity: qty,
        unitPriceCurrency: Number(unitPrice) || 0,
        totalGoodsValueCurrency: vmInCurrency,
        totalGoodsValueMzn: vmInMzn,
        currency
      },
      logisticsSummary: {
        transportType,
        destinationCity,
        freightMzn: freightInMzn,
        freightStatus,
        insuranceMzn: insuranceInMzn,
        insuranceStatus,
        otherCostsMzn: otherCostsInMzn,
        customsValueMzn: customsValue
      },
      taxSummary: {
        shCode,
        officialDescription,
        legalBasis,
        exemptionBasis: isExempt ? exemptionBasis : null,
        isExempt,
        customsDuty: {
          rate: daRate,
          baseMzn: customsValue,
          amountMzn: customsDuty,
          legalRule: 'Artigo 14 da Pauta Aduaneira (Lei 8/2025): DA = CIF x Taxa'
        },
        ice: {
          rate: iceRate,
          baseMzn: customsValue,
          amountMzn: ice,
          legalRule: iceRate > 0 ? 'Lei 19/2022 e Lei 7/2025: ICE = CIF x Taxa' : 'Isento / Não aplicável'
        },
        vat: {
          rate: effectiveIvaRate,
          baseMzn: vatBase,
          amountMzn: vat,
          legalRule: isExempt ? `Isenção: ${exemptionBasis}` : 'Artigo 17 do Código do IVA: Base = CIF + DA + ICE'
        },
        customsServicesFee: {
          name: 'Taxa de Serviços Aduaneiros (TSA / JUE)',
          amountMzn: tsaJueFee,
          legalRule: 'Decreto n.º 56/2011 (Processamento Eletrónico JUE)'
        },
        totalGovernmentTaxesMzn: totalGovernmentTaxes
      },
      operationalSummary: {
        kudumbaScannerFee: kudumbaFee,
        terminalHandlingFee: terminalHandling,
        customsBrokerFee,
        domesticDeliveryFee,
        totalOperationalFeesMzn: totalOperationalHandling
      },
      commercialSummary: {
        nhiquelaServiceFeeMzn: nhiquelaServiceFee,
        description: 'Serviço de Sourcing, Auditoria de Fornecedor na Origem e Acompanhamento Alfandegário Nhiquela'
      },
      grandTotal: {
        totalCostMzn: totalImportCostMzn,
        costPerUnitMzn,
        costPerUnitCurrency,
        currency,
        pendingItems: [
          freightStatus !== 'CONFIRMED' ? 'Frete internacional sujeito a cotação negociada de transitário' : null,
          'Validação física da mercadoria e conferência pautal final no Porto/Aeroporto de Entrada',
          'Taxa de câmbio final liquidada na data da Declaração Aduaneira (D.U.)'
        ].filter(Boolean)
      }
    };
  }
}

export default CustomsTaxEngine;
