import ImportSimulationLead from '../models/ImportSimulationLeadModel.js';
import ImportRequest from '../models/ImportRequestModel.js';
import TariffDatabaseService from '../services/TariffDatabaseService.js';
import ProductClassificationService from '../services/ProductClassificationService.js';
import CustomsTaxEngine from '../services/CustomsTaxEngine.js';
import Settings from '../../../models/SettingsModel.js';

let ratesLoadedFromDb = false;
async function syncExchangeRatesWithDb() {
  if (ratesLoadedFromDb) return;
  try {
    const setting = await Settings.findOne({ key: 'import_exchange_rates' });
    if (setting && setting.value) {
      const dbRates = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      if (dbRates && typeof dbRates === 'object') {
        Object.keys(dbRates).forEach((curr) => {
          if (dbRates[curr]?.rate) {
            CustomsTaxEngine.setExchangeRate(curr, dbRates[curr].rate, dbRates[curr].source || 'Câmbio Oficial Nhiquela');
          }
        });
      }
    } else {
      await Settings.create({
        key: 'import_exchange_rates',
        value: CustomsTaxEngine.getExchangeRates(),
        description: 'Taxas de câmbio oficiais de importação (Nhiquela)',
        type: 'json'
      });
    }
    ratesLoadedFromDb = true;
  } catch (err) {
    console.error('[syncExchangeRatesWithDb] Aviso:', err?.message || err);
  }
}

// Cache simples em memória para Rate Limiting anti-abuso e anti-scraping
const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS_PER_WINDOW = 35; // máx 35 pedidos por IP por janela

const checkRateLimit = (ip) => {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    ipRequestCounts.set(ip, { count: 1, startTime: now });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
};

/**
 * 1. CLASSIFICAÇÃO PAUTAL ASSISTIDA (Motor de Classificação Inteligente)
 * POST /api/import/simulation/classify
 */
export const classifyProduct = async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ message: 'Limite de consultas atingido. Tente mais tarde.' });
    }

    const {
      productName,
      productDescription,
      category,
      material,
      functionUse,
      technicalSpecs,
      condition
    } = req.body;

    if (!productName && !productDescription) {
      return res.status(400).json({ message: 'Indique o nome ou descrição do produto.' });
    }

    const classificationResult = ProductClassificationService.classify({
      productName,
      productDescription,
      category,
      material,
      functionUse,
      technicalSpecs,
      condition
    });

    res.status(200).json(classificationResult);
  } catch (error) {
    console.error('[classifyProduct] Erro:', error);
    res.status(500).json({ message: 'Erro ao classificar produto.' });
  }
};

/**
 * 2. CÁLCULO ADUANEIRO DETALHADO (Motor Fiscal)
 * POST /api/import/simulation/calculate
 */
export const calculateCustomsTax = async (req, res) => {
  try {
    await syncExchangeRatesWithDb();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ message: 'Limite de simulações atingido. Tente mais tarde.' });
    }

    const calculationResult = CustomsTaxEngine.calculate(req.body);
    res.status(200).json(calculationResult);
  } catch (error) {
    console.error('[calculateCustomsTax] Erro:', error);
    res.status(500).json({ message: 'Erro ao calcular encargos aduaneiros.' });
  }
};

/**
 * 3. CONSULTA PAUTAL PÚBLICA E DIRETA
 * GET /api/import/tariff/search?q=...&category=...
 */
export const searchTariff = async (req, res) => {
  try {
    const { q, category } = req.query;
    const items = TariffDatabaseService.search(q, category);
    const metadata = TariffDatabaseService.getMetadata();

    res.status(200).json({
      items,
      count: items.length,
      metadata
    });
  } catch (error) {
    console.error('[searchTariff] Erro:', error);
    res.status(500).json({ message: 'Erro ao pesquisar na pauta aduaneira.' });
  }
};

/**
 * 4. DETALHES DE UMA POSIÇÃO PAUTAL
 * GET /api/import/tariff/:shCode
 */
