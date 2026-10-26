import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Badge, Spinner, Modal, Table, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight, faArrowLeft, faShieldAlt, faCheckCircle, faComments, faFileInvoiceDollar,
  faBuilding, faUser, faPhone, faEnvelope, faRedo, faClock, faPlane, faShip, faTruck,
  faSearch, faBook, faBoxes, faBalanceScale, faFileAlt, faInfoCircle, faExclamationTriangle,
  faListOl, faGlobe, faExternalLinkAlt, faTimes, faFilePdf, faDownload, faExchangeAlt, faCheck, faStar,
  faMapMarkerAlt, faBolt, faCamera, faTrash, faUpload, faImage
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../api';
import { selectUser } from '../store/features/userSlice';
import { PAUTA_CATEGORIES } from '../data/pautaAduaneiraData';
import { generateProformaPdf } from '../utils/generateProformaPdf';
import './ImportTariffCards.css';

export default function ImportFunnelSimulator({ onStartQuoteRequest }) {
  const currentUser = useSelector(selectUser);
  const isAdmin = Boolean(currentUser && (currentUser.isAdmin === true || currentUser.role === 'ADMIN' || currentUser.role === 'admin'));

  // Etapa ativa do assistente (1 a 7)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal de Consulta Pautal Direta Independente
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [tariffSearchQuery, setTariffSearchQuery] = useState('');
  const [tariffSearchResults, setTariffSearchResults] = useState([]);
  const [tariffSearchLoading, setTariffSearchLoading] = useState(false);

  // --- DADOS DA ETAPA 2: IDENTIFICAÇÃO DO PRODUTO ---
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [category, setCategory] = useState('Agricultura & Pecuária');
  const [productLink, setProductLink] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productImageDataUrl, setProductImageDataUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // --- DADOS DA ETAPA 3: CLASSIFICAÇÃO PAUTAL INTELIGENTE ---
  const [classificationResult, setClassificationResult] = useState(null);
  const [selectedTariffItem, setSelectedTariffItem] = useState(null);
  const [disambiguationAnswers, setDisambiguationAnswers] = useState({});

  // --- DADOS DA ETAPA 4: LOGÍSTICA E ENCOMENDA ---
  const [originCountry, setOriginCountry] = useState('China');
  const [acquisitionCountry, setAcquisitionCountry] = useState('China');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(1000);
  const [currency, setCurrency] = useState('USD');
  const [incoterm, setIncoterm] = useState('FOB');
  const [transportType, setTransportType] = useState('SEA'); // 'SEA' | 'AIR' | 'ROAD'
  const [entryPort, setEntryPort] = useState('Porto de Maputo');
  const [destinationCity, setDestinationCity] = useState('Maputo');
  const [freightOption, setFreightOption] = useState('NEED_NHIQUELA'); // 'HAS_QUOTE' | 'HAS_ESTIMATE' | 'NEED_NHIQUELA'
  const [freightValue, setFreightValue] = useState('200');
  const [isFreightCustom, setIsFreightCustom] = useState(false);
  const [importerType, setImporterType] = useState('company');

  // --- DADOS DA ETAPA 5 & 6: RESULTADO DO MOTOR FISCAL ---
  const [calculationResult, setCalculationResult] = useState(null);

  // --- DADOS DA ETAPA 7: CONTACTO E PEDIDO ---
  const [contactName, setContactName] = useState(currentUser?.name ? String(currentUser.name) : '');
  const [phone, setPhone] = useState(
    currentUser?.phone || currentUser?.phoneNumber ? String(currentUser.phone || currentUser.phoneNumber) : ''
  );
  const [companyName, setCompanyName] = useState(currentUser?.companyName ? String(currentUser.companyName) : '');
  const [email, setEmail] = useState(currentUser?.email ? String(currentUser.email) : '');
  const [notes, setNotes] = useState('');
  const [simulationCode, setSimulationCode] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [formalQuoteSent, setFormalQuoteSent] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({
    USD: { rate: 75.00, name: 'Dólar Americano', source: 'Câmbio Oficial Nhiquela' },
    ZAR: { rate: 4.10, name: 'Rand Sul-Africano', source: 'Câmbio Oficial Nhiquela' },
    EUR: { rate: 81.50, name: 'Euro', source: 'Câmbio Oficial Nhiquela' },
    CNY: { rate: 10.40, name: 'Yuan Chinês', source: 'Câmbio Oficial Nhiquela' },
    GBP: { rate: 95.00, name: 'Libra Esterlina', source: 'Câmbio Oficial Nhiquela' }
  });

  // Carregar taxas de câmbio oficiais configuradas pelo admin na API
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const res = await api.get('/import/simulation/exchange-rates');
        if (res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
          setExchangeRates(res.data);
        }
      } catch (err) {
        console.warn('[ImportFunnelSimulator] Uso de taxas de câmbio de fallback:', err?.message || err);
      }
    };
    fetchExchangeRates();
  }, []);

  // Efeito para preencher contactos se utilizador logado
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !contactName) setContactName(String(currentUser.name));
      const userPhone = currentUser.phone || currentUser.phoneNumber;
      if (userPhone && !phone) setPhone(String(userPhone));
      if (currentUser.email && !email) setEmail(String(currentUser.email));
      if (currentUser.companyName && !companyName) setCompanyName(String(currentUser.companyName));
    }
  }, [currentUser]);

  // Upload de imagem do produto (com suporte a API multipart e fallback base64 local)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor selecione um ficheiro de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.warning('A imagem deve ter tamanho inferior a 10MB.');
      return;
    }

    // Gerar imediatamente data URL local para impressão no PDF
    const localReader = new FileReader();
    localReader.onloadend = () => {
      setProductImageDataUrl(localReader.result);
    };
    localReader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      let uploadRes;
      try {
        uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (err) {
        uploadRes = await api.post('/upload/local', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (uploadRes?.data) {
        const url = uploadRes.data.url || uploadRes.data.secure_url || uploadRes.data;
        if (typeof url === 'string') {
          setProductImage(url);
          toast.success('Imagem do produto anexada com sucesso!');
          return;
        }
      }

      // Fallback base64 para garantia total de funcionamento offline ou sem S3/Cloudinary
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result);
        setProductImageDataUrl(reader.result);
        toast.success('Imagem do produto anexada!');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Erro ao enviar imagem ao servidor, convertendo localmente:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result);
        setProductImageDataUrl(reader.result);
        toast.success('Imagem do produto anexada!');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // Rolar suavemente para o topo do simulador
  const scrollToSimulator = () => {
    document.getElementById('simulator-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- BUSCA NA PAUTA DIRETA (MOÇAMBIQUE) ---
  // REGRA: Por padrão apresenta APENAS 5 ITENS de referência.
  // Ao pesquisar, busca pelo nome do item, descrição oficial da pauta aduaneira, exemplos e código SH.
  const handleSearchTariff = async (query = '') => {
    const cleanQuery = (query !== undefined ? query : tariffSearchQuery || '').trim();
    setTariffSearchLoading(true);
    try {
      const res = await api.get(`/import/tariff/search?q=${encodeURIComponent(cleanQuery)}`);
      let items = res.data?.items || [];
      // Garantir rigorosamente apenas 5 itens por padrão se não houver pesquisa
      if (!cleanQuery) {
        items = items.slice(0, 5);
      }
      setTariffSearchResults(items);
    } catch (err) {
      console.warn('[handleSearchTariff] Consulta à API falhou, utilizando dataset pautal local:', err);
      // Fallback robusto para o dataset local PAUTA_CATEGORIES
      if (!cleanQuery) {
        setTariffSearchResults(PAUTA_CATEGORIES.slice(0, 5).map(c => ({
          shCode: c.shCode,
          name: c.name,
          description: c.name,
          category: c.group,
          daRate: c.daRate,
          ivaRate: c.ivaRate,
          iceRate: c.iceRate,
          notes: c.exemptNotes,
          examples: c.examples
        })));
      } else {
        const qLower = cleanQuery.toLowerCase();
        const matches = PAUTA_CATEGORIES.filter(c =>
          (c.name && c.name.toLowerCase().includes(qLower)) ||
          (c.shCode && c.shCode.toLowerCase().includes(qLower)) ||
          (c.examples && c.examples.toLowerCase().includes(qLower)) ||
          (c.group && c.group.toLowerCase().includes(qLower)) ||
          (c.exemptNotes && c.exemptNotes.toLowerCase().includes(qLower))
        ).map(c => ({
          shCode: c.shCode,
          name: c.name,
          description: c.name,
          category: c.group,
          daRate: c.daRate,
          ivaRate: c.ivaRate,
          iceRate: c.iceRate,
          notes: c.exemptNotes,
          examples: c.examples
        }));
        setTariffSearchResults(matches);
      }
    } finally {
      setTariffSearchLoading(false);
    }
  };

  // Ao abrir o modal, carregar sempre os 5 itens padrão de referência
  useEffect(() => {
    if (showTariffModal) {
      setTariffSearchQuery('');
      handleSearchTariff('');
    }
  }, [showTariffModal]);

  // Pesquisa dinâmica em tempo real com debounce de 300ms quando o utilizador digita
  useEffect(() => {
    if (!showTariffModal) return;
    const clean = tariffSearchQuery.trim();
    if (!clean) {
      handleSearchTariff('');
      return;
    }
    const timer = setTimeout(() => {
      handleSearchTariff(clean);
    }, 300);
    return () => clearTimeout(timer);
  }, [tariffSearchQuery, showTariffModal]);

  // --- TRANSIÇÃO ETAPA 1 -> ETAPA 2 ---
  const startSimulationWizard = () => {
    setStep(2);
    scrollToSimulator();
  };

  // Taxa de frete estimada padrão conforme modal de transporte
  const getAutoFreightRate = () => {
    return transportType === 'AIR' ? 0.35 : transportType === 'ROAD' ? 0.12 : 0.20;
  };

  // Valor do frete preenchido e estimado automaticamente por padrão
  const getAutoFreightValue = () => {
    const parsed = parseFloat(freightValue);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
    const qty = Math.max(1, parseInt(quantity) || 1);
    const price = Math.max(0, parseFloat(unitPrice) || 0);
    const goodsTotal = qty * price;
    return Number((goodsTotal * getAutoFreightRate()).toFixed(2));
  };

  // Recalcula o valor do frete automaticamente se o usuário ainda não tiver editado manualmente
  useEffect(() => {
    if (!isFreightCustom) {
      const qty = Math.max(1, parseInt(quantity) || 1);
      const price = Math.max(0, parseFloat(unitPrice) || 0);
      const rate = transportType === 'AIR' ? 0.35 : 0.20;
      setFreightValue((qty * price * rate).toFixed(2));
    }
  }, [quantity, unitPrice, transportType, isFreightCustom]);

  // Cálculo automático do seguro aduaneiro à taxa legal de 1% sobre CIF (Moçambique)
  const calculateAutoInsurance = () => {
    const qty = Math.max(1, parseInt(quantity) || 1);
    const price = Math.max(0, parseFloat(unitPrice) || 0);
    const goodsTotal = qty * price;
    const freight = getAutoFreightValue();
    return Number(((goodsTotal + freight) * 0.01).toFixed(2));
  };

  // --- TRANSIÇÃO ETAPA 2 -> ETAPA 3 (Executar Classificação Pautal Assistida) ---
  const handleProceedToStep3 = async (e) => {
    if (e) e.preventDefault();

    if (!productName.trim() || productName.trim().length < 3) {
      toast.warning('O nome comercial do produto é obrigatório.');
      return;
    }
    if (!productDescription.trim() || productDescription.trim().length < 8) {
      toast.warning('Por favor forneça uma descrição detalhada e completa da mercadoria (função, potência, composição).');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      toast.warning('Indique uma quantidade válida (mínimo 1 unidade).');
      return;
    }
    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      toast.warning('Indique o preço de compra unitário do produto.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/import/simulation/classify', {
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        category,
        productLink: productLink.trim(),
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        currency,
        freightOption,
        freightValue: parseFloat(freightValue) || 0
      });

      setClassificationResult(res.data);
      if (res.data.topCandidate) {
        setSelectedTariffItem(res.data.topCandidate);
      } else if (res.data.candidates && res.data.candidates.length > 0) {
        setSelectedTariffItem(res.data.candidates[0]);
      } else {
        setSelectedTariffItem(null);
      }

      setStep(3);
      scrollToSimulator();
    } catch (err) {
      toast.error('Erro ao processar classificação pautal. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // --- TRANSIÇÃO ETAPA 3 -> ETAPA 4 (Confirmar Classificação e ir para Logística) ---
  const handleProceedToStep4 = () => {
    if (!selectedTariffItem && classificationResult?.candidates?.length > 0) {
      setSelectedTariffItem(classificationResult.candidates[0]);
    }
    if (!selectedTariffItem) {
      toast.warning('Por favor selecione uma classificação pautal válida para prosseguir com o cálculo.');
      return;
    }
    setStep(4);
    scrollToSimulator();
  };

  // --- TRANSIÇÃO ETAPA 4 -> ETAPA 5 & 6 (Executar Motor Fiscal e Apresentar Relatório) ---
  const handleRunCustomsCalculation = async (e) => {
    if (e) e.preventDefault();

    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      toast.warning('Indique um preço unitário válido.');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      toast.warning('Indique uma quantidade válida.');
      return;
    }

    setLoading(true);
    setStep(5); // Tela de processamento do cálculo
    scrollToSimulator();

    try {
      const autoFreightAmount = getAutoFreightValue();
      const autoInsuranceAmount = calculateAutoInsurance();
      const payload = {
        currency,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        freightOption: isFreightCustom ? 'HAS_QUOTE' : 'HAS_ESTIMATE',
        freightValue: parseFloat(freightValue) || autoFreightAmount,
        insuranceOption: 'ESTIMATED_STATUTORY_1_PERCENT',
        insuranceValue: autoInsuranceAmount,
        transportType,
        destinationCity,
        tariffItem: selectedTariffItem,
        importerType
      };

      const res = await api.post('/import/simulation/calculate', payload);
      setCalculationResult(res.data);

      // Salva rascunho no backend
      try {
        const saveRes = await api.post('/import/simulation/save-step', {
          productName,
          productDescription,
          productImage,
          quantity: parseInt(quantity),
          currency,
          unitPrice: parseFloat(unitPrice),
          freightOption: 'NEED_NHIQUELA',
          freightKnownValue: autoFreightAmount,
          insuranceOption: 'ESTIMATED_STATUTORY_1_PERCENT',
          destinationCity,
          originCountry,
          transportType,
          importerType,
          tariffItem: selectedTariffItem,
          calculationResult: res.data,
          estimatedRange: {
            minMzn: res.data.grandTotal.totalCostMzn * 0.95,
            maxMzn: res.data.grandTotal.totalCostMzn * 1.05,
            exchangeRate: res.data.metadata.exchangeRateToMzn
          },
          status: 'SIMULACAO_REALIZADA'
        });
        setSimulationCode(saveRes.data.simulationCode);
      } catch (errSave) {
        console.error('Aviso ao guardar rascunho:', errSave);
      }

      // Transição automática para Etapa 6 após breve feedback de cálculo
      setTimeout(() => {
        setStep(6);
        setLoading(false);
        scrollToSimulator();
      }, 700);
    } catch (err) {
      toast.error('Erro ao executar motor fiscal. Verifique os dados inseridos.');
      setStep(4);
      setLoading(false);
    }
  };

  // --- TRANSIÇÃO ETAPA 6 -> ETAPA 7 (Avançar para Contacto e Cotação) ---
  const handleProceedToStep7 = () => {
    setStep(7);
    scrollToSimulator();
  };

  // --- GERAR E DESCARREGAR FACTURA PROFORMA EM PDF ---
  const handleDownloadProformaPdf = (customCode = null) => {
    try {
      generateProformaPdf({
        simulationCode: customCode || simulationCode || 'NQL-SIM-DEMO',
        customer: {
          name: contactName || currentUser?.name || 'Cliente Particular',
          company: companyName || currentUser?.companyName || '',
          city: destinationCity || 'Maputo',
          phone: phone || currentUser?.phone || currentUser?.phoneNumber || '',
          email: email || currentUser?.email || '',
          nuit: ''
        },
        product: {
          name: productName || 'Produto de Importação',
          description: productDescription || '',
          productImage: productImageDataUrl || productImage,
          category,
          originCountry: originCountry || 'China',
          destinationCity: destinationCity || 'Maputo',
          transportType,
          quantity: parseInt(quantity) || 1,
          unitPrice: parseFloat(unitPrice) || 0,
          currency
        },
        tariffItem: selectedTariffItem,
        calculationResult
      });
      toast.success('Factura Proforma transferida com sucesso!');
    } catch (errPdf) {
      console.error('Erro ao gerar Factura Proforma:', errPdf);
      toast.error('Erro ao gerar o ficheiro PDF.');
    }
  };

  // --- SUBMETER PEDIDO FINAL E CONTACTO ---
  const handleSubmitLeadAndQuote = async (e) => {
    if (e) e.preventDefault();

    const safeContactName = String(contactName || '').trim();
    const safePhone = String(phone || '').trim();
    const safeCompanyName = String(companyName || '').trim();
    const safeEmail = String(email || '').trim();
    const safeNotes = String(notes || '').trim();

    if (!safeContactName || !safePhone) {
      toast.warning('O nome e o telefone/WhatsApp são obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/import/simulation/capture-lead', {
        simulationCode,
        contactName: safeContactName,
        phone: safePhone,
        companyName: safeCompanyName,
        email: safeEmail,
        productName: productName || selectedTariffItem?.description || 'Importação Geral',
        productDescription: productDescription || '',
        notes: `Destino: ${destinationCity}. Modal: ${transportType}. Mercadoria: ${productName || selectedTariffItem?.description || ''}. Código SH: ${selectedTariffItem?.shCode || 'Pendente'}.${safeNotes ? ' ' + safeNotes : ''}`,
        tariffItem: selectedTariffItem,
        calculationResult,
        productImage,
        originCountry,
        destinationCity,
        transportType
      });

      let leadWhatsapp = res.data?.whatsappLink;
      if (leadWhatsapp) setWhatsappUrl(leadWhatsapp);
      const activeCode = res.data.simulationCode || res.data.lead?.simulationCode || simulationCode;
      if (activeCode) setSimulationCode(activeCode);

      // Submeter pedido formal de cotação e notificar administração por email
      if (res.data.lead?._id) {
        const quoteRes = await api.post('/import/simulation/request-quote', {
          simulationId: res.data.lead._id,
          productName: productName || selectedTariffItem?.description || '',
          productDescription: productDescription || '',
          unitPrice: parseFloat(unitPrice) || 0,
          quantity: parseInt(quantity) || 1,
          currency,
          productImage,
          originCountry,
          destinationCity,
          transportType
        });
        if (quoteRes.data?.whatsappLink) {
          setWhatsappUrl(quoteRes.data.whatsappLink);
        }
        setFormalQuoteSent(true);
      }

      // Download automático e imediato da Factura Proforma Oficial em PDF
      handleDownloadProformaPdf(activeCode);

      toast.success('Pedido registado! Email enviado à administração e notificação WhatsApp (+258853600036) gerada.');
      scrollToSimulator();
    } catch (err) {
      toast.error('Erro ao registar contacto comercial.');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setProductName('');
    setProductDescription('');
    setProductImage('');
    setProductImageDataUrl('');
    setCalculationResult(null);
    setClassificationResult(null);
    setSelectedTariffItem(null);
    setFormalQuoteSent(false);
    setSimulationCode('');
  };

  return (
    <div className="w-100" style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div id="simulator-anchor" className="scroll-margin-top" />

      {/* ========================================================
          ETAPA 1 — INÍCIO
          ======================================================== */}
      {step === 1 && (
        <React.Fragment>
          {/* HERO BANNER NHIQUELA */}
          <div
            className="rounded-4 p-4 p-md-5 mb-4 text-white shadow-sm position-relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #8a2be2 50%, #6d28d9 100%)',
              boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.3)'
            }}
          >
            <div className="fw-black mb-2 opacity-90" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
              nhiquela.
            </div>
            <h1 className="fw-black fs-2 fs-md-1 mb-3" style={{ lineHeight: '1.2' }}>
              Importe para Moçambique com mais confiança.
            </h1>
            <p className="text-white-50 mb-4" style={{ fontSize: '1.05rem', maxWidth: '640px', lineHeight: '1.5' }}>
              Descubra os custos da sua importação e receba apoio da nossa equipa, desde a escolha do fornecedor até à entrega.
            </p>

            {isAdmin && (
              <div className="d-flex flex-wrap gap-2.5">
                <Button
                  variant="light"
                  className="rounded-pill px-4 py-2.5 fw-bold shadow-sm"
                  style={{ color: '#7c3aed', fontSize: '0.95rem' }}
                  onClick={startSimulationWizard}
                >
                  Simular custos de importação
                </Button>

                <Button
                  variant="outline-light"
                  className="rounded-pill px-4 py-2.5 fw-semibold"
                  style={{ fontSize: '0.95rem', borderColor: 'rgba(255,255,255,0.7)' }}
                  onClick={() => setShowTariffModal(true)}
                >
                  <FontAwesomeIcon icon={faSearch} className="me-2 small" />
                  Consultar código pautal
                </Button>
              </div>
            )}
          </div>

          {/* PROCESSO DO SISTEMA: DETERMINAÇÃO PAUTAL E CÁLCULO DE CUSTOS (Filosofia do Stepper com os 4 passos da Foto 2) */}
          <Card className="border-0 shadow-sm rounded-4 bg-white p-4 p-md-5 mb-4">
            <h3 className="fw-bold fs-4 text-dark mb-4">
              Como funciona a nossa cotação ?
            </h3>

            <div className="nql-timeline">
              {[
                {
                  num: '01',
                  title: 'Dados do produto',
                  desc: 'Descrição, composição, função, modelo, potência, dimensões e documentação do fornecedor.',
                  icon: faBoxes,
                  iconColor: '#2563eb'
                },
                {
                  num: '02',
                  title: 'Classificação pautal',
                  desc: 'Pesquisa na nomenclatura oficial, identifica códigos candidatos e verifica as regras de classificação.',
                  icon: faBook,
                  iconColor: '#0284c7'
                },
                {
                  num: '03',
                  title: 'Cálculo do imposto',
                  desc: 'Aplica as taxas vigentes, a base tributável, as preferências de origem e as imposições adicionais aplicáveis.',
                  icon: faBalanceScale,
                  iconColor: '#d97706'
                },
                {
                  num: '04',
                  title: 'Cotação simulada',
                  desc: 'Apresenta valores calculados, fontes legais, data de referência, pressupostos e custos pendentes.',
                  icon: faFileAlt,
                  iconColor: '#7c3aed'
                }
              ].map((item, idx, arr) => (
                <div
                  key={item.num}
                  className={`nql-timeline-step ${idx === 0 ? 'is-active' : ''} ${idx === arr.length - 1 ? 'is-last' : ''}`}
                >
                  <div className="nql-timeline-marker">
                    <span className="nql-timeline-dot">{item.num}</span>
                  </div>
                  <div className="nql-timeline-content">
                    <div className="nql-step-icon-wrap mb-2">
                      <FontAwesomeIcon icon={item.icon} style={{ color: item.iconColor }} className="fs-5" />
                    </div>
                    <h5 className="fw-bold text-dark mb-1 nql-step-title">{item.title}</h5>
                    <p className="text-muted small mb-0 nql-step-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-top">
              <Button
                variant="dark"
                className="w-100 rounded-pill py-3 fw-bold shadow-sm"
                style={{ fontSize: '1.05rem', backgroundColor: '#000000' }}
                onClick={startSimulationWizard}
              >
                Começar agora com os Dados do Produto →
              </Button>
            </div>
          </Card>
        </React.Fragment>
      )}

      {/* ========================================================
          BARRA DE PROGRESSO DO ASSISTENTE (Etapas 2 a 7) — DESIGN PREMIUM
          ======================================================== */}
      {step > 1 && (
        <div className="nql-stepper-header">
          <div className="nql-stepper-nav">
            <button
              type="button"
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              className="nql-back-btn"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Voltar</span>
            </button>

            <div className="nql-step-title-group">
              <span className="nql-step-badge-pill">
                Etapa {step} de 7
              </span>
              <span className="nql-step-name-text">
                {
                  step === 2 ? 'Identificação do Produto' :
                    step === 3 ? 'Classificação Pautal Inteligente' :
                      step === 4 ? 'Logística & Encomenda' :
                        step === 5 ? 'Processamento do Cálculo' :
                          step === 6 ? 'Resultado & Cotação Simulada' : 'Contacto & Cotação'
                }
              </span>
            </div>

            <div className="nql-step-pct-pill">
              <span>{Math.round((step / 7) * 100)}%</span>
            </div>
          </div>

          <div className="nql-progress-track">
            <div
              className="nql-progress-bar-fill"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          ETAPA 2 — IDENTIFICAÇÃO DO PRODUTO (DESIGN PREMIUM)
          ======================================================== */}
      {step === 2 && (
        <div className="nql-wizard-card mb-4">
          <div className="mb-4">
            <span className="nql-step-intro-badge">
              <span className="pulse-dot"></span>
              <span>Passo 02 de 07</span>
            </span>
            <h2 className="nql-step-title">Identificação do produto</h2>
            <p className="nql-step-subtitle mb-0">
              Descreva a sua mercadoria em linguagem corrente. O nosso motor pautal irá identificar a posição oficial correta.
            </p>
          </div>

          <Form onSubmit={handleProceedToStep3}>
            {/* 1. DADOS DE IDENTIFICAÇÃO DO PRODUTO */}
            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="fw-semibold text-secondary small mb-0">
                  Nome comercial do produto *
                </Form.Label>
                <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25" style={{ fontSize: '0.7rem' }}>
                  Obrigatório
                </Badge>
              </div>
              <Form.Control
                type="text"
                placeholder="Ex.: Bomba de irrigação solar submersível, painel fotovoltaico, gerador diesel..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="rounded-pill px-4 py-3 bg-light border-0 shadow-none text-dark"
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="fw-semibold text-secondary small mb-0">
                  Descrição detalhada, função e composição *
                </Form.Label>
                <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25" style={{ fontSize: '0.7rem' }}>
                  Obrigatório
                </Badge>
              </div>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Ex.: Bomba de água centrífuga de 2 polegadas, motor diesel de 4 tempos, 7.5 HP, para rega de hortícolas..."
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="rounded-4 p-3 bg-light border-0 shadow-none text-dark"
                required
              />
              <small className="text-muted d-block mt-1.5" style={{ fontSize: '0.78rem' }}>
                <FontAwesomeIcon icon={faInfoCircle} className="text-primary me-1" />
                <strong>Descrição completa obrigatória:</strong> Indique as especificações e função. O sistema combina o nome e a descrição para consultar o código pautal e a sua designação oficial.
              </small>
            </Form.Group>

            {/* Campo de Upload da Imagem do Produto (Ocultada Categoria do Produto conforme solicitado) */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-secondary small mb-2 d-flex align-items-center justify-content-between">
                <span>
                  <FontAwesomeIcon icon={faCamera} className="me-2 text-primary" />
                  Fotografia ou Imagem do Produto (opcional)
                </span>
                {productImage && (
                  <Badge bg="success" className="px-2 py-1 fw-normal">
                    <FontAwesomeIcon icon={faCheck} className="me-1" /> Imagem Anexada
                  </Badge>
                )}
              </Form.Label>

              {productImage ? (
                <div className="p-3 bg-light rounded-4 border d-flex align-items-center justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={productImage}
                      alt="Produto"
                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '12px' }}
                      className="border shadow-sm"
                    />
                    <div>
                      <div className="fw-bold text-dark small">Imagem anexada com sucesso</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>Será registada no pedido e enviada na notificação comercial</div>
                    </div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="rounded-pill px-3"
                    onClick={() => {
                      setProductImage('');
                      setProductImageDataUrl('');
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} className="me-1" /> Remover
                  </Button>
                </div>
              ) : (
                <div
                  className="p-3 border rounded-4 text-center bg-light"
                  style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: '#cbd5e1', cursor: 'pointer' }}
                  onClick={() => document.getElementById('productImageInput')?.click()}
                >
                  <input
                    id="productImageInput"
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <div>
                      <Spinner animation="border" size="sm" variant="primary" className="me-2" />
                      <span className="small text-muted">A processar imagem do produto...</span>
                    </div>
                  ) : (
                    <div>
                      <span className="badge rounded-pill bg-white p-2.5 text-primary shadow-sm mb-2">
                        <FontAwesomeIcon icon={faUpload} />
                      </span>
                      <div className="fw-bold text-dark small mb-0.5">
                        Carregar imagem do produto ou foto da mercadoria
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.76rem' }}>
                        Clique para anexar foto (JPG, PNG, WEBP até 10MB)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-secondary small mb-1">
                Link do produto (opcional)
              </Form.Label>
              <Form.Control
                type="url"
                placeholder="https://alibaba.com/product... ou link do catálogo do fabricante"
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                className="rounded-pill px-4 py-2.5 bg-light border-0 shadow-none text-dark"
              />
            </Form.Group>

            {/* 2. VALORES DE COMPRA, QUANTIDADE E FRETE (ADICIONADOS NESTA ETAPA) */}
            <div className="border-top pt-4 mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge rounded-pill bg-dark p-2 text-white">
                  <FontAwesomeIcon icon={faFileInvoiceDollar} />
                </span>
                <h5 className="fw-bold text-dark mb-0 fs-6">
                  Valores de Compra, Quantidade e Frete
                </h5>
              </div>
              <p className="text-muted small mb-3">
                Preencha os valores da sua encomenda para o cálculo fiscal e determinação da base aduaneira.
              </p>

              <Row className="g-3.5 mb-3.5">
                {/* 1. Quantidade */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <Form.Label className="fw-semibold text-dark small mb-0">
                        Quantidade <span className="text-danger">*</span>
                      </Form.Label>
                      <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25 py-1 px-2" style={{ fontSize: '0.68rem' }}>
                        Obrigatório
                      </Badge>
                    </div>
                    <Form.Control
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="rounded-3 px-3 py-2.5 bg-light border-0 shadow-none text-dark fw-bold"
                      placeholder="Ex: 1"
                      required
                    />
                  </Form.Group>
                </Col>

                {/* 2. Moeda da Fatura */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <Form.Label className="fw-semibold text-dark small mb-0">
                        Moeda da fatura <span className="text-danger">*</span>
                      </Form.Label>

                    </div>
                    <Form.Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="rounded-3 px-3 py-2.5 bg-light border-0 shadow-none text-dark fw-semibold"
                    >
                      {['USD'].map((currKey) => {
                        const currInfo = exchangeRates[currKey] || { rate: 75, name: 'Dólar Americano' };
                        const rateVal = typeof currInfo === 'object' && currInfo !== null ? currInfo.rate : currInfo;
                        const nameVal = typeof currInfo === 'object' && currInfo !== null ? (currInfo.name || currKey) : currKey;
                        return (
                          <option key={currKey} value={currKey}>
                            {currKey} — {nameVal} (1 {currKey} = {Number(rateVal).toFixed(2)} MT)
                          </option>
                        );
                      })}
                    </Form.Select>
                    <div className="d-flex align-items-center justify-content-between mt-2 px-1">
                      <small className="text-muted" style={{ fontSize: '0.74rem' }}>
                        Câmbio oficial em vigor: <strong className="text-dark">1 {currency} = {Number(exchangeRates[currency]?.rate || 75).toFixed(2)} MT</strong>
                      </small>
                      {exchangeRates[currency]?.source && (
                        <small className="text-muted" style={{ fontSize: '0.70rem' }}>
                          Ref: {exchangeRates[currency]?.source}
                        </small>
                      )}
                    </div>
                  </Form.Group>
                </Col>

                {/* 3. Preço Unitário */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <Form.Label className="fw-semibold text-dark small mb-0">
                        Preço Unitário <span className="text-danger">*</span>
                      </Form.Label>
                      <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25 py-1 px-2" style={{ fontSize: '0.68rem' }}>
                        Obrigatório
                      </Badge>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 text-muted fw-bold rounded-start-3 px-3">
                        {currency}
                      </span>
                      <Form.Control
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="0.00"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="rounded-end-3 px-3 py-2.5 bg-light border-0 shadow-none text-dark fw-bold"
                        required
                      />
                    </div>
                  </Form.Group>
                </Col>

                {/* 4. Frete Internacional */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <Form.Label className="fw-semibold text-dark small mb-0">
                        Frete Internacional ({currency}) <span className="text-danger">*</span>
                      </Form.Label>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 text-muted fw-bold rounded-start-3 px-3">
                        {currency}
                      </span>
                      <Form.Control
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={freightValue}
                        onChange={(e) => {
                          setIsFreightCustom(true);
                          setFreightValue(e.target.value);
                        }}
                        className="rounded-end-3 px-3 py-2.5 bg-light border-0 shadow-none text-dark fw-bold"
                      />
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              {/* Subtotal da Compra */}
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center px-4 py-3 rounded-4 bg-light border mb-4">
                <span className="small text-muted fw-semibold mb-1 mb-sm-0">
                  Subtotal da Compra (inclui Frete e Seguro 1%):
                </span>
                <span className="fw-bold text-dark fs-5">
                  {(() => {
                    const goodsTotal = (Number(quantity) || 1) * (Number(unitPrice) || 0);
                    const freight = Number(freightValue) || 0;
                    const insurance = Number(((goodsTotal + freight) * 0.01).toFixed(2));
                    return (goodsTotal + freight + insurance).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()} {currency}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="nql-btn-primary-action"
            >
              {loading ? (
                <React.Fragment>
                  <Spinner size="sm" animation="border" className="me-2" /> A consultar base pautal oficial...
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <span>Pesquisar Classificação Pautal</span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </React.Fragment>
              )}
            </button>
          </Form>
        </div>
      )}

      {/* ========================================================
          ETAPA 3 — CLASSIFICAÇÃO PAUTAL (DESIGN PREMIUM)
          ======================================================== */}
      {step === 3 && classificationResult && (
        <div className="nql-wizard-card mb-4">
          <div className="mb-4">
            <span className="nql-step-intro-badge">
              <span className="pulse-dot"></span>
              <span>Passo 03 de 07</span>
            </span>
            <h2 className="nql-step-title">Classificação pautal</h2>
            <p className="nql-step-subtitle mb-0">
              O motor analisou a descrição da sua mercadoria e consultou a Pauta Aduaneira oficial de Moçambique.
            </p>
          </div>

          {/* ============================================================
              CASO 1: NENHUMA CLASSIFICAÇÃO CORRESPONDENTE ENCONTRADA
              ============================================================ */}
          {(classificationResult.status === 'unresolved' || (!classificationResult.candidates || classificationResult.candidates.length === 0)) && !selectedTariffItem ? (
            <div className="p-4 p-md-5 rounded-4 border mb-4 text-center" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm"
                style={{ width: '64px', height: '64px', backgroundColor: '#fef3c7', color: '#d97706' }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="fs-3" />
              </div>

              <h4 className="fw-bold text-dark mb-2">
                Nenhuma classificação pautal correspondente encontrada
              </h4>

              <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '640px', lineHeight: '1.6' }}>
                Não foi possível identificar automaticamente uma posição na Pauta Aduaneira correspondente a <strong className="text-dark">"{productName || 'Mercadoria'}"</strong>.
                Para garantir o rigor no cálculo de Direitos Aduaneiros e evitar despesas fiscais inesperadas, escolha uma das seguintes opções:
              </p>

              <div className="d-flex flex-column flex-sm-row justify-content-center gap-2.5 max-w-lg mx-auto">
                <Button
                  variant="primary"
                  className="rounded-pill px-4 py-2.5 fw-bold shadow-sm d-inline-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                  onClick={() => setShowTariffModal(true)}
                >
                  <FontAwesomeIcon icon={faSearch} />
                  <span>Consultar Pauta Manualmente</span>
                </Button>

                <Button
                  variant="outline-dark"
                  className="rounded-pill px-4 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center gap-2"
                  onClick={() => setStep(2)}
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                  <span>Ajustar Descrição</span>
                </Button>
              </div>
            </div>
          ) : (
            /* ============================================================
               CASO 2: CLASSIFICAÇÕES ENCONTRADAS COM SEPARAÇÃO PREMIUM ENTRE
               COMPONENTE SELECIONADO PARA O CÁLCULO E ALTERNATIVAS SUGERIDAS
               ============================================================ */
            (() => {
              const allCandidates = classificationResult.candidates || [];
              const activeCandidate = selectedTariffItem || (allCandidates.length > 0 ? allCandidates[0] : null);
              const alternativeCandidates = allCandidates.filter(c => c.shCode !== activeCandidate?.shCode);
              const isTopMatch = allCandidates.length > 0 && activeCandidate?.shCode === allCandidates[0]?.shCode;

              return (
                <React.Fragment>
                  <div className="mb-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                      <div>
                        <h5 className="fw-bold text-dark mb-1">
                          Classificação Pautal da Mercadoria
                        </h5>
                        <p className="text-muted small mb-0">
                          Avaliámos a sua mercadoria na Pauta Aduaneira oficial de Moçambique. O cálculo fiscal é baseado na opção em destaque.
                        </p>
                      </div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 flex-shrink-0"
                        onClick={() => setShowTariffModal(true)}
                      >
                        <FontAwesomeIcon icon={faSearch} className="small" />
                        <span>Outra Posição Pautal</span>
                      </Button>
                    </div>

                    <div className="tariff-selection-wrapper">
                      {/* =======================================================
                          1. COMPONENTE SELECIONADO PARA O CÁLCULO (EM DESTAQUE)
                          ======================================================= */}
                      {activeCandidate && (
                        <div>
                          <div className="tariff-selected-section">
                            {/* Cabeçalho do Card Selecionado */}
                            <div className="tariff-selected-header">
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="tariff-active-pill">
                                  <span className="pulse-dot"></span>
                                  <span>Selecionado para o Cálculo</span>
                                </div>

                                {isTopMatch && (
                                  <span className="tariff-match-badge">
                                    <span>Maior Correspondência</span>
                                  </span>
                                )}

                                {activeCandidate.category && (
                                  <span className="text-muted small fw-medium" style={{ fontSize: '0.78rem' }}>
                                    • {activeCandidate.category}
                                  </span>
                                )}
                              </div>

                              <span className="text-muted small d-none d-sm-inline" style={{ fontSize: '0.75rem' }}>
                                Determina as taxas de DA, IVA e ICE
                              </span>
                            </div>

                            {/* Corpo Principal do Card Selecionado */}
                            <div className="tariff-card-body">
                              <div className="tariff-check-icon">
                                <FontAwesomeIcon icon={faCheck} />
                              </div>

                              <div className="tariff-card-main">
                                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                  <span className="tariff-sh-badge">
                                    Código SH: {activeCandidate.shCode}
                                  </span>
                                </div>

                                <h4 className="tariff-title-selected">
                                  {activeCandidate.name || activeCandidate.description}
                                </h4>

                                {activeCandidate.name && activeCandidate.description && activeCandidate.name !== activeCandidate.description && (
                                  <div className="tariff-desc-box">
                                    <strong className="text-dark d-block mb-0.5">Descrição Pautal Oficial:</strong>
                                    <span>{activeCandidate.description}</span>
                                  </div>
                                )}

                                {activeCandidate.examples && (
                                  <div className="tariff-examples-box">
                                    <strong className="text-primary d-inline me-1">Exemplos Enquadrados:</strong>
                                    <span>{activeCandidate.examples}</span>
                                  </div>
                                )}

                                {(activeCandidate.notes || activeCandidate.exemptionBasis) && (
                                  <div className="text-success small fw-semibold mt-2 d-flex align-items-center gap-1.5" style={{ fontSize: '0.8rem' }}>
                                    <FontAwesomeIcon icon={faShieldAlt} />
                                    <span>{activeCandidate.notes || activeCandidate.exemptionBasis}</span>
                                  </div>
                                )}
                              </div>

                              {/* Painel de Taxas Oficiais em Chips Fiscais */}
                              <div className="tariff-rates-panel">
                                <div className={`tariff-rate-chip da ${activeCandidate.daRate === 0 ? 'zero-rate' : ''}`}>
                                  <span className="tariff-rate-label">Direitos (DA)</span>
                                  <span className="tariff-rate-value">
                                    {activeCandidate.daRate === 0 ? '0% Livre' : `${activeCandidate.daRate}%`}
                                  </span>
                                </div>

                                <div className={`tariff-rate-chip iva ${activeCandidate.ivaRate === 0 ? 'zero-rate' : ''}`}>
                                  <span className="tariff-rate-label">IVA Oficial</span>
                                  <span className="tariff-rate-value">
                                    {activeCandidate.ivaRate === 0 ? '0% Isento' : `${activeCandidate.ivaRate}%`}
                                  </span>
                                </div>

                                {activeCandidate.iceRate > 0 && (
                                  <div className="tariff-rate-chip ice">
                                    <span className="tariff-rate-label">ICE Consumo</span>
                                    <span className="tariff-rate-value">
                                      {activeCandidate.iceRate}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rodapé Informativo */}
                            <div className="tariff-selected-footer">
                              <div className="d-flex align-items-center gap-2">
                                <FontAwesomeIcon icon={faShieldAlt} className="text-purple" style={{ color: '#7c3aed' }} />
                                <span>
                                  <strong>Base fiscal activa:</strong> Esta classificação determinará os cálculos alfandegários nas próximas etapas.
                                </span>
                              </div>
                              <span className="badge bg-white text-dark border px-2.5 py-1 font-monospace" style={{ fontSize: '0.74rem' }}>
                                SH {activeCandidate.shCode}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* =======================================================
                          2. SEPARADOR ELEGANTE & ALTERNATIVAS SUGERIDAS
                          ======================================================= */}
                      {alternativeCandidates.length > 0 && (
                        <div className="mt-2">
                          <div className="tariff-divider-container mb-3">
                            <div className="tariff-divider-line"></div>
                            <div className="tariff-divider-badge">
                              <FontAwesomeIcon icon={faExchangeAlt} style={{ color: '#7c3aed' }} />
                              <span>Ou escolha uma das <strong>{alternativeCandidates.length} classificações alternativas</strong></span>
                            </div>
                          </div>

                          <p className="text-muted small text-center mb-3">
                            A sua mercadoria tem outras especificações? Clique em qualquer opção abaixo para alterar a base de cálculo:
                          </p>

                          <div className="tariff-alternatives-container">
                            {alternativeCandidates.map((cand, altIdx) => {
                              const isCandFirstMatch = cand.shCode === allCandidates[0]?.shCode;
                              return (
                                <div
                                  key={cand.shCode + '-alt-' + altIdx}
                                  onClick={() => setSelectedTariffItem(cand)}
                                  className="tariff-alternative-card"
                                >
                                  <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="d-flex align-items-start gap-3 w-100">
                                      <div className="tariff-radio-ring">
                                        {/* Círculo indicador */}
                                      </div>

                                      <div className="w-100 min-w-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                          <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="tariff-sh-badge-alt">
                                              Código SH: {cand.shCode}
                                            </span>

                                            {isCandFirstMatch && (
                                              <Badge bg="success" className="px-2 py-0.5 rounded-pill" style={{ fontSize: '0.66rem' }}>
                                                Maior Correspondência
                                              </Badge>
                                            )}

                                            {cand.category && (
                                              <span className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                                • {cand.category}
                                              </span>
                                            )}
                                          </div>

                                          <span className="tariff-switch-btn">
                                            <FontAwesomeIcon icon={faExchangeAlt} className="small" />
                                            <span>Mudar para esta</span>
                                          </span>
                                        </div>

                                        <h5 className="tariff-title-alt">
                                          {cand.name || cand.description}
                                        </h5>

                                        {cand.name && cand.description && cand.name !== cand.description && (
                                          <p className="text-secondary small mb-1" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                            <span className="fw-semibold">Descrição Pautal:</span> {cand.description}
                                          </p>
                                        )}

                                        {cand.examples && (
                                          <div className="text-muted small mb-1.5" style={{ fontSize: '0.78rem' }}>
                                            <span className="fw-semibold text-primary">Exemplos:</span> {cand.examples}
                                          </div>
                                        )}

                                        {(cand.notes || cand.exemptionBasis) && (
                                          <div className="text-success small fw-semibold mt-1" style={{ fontSize: '0.74rem' }}>
                                            <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
                                            {cand.notes || cand.exemptionBasis}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Taxas Aduaneiras da Alternativa */}
                                    <div className="text-end flex-shrink-0 d-none d-sm-block">
                                      <div className="d-flex flex-column align-items-end gap-1">
                                        <span
                                          className={`badge ${cand.daRate === 0 ? 'bg-success' : 'bg-light text-dark border'} px-2.5 py-1`}
                                          style={{ fontSize: '0.74rem' }}
                                        >
                                          DA: {cand.daRate === 0 ? '0% (Livre)' : `${cand.daRate}%`}
                                        </span>
                                        <span
                                          className={`badge ${cand.ivaRate === 0 ? 'bg-success' : 'bg-light text-dark border'} px-2.5 py-1`}
                                          style={{ fontSize: '0.74rem' }}
                                        >
                                          IVA: {cand.ivaRate === 0 ? '0% (Isento)' : `${cand.ivaRate}%`}
                                        </span>
                                        {cand.iceRate > 0 && (
                                          <span className="badge bg-warning text-dark border px-2.5 py-1" style={{ fontSize: '0.7rem' }}>
                                            ICE: {cand.iceRate}%
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Taxas em Mobile (< sm) */}
                                  <div className="d-flex d-sm-none align-items-center gap-1.5 mt-2 pt-2 border-top">
                                    <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '0.72rem' }}>
                                      DA: {cand.daRate}%
                                    </span>
                                    <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '0.72rem' }}>
                                      IVA: {cand.ivaRate}%
                                    </span>
                                    {cand.iceRate > 0 && (
                                      <span className="badge bg-warning text-dark border px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                        ICE: {cand.iceRate}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })()
          )}

          <button
            type="button"
            className="nql-btn-primary-action"
            disabled={!selectedTariffItem && (!classificationResult?.candidates || classificationResult.candidates.length === 0)}
            onClick={() => {
              if (!selectedTariffItem && classificationResult?.candidates && classificationResult.candidates.length > 0) {
                setSelectedTariffItem(classificationResult.candidates[0]);
              }
              handleProceedToStep4();
            }}
          >
            {(!selectedTariffItem && (!classificationResult?.candidates || classificationResult.candidates.length === 0)) ? (
              <span>Selecione uma classificação pautal acima para prosseguir</span>
            ) : (
              <React.Fragment>
                <span>Confirmar Classificação Selecionada & Avançar para Logística</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </React.Fragment>
            )}
          </button>
        </div>
      )}

      {/* ========================================================
          ETAPA 4 — LOGÍSTICA E DADOS DA ENCOMENDA (DESIGN PREMIUM)
          ======================================================== */}
      {step === 4 && (
        <div className="nql-wizard-card mb-4">
          <div className="mb-4">
            <span className="nql-step-intro-badge">
              <span className="pulse-dot"></span>
              <span>Passo 04 de 07</span>
            </span>
            <h2 className="nql-step-title">Logística e valores da encomenda</h2>
            <p className="nql-step-subtitle mb-0">
              Indique o país de expedição, o meio de transporte internacional e a cidade de desalfandegamento em Moçambique para liquidar o Valor Aduaneiro (CIF).
            </p>
          </div>

          {/* Mini-Painel de Resumo da Mercadoria Selecionada */}
          <div className="nql-order-summary-strip">
            <div>
              <span className="nql-summary-item-label">Mercadoria Selecionada</span>
              <div className="nql-summary-item-value">
                {productName || 'Mercadoria de Importação'}
                {selectedTariffItem?.shCode && (
                  <span className="badge bg-light text-dark ms-2 font-monospace" style={{ fontSize: '0.72rem' }}>
                    SH {selectedTariffItem.shCode}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="nql-summary-item-label">Quantidade & Preço</span>
              <div className="nql-summary-item-value">
                {quantity} un. × {Number(unitPrice || 0).toLocaleString()} {currency}
              </div>
            </div>

            <div>
              <span className="nql-summary-item-label">Frete Internacional</span>
              <div className="nql-summary-item-value">
                {Number(freightValue || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </div>
            </div>

            <div>
              <span className="nql-summary-item-label">Seguro de Carga (1%)</span>
              <div className="nql-summary-item-value">
                {(() => {
                  const goodsTotal = (Number(quantity || 1) * Number(unitPrice || 0));
                  const freight = Number(freightValue || 0);
                  const insurance = Number(((goodsTotal + freight) * 0.01).toFixed(2));
                  return insurance.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()} {currency}
              </div>
            </div>

            <div className="text-sm-end">
              <span className="nql-summary-item-label">Subtotal de Compra</span>
              <div className="nql-summary-item-value" style={{ color: '#a7f3d0' }}>
                {(() => {
                  const goodsTotal = (Number(quantity || 1) * Number(unitPrice || 0));
                  const freight = Number(freightValue || 0);
                  const insurance = Number(((goodsTotal + freight) * 0.01).toFixed(2));
                  return (goodsTotal + freight + insurance).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()} {currency}
              </div>
            </div>
          </div>

          <Form onSubmit={handleRunCustomsCalculation}>
            <Row className="g-4 mb-4">
              {/* 1. País de Origem da Mercadoria */}
              <Col xs={12} lg={6}>
                <Form.Group>
                  <label className="nql-form-label">
                    <span>
                      <FontAwesomeIcon icon={faGlobe} className="me-1.5" style={{ color: '#7c3aed' }} />
                      País de Origem da Mercadoria <span className="text-danger">*</span>
                    </span>
                    <span className="text-muted fw-normal small" style={{ fontSize: '0.72rem' }}>Local de expedição</span>
                  </label>
                  <select
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                    className="nql-form-select"
                  >
                    <option value="China">🇨🇳 China (Principal parceiro de fornecimento)</option>
                    <option value="África do Sul">🇿🇦 África do Sul</option>
                  </select>
                </Form.Group>
              </Col>

              {/* 2. Cidade de Entrega em Moçambique */}
              <Col xs={12} lg={6}>
                <Form.Group>
                  <label className="nql-form-label">
                    <span>
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1.5" style={{ color: '#7c3aed' }} />
                      Cidade de Entrega em Moçambique <span className="text-danger">*</span>
                    </span>
                    <span className="text-muted fw-normal small" style={{ fontSize: '0.72rem' }}>Destino Aduaneiro</span>
                  </label>
                  <select
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="nql-form-select"
                  >
                    <option value="Maputo">🇲🇿 Maputo (Porto de Maputo / Aeroporto Mavalane)</option>
                    <option value="Matola">🇲🇿 Matola (Hub Industrial / Maputo Província)</option>
                    <option value="Beira">🇲🇿 Beira (Porto da Beira / Corredor Central)</option>
                    <option value="Nacala">🇲🇿 Nacala (Porto de Águas Profundas)</option>
                    <option value="Nampula">🇲🇿 Nampula Cidade</option>
                    <option value="Tete">🇲🇿 Tete</option>
                    <option value="Pemba">🇲🇿 Pemba (Cabo Delgado)</option>
                    <option value="Quelimane">🇲🇿 Quelimane (Zambézia)</option>
                    <option value="Chimoio">🇲🇿 Chimoio (Manica)</option>
                    <option value="Inhambane">🇲🇿 Inhambane</option>
                    <option value="Outra">Outra Cidade / Província</option>
                  </select>
                </Form.Group>
              </Col>

              {/* 3. Modalidade de Transporte (Cards Interativos Premium) */}
              <Col xs={12}>
                <Form.Group>
                  <label className="nql-form-label">
                    <span>
                      <FontAwesomeIcon icon={faShip} className="me-1.5" style={{ color: '#7c3aed' }} />
                      Modalidade de Transporte Internacional <span className="text-danger">*</span>
                    </span>
                    <span className="text-muted fw-normal small" style={{ fontSize: '0.72rem' }}>Clique para alternar</span>
                  </label>

                  <div className="nql-transport-grid">
                    {/* Opção Marítima */}
                    <div
                      className={`nql-transport-card ${transportType === 'SEA' ? 'active' : ''}`}
                      onClick={() => setTransportType('SEA')}
                    >
                      <div>
                        <div className="nql-transport-card-header">
                          <div className="nql-transport-icon-wrap nql-transport-icon-sea">
                            <span>🚢</span>
                          </div>
                          <div className="nql-transport-radio-indicator">
                            {transportType === 'SEA' && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '0.75rem' }} />}
                          </div>
                        </div>

                        <h4 className="nql-transport-title">Marítimo (Carga / Contentor)</h4>
                        <p className="nql-transport-desc">
                          Recomendado para maquinaria, equipamentos industriais, móveis e compras com peso elevado. Frete económico.
                        </p>
                      </div>

                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top">
                        <span className="nql-transport-footer-badge nql-badge-eco">
                          <FontAwesomeIcon icon={faClock} /> 35 a 45 dias de trânsito
                        </span>
                        <span className="badge rounded-pill bg-light text-dark border px-2 py-1" style={{ fontSize: '0.68rem' }}>
                          Mais Económico
                        </span>
                      </div>
                    </div>

                    {/* Opção Aérea */}
                    <div
                      className={`nql-transport-card ${transportType === 'AIR' ? 'active' : ''}`}
                      onClick={() => setTransportType('AIR')}
                    >
                      <div>
                        <div className="nql-transport-card-header">
                          <div className="nql-transport-icon-wrap nql-transport-icon-air">
                            <span>✈️</span>
                          </div>
                          <div className="nql-transport-radio-indicator">
                            {transportType === 'AIR' && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '0.75rem' }} />}
                          </div>
                        </div>

                        <h4 className="nql-transport-title">Aéreo Expresso</h4>
                        <p className="nql-transport-desc">
                          Ideal para produtos de alta tecnologia, telemóveis, computadores, cosméticos ou encomendas com urgência de entrega.
                        </p>
                      </div>

                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top">
                        <span className="nql-transport-footer-badge nql-badge-speed">
                         5 a 7 dias de trânsito
                        </span>
                        <span className="badge rounded-pill bg-light text-dark border px-2 py-1" style={{ fontSize: '0.68rem' }}>
                          Mais Rápido
                        </span>
                      </div>
                    </div>
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <button
              type="submit"
              disabled={loading}
              className="nql-btn-primary-action mt-2"
            >
              <span>Calcular Impostos</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </Form>
        </div>
      )}

      {/* ========================================================
          ETAPA 5 — PROCESSAMENTO DO CÁLCULO FISCAL
          ======================================================== */}
      {step === 5 && (
        <Card className="border-0 shadow-sm rounded-4 bg-white p-5 mb-4 text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} className="mx-auto mb-3" />
          <h4 className="fw-bold text-dark mb-2">A processar o cálculo aduaneiro...</h4>
          <p className="text-muted small mb-0">
            A liquidar Valor Aduaneiro (CIF), Direitos Pautais (Lei 8/2025), Base do IVA (Lei 22/2022) e despesas portuárias.
          </p>
        </Card>
      )}

      {/* ========================================================
          ETAPA 6 — RESULTADO ESTIMADO (RELATÓRIO FISCAL COMPLETO)
          ======================================================== */}
      {step === 6 && calculationResult && (
        <Card className="border-0 shadow-sm rounded-4 bg-white p-4 p-md-5 mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
            <div>
              <Badge bg="light" className="text-primary border px-3 py-1.5 rounded-pill mb-1">
                Passo 06 de 07
              </Badge>
              <h2 className="fw-bold fs-3 text-dark mb-0">Cotação simulada</h2>
              <small className="text-muted">
                Referência: #{simulationCode || 'NQL-SIM-DEMO'} • Câmbio ref.: {calculationResult.metadata.exchangeRateToMzn} MT/{currency} ({calculationResult.metadata.exchangeRateSource})
              </small>
            </div>
            <div className="text-end">
              <span className="small text-muted d-block">Total Geral Estimado</span>
              <h3 className="fw-black text-primary mb-0" style={{ color: '#7c3aed' }}>
                {calculationResult.grandTotal.totalCostMzn?.toLocaleString()} MT
              </h3>
              <small className="text-muted">~{calculationResult.grandTotal.costPerUnitMzn?.toLocaleString()} MT / unidade</small>
            </div>
          </div>

          {/* SECÇÃO A: IDENTIFICAÇÃO DA MERCADORIA */}
          <div className="p-3.5 rounded-4 bg-light border mb-4">
            <h6 className="fw-bold text-dark mb-2">A. Identificação da mercadoria</h6>
            <div className="row g-2 small">
              <div className="col-md-6">
                <strong>Produto:</strong> {productName} ({quantity} unidades)
              </div>
              <div className="col-md-6">
                <strong>Código Pautal (SH):</strong> {calculationResult.taxSummary.shCode}
              </div>
              <div className="col-12 text-muted">
                <strong>Descrição Oficial:</strong> {calculationResult.taxSummary.officialDescription}
              </div>
            </div>
          </div>

          {/* SECÇÃO B & C: VALOR E LOGÍSTICA */}
          <div className="table-responsive mb-4">
            <Table bordered hover size="sm" className="align-middle mb-0 small">
              <thead className="bg-light text-muted">
                <tr>
                  <th>Rubrica</th>
                  <th>Valor na Moeda</th>
                  <th>Valor em Meticais (MT)</th>
                  <th>Observação Legal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Valor da Mercadoria (FOB)</td>
                  <td>{calculationResult.goodsSummary.totalGoodsValueCurrency?.toLocaleString()} {currency}</td>
                  <td className="fw-semibold">{calculationResult.goodsSummary.totalGoodsValueMzn?.toLocaleString()} MT</td>
                  <td className="text-muted">Preço de compra</td>
                </tr>
                <tr>
                  <td>Frete Internacional</td>
                  <td className="fw-semibold">
                    {(calculationResult.logisticsSummary.freightCurrency !== undefined
                      ? calculationResult.logisticsSummary.freightCurrency
                      : (calculationResult.logisticsSummary.freightMzn / (calculationResult.metadata.exchangeRateToMzn || 1))
                    ).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </td>
                  <td>{calculationResult.logisticsSummary.freightMzn?.toLocaleString()} MT</td>
                  <td className="text-muted">
                    {calculationResult.logisticsSummary.freightStatus === 'CONFIRMED' ? 'Confirmado pelo utilizador' : 'Estimado (sujeito a cotação final)'}
                  </td>
                </tr>
                <tr>
                  <td>Seguro de Carga</td>
                  <td className="fw-semibold">
                    {(calculationResult.logisticsSummary.insuranceCurrency !== undefined
                      ? calculationResult.logisticsSummary.insuranceCurrency
                      : (calculationResult.logisticsSummary.insuranceMzn / (calculationResult.metadata.exchangeRateToMzn || 1))
                    ).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </td>
                  <td>{calculationResult.logisticsSummary.insuranceMzn?.toLocaleString()} MT</td>
                  <td className="text-muted">Proteção de transporte e carga (1% pauta)</td>
                </tr>
                <tr className="table-active fw-bold">
                  <td>Valor Aduaneiro (CIF)</td>
                  <td className="text-primary fw-bold">
                    {(calculationResult.logisticsSummary.customsValueCurrency !== undefined
                      ? calculationResult.logisticsSummary.customsValueCurrency
                      : (calculationResult.logisticsSummary.customsValueMzn / (calculationResult.metadata.exchangeRateToMzn || 1))
                    ).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </td>
                  <td className="text-primary">{calculationResult.logisticsSummary.customsValueMzn?.toLocaleString()} MT</td>
                  <td className="text-muted">Base de cálculo dos Direitos e ICE</td>
                </tr>
              </tbody>
            </Table>
          </div>

          {/* SECÇÃO D: IMPOSTOS LEGAIS (ESTADO / AT) */}
          <h5 className="fw-bold text-dark mb-3">D. Impostos e imposições aduaneiras (AT)</h5>
          <div className="table-responsive mb-4">
            <Table bordered hover size="sm" className="align-middle mb-0 small">
              <thead className="bg-light text-muted">
                <tr>
                  <th>Imposto</th>
                  <th>Base de Incidência</th>
                  <th>Taxa</th>
                  <th>Montante (MT)</th>
                  <th>Fundamentação Legal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="fw-bold">Direitos Aduaneiros (DA)</td>
                  <td>{calculationResult.taxSummary.customsDuty.baseMzn?.toLocaleString()} MT</td>
                  <td>{calculationResult.taxSummary.customsDuty.rate}%</td>
                  <td className="fw-semibold">{calculationResult.taxSummary.customsDuty.amountMzn?.toLocaleString()} MT</td>
                  <td className="text-muted">{calculationResult.taxSummary.customsDuty.legalRule}</td>
                </tr>
                {calculationResult.taxSummary.ice.rate > 0 && (
                  <tr>
                    <td className="fw-bold">ICE</td>
                    <td>{calculationResult.taxSummary.ice.baseMzn?.toLocaleString()} MT</td>
                    <td>{calculationResult.taxSummary.ice.rate}%</td>
                    <td className="fw-semibold">{calculationResult.taxSummary.ice.amountMzn?.toLocaleString()} MT</td>
                    <td className="text-muted">Lei n.º 19/2022 / Lei 7/2025</td>
                  </tr>
                )}
                <tr>
                  <td className="fw-bold">IVA na Importação</td>
                  <td>{calculationResult.taxSummary.vat.baseMzn?.toLocaleString()} MT</td>
                  <td>{calculationResult.taxSummary.vat.rate}%</td>
                  <td className="fw-semibold">{calculationResult.taxSummary.vat.amountMzn?.toLocaleString()} MT</td>
                  <td className="text-muted">{calculationResult.taxSummary.vat.legalRule}</td>
                </tr>
                <tr>
                  <td className="fw-bold">Taxa JUE / TSA</td>
                  <td>Taxa fixa por D.U.</td>
                  <td>Fixa</td>
                  <td className="fw-semibold">{calculationResult.taxSummary.customsServicesFee.amountMzn?.toLocaleString()} MT</td>
                  <td className="text-muted">Decreto n.º 56/2011</td>
                </tr>
                <tr className="table-warning fw-bold">
                  <td colSpan="3">Total Impostos Oficiais Obrigatórios</td>
                  <td colSpan="2">{calculationResult.taxSummary.totalGovernmentTaxesMzn?.toLocaleString()} MT</td>
                </tr>
              </tbody>
            </Table>
          </div>

          {/* SECÇÃO E & F: OPERACIONAL E SERVIÇO NHIQUELA */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="p-3 rounded-4 bg-light border h-100">
                <h6 className="fw-bold text-dark mb-2">Estes encargos portuários e despacho variam (Confirme com a equipa da nhiquela)</h6>
                <div className="small d-flex flex-column gap-1 text-muted">
                  <div className="d-flex justify-content-between">
                    <span>Varredura não-intrusiva (Kudumba):</span>
                    <strong>{Number(calculationResult.operationalSummary.kudumbaScannerFee || 0).toLocaleString()} MT</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Manuseamento de terminal portuário:</span>
                    <strong>{Number(calculationResult.operationalSummary.terminalHandlingFee || 0).toLocaleString()} MT</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Honorários de Despacho Aduaneiro:</span>
                    <strong>{Number(calculationResult.operationalSummary.customsBrokerFee || 0).toLocaleString()} MT</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Transporte interno ({destinationCity}):</span>
                    <strong>{Number(calculationResult.operationalSummary.domesticDeliveryFee || 0).toLocaleString()} MT</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-3 rounded-4 bg-light border h-100" style={{ backgroundColor: '#faf5ff', borderColor: '#d8b4fe' }}>
                <h6 className="fw-bold text-primary mb-2">F. Serviço de Sourcing & Gestão Nhiquela</h6>
                <p className="small text-muted mb-2">
                  Auditoria técnica ao fornecedor, negociação internacional, coordenação de frete e despacho porta-a-porta:
                </p>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small fw-semibold text-dark">Assessoria integral Nhiquela:</span>
                  <span className="fw-bold fs-5 text-primary">{calculationResult.commercialSummary.nhiquelaServiceFeeMzn?.toLocaleString()} MT</span>
                </div>
              </div>
            </div>
          </div>

          {/* PENDÊNCIAS E PRESSUPOSTOS */}
          <div className="p-3 rounded-4 bg-light border text-muted small mb-4">
            <h6 className="fw-bold text-dark mb-1">Pressupostos da assessoria da Nhiquela:</h6>
            <ul className="mb-0 ps-3">
              {calculationResult.grandTotal.pendingItems.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>

          <div className="d-flex flex-wrap gap-3">
            <Button
              variant="outline-secondary"
              className="rounded-pill px-4"
              onClick={() => setStep(4)}
            >
              Corrigir dados
            </Button>
            <Button
              variant="outline-dark"
              className="rounded-pill px-4 fw-semibold d-inline-flex align-items-center gap-2"
              onClick={() => handleDownloadProformaPdf()}
            >
              <FontAwesomeIcon icon={faFilePdf} className="text-danger" />
              Descarregar Proforma (PDF)
            </Button>
            <Button
              variant="dark"
              className="flex-grow-1 rounded-pill py-3 fw-bold"
              style={{ backgroundColor: '#000000' }}
              onClick={handleProceedToStep7}
            >
              Solicitar Apoio & Assessoria à Nhiquela →
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================
          ETAPA 7 — CONTACTO E COTAÇÃO
          ======================================================== */}
      {step === 7 && (
        <Card className="border-0 shadow-sm rounded-4 bg-white p-4 p-md-5 mb-4">
          <div className="mb-4">
            <Badge bg="light" className="text-primary border px-3 py-1.5 rounded-pill mb-2">
              Passo 07 de 07
            </Badge>
            <h2 className="fw-bold fs-3 text-dark mb-1">Solicitar Apoio & Assessoria no Processo de Importação</h2>
            <p className="text-muted small mb-0">
              Indique os seus contactos para que a equipa da Nhiquela assuma a assessoria completa (validação de fornecedor, frete, desalfandegamento e entrega porta-a-porta).
            </p>
          </div>

          <Form onSubmit={handleSubmitLeadAndQuote}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold text-secondary small mb-1">
                <FontAwesomeIcon icon={faUser} className="me-2 text-primary" />
                Nome completo *
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex.: João Mondlane"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="rounded-pill px-4 py-2.5 bg-light border-0 shadow-none text-dark"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold text-secondary small mb-1">
                <FontAwesomeIcon icon={faPhone} className="me-2 text-success" />
                Telefone / WhatsApp (+258) *
              </Form.Label>
              <Form.Control
                type="tel"
                placeholder="Ex.: 84 123 4567 ou 82..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-pill px-4 py-2.5 bg-light border-0 shadow-none text-dark"
                required
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold text-secondary small mb-1">
                    <FontAwesomeIcon icon={faBuilding} className="me-2 text-info" />
                    Nome da Empresa (opcional)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex.: AgroTec Lda."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="rounded-pill px-4 py-2.5 bg-light border-0 shadow-none text-dark"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold text-secondary small mb-1">
                    <FontAwesomeIcon icon={faEnvelope} className="me-2 text-muted" />
                    E-mail profissional (opcional)
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="seuemail@empresa.co.mz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-pill px-4 py-2.5 bg-light border-0 shadow-none text-dark"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-secondary small mb-1">
                Observações adicionais ou especificações para o fornecedor
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Ex.: Necessidade urgente de entrega; preferência por fornecedor verificado com certificação CE..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-4 p-3 bg-light border-0 shadow-none text-dark"
              />
            </Form.Group>

            <div className="p-3 rounded-4 bg-light text-muted small mb-4 border">
              🔒 <strong>Privacidade:</strong> Os seus dados serão tratados com estrita confidencialidade e utilizados exclusivamente para emissão desta cotação comercial.
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-100 rounded-pill py-3 fw-bold text-white shadow-sm mb-3"
              style={{ backgroundColor: '#000000', fontSize: '1.05rem' }}
            >
              {loading ? (
                <React.Fragment>
                  <Spinner size="sm" animation="border" className="me-2" /> A submeter solicitação...
                </React.Fragment>
              ) : (
                'Submeter Pedido & Solicitar Assessoria à Nhiquela'
              )}
            </Button>
          </Form>

          {formalQuoteSent && (
            <div className="text-center pt-3 border-top">
              <Badge bg="success" className="px-3 py-2 rounded-pill mb-2">
                Pedido Registado no Sistema!
              </Badge>
              <h5 className="fw-bold text-dark mb-2">Factura Proforma Gerada com Sucesso</h5>
              <p className="text-muted small mb-3">
                A Factura Proforma oficial foi transferida para o seu dispositivo e foi enviado um <strong>e-mail de notificação à administração</strong> da Nhiquela. Pode também notificar diretamente o WhatsApp da Nhiquela (<strong>+258853600036</strong>):
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-2 mb-2">
                <a
                  href={whatsappUrl || 'https://wa.me/258853600036'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success rounded-pill px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                >
                  <FontAwesomeIcon icon={faWhatsapp} size="lg" />
                  Notificar WhatsApp Nhiquela (+258853600036)
                </a>
                <Button
                  variant="outline-dark"
                  className="rounded-pill px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                  onClick={() => handleDownloadProformaPdf()}
                >
                  <FontAwesomeIcon icon={faFilePdf} className="text-danger" size="lg" />
                  Descarregar Factura Proforma Novamente (PDF)
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================
          MODAL DE CONSULTA PAUTAL DIRETA INDEPENDENTE
          ======================================================== */}
      <Modal show={showTariffModal} onHide={() => setShowTariffModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5">
            <FontAwesomeIcon icon={faBook} className="text-primary me-2" />
            Consulta Pautal Direta de Moçambique
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <p className="text-muted small mb-3">
            Pesquise posições pautais, descrições oficiais, taxas aduaneiras e notas de isenção (Lei 8/2025 e Lei 22/2022).
          </p>

          <div className="d-flex gap-2 mb-2 position-relative">
            <div className="flex-grow-1 position-relative">
              <Form.Control
                type="text"
                placeholder="Pesquise por nome do item (ex: calçado, vestuário, solar, bomba) ou código SH..."
                value={tariffSearchQuery}
                onChange={(e) => setTariffSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchTariff(tariffSearchQuery); }}
                className="rounded-pill px-4 py-2 pe-5"
              />
              {tariffSearchQuery && (
                <button
                  type="button"
                  className="btn btn-sm text-muted position-absolute end-0 top-50 translate-middle-y me-3 border-0 bg-transparent"
                  onClick={() => {
                    setTariffSearchQuery('');
                    handleSearchTariff('');
                  }}
                  title="Limpar pesquisa e voltar aos 5 padrão"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
            <Button
              variant="primary"
              className="rounded-pill px-4"
              onClick={() => handleSearchTariff(tariffSearchQuery)}
              disabled={tariffSearchLoading}
            >
              {tariffSearchLoading ? <Spinner size="sm" animation="border" /> : <FontAwesomeIcon icon={faSearch} />}
            </Button>
          </div>

          {/* Indicador de Estado: 5 Padrão vs Resultados de Pesquisa */}
          <div className="d-flex justify-content-between align-items-center mb-2 px-1">
            {!tariffSearchQuery.trim() ? (
              <>
                <span className="text-muted small">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-primary me-1" />
                  A apresentar <strong>5 posições de referência</strong> por padrão. Digite para pesquisar qualquer item na Pauta Aduaneira.
                </span>
                <Badge bg="light" className="text-secondary border">Padrão: 5 itens</Badge>
              </>
            ) : (
              <>
                <span className="text-muted small">
                  <FontAwesomeIcon icon={faSearch} className="text-primary me-1" />
                  A apresentar <strong>{tariffSearchResults.length}</strong> {tariffSearchResults.length === 1 ? 'posição encontrada' : 'posições encontradas'} para "<strong>{tariffSearchQuery}</strong>".
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none small text-primary fw-semibold"
                  onClick={() => {
                    setTariffSearchQuery('');
                    handleSearchTariff('');
                  }}
                >
                  Restaurar padrão (5)
                </Button>
              </>
            )}
          </div>

          <div style={{ maxHeight: '430px', overflowY: 'auto' }} className="border rounded-3">
            <Table hover size="sm" className="align-middle mb-0 small">
              <thead className="bg-light text-muted position-sticky top-0" style={{ zIndex: 1 }}>
                <tr>
                  <th style={{ width: '130px' }}>Código SH</th>
                  <th>Nome do Item & Descrição Oficial</th>
                  <th className="text-center" style={{ width: '100px' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {tariffSearchResults.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-muted">
                      {tariffSearchLoading ? (
                        <div className="py-2">
                          <Spinner size="sm" animation="border" className="me-2 text-primary" />
                          A pesquisar na Pauta Aduaneira oficial...
                        </div>
                      ) : (
                        <div>
                          <p className="mb-1 fw-semibold text-dark">Nenhum item pautal encontrado para "{tariffSearchQuery}".</p>
                          <small className="text-muted">Tente buscar por termos como "vestuário", "calçado", "bomba", "solar", "máquina" ou dígitos do código SH.</small>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  tariffSearchResults.map((item) => (
                    <tr key={item.shCode}>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace fw-bold px-2 py-1">
                          {item.shCode}
                        </span>
                        {item.category && (
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {item.category}
                          </div>
                        )}
                      </td>
                      <td>
                        {/* Nome do item em destaque */}
                        <div className="fw-bold text-dark" style={{ fontSize: '0.92rem' }}>
                          {item.name || item.description}
                        </div>

                        {/* Descrição pautal oficial relacionada */}
                        {item.description && item.description !== item.name && (
                          <div className="text-secondary small mt-0.5">
                            <span className="fw-semibold text-dark">Descrição Oficial:</span> {item.description}
                          </div>
                        )}

                        {/* Exemplos práticos */}
                        {item.examples && (
                          <div className="text-muted small mt-0.5" style={{ fontSize: '0.78rem' }}>
                            <span className="fw-semibold text-primary">Exemplos:</span> {item.examples}
                          </div>
                        )}

                        {/* Notas legais e isenções */}
                        {(item.notes || item.exemptNotes || item.exemptionBasis) && (
                          <div className="text-success small mt-0.5" style={{ fontSize: '0.74rem' }}>
                            <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
                            {item.notes || item.exemptNotes || item.exemptionBasis}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          variant={selectedTariffItem?.shCode === item.shCode ? "primary" : "outline-primary"}
                          size="sm"
                          className="rounded-pill px-2.5 py-1 fw-bold"
                          style={selectedTariffItem?.shCode === item.shCode ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed', fontSize: '0.75rem' } : { fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedTariffItem(item);
                            setShowTariffModal(false);
                            toast.success(`Posição ${item.shCode} selecionada para o cálculo!`);
                          }}
                        >
                          {selectedTariffItem?.shCode === item.shCode ? "Ativo" : "Selecionar"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
      </Modal>

      <style>{`
        .scroll-margin-top { scroll-margin-top: 100px; }

        /* TIMELINE - PADRÃO VERTICAL (Mobile e Telas Menores < 992px) */
        .nql-timeline { display: flex; flex-direction: column; }
        .nql-timeline-step { display: flex; gap: 1rem; position: relative; }
        .nql-timeline-marker { position: relative; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
        .nql-timeline-marker::after {
          content: '';
          position: absolute;
          top: 44px;
          bottom: 0;
          left: 50%;
          width: 2px;
          transform: translateX(-50%);
          background: linear-gradient(to bottom, #d8b4fe, #e2e8f0);
        }
        .nql-timeline-step.is-last .nql-timeline-marker::after { display: none; }
        .nql-timeline-dot {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          color: #64748b;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          position: relative;
          z-index: 1;
          transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }
        .nql-timeline-step.is-active .nql-timeline-dot {
          color: #ffffff;
          background: linear-gradient(135deg, #7c3aed, #8a2be2);
          border-color: #7c3aed;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }
        .nql-timeline-step:hover .nql-timeline-dot {
          transform: scale(1.08);
          border-color: #a855f7;
          color: #7c3aed;
        }
        .nql-timeline-step.is-active:hover .nql-timeline-dot { color: #ffffff; }
        .nql-step-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .nql-timeline-step:hover .nql-step-icon-wrap {
          transform: translateY(-2px);
          background: #f1f5f9;
        }
        .nql-timeline-content { padding: 0.45rem 0 1.6rem; }
        .nql-timeline-step.is-last .nql-timeline-content { padding-bottom: 0; }
        .nql-step-title { font-size: 1.02rem; }
        .nql-timeline-step.is-active .nql-step-title { color: #7c3aed !important; }

        /* TIMELINE - HORIZONTAL NO DESKTOP (>= 992px) */
        @media (min-width: 992px) {
          .nql-timeline {
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            position: relative;
          }
          .nql-timeline-step {
            flex: 1;
            min-width: 0;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0;
            padding: 0 0.5rem;
          }
          .nql-timeline-marker {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
          }
          .nql-timeline-marker::after {
            top: 21px;
            left: 50%;
            width: 100%;
            height: 2px;
            bottom: auto;
            transform: none;
            background: linear-gradient(to right, #d8b4fe, #e2e8f0);
          }
          .nql-timeline-step.is-last .nql-timeline-marker::after {
            display: none;
          }
          .nql-timeline-content {
            padding: 1rem 0.4rem 0;
            width: 100%;
          }
          .nql-step-title {
            font-size: 0.98rem;
            margin-bottom: 0.35rem;
            line-height: 1.3;
          }
          .nql-step-desc {
            font-size: 0.82rem;
            line-height: 1.45;
            color: #64748b;
          }
        }
      `}</style>
    </div>
  );
}
