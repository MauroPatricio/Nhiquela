import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMotorcycle, faStore, faShoppingBag, faMobileAlt, faStar, faCheckCircle,
  faMapMarkerAlt, faWallet, faListCheck, faMap, faTruck, faChevronLeft, faChevronRight,
  faArrowRight, faUtensils, faBox, faGasPump, faWrench, faBuilding, faHandshake,
  faQrcode, faChartLine, faShieldAlt, faTimes, faPaperPlane, faCapsules, faCar,
  faHardHat, faUsers, faPhone, faEnvelope, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../api';

const logisticsSlides = [
  {
    id: 'freightliners',
    title: 'Camiões & Carga',
    subtitle: 'Frotas articuladas de grande capacidade para o transporte de pesados com monitoramento contínuo.',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
    tag: '',
    tagBg: '#8A2BE2',
    highlight: 'Frotas de Longa Distância'
  },
  {
    id: 'port_cargo',
    title: 'Logística Portuária & Cargas',
    subtitle: 'Operações contínuas de desembaraço e escoamento rodoviário nos Portos para contentores.',
    image: '/images/cargasportuarias.jpg',
    tag: '',
    tagBg: '#2563EB',
    highlight: 'Importação & Exportação'
  },
  {
    id: 'machambas',
    title: 'Produtores nas Machambas & Escoamento Agrícola',
    subtitle: 'Recolha direta de colheitas agrícolas rurais conectando os pequenos e grandes produtores aos mercados urbanos.',
    image: '/images/milho.jpg',
    tag: '',
    tagBg: '#059669',
    highlight: 'Campo ao Mercado'
  },
  {
    id: 'machinery',
    title: 'Entregas rápidas',
    subtitle: 'Entrega de forma rápida e segura de produtos e serviços no seu dia a dia.',
    image: '/images/deliver.jfif',
    tag: '',
    tagBg: '#D97706',
    highlight: 'Entregas rápidas'
  }
];