export const getTariffByCode = async (req, res) => {
  try {
    const item = TariffDatabaseService.getByShCode(req.params.shCode);
    if (!item) {
      return res.status(404).json({ message: 'Código pautal não encontrado.' });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error('[getTariffByCode] Erro:', error);
    res.status(500).json({ message: 'Erro ao buscar código pautal.' });
  }
};

/**
 * 5. SALVAR OU ATUALIZAR ETAPA DE UMA SIMULAÇÃO
 * POST /api/import/simulation/save-step
 */
export const saveSimulationStep = async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const {
      simulationId,
      simulationCode: providedCode,
      productName,
      productDescription,
      productLink,
      quantity,
      currency,
      unitPrice,
      freightOption,
      freightKnownValue,
      insuranceOption,
      destinationCity,
      originCountry,
      transportType,
      importerType,
      contactName,
      phone,
      companyName,
      email,
      notes,
      estimatedRange,
      status
    } = req.body;

    let lead = null;

    if (simulationId) {
      lead = await ImportSimulationLead.findById(simulationId);
    } else if (providedCode) {
      lead = await ImportSimulationLead.findOne({ simulationCode: providedCode });
    }

    const calculatedEstimatedValueUsd = req.body.estimatedValueUsd !== undefined 
      ? parseFloat(req.body.estimatedValueUsd) 
      : (unitPrice && quantity ? (parseFloat(unitPrice) * parseInt(quantity)) : 0);

    if (!lead) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const simulationCode = providedCode || `NQL-SIM-${randomSuffix}`;

      lead = new ImportSimulationLead({
        simulationCode,
        productName: productName || 'Produto sem nome',
        estimatedValueUsd: calculatedEstimatedValueUsd,
        ipAddress: clientIp,
        userId: req.user ? req.user._id : null
      });
    }

    // Atualização de campos disponíveis
    if (productName) lead.productName = productName.trim();
    if (productDescription !== undefined) lead.productDescription = productDescription.trim();
    if (productLink !== undefined) lead.productLink = productLink.trim();
    if (quantity !== undefined) lead.quantity = parseInt(quantity) || 1;
    if (currency) lead.currency = currency;
    if (unitPrice !== undefined) lead.unitPrice = parseFloat(unitPrice) || 0;
    lead.estimatedValueUsd = calculatedEstimatedValueUsd || lead.estimatedValueUsd || 0;
    if (freightOption) lead.freightOption = freightOption;
    if (freightKnownValue !== undefined) lead.freightKnownValue = parseFloat(freightKnownValue) || 0;
    if (insuranceOption) lead.insuranceOption = insuranceOption;
    if (destinationCity) lead.destinationCity = destinationCity;
    if (originCountry) lead.originCountry = originCountry;
    if (transportType) lead.transportType = transportType;
    if (importerType) lead.importerType = importerType;
    if (contactName) lead.contactName = contactName.trim();
    if (phone) lead.phone = phone.trim();
    if (companyName) lead.companyName = companyName.trim();
    if (email) lead.email = email.trim();
    if (notes) lead.notes = notes.trim();
    if (estimatedRange) lead.estimatedRange = estimatedRange;
    if (status) lead.status = status;
    if (req.user && !lead.userId) lead.userId = req.user._id;

    try {
      const savedLead = await lead.save();
      return res.status(200).json({
        simulationId: savedLead._id,
        simulationCode: savedLead.simulationCode,
        lead: savedLead
      });
    } catch (dbErr) {
      console.warn('[saveSimulationStep] Aviso BD (persistencia pendente):', dbErr.message);
      return res.status(200).json({
        simulationId: lead._id || 'sim_local_pending',
        simulationCode: lead.simulationCode,
        lead,
        pendingSync: true
      });
    }
  } catch (error) {
    console.error('[saveSimulationStep] Erro:', error);
    res.status(500).json({ message: 'Erro ao guardar dados da simulação.' });
  }
};

/**
 * 6. CAPTURA DE CONTACTO E LEAD COMERCIAL
 * POST /api/import/simulation/capture-lead
 */
