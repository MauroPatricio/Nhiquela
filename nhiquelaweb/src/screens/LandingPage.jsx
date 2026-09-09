import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMotorcycle, faStore, faShoppingBag, faMobileAlt, faStar, faCheckCircle, faMapMarkerAlt, faWallet, faListCheck, faMap, faTruck, faChevronLeft, faChevronRight, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';
import api from '../api';

const logisticsSlides = [
  {
    id: 'freightliners',
    title: 'Camiões Freightliners & Carga Pesada',
    subtitle: 'Frotas articuladas de grande capacidade para o transporte de pesados entre Maputo, Beira, Tete e Nacala com monitoramento contínuo.',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
    tag: '',
    tagBg: '#8A2BE2',
    highlight: 'Frotas de Longa Distância'
  },
  {
    id: 'port_cargo',
    title: 'Logística Portuária & Cargas no Porto',
    subtitle: 'Operações contínuas de desembaraço e escoamento rodoviário nos Portos de Maputo, Beira e Nacala para contentores de importação e exportação.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    tag: '',
    tagBg: '#2563EB',
    highlight: 'Importação & Exportação'
  },
  {
    id: 'machambas',
    title: 'Produtores nas Machambas & Escoamento Agrícola',
    subtitle: 'Recolha direta de colheitas agrícolas rurais (milho, castanha de caju, gergelim, hortícolas) conectando os pequenos e grandes produtores aos mercados urbanos.',
    image: 'https://images.unsplash.com/photo-1595838788566-a3d8ecbc7e39?auto=format&fit=crop&w=1200&q=80',
    tag: '',
    tagBg: '#059669',
    highlight: 'Campo ao Mercado'
  },
  {
    id: 'machinery',
    title: 'Maquinaria Pesada & Equipamento de Construção',
    subtitle: 'Mobilização de retroescavadoras, camiões basculantes e matérias-primas pesadas para grandes obras e projetos de infraestrutura nacional.',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    tag: '',
    tagBg: '#D97706',
    highlight: 'Cargas Especiais'
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
      subtitle: 'Encontre profissionais, logística, assistência técnica, reformas, mudanças e produtos num só lugar.',
      image: '/images/mockups/client_app_services_mockup.png',
      badge: 'App Cliente',
      badgeBg: '#7F00FF',
      bullets: [
        'Acesso direto ao Catálogo de Serviços e Mercado Multi-Serviços',
        'Serviço de Logística, Assistência Técnica, Reformas e Mudanças',
        'Navegação intuitiva com acompanhamento e pagamentos M-Pesa / e-Mola'
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
    <div className="bg-light min-vh-100">
      {/* Navbar Institucional */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3 sticky-top">
        <div className="container">
          <Link className="text-decoration-none" to="/">
            <h3 className="m-0 text-black fw-extrabold" style={{ letterSpacing: '-1px' }}>nhiquela<span className="text-primary-custom">.</span></h3>
          </Link>
          <div className="d-flex gap-2">
            <Link to="/shop" className="btn btn-outline-dark rounded-pill px-4 fw-bold">Marketplace Web</Link>
            <Link to="/login" className="btn btn-outline-primary rounded-pill px-4">Entrar</Link>
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
              Do escoamento agrícola nas machambas rurais ao transporte de contentores no porto e fretes pesados interprovinciais com frotas de Freightliners.
            </p>
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

      {/* Hero Section com Imagem do Cliente */}
      <div className="py-5 my-2 position-relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)' }}>
        <div className="container py-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="badge px-3 py-2 rounded-pill fw-bold mb-3 shadow-sm d-inline-flex align-items-center gap-2" style={{ backgroundColor: '#F3E8FF', color: '#7F00FF', border: '1px solid rgba(127, 0, 255, 0.2)', fontSize: '0.88rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7F00FF', display: 'inline-block' }}></span>
                Conectamos quem precisa a quem tem a solução.
              </span>
              
              <h1 className="display-4 fw-extrabold text-dark mb-4" style={{ letterSpacing: '-1.5px', lineHeight: '1.15' }}>
                Tudo em suas mãos, entregue em <span className="text-primary-custom" style={{ background: 'linear-gradient(135deg, #7F00FF 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>minutos.</span>
              </h1>
              
              <p className="lead text-secondary mb-4 fs-5" style={{ lineHeight: '1.6', maxWidth: '540px' }}>
                Nhiquela é a plataforma integrada que conecta Clientes, Fornecedores e Motoristas num único ecossistema inteligente de marketplace e entregas.
              </p>
              
              <div className="d-flex flex-wrap gap-3 mb-4">
                <Link 
                  to="/shop" 
                  className="btn text-white rounded-pill px-4 py-3 fw-extrabold fs-5 transition-all d-inline-flex align-items-center justify-content-center gap-3 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #7F00FF 0%, #9333EA 50%, #6366F1 100%)',
                    boxShadow: '0 14px 35px -6px rgba(127, 0, 255, 0.55), 0 4px 14px rgba(127, 0, 255, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    letterSpacing: '-0.3px',
                    paddingLeft: '28px',
                    paddingRight: '20px'
                  }}
                >
                  <span>Acessar Marketplace Web</span>
                  <span 
                    className="rounded-circle d-inline-flex align-items-center justify-content-center text-white" 
                    style={{ 
                      width: '38px', 
                      height: '38px', 
                      backgroundColor: 'rgba(255, 255, 255, 0.22)',
                      backdropFilter: 'blur(6px)',
                      boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                    }}
                  >
                    <FontAwesomeIcon icon={faShoppingBag} style={{ fontSize: '16px' }} />
                  </span>
                </Link>
              </div>

              {/* Trust Badges Bar */}
              <div className="p-3 bg-white rounded-4 shadow-sm border d-inline-flex flex-wrap align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle p-2 d-flex justify-content-center align-items-center" style={{ width: '34px', height: '34px', backgroundColor: '#F3E8FF', color: '#7F00FF' }}>
                    <FontAwesomeIcon icon={faMobileAlt} />
                  </div>
                  <span className="fw-semibold text-dark small">Android & iOS</span>
                </div>
                <div className="vr d-none d-sm-block" style={{ height: '20px', opacity: 0.2 }} />
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle p-2 d-flex justify-content-center align-items-center" style={{ width: '34px', height: '34px', backgroundColor: '#D1FAE5', color: '#059669' }}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                  <span className="fw-semibold text-dark small">Pagamentos M-Pesa & e-Mola</span>
                </div>
              </div>
            </div>

            <div className="col-lg-6 text-center d-flex justify-content-center align-items-center">
              {/* CARROSSEL INTERATIVO DE MOCKUPS DAS APPS E ECOSSISTEMA */}
              <div 
                className="position-relative p-3 bg-white rounded-5 shadow-lg border text-center" 
                style={{ maxWidth: '370px', transition: 'all 0.3s ease' }}
                onMouseEnter={() => setHeroPaused(true)}
                onMouseLeave={() => setHeroPaused(false)}
              >
                {/* CONTAINER DO MOCKUP COM TRANSIÇÃO */}
                <div className="position-relative overflow-hidden rounded-4">
                  <img 
                    key={heroMockupKeys[heroMockupIndex]}
                    src={mockups[heroMockupKeys[heroMockupIndex]]?.image || '/images/mockups/client_app_services_mockup.png'} 
                    alt={mockups[heroMockupKeys[heroMockupIndex]]?.title || 'Mockup App'} 
                    className="img-fluid rounded-4 shadow-sm" 
                    style={{ maxHeight: '490px', width: '100%', objectFit: 'cover', transition: 'all 0.4s ease-in-out' }} 
                  />

                  {/* BOTÃO ANTERIOR DO CARROSSEL */}
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx = (heroMockupIndex - 1 + heroMockupKeys.length) % heroMockupKeys.length;
                      setHeroMockupIndex(prevIdx);
                      setActiveTab(heroMockupKeys[prevIdx]);
                    }}
                    className="btn btn-sm text-white rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2 border-0 d-flex align-items-center justify-content-center shadow"
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(6px)',
                      zIndex: 5
                    }}
                    title="Anterior"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} size="sm" />
                  </button>

                  {/* BOTÃO SEGUINTE DO CARROSSEL */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (heroMockupIndex + 1) % heroMockupKeys.length;
                      setHeroMockupIndex(nextIdx);
                      setActiveTab(heroMockupKeys[nextIdx]);
                    }}
                    className="btn btn-sm text-white rounded-circle position-absolute top-50 end-0 translate-middle-y me-2 border-0 d-flex align-items-center justify-content-center shadow"
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(6px)',
                      zIndex: 5
                    }}
                    title="Seguinte"
                  >
                    <FontAwesomeIcon icon={faChevronRight} size="sm" />
                  </button>

                  {/* RÓTULO FLUTUANTE DA APLICAÇÃO ATUAL */}
                  <div 
                    className="position-absolute bottom-0 start-50 translate-middle-x mb-3 text-white px-3 py-2 rounded-pill shadow-lg small fw-bold border border-secondary d-flex align-items-center justify-content-center gap-2" 
                    style={{ width: '90%', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 23, 42, 0.88)', zIndex: 6, fontSize: '13px' }}
                  >
                    <span>📱</span> {mockups[heroMockupKeys[heroMockupIndex]]?.badge}
                  </div>
                </div>

                {/* PONTOS INDICADORES (DOTS) */}
                <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
                  {heroMockupKeys.map((key, idx) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setHeroMockupIndex(idx);
                        setActiveTab(key);
                      }}
                      style={{
                        width: idx === heroMockupIndex ? '24px' : '9px',
                        height: '9px',
                        borderRadius: '10px',
                        backgroundColor: idx === heroMockupIndex ? '#7F00FF' : '#CBD5E1',
                        border: 'none',
                        transition: 'all 0.3s ease',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                      title={mockups[key]?.badge}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ECOSSISTEMA MOCKUP SHOWCASE SECTION */}
      <div className="bg-white py-5 border-top border-bottom">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold text-dark mt-2" style={{ letterSpacing: '-1px' }}>
              Uma plataforma que conecta soluções em perfeita sintonia.
            </h2>
            <p className="lead text-muted mx-auto" style={{ maxWidth: '650px' }}>
              Explore como o Cliente navega e solicita serviços, o Fornecedor faz a gestão e o Motorista realiza as entregas em tempo real.
            </p>

            {/* Tab Selectors */}
            <div className="d-flex justify-content-center flex-wrap gap-2 mt-4">
              <button 
                className={`btn rounded-pill px-4 py-2 fw-bold transition-all ${activeTab === 'client' ? 'bg-primary-custom text-white shadow' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('client')}
              >
                <FontAwesomeIcon icon={faShoppingBag} className="me-2" /> App Cliente (Serviços)
              </button>
              <button 
                className={`btn rounded-pill px-4 py-2 fw-bold transition-all ${activeTab === 'order' ? 'bg-primary-custom text-white shadow' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('order')}
              >
                <FontAwesomeIcon icon={faListCheck} className="me-2" /> Acompanhar Pedido
              </button>
              <button 
                className={`btn rounded-pill px-4 py-2 fw-bold transition-all ${activeTab === 'seller' ? 'bg-primary-custom text-white shadow' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('seller')}
              >
                <FontAwesomeIcon icon={faStore} className="me-2" /> App Fornecedor
              </button>
              <button 
                className={`btn rounded-pill px-4 py-2 fw-bold transition-all ${activeTab === 'driver' ? 'bg-primary-custom text-white shadow' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('driver')}
              >
                <FontAwesomeIcon icon={faMotorcycle} className="me-2" /> App Motorista
              </button>
              <button 
                className={`btn rounded-pill px-4 py-2 fw-bold transition-all ${activeTab === 'map' ? 'bg-primary-custom text-white shadow' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('map')}
              >
                <FontAwesomeIcon icon={faMap} className="me-2" /> Trajeto GPS
              </button>
            </div>
          </div>

          {/* Active Mockup Display Card */}
          <div className="bg-light rounded-5 p-4 p-md-5 border shadow-sm">
            <div className="row align-items-center g-4">
              <div className="col-lg-5 text-center">
                <div className="position-relative d-inline-block bg-white p-2 rounded-5 shadow border">
                  <img 
                    src={currentMockup.image} 
                    alt={currentMockup.title} 
                    className="img-fluid rounded-4 transition-all" 
                    style={{ maxHeight: '480px', objectFit: 'cover' }} 
                  />
                  <span 
                    className="position-absolute top-0 start-50 translate-middle badge rounded-pill px-3 py-2 shadow"
                    style={{ backgroundColor: currentMockup.badgeBg, fontSize: '0.85rem' }}
                  >
                    {currentMockup.badge}
                  </span>
                </div>
              </div>
              <div className="col-lg-7">
                <h3 className="fw-bold text-dark mb-3">{currentMockup.title}</h3>
                <p className="lead text-muted mb-4 fs-5">{currentMockup.subtitle}</p>

                <div className="d-flex flex-column gap-3 mb-4">
                  {currentMockup.bullets.map((bullet, idx) => (
                    <div key={idx} className="d-flex align-items-start gap-3">
                      <div className="bg-white text-primary-custom rounded-circle p-1 shadow-sm d-flex justify-content-center align-items-center" style={{ width: '28px', height: '28px' }}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </div>
                      <span className="text-dark fw-medium fs-6">{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 py-2 fw-bold">
                    Acessar no Marketplace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Serviços / Features */}
      <div className="bg-white py-5">
        <div className="container py-4">
          <h2 className="text-center fw-bold mb-5">Junte-se à nhiquela</h2>
          
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm-custom rounded-4 text-center p-4">
                <div className="card-body">
                  <div className="bg-light text-primary-custom rounded-circle d-flex justify-content-center align-items-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                    <FontAwesomeIcon icon={faStore} size="2x" />
                  </div>
                  <h4 className="fw-bold mb-3">Para Fornecedores</h4>
                  <p className="text-muted mb-4">Multiplique as suas vendas. Exponha os seus produtos a milhares de clientes sem pagar custos fixos de plataforma.</p>
                  <Link to="/signup?type=seller" className="text-primary-custom fw-bold text-decoration-none">Criar Loja Grátis &rarr;</Link>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm-custom rounded-4 text-center p-4">
                <div className="card-body">
                  <div className="bg-light text-success rounded-circle d-flex justify-content-center align-items-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                    <FontAwesomeIcon icon={faMotorcycle} size="2x" />
                  </div>
                  <h4 className="fw-bold mb-3">Para Motoristas</h4>
                  <p className="text-muted mb-4">Seja seu próprio chefe. Faça entregas com a Nhiquela e receba os seus ganhos diretamente na sua carteira.</p>
                  <Link to="/signup?type=driver" className="text-success fw-bold text-decoration-none">Seja um Motorista &rarr;</Link>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm-custom rounded-4 text-center p-4">
                <div className="card-body">
                  <div className="bg-light text-warning rounded-circle d-flex justify-content-center align-items-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                    <FontAwesomeIcon icon={faShoppingBag} size="2x" />
                  </div>
                  <h4 className="fw-bold mb-3">Para Clientes</h4>
                  <p className="text-muted mb-4">Tudo o que você precisa, onde quer que você esteja. Pague fácil via M-Pesa e e-Mola.</p>
                  <Link to="/shop" className="text-warning fw-bold text-decoration-none">Explorar Catálogo &rarr;</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                Marketplace Web <FontAwesomeIcon icon={faArrowRight} />
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
            <div className="col-lg-4 col-md-6 mb-4 mb-lg-0">
              <Link className="text-decoration-none" to="/">
                <h3 className="m-0 text-white fw-extrabold mb-3" style={{ letterSpacing: '-1px' }}>
                  nhiquela<span className="text-primary-custom">.</span>
                </h3>
              </Link>
              <p className="small text-slate-400 mb-4" style={{ color: '#94A3B8', lineHeight: '1.7', maxWidth: '320px' }}>
                Ecossistema tecnológico que conecta clientes, fornecedores e frotas de logística corporativa de carga pesada em todo o país.
              </p>
            </div>

            {/* Coluna 2: Plataforma & Serviços */}
            <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
              <h6 className="text-white fw-bold text-uppercase mb-3" style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>
                Plataforma Web
              </h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li><Link to="/shop" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Marketplace</Link></li>
                <li><Link to="/shop" className="text-slate-400 text-decoration-none hover-text-white" style={{ color: '#94A3B8' }}>Cargas Pesados & Freightliners</Link></li>
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

            {/* Coluna 4: Suporte & Contacto */}
            <div className="col-lg-2 col-md-6">
              <h6 className="text-white fw-bold text-uppercase mb-3" style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>
                Suporte
              </h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li><a href="mailto:suporte@nhiquela.co.mz" className="text-slate-400 text-decoration-none" style={{ color: '#94A3B8' }}>Central de Ajuda</a></li>
                <li><span className="text-slate-400" style={{ color: '#94A3B8' }}>Maputo, Moçambique</span></li>
                <li><span className="text-slate-400" style={{ color: '#94A3B8' }}>Termos de Serviço</span></li>
                <li><span className="text-slate-400" style={{ color: '#94A3B8' }}>Política de Privacidade</span></li>
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
    </div>
  );
}