export default function LandingPage() {
  const [stats, setStats] = useState({
    provinces: 11,
    cities: 38,
    activePartners: 142
  });

  const [activeTab, setActiveTab] = useState('client');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const heroMockupKeys = ['client', 'order', 'seller', 'driver', 'map'];
  const [heroMockupIndex, setHeroMockupIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  const [showPartnershipModal, setShowPartnershipModal] = useState(false);
  const [partnershipSubmitting, setPartnershipSubmitting] = useState(false);
  const [partnershipSuccess, setPartnershipSuccess] = useState(false);
  const [partnershipForm, setPartnershipForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    productsServices: '',
    reasons: ''
  });

  const handlePartnershipSubmit = async (e) => {
    e.preventDefault();
    if (!partnershipForm.companyName.trim() || !partnershipForm.email.trim() || !partnershipForm.productsServices.trim() || !partnershipForm.reasons.trim()) {
      toast.error('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setPartnershipSubmitting(true);
    try {
      const { data } = await api.post('/partners/partnership-request', partnershipForm);
      setPartnershipSuccess(true);
      toast.success(data.message || 'Proposta de parceria enviada com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao enviar proposta de parceria. Tente novamente.');
    } finally {
      setPartnershipSubmitting(false);
    }
  };

  const handleClosePartnershipModal = () => {
    setShowPartnershipModal(false);
    setTimeout(() => {
      setPartnershipSuccess(false);
      setPartnershipForm({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        productsServices: '',
        reasons: ''
      });
    }, 300);
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % logisticsSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    if (heroPaused) return;
    const timer = setInterval(() => {
      setHeroMockupIndex((prev) => (prev + 1) % heroMockupKeys.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [heroPaused, heroMockupKeys.length]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/stats/landing');
        setStats({
          provinces: data.provinces || 11,
          cities: data.cities || 38,
          activePartners: data.activePartners || 142
        });
      } catch (error) {
        // Se a API falhar, mantém os valores de fallback silenciosamente
      }
    };
    fetchStats();
  }, []);

  const mockups = {
    client: {
      title: 'App Cliente — Catálogo de Serviços & Produtos',
      subtitle: 'Encontre profissionais, logística, mudanças e produtos num só lugar.',
      image: '/images/mockups/client_app_services_mockup.png',
      badge: 'App Cliente',
      badgeBg: '#7F00FF',
      bullets: [
        'Acesso direto ao Catálogo de Serviços e Mercado',
        'Serviço de Logística',
        'Navegação intuitiva com acompanhamento e pagamentos'
      ]
    },
    order: {
      title: 'App Cliente — Acompanhamento de Pedido',
      subtitle: 'Acompanhe cada etapa do seu pedido em tempo real, da aprovação do fornecedor à chegada do estafeta.',
      image: '/images/mockups/order_detail_mockup.jpg',
      badge: 'Progresso do Pedido',
      badgeBg: '#8B5CF6',
      bullets: [
        'Acompanhamento transparente por passos (Pendente, Aceite, Em Trânsito, Entregue)',
        'Notificações instantâneas em cada alteração de estado',
        'Confirmação direta de recepção do pedido pelo cliente'
      ]
    },
    seller: {
      title: 'App Fornecedor (nhiquelaseller) — Gestão de Loja',
      subtitle: 'Gerencie novos pedidos, controle o stock e acompanhe as suas vendas e saldo em tempo real.',
      image: '/images/mockups/seller_app_mockup.jpg',
      badge: 'Vendedor / Fornecedor',
      badgeBg: '#9333EA',
      bullets: [
        'Saldo da Carteira Digital com crédito/débito automático',
        'Aprovação e rejeição de pedidos com 1 toque',
        'Opção de solicitar motorista interno ou entrega externa'
      ]
    },
    driver: {
      title: 'App Motorista  — Viagens & Entregas',
      subtitle: 'Receba solicitações de entregas com 1 toque e gira os seus ganhos diários na sua carteira.',
      image: '/images/mockups/driver_app_mockup.jpg',
      badge: 'Motorista / Entregador',
      badgeBg: '#10B981',
      bullets: [
        'Alternador Online/Offline simples e intuitivo',
        'Histórico de viagens e ganhos diários detalhados',
        'Aceitação imediata de corridas com alerta sonoro'
      ]
    },
    map: {
      title: 'Navegação GPS & Trajeto em Tempo Real',
      subtitle: 'Navegação integrada com mapas interativos e geolocalização exata de partida e chegada.',
      image: '/images/mockups/driver_map_mockup.jpg',
      badge: 'GPS & Trajeto',
      badgeBg: '#3B82F6',
      bullets: [
        'Mapa vetorial com visualização 3D da rota',
        'Cálculo de distância e tempo estimado de chegada (ETA)',
        'Sincronização ao vivo entre Cliente, Vendedor e Motorista'
      ]
    }
  };

  const currentMockup = mockups[activeTab];

  return (
    <div className="nhiquela-landing-root min-vh-100 position-relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        
        .nhiquela-landing-root {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0F172A;
          background-color: #F8FAFC;
          overflow-x: hidden;
          letter-spacing: -0.2px;
        }
        
        .navbar-glass-sticky {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.03);
        }

        .corporate-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .gradient-text-purple {
          background: linear-gradient(135deg, #6D28D9 0%, #2563EB 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .card-corporate-pro {
          background: #FFFFFF !important;
          border: 1px solid #E2E8F0 !important;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .card-corporate-pro:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.12) !important;
          border-color: rgba(109, 40, 217, 0.3) !important;
        }

        .btn-corporate-primary {
          background: linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%) !important;
          color: #FFFFFF !important;
          box-shadow: 0 10px 25px -5px rgba(109, 40, 217, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          transition: all 0.25s ease !important;
        }
        .btn-corporate-primary:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 14px 32px -5px rgba(109, 40, 217, 0.55) !important;
          color: #FFFFFF !important;
        }

        .btn-corporate-outline {
          background: #FFFFFF !important;
          color: #0F172A !important;
          border: 1.5px solid #CBD5E1 !important;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04) !important;
          transition: all 0.25s ease !important;
        }
        .btn-corporate-outline:hover {
          background: #F8FAFC !important;
          border-color: #0F172A !important;
          transform: translateY(-2px) !important;
        }

        .badge-soft-purple {
          background-color: #F3E8FF !important;
          color: #6D28D9 !important;
          border: 1px solid rgba(109, 40, 217, 0.2) !important;
        }
      `}</style>

      {/* Top Banner Corporativo de Anúncios B2B */}
      <div style={{ background: '#0F172A', color: '#94A3B8', fontSize: '0.82rem', padding: '8px 0', borderBottom: '1px solid #1E293B' }}>
        <div className="container d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">

            <span style={{ color: '#E2E8F0', fontWeight: '500' }}>
              Plataforma integrada de entregas, mobilidade e transporte corporativo em Moçambique.
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPartnershipModal(true)}
              className="btn btn-link text-decoration-none d-flex align-items-center gap-1 p-0 border-0"
              style={{ color: '#CBD5E1', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '500' }}
            >
              <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '10px' }} />
              <span>Contactar para parcerias</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navbar Institucional Glassmorphism */}
      <nav className="navbar navbar-expand-lg navbar-light py-3 sticky-top navbar-glass-sticky">
        <div className="container">
          <Link className="text-decoration-none" to="/">
            <h3 className="m-0 text-dark fw-extrabold" style={{ letterSpacing: '-1.2px', fontSize: '1.75rem' }}>nhiquela<span style={{ color: '#6D28D9' }}>.</span></h3>
          </Link>
          <div className="d-flex align-items-center gap-2">
            <Link to="/shop" className="btn btn-corporate-outline rounded-pill px-4 py-2 fw-bold small transition-all d-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faShoppingBag} />
              <span>Marketplace</span>
            </Link>
            <Link to="/login" className="btn btn-corporate-primary rounded-pill px-4 py-2 fw-bold small d-flex align-items-center gap-2">
              <span>Entrar</span>
              <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '12px' }} />
            </Link>
          </div>
        </div>
      </nav>

      {/* SEÇÃO CORPORATIVA: LOGÍSTICA PESADA & CARROSSEL (PRIMEIRA NA PÁGINA) */}
      <div style={{ backgroundColor: '#F1F5F9', color: '#0F172A', padding: '50px 0 0 0', position: 'relative', overflow: 'hidden' }}>
        {/* Luzes decorativas */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(138, 43, 226, 0.08) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

        {/* Título & Cabeçalho da Seção em Container */}
        <div className="container position-relative mb-4" style={{ zIndex: 2 }}>
          <div className="text-center">

            <h2 className="display-5 fw-extrabold mb-3" style={{ letterSpacing: '-1.5px', color: '#0F172A' }}>
              Conectamos a Cadeia de Suprimentos de Moçambique
            </h2>
            <p className="lead mx-auto mb-0" style={{ maxWidth: '820px', color: '#475569', fontSize: '1.15rem', lineHeight: '1.6' }}>
  Da machamba à cidade. Do físico ao digital. A nhiquela conecta produtos, negócios e pessoas.            </p>
          </div>
        </div>

        {/* CARROSSEL PONTA A PONTA (EDGE-TO-EDGE FULL WIDTH) */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: '#1E293B'
          }}
        >
          {/* CONTAINER DOS SLIDES - FULL WIDTH */}
          <div style={{ position: 'relative', minHeight: '480px', display: 'flex', alignItems: 'center', width: '100%' }}>
            {/* IMAGEM DE FUNDO DO SLIDE ATUAL (PONTA A PONTA) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${logisticsSlides[carouselIndex].image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'all 0.6s ease-in-out',
                filter: 'brightness(0.42)',
                width: '100%'
              }}
            />

            {/* CONTEÚDO DO SLIDE CENTRALIZADO */}
            <div className="container p-4 p-md-5 position-relative" style={{ zIndex: 3 }}>
              <div style={{ maxWidth: '850px' }}>
                <span
                  className="badge px-3 py-2 rounded-pill fw-bold mb-3 shadow"
                  style={{ backgroundColor: logisticsSlides[carouselIndex].tagBg, color: '#FFFFFF', fontSize: '13px' }}
                >
                  {logisticsSlides[carouselIndex].tag}
                </span>

                <h2 className="display-6 fw-extrabold text-white mb-3" style={{ letterSpacing: '-0.5px' }}>
                  {logisticsSlides[carouselIndex].title}
                </h2>

                <p className="fs-5 text-slate-200 mb-4" style={{ color: '#E2E8F0', lineHeight: '1.6', maxWidth: '750px' }}>
                  {logisticsSlides[carouselIndex].subtitle}
                </p>

                <div className="d-flex flex-wrap gap-3 align-items-center pt-2">

                  <span className="badge px-3 py-2 rounded-pill fw-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(6px)', color: '#FFFFFF' }}>
                    <FontAwesomeIcon icon={faTruck} className="me-2" /> {logisticsSlides[carouselIndex].highlight}
                  </span>
                </div>
              </div>
            </div>

            {/* BOTÃO ANTERIOR */}
            <button
              type="button"
              onClick={() => setCarouselIndex((prev) => (prev - 1 + logisticsSlides.length) % logisticsSlides.length)}
              style={{
                position: 'absolute',
                left: '24px',
                zIndex: 4,
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            {/* BOTÃO SEGUINTE */}
            <button
              type="button"
              onClick={() => setCarouselIndex((prev) => (prev + 1) % logisticsSlides.length)}
              style={{
                position: 'absolute',
                right: '24px',
                zIndex: 4,
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          {/* BARRA DE BOTÕES/ABAS DOS SERVIÇOS (PONTA A PONTA) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              borderTop: '1px solid #E2E8F0',
              width: '100%'
            }}
          >
            {logisticsSlides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCarouselIndex(idx)}
                style={{
                  backgroundColor: idx === carouselIndex ? slide.tagBg : '#F1F5F9',
                  color: idx === carouselIndex ? '#FFFFFF' : '#475569',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: idx === carouselIndex ? '#FFFFFF' : '#94A3B8' }} />
                {slide.tag}
              </button>
            ))}
          </div>
        </div>
      </div>



      {/* ========================================================================= */}
      {/* 2. "O QUE POSSO FAZER COM A NHIQUELA?" — O ECOSSISTEMA COMPLETO           */}
      {/* ========================================================================= */}
      <section className="py-5 bg-white border-top border-bottom position-relative overflow-hidden">
        <div className="container py-4 position-relative" style={{ zIndex: 2 }}>
          <div className="text-center mb-5">

            <h2 className="display-4 fw-black text-dark mb-3" style={{ letterSpacing: '-1.5px' }}>
              O que posso fazer com a <span style={{ background: 'linear-gradient(135deg, #7F00FF 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>nhiquela?</span>
            </h2>
            <p className="lead text-secondary mx-auto mb-0" style={{ maxWidth: '750px', fontSize: '1.15rem' }}>
              Conectamos todas as suas necessidades do dia a dia num único ecossistema digital inteligente, rápido e confiável em Moçambique.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* 🛍️ COMPRAR */}
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF5FF 100%)',
                  border: '1px solid rgba(127, 0, 255, 0.15)',
                  transition: 'all 0.35s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(127, 0, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white shadow-sm flex-shrink-0"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #7F00FF 0%, #9333EA 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faShoppingBag} size="lg" />
                  </div>
                  <div>
                    <h4 className="fw-extrabold text-dark mb-0">Comprar</h4>
                    <span className="badge bg-light text-primary-custom border rounded-pill small" style={{ fontSize: '11px' }}>Mercado & Lojas</span>
                  </div>
                </div>
                <p className="text-secondary small mb-3" style={{ lineHeight: '1.6' }}>
                  Produtos de lojas e estabelecimentos de parceiros confiáveis.
                </p>
                <div className="d-flex flex-wrap gap-2 mt-auto pt-3 border-top">
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    Solicitar pedido
                  </span>
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    Compra de produtos
                  </span>
                </div>
              </div>
            </div>

            {/* 📦 ENVIAR */}
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  transition: 'all 0.35s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(37, 99, 235, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white shadow-sm flex-shrink-0"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faBox} size="lg" />
                  </div>
                  <div>
                    <h4 className="fw-extrabold text-dark mb-0">Enviar</h4>
                    <span className="badge bg-light text-primary border rounded-pill small" style={{ fontSize: '11px' }}>Encomendas Expressas</span>
                  </div>
                </div>
                <p className="text-secondary small mb-3" style={{ lineHeight: '1.6' }}>
                  Documentos, encomendas e mercadorias com envio seguro.
                </p>
                <div className="d-flex flex-wrap gap-2 mt-auto pt-3 border-top">
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    📄 Documentos
                  </span>
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    ✉️ Encomendas rápidas
                  </span>
                </div>
              </div>
            </div>

            {/* 🚚 TRANSPORTAR */}
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                  border: '1px solid rgba(30, 41, 59, 0.15)',
                  transition: 'all 0.35s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(30, 41, 59, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white shadow-sm flex-shrink-0"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faTruck} size="lg" />
                  </div>
                  <div>
                    <h4 className="fw-extrabold text-dark mb-0">Transportar</h4>
                    <span className="badge bg-light text-dark border rounded-pill small" style={{ fontSize: '11px' }}>Fretes & Logística</span>
                  </div>
                </div>
                <p className="text-secondary small mb-3" style={{ lineHeight: '1.6' }}>
                  Carga, mudanças e materiais corporativos ou residenciais.
                </p>
                <div className="d-flex flex-wrap gap-2 mt-auto pt-3 border-top">
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    📦 Mudanças
                  </span>
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    🚛 Cargas pesadas
                  </span>
                </div>
              </div>
            </div>

            {/* 🏍️ MOBILIDADE */}
            <div className="col-12 col-md-6 col-lg-6">
              <div
                className="card h-100 border-0 rounded-5 p-4 transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #ECFDF5 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  transition: 'all 0.35s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(16, 185, 129, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white shadow-sm flex-shrink-0"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faMotorcycle} size="lg" />
                  </div>
                  <div>
                    <h4 className="fw-extrabold text-dark mb-0">Mobilidade</h4>
                    <span className="badge bg-light text-success border rounded-pill small" style={{ fontSize: '11px' }}>Transporte Urbano</span>
                  </div>
                </div>
                <p className="text-secondary small mb-3" style={{ lineHeight: '1.6' }}>
                  Moto-táxi, transporte rápido de passageiros e outros serviços de mobilidade.
                </p>
                <div className="d-flex flex-wrap gap-2 mt-auto pt-3 border-top">
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    🛵 Moto-Táxi
                  </span>
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    Deslocação Rápida
                  </span>
                </div>
              </div>
            </div>

            {/* ⛽ SERVIÇOS */}
            <div className="col-12 col-md-6 col-lg-6">
              <div
                className="card h-100 border-0 rounded-5 p-4 transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFBEB 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  transition: 'all 0.35s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(245, 158, 11, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white shadow-sm flex-shrink-0"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faGasPump} size="lg" />
                  </div>
                  <div>
                    <h4 className="fw-extrabold text-dark mb-0">Serviços</h4>
                    <span className="badge bg-light text-warning border rounded-pill small" style={{ fontSize: '11px' }}>Assistência 24/7</span>
                  </div>
                </div>
                <p className="text-secondary small mb-3" style={{ lineHeight: '1.6' }}>
                  Reboque, aluguer de viaturas e outros serviços de suporte na estrada.
                </p>
                <div className="d-flex flex-wrap gap-2 mt-auto pt-3 border-top">
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    Reboque
                  </span>
                  <span className="badge bg-white text-dark border rounded-pill px-3 py-1.5 small fw-bold">
                    Aluguer de Viaturas
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ECOSSISTEMA MOCKUP SHOWCASE SECTION (DESIGN ULTRA PROFISSIONAL) */}
      <section className="py-5 position-relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 50%, #F1F5F9 100%)' }}>
        <div className="container py-4 position-relative" style={{ zIndex: 2 }}>
          {/* CABEÇALHO DA SEÇÃO */}
          <div className="text-center mb-5">

            <h2 className="display-4 fw-black text-dark mb-3" style={{ letterSpacing: '-1.5px', lineHeight: '1.15' }}>
              Uma plataforma que conecta <span style={{ background: 'linear-gradient(135deg, #7F00FF 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>soluções em perfeita sintonia.</span>
            </h2>
            <p className="lead text-secondary mx-auto mb-0" style={{ maxWidth: '760px', fontSize: '1.15rem', lineHeight: '1.65' }}>
              Explore como o Cliente navega e solicita serviços, o Fornecedor faz a gestão completa do negócio e o Motorista realiza as entregas com rastreamento GPS ativo em tempo real.
            </p>

            {/* BARRA DE SELEÇÃO DE ABAS INTERATIVAS */}
            <div className="d-flex justify-content-center flex-wrap gap-2 mt-4 pt-2">
              {[
                { id: 'client', label: 'App Cliente (Serviços)', icon: faShoppingBag, activeBg: '#7F00FF' },
                { id: 'order', label: 'Acompanhar Pedido', icon: faListCheck, activeBg: '#8B5CF6' },
                { id: 'seller', label: 'App Fornecedor', icon: faStore, activeBg: '#10B981' },
                { id: 'driver', label: 'App Motorista', icon: faMotorcycle, activeBg: '#059669' },
                { id: 'map', label: 'Trajeto GPS', icon: faMap, activeBg: '#2563EB' }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="btn rounded-pill px-4 py-2.5 fw-bold transition-all d-inline-flex align-items-center gap-2 border"
                    style={{
                      backgroundColor: isActive ? tab.activeBg : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#475569',
                      borderColor: isActive ? tab.activeBg : '#E2E8F0',
                      boxShadow: isActive ? `0 10px 25px -5px ${tab.activeBg}66` : '0 2px 5px rgba(0,0,0,0.03)',
                      fontSize: '0.92rem',
                      transform: isActive ? 'scale(1.03)' : 'scale(1)'
                    }}
                  >
                    <FontAwesomeIcon icon={tab.icon} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DISPLAY CARD PRINCIPAL DA APLICAÇÃO */}
          <div
            className="card border-0 rounded-5 p-4 p-md-5 overflow-hidden position-relative"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.12), 0 0 40px rgba(127, 0, 255, 0.06)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}
          >
            <div className="row align-items-center g-5 position-relative" style={{ zIndex: 2 }}>
              {/* COLUNA ESQUERDA: MOCKUP INTERATIVO */}
              <div className="col-lg-5 text-center">
                <div
                  className="position-relative d-inline-block p-3 rounded-5 bg-white shadow-lg border overflow-hidden"
                  style={{ maxWidth: '340px', width: '100%', transition: 'all 0.4s ease' }}
                >
                  <div className="position-relative rounded-4 overflow-hidden">
                    <img
                      src={currentMockup.image}
                      alt={currentMockup.title}
                      className="img-fluid rounded-4 transition-all"
                      style={{ maxHeight: '460px', width: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80';
                      }}
                    />

                    {/* FLUTUANTE BADGE DA INTERFACE */}
                    <span
                      className="position-absolute top-0 start-50 translate-middle-x mt-3 badge rounded-pill px-4 py-2 shadow-lg fw-bold text-white border border-white"
                      style={{
                        backgroundColor: currentMockup.badgeBg || '#7F00FF',
                        fontSize: '0.82rem',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
                      }}
                    >
                      {currentMockup.badge}
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: DETALHES & DESTAQUES TÉCNICOS */}
              <div className="col-lg-7">


                <h3 className="display-6 fw-extrabold text-dark mb-3" style={{ letterSpacing: '-0.8px' }}>
                  {currentMockup.title}
                </h3>

                <p className="lead text-secondary mb-4 fs-5" style={{ lineHeight: '1.65' }}>
                  {currentMockup.subtitle}
                </p>

                {/* LISTA DE DESTAQUES EM MICRO-CARDS PROFISSIONAIS */}
                <div className="d-flex flex-column gap-3 mb-4">
                  {currentMockup.bullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="d-flex align-items-start gap-3 p-3 rounded-4 bg-light border transition-all"
                      style={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}
                    >
                      <div
                        className="rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'linear-gradient(135deg, #7F00FF 0%, #2563EB 100%)'
                        }}
                      >
                        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '14px' }} />
                      </div>
                      <div className="flex-grow-1">
                        <span className="text-dark fw-bold fs-6" style={{ lineHeight: '1.5', display: 'block' }}>
                          {bullet}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AÇÕES E BOTÃO CTA DA ABA */}
                <div className="pt-2 d-flex flex-wrap align-items-center gap-3">
                  <Link
                    to="/shop"
                    className="btn text-white rounded-pill px-4 py-3 fw-extrabold shadow-lg transition-all d-inline-flex align-items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #7F00FF 0%, #9333EA 50%, #6366F1 100%)',
                      boxShadow: '0 10px 25px -5px rgba(127, 0, 255, 0.45)'
                    }}
                  >
                    <span>Explorar no Marketplace</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </Link>


                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* SEÇÃO CTA MULTI-FUNIL PREMIUM: JUNTE-SE À NHIQUELA */}
      <section className="py-5 position-relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F6 100%)' }}>
        <div className="container py-4 position-relative" style={{ zIndex: 2 }}>
          <div className="text-center mb-5">

            <h2 className="display-4 fw-black text-dark mb-3" style={{ letterSpacing: '-1.5px' }}>
              Junte-se à nhiquela<span style={{ background: 'linear-gradient(135deg, #7F00FF 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>.</span>
            </h2>
            <p className="lead text-secondary mx-auto mb-0" style={{ maxWidth: '680px', fontSize: '1.15rem' }}>
              Escolha o seu perfil de utilização e descubra como a nossa plataforma integrada transforma o seu negócio, os seus ganhos e a sua conveniência diária.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* CARD 1: PARA FORNECEDORES */}
            <div className="col-12 col-md-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 text-center transition-all position-relative overflow-hidden"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 20px 40px -15px rgba(127, 0, 255, 0.15)',
                  border: '1px solid rgba(127, 0, 255, 0.12)',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 30px 60px -20px rgba(127, 0, 255, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(127, 0, 255, 0.15)';
                }}
              >
                <div className="card-body d-flex flex-column align-items-center p-2">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white mb-4 shadow-lg"
                    style={{
                      width: '76px',
                      height: '76px',
                      background: 'linear-gradient(135deg, #7F00FF 0%, #9333EA 100%)',
                      boxShadow: '0 10px 25px rgba(127, 0, 255, 0.4)'
                    }}
                  >
                    <FontAwesomeIcon icon={faStore} size="2x" />
                  </div>



                  <h3 className="fw-extrabold text-dark mb-3" style={{ letterSpacing: '-0.5px' }}>
                    Para Fornecedores
                  </h3>

                  <p className="text-secondary mb-4 small" style={{ lineHeight: '1.65', minHeight: '64px' }}>
                    Multiplique as suas vendas. Exponha os seus produtos a milhares de clientes sem pagar custos fixos de plataforma.
                  </p>

                  <div className="w-100 pt-3 border-top mt-auto">
                    <Link
                      to="/signup?type=seller"
                      className="btn text-white rounded-pill w-100 py-3 fw-extrabold shadow-md transition-all d-flex align-items-center justify-content-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #7F00FF 0%, #8A2BE2 100%)',
                        boxShadow: '0 8px 20px rgba(127, 0, 255, 0.3)'
                      }}
                    >
                      <span>Criar Loja Grátis</span>
                      <FontAwesomeIcon icon={faArrowRight} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: PARA MOTORISTAS */}
            <div className="col-12 col-md-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 text-center transition-all position-relative overflow-hidden"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 30px 60px -20px rgba(16, 185, 129, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(16, 185, 129, 0.15)';
                }}
              >
                <div className="card-body d-flex flex-column align-items-center p-2">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white mb-4 shadow-lg"
                    style={{
                      width: '76px',
                      height: '76px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <FontAwesomeIcon icon={faMotorcycle} size="2x" />
                  </div>

                  <h3 className="fw-extrabold text-dark mb-3" style={{ letterSpacing: '-0.5px' }}>
                    Para Motoristas
                  </h3>

                  <p className="text-secondary mb-4 small" style={{ lineHeight: '1.65', minHeight: '64px' }}>
                    Seja seu próprio chefe. Faça entregas com a Nhiquela e receba os seus ganhos diretamente na sua carteira.
                  </p>

                  <div className="w-100 pt-3 border-top mt-auto">
                    <Link
                      to="/signup?type=driver"
                      className="btn text-white rounded-pill w-100 py-3 fw-extrabold shadow-md transition-all d-flex align-items-center justify-content-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <span>Seja um Motorista</span>
                      <FontAwesomeIcon icon={faArrowRight} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: PARA CLIENTES */}
            <div className="col-12 col-md-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 text-center transition-all position-relative overflow-hidden"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 20px 40px -15px rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 30px 60px -20px rgba(37, 99, 235, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(37, 99, 235, 0.15)';
                }}
              >
                <div className="card-body d-flex flex-column align-items-center p-2">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white mb-4 shadow-lg"
                    style={{
                      width: '76px',
                      height: '76px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    <FontAwesomeIcon icon={faShoppingBag} size="2x" />
                  </div>


                  <h3 className="fw-extrabold text-dark mb-3" style={{ letterSpacing: '-0.5px' }}>
                    Para Clientes
                  </h3>

                  <p className="text-secondary mb-4 small" style={{ lineHeight: '1.65', minHeight: '64px' }}>
                    Tudo o que você precisa, onde quer que você esteja. Pague fácil via M-Pesa e e-Mola.
                  </p>

                  <div className="w-100 pt-3 border-top mt-auto">
                    <Link
                      to="/shop"
                      className="btn text-white rounded-pill w-100 py-3 fw-extrabold shadow-md transition-all d-flex align-items-center justify-content-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                        boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      <span>Explorar Catálogo</span>
                      <FontAwesomeIcon icon={faArrowRight} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. SEÇÃO MOBILE APP + GOOGLE PLAY & QR CODES (CORPORATE HIGH-TECH)       */}
      {/* ========================================================================= */}
      <section className="py-5 bg-white border-top border-bottom position-relative overflow-hidden">
        <div className="container py-4 position-relative" style={{ zIndex: 2 }}>
          <div className="text-center mb-5">

            <h2 className="display-4 fw-black text-dark mb-3" style={{ letterSpacing: '-1.5px', lineHeight: '1.15' }}>
              A nhiquela está no seu <span style={{ background: 'linear-gradient(135deg, #7F00FF 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>telemóvel.</span>
            </h2>
            <p className="lead text-secondary mx-auto mb-0" style={{ maxWidth: '750px', fontSize: '1.15rem', lineHeight: '1.65' }}>
              Faça download da aplicação na Google Play Store ou escaneie o QR Code correspondente para acessar à experiência completa.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* APP CLIENTE & MARKETPLACE */}
            <div className="col-12 col-md-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 text-center transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF5FF 100%)',
                  border: '1px solid rgba(127, 0, 255, 0.15)'
                }}
              >
                <div className="card-body d-flex flex-column align-items-center p-2">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white mb-3 shadow-md"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: 'linear-gradient(135deg, #7F00FF 0%, #9333EA 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faShoppingBag} size="xl" />
                  </div>

                  <h4 className="fw-extrabold text-dark mb-2">Cliente & Mercado</h4>
                  <p className="text-secondary small mb-4" style={{ lineHeight: '1.6' }}>
                    Compre produtos, solicite entregas, transporte e acompanhe o seu pedido ao vivo.
                  </p>

                  {/* QR CODE CONTAINER */}
                  <div className="p-3 bg-white rounded-4 shadow-sm border mb-4 d-inline-block">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://play.google.com/store/apps/details?id=com.mpatricio.nhiquelaa"
                      alt="QR Code App Cliente"
                      className="img-fluid rounded-3"
                      style={{ width: '140px', height: '140px' }}
                    />
                    <div className="mt-2 text-muted small fw-bold" style={{ fontSize: '11px' }}>
                      <FontAwesomeIcon icon={faQrcode} className="me-1" /> Apontar Câmara
                    </div>
                  </div>

                  {/* GOOGLE PLAY & APP STORE BUTTONS */}
                  <div className="w-100 d-flex flex-column gap-2 mt-auto">
                    <a
                      href="https://play.google.com/store/apps/details?id=com.mpatricio.nhiquelaa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-dark rounded-pill py-2.5 px-3 fw-bold small d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L18.81,13.97C19.46,13.6 19.46,12.4 18.81,12.03L16.81,10.88L14.83,12.86L16.81,15.12M4.6,1.44L14.12,10.96L12,13.08L4.6,1.44M4.6,22.56L12,10.92L14.12,13.04L4.6,22.56Z" />
                      </svg>
                      <span>Google Play</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* APP FORNECEDOR / LOJA */}
            <div className="col-12 col-md-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 text-center transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.15)'
                }}
              >
                <div className="card-body d-flex flex-column align-items-center p-2">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white mb-3 shadow-md"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faStore} size="xl" />
                  </div>

                  <h4 className="fw-extrabold text-dark mb-2">Fornecedor</h4>
                  <p className="text-secondary small mb-4" style={{ lineHeight: '1.6' }}>
                    Gerencie a sua loja, aceite novos pedidos, controle stock e acompanhe relatórios.
                  </p>

                  {/* QR CODE CONTAINER */}
                  <div className="p-3 bg-white rounded-4 shadow-sm border mb-4 d-inline-block">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://play.google.com/store/apps/details?id=com.mpatricio.nhiquelap"
                      alt="QR Code App Fornecedor"
                      className="img-fluid rounded-3"
                      style={{ width: '140px', height: '140px' }}
                    />
                    <div className="mt-2 text-muted small fw-bold" style={{ fontSize: '11px' }}>
                      <FontAwesomeIcon icon={faQrcode} className="me-1" /> Apontar Câmara
                    </div>
                  </div>

                  {/* GOOGLE PLAY & APP STORE BUTTONS */}
                  <div className="w-100 d-flex flex-column gap-2 mt-auto">
                    <a
                      href="https://play.google.com/store/apps/details?id=com.mpatricio.nhiquelap"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-dark rounded-pill py-2.5 px-3 fw-bold small d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L18.81,13.97C19.46,13.6 19.46,12.4 18.81,12.03L16.81,10.88L14.83,12.86L16.81,15.12M4.6,1.44L14.12,10.96L12,13.08L4.6,1.44M4.6,22.56L12,10.92L14.12,13.04L4.6,22.56Z" />
                      </svg>
                      <span>Google Play</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* APP MOTORISTA / ESTAFETA */}
            <div className="col-12 col-md-4">
              <div
                className="card h-100 border-0 rounded-5 p-4 text-center transition-all position-relative shadow-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)',
                  border: '1px solid rgba(37, 99, 235, 0.15)'
                }}
              >
                <div className="card-body d-flex flex-column align-items-center p-2">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-white mb-3 shadow-md"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                    }}
                  >
                    <FontAwesomeIcon icon={faMotorcycle} size="xl" />
                  </div>

                  <h4 className="fw-extrabold text-dark mb-2">Motorista</h4>
                  <p className="text-secondary small mb-4" style={{ lineHeight: '1.6' }}>
                    Receba solicitações de transporte, navegue via GPS e ganhe diretamente na sua carteira.
                  </p>

                  {/* QR CODE CONTAINER */}
                  <div className="p-3 bg-white rounded-4 shadow-sm border mb-4 d-inline-block">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://play.google.com/store/apps/details?id=com.nhiquela.driver"
                      alt="QR Code App Motorista"
                      className="img-fluid rounded-3"
                      style={{ width: '140px', height: '140px' }}
                    />
                    <div className="mt-2 text-muted small fw-bold" style={{ fontSize: '11px' }}>
                      <FontAwesomeIcon icon={faQrcode} className="me-1" /> Apontar Câmara
                    </div>
                  </div>

                  {/* GOOGLE PLAY & APP STORE BUTTONS */}
                  <div className="w-100 d-flex flex-column gap-2 mt-auto">
                    <a
                      href="https://play.google.com/store/apps/details?id=com.nhiquela.driver"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-dark rounded-pill py-2.5 px-3 fw-bold small d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L18.81,13.97C19.46,13.6 19.46,12.4 18.81,12.03L16.81,10.88L14.83,12.86L16.81,15.12M4.6,1.44L14.12,10.96L12,13.08L4.6,1.44M4.6,22.56L12,10.92L14.12,13.04L4.6,22.56Z" />
                      </svg>
                      <span>Google Play</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Secção CTA (Call to Action) Ultra Premium com Cor Principal Nhiquela */}
      <div className="container py-4 my-4">
        <section
          style={{
            position: 'relative',
            borderRadius: '32px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #7F00FF 0%, #6000C0 50%, #4A0099 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 25px 60px -15px rgba(127, 0, 255, 0.45), 0 0 35px rgba(127, 0, 255, 0.3)',
            padding: '64px 32px',
            color: '#FFFFFF'
          }}
        >
          {/* Luzes ambiente decorativas de fundo */}
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(127, 0, 255, 0.5) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

          <div className="position-relative text-center mx-auto" style={{ zIndex: 3, maxWidth: '820px' }}>

            <h1 className="display-4 fw-extrabold text-white mb-4" style={{ letterSpacing: '-1.5px', lineHeight: '1.15' }}>
              Pronto para experimentar a <span style={{ color: '#FFFFFF', textShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>nhiquela?</span>
            </h1>

            <p className="lead mb-5" style={{ color: '#F3E8FF', fontSize: '1.25rem', lineHeight: '1.6', maxWidth: '680px', margin: '0 auto' }}>
              A sua próxima entrega, o seu próximo serviço, o seu próximo cliente — tudo a começar agora.
            </p>

            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 align-items-center">
              <Link
                to="/shop"
                className="btn bg-white text-primary-custom rounded-pill px-5 py-3 fw-extrabold shadow-lg fs-5 transition-all d-flex align-items-center justify-content-center gap-2"
                style={{ minWidth: '260px', color: '#7F00FF' }}
              >
                Marketplace <FontAwesomeIcon icon={faArrowRight} />
              </Link>

              <Link
                to="/signup?type=seller"
                className="btn rounded-pill px-5 py-3 fw-bold fs-5 text-white transition-all d-flex align-items-center justify-content-center gap-2"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  minWidth: '240px'
                }}
              >
                <FontAwesomeIcon icon={faStore} /> Tornar-se Fornecedor
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER CORPORATIVO PREMIUM */}
      <footer style={{ backgroundColor: '#0F172A', color: '#94A3B8', borderTop: '1px solid #1E293B', paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="container">
          <div className="row g-4 mb-5">
            {/* Coluna 1: Branding & Missão */}
            <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
              <Link className="text-decoration-none" to="/">
                <h3 className="m-0 text-white fw-extrabold mb-3" style={{ letterSpacing: '-1px' }}>
                  nhiquela<span className="text-primary-custom">.</span>
                </h3>
              </Link>
              <p className="small text-slate-400 mb-4" style={{ color: '#94A3B8', lineHeight: '1.7', maxWidth: '320px' }}>
                Ecossistema tecnológico que conecta clientes, fornecedores e logística de cargas em todo o país.
              </p>
            </div>

            {/* Coluna 2: Plataforma & Serviços */}
            <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
              <h6 className="text-white fw-bold text-uppercase mb-3" style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>
                Plataforma Web
              </h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li><Link to="/shop" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Marketplace</Link></li>
                <li><Link to="/shop" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Cargas Pesadas</Link></li>
                <li><Link to="/shop" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Logística Portuária & Contentores</Link></li>
                <li><Link to="/shop" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Escoamento Agrícola nas Machambas</Link></li>
              </ul>
            </div>

            {/* Coluna 3: Parceiros & Apps */}
            <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
              <h6 className="text-white fw-bold text-uppercase mb-3" style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>
                Oportunidades & Apps
              </h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li><Link to="/signup?type=seller" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Cadastrar Loja / Fornecedor</Link></li>
                <li><Link to="/signup?type=driver" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Seja um Motorista Parceiro</Link></li>
                <li><Link to="/login" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Portal Fornecedor</Link></li>
                <li><Link to="/login" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>App Motorista</Link></li>
              </ul>
            </div>

            {/* Coluna 4: Contactos & Sede */}
            <div className="col-lg-3 col-md-6">
              <h6 className="text-white fw-bold text-uppercase mb-3" style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>
                Contactos & Sede
              </h6>
              <ul className="list-unstyled d-flex flex-column gap-2.5 small mb-0">
                <li className="d-flex align-items-start gap-2" style={{ color: '#94A3B8' }}>
                  <FontAwesomeIcon icon={faPhone} className="mt-1 text-primary-custom" style={{ fontSize: '0.85rem' }} />
                  <div>
                    <span className="d-block text-white fw-semibold" style={{ fontSize: '0.8rem' }}>Chamadas & WhatsApp:</span>
                    <a href="tel:+258853600036" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>
                      853600036
                    </a>
                  </div>
                </li>
                <li className="d-flex align-items-start gap-2" style={{ color: '#94A3B8' }}>
                  <FontAwesomeIcon icon={faEnvelope} className="mt-1 text-primary-custom" style={{ fontSize: '0.85rem' }} />
                  <div>
                    <span className="d-block text-white fw-semibold" style={{ fontSize: '0.8rem' }}>E-mail:</span>
                    <a href="mailto:nhiquelaservicos@gmail.com" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>
                      nhiquelaservicos@gmail.com
                    </a>
                  </div>
                </li>
                <li className="d-flex align-items-start gap-2" style={{ color: '#94A3B8' }}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mt-1 text-primary-custom" style={{ fontSize: '0.85rem' }} />
                  <div>
                    <span className="d-block text-white fw-semibold" style={{ fontSize: '0.8rem' }}>Localização:</span>
                    <span style={{ color: '#94A3B8', lineHeight: '1.4' }}>
                      Paulo Samuel Kankhomba, Bairro da Sommershield, KaMpfumo, Maputo
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <hr style={{ borderColor: '#1E293B', margin: '32px 0' }} />

          {/* Copyright Bottom Bar */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 small text-slate-500" style={{ color: '#64748B' }}>
            <span>Todos os direitos reservados @2026 nhiquela.</span>
            <span>Desenvolvido por Nhiquela Serviços e Consultoria</span>
          </div>
        </div>
      </footer>

      {/* Modal de Contacto para Parcerias */}
      {showPartnershipModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          onClick={handleClosePartnershipModal}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              {/* Header do Modal */}
              <div
                className="modal-header border-0 text-white p-4"
                style={{ background: 'linear-gradient(135deg, #0F172A 0%, #6D28D9 100%)' }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge rounded-pill px-3 py-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', fontSize: '0.75rem' }}>
                      <FontAwesomeIcon icon={faHandshake} className="me-1" /> Oportunidade B2B
                    </span>
                  </div>
                  <h4 className="modal-title fw-bold m-0" style={{ letterSpacing: '-0.5px' }}>
                    Seja nosso Parceiro / Fornecedor
                  </h4>
                  <p className="m-0 text-light small opacity-75 mt-1">
                    Preencha o formulário abaixo com os dados da sua empresa e proposta de parceria.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white align-self-start"
                  onClick={handleClosePartnershipModal}
                ></button>
              </div>

              {/* Corpo do Modal */}
              <div className="modal-body p-4 bg-light">
                {partnershipSuccess ? (
                  <div className="text-center py-5">
                    <div
                      className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                      style={{ width: '80px', height: '80px', backgroundColor: '#DCFCE7', color: '#16A34A' }}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '2.5rem' }} />
                    </div>
                    <h4 className="fw-bold text-dark mb-2">Proposta Enviada com Sucesso!</h4>
                    <p className="text-muted mx-auto mb-4" style={{ maxWidth: '500px' }}>
                      Agradecemos o seu interesse em colaborar com o <strong>Nhiquela</strong>. A nossa equipa de expansão e parcerias irá analisar os seus dados e entrará em contacto muito brevemente.
                    </p>
                    <button
                      type="button"
                      className="btn btn-corporate-primary rounded-pill px-5 py-2.5 fw-bold"
                      onClick={handleClosePartnershipModal}
                    >
                      Concluir
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePartnershipSubmit}>
                    <div className="row g-3">
                      {/* Empresa / Razão Social */}
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-dark mb-1">
                          Empresa / Estabelecimento Comercial <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0 text-muted rounded-start-3">
                            <FontAwesomeIcon icon={faBuilding} />
                          </span>
                          <input
                            type="text"
                            className="form-control bg-white border-start-0 py-2 rounded-end-3"
                            placeholder="Ex: Comercial Maputo Lda"
                            value={partnershipForm.companyName}
                            onChange={(e) => setPartnershipForm({ ...partnershipForm, companyName: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      {/* Nome do Responsável */}
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-dark mb-1">
                          Nome do Responsável / Contacto
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0 text-muted rounded-start-3">
                            <FontAwesomeIcon icon={faUsers} />
                          </span>
                          <input
                            type="text"
                            className="form-control bg-white border-start-0 py-2 rounded-end-3"
                            placeholder="Ex: João Silva"
                            value={partnershipForm.contactName}
                            onChange={(e) => setPartnershipForm({ ...partnershipForm, contactName: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* E-mail de Contacto */}
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-dark mb-1">
                          E-mail Corporativo <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0 text-muted rounded-start-3">
                            <FontAwesomeIcon icon={faEnvelope} />
                          </span>
                          <input
                            type="email"
                            className="form-control bg-white border-start-0 py-2 rounded-end-3"
                            placeholder="parcerias@suaempresa.co.mz"
                            value={partnershipForm.email}
                            onChange={(e) => setPartnershipForm({ ...partnershipForm, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      {/* Telefone / WhatsApp */}
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-dark mb-1">
                          Telefone / WhatsApp
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0 text-muted rounded-start-3">
                            <FontAwesomeIcon icon={faPhone} />
                          </span>
                          <input
                            type="text"
                            className="form-control bg-white border-start-0 py-2 rounded-end-3"
                            placeholder="+258 84 000 0000"
                            value={partnershipForm.phone}
                            onChange={(e) => setPartnershipForm({ ...partnershipForm, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Produtos / Serviços Comercializados */}
                      <div className="col-12">
                        <label className="form-label fw-bold small text-dark mb-1">
                          Produtos ou Serviços Comercializados <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0 text-muted rounded-start-3 align-items-start pt-2">
                            <FontAwesomeIcon icon={faBox} />
                          </span>
                          <textarea
                            className="form-control bg-white border-start-0 py-2 rounded-end-3"
                            rows="2"
                            placeholder="Descreva resumidamente os produtos (ex: produtos alimentares, material de construção) ou serviços que a sua empresa oferece..."
                            value={partnershipForm.productsServices}
                            onChange={(e) => setPartnershipForm({ ...partnershipForm, productsServices: e.target.value })}
                            required
                          ></textarea>
                        </div>
                      </div>

                      {/* Motivos da Parceria */}
                      <div className="col-12">
                        <label className="form-label fw-bold small text-dark mb-1">
                          Motivos da Parceria / Apresentação de Proposta <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0 text-muted rounded-start-3 align-items-start pt-2">
                            <FontAwesomeIcon icon={faPaperPlane} />
                          </span>
                          <textarea
                            className="form-control bg-white border-start-0 py-2 rounded-end-3"
                            rows="3"
                            placeholder="Explique os objetivos da parceria, abrangência geográfica, capacidade de distribuição ou outros detalhes relevantes..."
                            value={partnershipForm.reasons}
                            onChange={(e) => setPartnershipForm({ ...partnershipForm, reasons: e.target.value })}
                            required
                          ></textarea>
                        </div>
                      </div>
                    </div>

                    {/* Botões do Rodapé */}
                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                      <button
                        type="button"
                        className="btn btn-light rounded-pill px-4 fw-bold"
                        onClick={handleClosePartnershipModal}
                        disabled={partnershipSubmitting}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-corporate-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
                        disabled={partnershipSubmitting}
                      >
                        {partnershipSubmitting ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin />
                            <span>A enviar proposta...</span>
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPaperPlane} />
                            <span>Enviar Proposta de Parceria</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