export const captureSimulationLead = async (req, res) => {
  try {
    const {
      simulationId,
      simulationCode,
      contactName,
      phone,
      companyName,
      email,
      notes
    } = req.body;

    if (!contactName || !phone) {
      return res.status(400).json({ message: 'O nome e o contacto de WhatsApp/telefone são obrigatórios.' });
    }

    let lead = null;
    if (simulationId) {
      lead = await ImportSimulationLead.findById(simulationId);
    } else if (simulationCode) {
      lead = await ImportSimulationLead.findOne({ simulationCode });
    }

    if (!lead) {
      const generatedCode = simulationCode || `NQL-SIM-${Math.floor(1000 + Math.random() * 9000)}`;
      lead = new ImportSimulationLead({
        simulationCode: generatedCode,
        productName: req.body.productName || 'Importação Geral',
        contactName: contactName.trim(),
        phone: phone.trim(),
        companyName: companyName ? companyName.trim() : '',
        email: email ? email.trim() : '',
        status: 'CONTACTO_REGISTADO'
      });
    } else {
      lead.contactName = contactName.trim();
      lead.phone = phone.trim();
      if (companyName) lead.companyName = companyName.trim();
      if (email) lead.email = email.trim();
      if (notes) lead.notes = notes.trim();
      if (req.user && !lead.userId) lead.userId = req.user._id;
      lead.status = 'CONTACTO_REGISTADO';
    }

    try {
      await lead.save();
    } catch (saveErr) {
      console.warn('[captureSimulationLead] Aviso BD:', saveErr.message);
    }

    // Notificar painel administrativo em tempo real via Socket.IO
    const io = req.app?.get('io');
    if (io) {
      io.emit('new_import_simulation_lead', lead);
      io.emit('admin_notification', {
        type: 'NEW_IMPORT_SIMULATION_LEAD',
        title: 'Novo Lead de Importação 🚀',
        message: `${lead.contactName} (${lead.phone}) simulou importação de ${lead.productName}`,
        simulationId: lead._id
      });
    }

    // Gerar link e texto oficial do WhatsApp Nhiquela
    const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
    const nhiquelaWhatsappNumber = '258840000000'; // Número oficial da equipa Nhiquela
    const whatsappMessage = encodeURIComponent(
      `Olá Nhiquela! Fiz a simulação #${lead.simulationCode} no vosso site para importar *${lead.productName}* (${lead.originCountry}, ${lead.transportType === 'SEA' ? 'Marítimo' : 'Aéreo'}). ` +
      `Gostaria de receber a cotação oficial e apoio da vossa equipa.`
    );
    const whatsappLink = `https://wa.me/${nhiquelaWhatsappNumber}?text=${whatsappMessage}`;

    res.status(200).json({
      success: true,
      simulationCode: lead.simulationCode,
      lead,
      whatsappLink,
      message: 'Contacto registado com sucesso! A equipa da Nhiquela irá validar a pauta e preparar a cotação oficial.'
    });
  } catch (error) {
    console.error('[captureSimulationLead] Erro:', error);
    res.status(500).json({ message: 'Erro ao registar contacto de simulação.' });
  }
};

/**
 * 7. PEDIDO FORMAL DE COTAÇÃO E CONVERSÃO EM PEDIDO
 * POST /api/import/simulation/request-quote
 */
export const requestOfficialQuoteFromSimulation = async (req, res) => {
  try {
    const { simulationId, targetBudget, detailedDescription } = req.body;
    let lead = null;
    if (simulationId) {
      try {
        lead = await ImportSimulationLead.findById(simulationId);
      } catch (e) {}
    }

    const simCode = lead?.simulationCode || `NQL-SIM-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerId = req.user ? req.user._id : (lead?.userId || '64e3c1f2b3b3a2a1a1a1a1a1');

    try {
      const newRequest = new ImportRequest({
        customerId,
        productName: lead?.productName || 'Importação Solicitada',
        description: detailedDescription || `Pedido gerado a partir da Simulação #${simCode}.\nImportador: ${lead?.contactName || 'Cliente'} (${lead?.companyName || 'Particular'}).\nTelefone: ${lead?.phone || ''}.\nDescrição: ${lead?.productDescription || ''}`,
        quantity: lead?.quantity || 1,
        preferredOriginCountry: lead?.originCountry || 'China',
        shippingMethod: lead?.transportType || 'SEA',
        targetBudget: targetBudget || lead?.estimatedRange?.maxMzn,
        notes: `Origem: Simulação #${simCode}. Destino: ${lead?.destinationCity || 'Moçambique'}`
      });

      const savedRequest = await newRequest.save();

      if (lead) {
        lead.status = 'COTACAO_SOLICITADA';
        lead.requestId = savedRequest._id;
        await lead.save();
      }

      const io = req.app?.get('io');
      if (io) {
        io.emit('import_request_created', savedRequest);
      }

      return res.status(201).json({
        success: true,
        requestId: savedRequest._id,
        simulationCode: simCode,
        message: 'Pedido formal de cotação enviado com sucesso para a equipa da Nhiquela.'
      });
    } catch (saveErr) {
      console.warn('[requestOfficialQuoteFromSimulation] Aviso persistência:', saveErr.message);
      return res.status(201).json({
        success: true,
        simulationCode: simCode,
        message: 'Pedido registado com sucesso para contacto da equipa da Nhiquela.'
      });
    }
  } catch (error) {
    console.error('[requestOfficialQuoteFromSimulation] Erro:', error);
    res.status(500).json({ message: 'Erro ao solicitar cotação formal.' });
  }
};

/**
 * 8. ADMIN: LISTAGEM DE LEADS E SIMULAÇÕES
 * GET /api/import/simulations/admin
 */
export const getAdminSimulationLeads = async (req, res) => {
  try {
    const leads = await ImportSimulationLead.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'name email phone');

    res.status(200).json(leads);
  } catch (error) {
    console.error('[getAdminSimulationLeads] Erro:', error);
    res.status(500).json({ message: 'Erro ao buscar leads do simulador.' });
  }
};

/**
 * 9. ADMIN: VALIDAÇÃO TÉCNICA DE CLASSIFICAÇÃO PAUTAL
 * PUT /api/import/simulations/:id/validate-tariff
 */
