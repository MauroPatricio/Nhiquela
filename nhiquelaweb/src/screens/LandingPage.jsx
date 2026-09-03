import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMotorcycle, faStore, faShoppingBag, faMobileAlt, faStar, faCheckCircle, faMapMarkerAlt, faWallet, faListCheck, faMap } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';
import api from '../api';

export default function LandingPage() {
  const [stats, setStats] = useState({
    provinces: 11,
    cities: 38,
    activePartners: 142
  });

  const [activeTab, setActiveTab] = useState('client');

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
      title: 'App Motorista (nhiqueladriver) — Viagens & Entregas',
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

      {/* Hero Section com Imagem do Cliente */}
      <div className="container py-5 my-3">
        <div className="row align-items-center">
          <div className="col-lg-6 mb-5 mb-lg-0">
            <span className="badge bg-purple-light text-primary-custom px-3 py-2 rounded-pill fw-bold mb-3" style={{ backgroundColor: '#F3E8FF' }}>
Conectamos quem precisa mover, a quem sabe entregar.
            </span>
            <h1 className="display-4 fw-bold text-dark mb-4" style={{ letterSpacing: '-1.5px', lineHeight: '1.1' }}>
              Tudo em suas mãos, entregue em <span className="text-primary-custom">minutos.</span>
            </h1>
            <p className="lead text-muted mb-4 fs-5" style={{ lineHeight: '1.6' }}>
              Nhiquela é a plataforma integrada que conecta Clientes, Fornecedores e Motoristas num único ecossistema inteligente de marketplace e entregas.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 py-3 fw-bold fs-5 shadow-sm">
                Acessar Marketplace Web <FontAwesomeIcon icon={faShoppingBag} className="ms-2" />
              </Link>
            </div>
            <div className="mt-4 text-muted small d-flex align-items-center gap-3">
              <span><FontAwesomeIcon icon={faMobileAlt} className="me-1 text-primary-custom" /> Android & iOS</span>
              <span>•</span>
              <span><FontAwesomeIcon icon={faCheckCircle} className="me-1 text-success" /> Pagamentos via M-Pesa & e-Mola</span>
            </div>
          </div>
          <div className="col-lg-6 text-center d-flex justify-content-center align-items-center">
            {/* Imagem Ilustrativa Principal (App Cliente) */}
            <div className="position-relative p-2 bg-white rounded-5 shadow-lg border" style={{ maxWidth: '340px' }}>
              <img 
                src="/images/mockups/client_app_services_mockup.png" 
                alt="App Cliente Nhiquela — Catálogo de Serviços" 
                className="img-fluid rounded-4" 
                style={{ maxHeight: '520px', objectFit: 'cover' }} 
              />
              <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 bg-dark text-white px-4 py-2 rounded-pill shadow fs-6 fw-bold border border-secondary" style={{ width: '85%' }}>
                📱 App Cliente Nhiquela
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ECOSSISTEMA MOCKUP SHOWCASE SECTION */}
      <div className="bg-white py-5 border-top border-bottom">
        <div className="container py-4">
          <div className="text-center mb-5">
            <span className="text-uppercase fw-bold small text-primary-custom" style={{ letterSpacing: '2px' }}>Ecossistema integrado</span>
            <h2 className="display-5 fw-bold text-dark mt-2" style={{ letterSpacing: '-1px' }}>
              Uma plataforma que conecta três aplicações em perfeita sintonia.
            </h2>
            <p className="lead text-muted mx-auto" style={{ maxWidth: '650px' }}>
              Explore como o Cliente navega e pede serviços, o Fornecedor faz a gestão e o Motorista realiza a entrega em tempo real.
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
                    Testar no Marketplace Web
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
          <h2 className="text-center fw-bold mb-5">Junte-se à revolução Nhiquela</h2>
          
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

      {/* Secção CTA (Call to Action) */}
      <section className="bg-primary-custom text-white rounded-4 p-5 my-5 text-center shadow-sm container">
        <div className="py-4 px-md-5">
          <h1 className="fw-black mb-4" style={{ fontSize: '3.2rem', letterSpacing: '-1px' }}>
            Pronto para experimentar a Nhiquela?
          </h1>
          <p className="lead text-white-50 mb-5 mx-auto" style={{ maxWidth: '600px' }}>
            A sua próxima entrega, o seu próximo serviço, o seu próximo cliente — tudo a começar agora.
          </p>
          
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
            <Link to="/shop" className="btn bg-white text-dark rounded-pill-custom px-5 py-3 fw-bold shadow-sm fs-5">
              Fazer Compras no Web Marketplace
            </Link>
            <Link to="/signup?type=seller" className="btn btn-outline-light rounded-pill-custom px-5 py-3 fw-bold border-2 fs-5">
              Criar Loja Fornecedor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
