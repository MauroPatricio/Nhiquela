import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMotorcycle, faStore, faShoppingBag, faMobileAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';
import api from '../api';

export default function LandingPage() {
  const [stats, setStats] = useState({
    provinces: 11,
    cities: 38,
    activePartners: 142
  });

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
        // Se a API falhar (ou ainda não existir no backend), mantém os valores de fallback silenciosamente
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-light min-vh-100">
      {/* Navbar Institucional */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3">
        <div className="container">
          <Link className="text-decoration-none" to="/">
            <h3 className="m-0 text-black fw-extrabold" style={{ letterSpacing: '-1px' }}>nhiquela<span className="text-primary-custom">.</span></h3>
          </Link>
          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-outline-primary rounded-pill px-4">Entrar</Link>
            <Link to="/signup" className="btn bg-primary-custom text-white rounded-pill px-4">Ser Parceiro</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container py-5 my-5">
        <div className="row align-items-center">
          <div className="col-lg-6 mb-5 mb-lg-0">
            <h1 className="display-4 fw-bold text-dark mb-4">
              Tudo em suas mãos, entregue em <span className="text-primary-custom">minutos.</span>
            </h1>
            <p className="lead text-muted mb-4">
              Nhiquela é o maior marketplace multi-serviços de Moçambique. Peça comida, faça compras ou contrate profissionais num só lugar.
            </p>
            <div className="d-flex gap-3">
              <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 py-3 fw-bold fs-5 shadow-sm">
                Acessar Marketplace Web <FontAwesomeIcon icon={faShoppingBag} className="ms-2" />
              </Link>
            </div>
            <div className="mt-4 text-muted small">
              <FontAwesomeIcon icon={faMobileAlt} className="me-2" /> 
              Baixe também o nosso App na PlayStore
            </div>
          </div>
          <div className="col-lg-6 text-center d-flex justify-content-center align-items-center">
            {/* Imagem Placeholder Hero */}
            <img src="/nhiquela-app-mockup.png" alt="Mockup do App Nhiquela" className="img-fluid" style={{ maxHeight: '500px', objectFit: 'contain', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' }} />
          </div>
        </div>
      </div>

      {/* Serviços / Features */}
      <div className="bg-white py-5">
        <div className="container py-5">
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
                  <Link to="/signup" className="text-primary-custom fw-bold text-decoration-none">Criar Loja Grátis &rarr;</Link>
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
                  <a href="#" className="text-success fw-bold text-decoration-none">Seja um Motorista &rarr;</a>
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
      
      {/* Secção de Testemunhos */}
      <div className="bg-light py-5">
        <div className="container py-5">
          <div className="d-flex justify-content-between align-items-end mb-5">
            <div>
              <span className="text-uppercase fw-bold small" style={{ color: '#ea4e1b', letterSpacing: '2px' }}>Testemunhos</span>
              <h2 className="display-5 fw-bold text-dark mt-2 m-0" style={{ letterSpacing: '-1px' }}>
                A voz de quem nos usa.
              </h2>
            </div>
            <div className="d-none d-md-flex gap-2 pb-2">
              <span className="rounded-pill" style={{ width: '30px', height: '10px', backgroundColor: '#4E342E' }}></span>
              <span className="rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: '#e5e3df' }}></span>
              <span className="rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: '#e5e3df' }}></span>
            </div>
          </div>
          
          <div className="row g-4">
            {/* Cartão 1 */}
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-4" style={{ border: '1px solid rgba(234, 78, 27, 0.3) !important' }}>
                <div className="card-body p-0 d-flex flex-column">
                  <div className="mb-4" style={{ color: '#ea4e1b' }}>
                    {[...Array(5)].map((_, i) => <FontAwesomeIcon key={i} icon={faStar} className="me-1" />)}
                  </div>
                  <p className="text-dark fs-6 mb-5 flex-grow-1" style={{ lineHeight: '1.6' }}>
                    "Fiquei sem gás a meio de um jantar importante. Em menos de 20 minutos, um motorista da Nhiquela entregou uma botija nova na minha porta. Foi super rápido e salvou-me a noite!"
                  </p>
                  <div className="d-flex align-items-center">
                    <img src="https://randomuser.me/api/portraits/women/46.jpg" alt="Aida Macuácua" className="rounded-circle me-3" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                    <div>
                      <h6 className="fw-bold m-0 text-dark">Aida Macuácua</h6>
                      <small className="text-muted">Cliente em Maputo</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cartão 2 */}
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-4">
                <div className="card-body p-0 d-flex flex-column">
                  <div className="mb-4" style={{ color: '#ea4e1b' }}>
                    {[...Array(5)].map((_, i) => <FontAwesomeIcon key={i} icon={faStar} className="me-1" />)}
                  </div>
                  <p className="text-dark fs-6 mb-5 flex-grow-1" style={{ lineHeight: '1.6' }}>
                    "Com o meu serviço de reboque na Nhiquela, o trabalho nunca para. O aplicativo encaminha clientes que precisam de ajuda urgente e os pagamentos caem na hora."
                  </p>
                  <div className="d-flex align-items-center">
                    <img src="https://randomuser.me/api/portraits/men/33.jpg" alt="Carlos Mondlane" className="rounded-circle me-3" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                    <div>
                      <h6 className="fw-bold m-0 text-dark">Carlos Mondlane</h6>
                      <small className="text-muted">Motorista</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cartão 3 */}
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-4">
                <div className="card-body p-0 d-flex flex-column">
                  <div className="mb-4" style={{ color: '#ea4e1b' }}>
                    {[...Array(5)].map((_, i) => <FontAwesomeIcon key={i} icon={faStar} className="me-1" />)}
                  </div>
                  <p className="text-dark fs-6 mb-5 flex-grow-1" style={{ lineHeight: '1.6' }}>
                    "A nossa empresa de mudanças cresceu imenso. Os clientes agora encontram e solicitam os nossos serviços com um clique, e o nosso volume de negócios duplicou."
                  </p>
                  <div className="d-flex align-items-center">
                    <img src="https://randomuser.me/api/portraits/women/27.jpg" alt="Lúcia Tembe" className="rounded-circle me-3" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                    <div>
                      <h6 className="fw-bold m-0 text-dark">Lúcia Tembe</h6>
                      <small className="text-muted">Fornecedora</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Secção de Cobertura */}
      <div className="bg-white pb-5">
        <div className="container py-5">
          <div className="row align-items-center">
            <div className="col-lg-5 mb-5 mb-lg-0 pe-lg-5">
              <span className="text-uppercase fw-bold small" style={{ color: '#ea4e1b', letterSpacing: '2px' }}>Cobertura</span>
              <h2 className="display-5 fw-bold text-dark mt-2 mb-4" style={{ letterSpacing: '-1px' }}>
                Onde estiver, nós chegamos.
              </h2>
              <p className="lead text-muted mb-5 fs-5">
                Veja em tempo real os fornecedores, serviços e motoristas próximos de si.
              </p>
              
              <div className="d-flex gap-3">
                <div className="bg-cream rounded-4 p-4 text-center flex-fill border border-light shadow-sm" style={{ backgroundColor: '#FAF9F6' }}>
                  <h3 className="fw-extrabold text-dark m-0">{stats.provinces}</h3>
                  <small className="text-muted">Províncias</small>
                </div>
                <div className="bg-cream rounded-4 p-4 text-center flex-fill border border-light shadow-sm" style={{ backgroundColor: '#FAF9F6' }}>
                  <h3 className="fw-extrabold text-dark m-0">{stats.cities}</h3>
                  <small className="text-muted">Cidades</small>
                </div>
                <div className="bg-cream rounded-4 p-4 text-center flex-fill border border-light shadow-sm" style={{ backgroundColor: '#FAF9F6' }}>
                  <h3 className="fw-extrabold text-dark m-0">24/7</h3>
                  <small className="text-muted">Operação</small>
                </div>
              </div>
            </div>
            
            <div className="col-lg-7">
              <div className="position-relative rounded-4 overflow-hidden shadow-sm-custom" style={{ height: '400px', backgroundColor: '#e5e3df' }}>
                {/* Fallback de Imagem/Mapa estático para representar OpenStreetMap */}
                <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight="0" 
                  marginWidth="0" 
                  src="https://www.openstreetmap.org/export/embed.html?bbox=32.388839721679695%2C-26.04655452292723%2C32.74452209472657%2C-25.801642878496464&amp;layer=mapnik" 
                  style={{ border: 0, filter: 'contrast(0.9) opacity(0.8)' }}>
                </iframe>
                
                {/* Pill Flutuante de parceiros ativos */}
                <div className="position-absolute top-0 start-0 m-4 bg-white rounded-pill shadow-sm px-3 py-2 d-flex align-items-center gap-2">
                  <span className="rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: '#ea4e1b' }}></span>
                  <span className="fw-bold small text-dark">{stats.activePartners} parceiros activos perto de si</span>
                </div>
                
                <div className="position-absolute bottom-0 end-0 bg-white bg-opacity-75 px-2 py-1 small text-muted" style={{ fontSize: '10px' }}>
                  Report a problem | © OpenStreetMap contributors
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="text-white py-4 text-center" style={{ backgroundColor: '#1E0F0A' }}>
        <div className="container">
          <p className="m-0 mb-2">&copy; {new Date().getFullYear()} Nhiquela. Todos os direitos reservados.</p>
          <div className="d-flex justify-content-center gap-3 small">
            <Link to="/terms" className="text-white text-decoration-none opacity-75 custom-hover-opacity">Termos e Condições</Link>
            <span className="text-white opacity-50">|</span>
            <Link to="/privacy-policy" className="text-white text-decoration-none opacity-75 custom-hover-opacity">Políticas de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