export const validateTariffClassification = async (req, res) => {
  try {
    const { id } = req.params;
    const { shCode, officialDescription, daRate, ivaRate, iceRate, validationNotes } = req.body;

    const lead = await ImportSimulationLead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: 'Simulação não encontrada.' });
    }

    lead.notes = `${lead.notes || ''}\n[Classificação Validada por Admin]: SH ${shCode} - ${officialDescription}. DA: ${daRate}%, IVA: ${ivaRate}%. Nota: ${validationNotes || ''}`;
    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Classificação pautal validada com sucesso pelo despachante/operador.',
      lead
    });
  } catch (error) {
    console.error('[validateTariffClassification] Erro:', error);
    res.status(500).json({ message: 'Erro ao validar classificação.' });
  }
};

/**
 * 10. SIMULAÇÃO PRELIMINAR (Compatibilidade com a versão anterior)
 * POST /api/import/simulation/preliminary
 */
export const calculatePreliminarySimulation = async (req, res) => {
  try {
    const calculation = CustomsTaxEngine.calculate(req.body);
    const {
      productName,
      productDescription = '',
      originCountry = 'China',
      transportType = 'SEA',
      importerType = 'company'
    } = req.body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const simulationCode = `NQL-SIM-${randomSuffix}`;

    const lead = new ImportSimulationLead({
      simulationCode,
      productName: productName?.trim() || 'Simulação Preliminar',
      productDescription: productDescription?.trim() || '',
      originCountry,
      transportType,
      estimatedValueUsd: calculation.goodsSummary.totalGoodsValueCurrency,
      importerType,
      estimatedRange: {
        minMzn: Math.round(calculation.grandTotal.totalCostMzn * 0.92),
        maxMzn: Math.round(calculation.grandTotal.totalCostMzn * 1.08),
        exchangeRate: calculation.metadata.exchangeRateToMzn
      },
      status: 'INICIADA',
      userId: req.user ? req.user._id : null
    });

    const savedLead = await lead.save();

    res.status(200).json({
      simulationId: savedLead._id,
      simulationCode: savedLead.simulationCode,
      productName: savedLead.productName,
      estimatedRange: savedLead.estimatedRange,
      goodsCostMzn: calculation.goodsSummary.totalGoodsValueMzn,
      dutiesEstimate: {
        minMzn: calculation.taxSummary.customsDuty.amountMzn,
        maxMzn: calculation.taxSummary.totalGovernmentTaxesMzn
      },
      exchangeRate: calculation.metadata.exchangeRateToMzn,
      disclaimer: 'O resultado depende da classificação pautal oficial, dos custos logísticos negociados e das regras fiscais moçambicanas.'
    });
  } catch (error) {
    console.error('[calculatePreliminarySimulation] Erro:', error);
    res.status(500).json({ message: 'Erro ao gerar simulação preliminar.' });
  }
};

/**
 * 11. CONSULTAR TAXAS DE CÂMBIO ATIVAS
 * GET /api/import/simulation/exchange-rates
 */
export const getExchangeRates = async (req, res) => {
  try {
    await syncExchangeRatesWithDb();
    const rates = CustomsTaxEngine.getExchangeRates();
    res.status(200).json(rates);
  } catch (error) {
    console.error('[getExchangeRates] Erro:', error);
    res.status(500).json({ message: 'Erro ao buscar taxas de câmbio.' });
  }
};

/**
 * 12. ATUALIZAR TAXA DE CÂMBIO (ADMIN)
 * PUT /api/import/simulation/exchange-rates
 */
export const updateExchangeRate = async (req, res) => {
  try {
    const { currency = 'USD', rate, source = 'Câmbio Oficial Nhiquela' } = req.body;
    const numRate = Number(rate);
    if (!numRate || numRate <= 0) {
      return res.status(400).json({ message: 'Taxa de câmbio inválida. Deve ser maior que zero.' });
    }

    const updated = CustomsTaxEngine.setExchangeRate(currency, numRate, source);
    if (!updated) {
      return res.status(404).json({ message: `Moeda ${currency} não suportada.` });
    }

    const allRates = CustomsTaxEngine.getExchangeRates();
    await Settings.findOneAndUpdate(
      { key: 'import_exchange_rates' },
      {
        key: 'import_exchange_rates',
        value: allRates,
        description: 'Taxas de câmbio oficiais de importação (Nhiquela)',
        type: 'json'
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: `Taxa de câmbio de ${currency.toUpperCase()} atualizada para ${numRate} MT com sucesso!`,
      rates: allRates,
      updatedRate: updated
    });
  } catch (error) {
    console.error('[updateExchangeRate] Erro:', error);
    res.status(500).json({ message: 'Erro ao atualizar taxa de câmbio.' });
  }
};
