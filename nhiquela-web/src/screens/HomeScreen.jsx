import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBolt, faShieldAlt, faHeadset, faMapMarkerAlt, faStar, faClock, faArrowRight, faShoppingBag, faWrench, faTruck, faCarSide, faBroom, faHome, faHamburger, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../api';

export default function HomeScreen() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Socket.IO connection (root namespace)
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socket.on('newProduct', (newProduct) => {
      setFeaturedProducts((prev) => [newProduct, ...prev.slice(0, 19)]);
    });

    const loadData = async () => {
      try {
        const catRes = await api.get('/categories');
        const cats = catRes.data || [];
        setCategories(cats.map(c => ({
          name: c.name,
          shops: `${c.productCount || c.count || 0} lojas`,
          icon: c.icon || '📦', // default
          _id: c._id
        })));

        const prodRes = await api.get('/products');
        setFeaturedProducts(prodRes.data || []);
      } catch (error) {
        console.warn('Backend sem produtos, carregando fallback mockado');
        // Fallback local se o backend não tiver dados
        setFeaturedProducts([
          { _id: '1', name: 'Cabaz de Vegetais Frescos', price: '850', vendor: 'Bio Mercado', rating: 4.9, dist: '2.4 km', time: '15-25 min', images: [{url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'}], stock: 10, tag: 'POPULAR' },
          { _id: '2', name: 'Hambúrguer Gourmet Duplo', price: '620', vendor: 'BlackPlate', rating: 4.7, dist: '1.1 km', time: '20-35 min', images: [{url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'}], stock: 15, tag: 'TOP VENDA' },
        ]);
        setCategories([
          { name: 'Supermercado', shops: '142 lojas', icon: '🥦', _id: 'c1' },
          { name: 'Restaurantes', shops: '89 aberto', icon: '🍔', _id: 'c2' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => socket.disconnect();
  }, []);

  return (
    <div className="pb-5 container">
      {/* Secção Hero */}
      <section className="py-5 my-md-5">
        <div className="row">
          <div className="col-lg-8 col-xl-7">
            <h1 className="fw-black mb-4 text-black" style={{ fontSize: '4.5rem', lineHeight: '1.1', letterSpacing: '-2px' }}>
              Tudo o que precisa, entregue à <i className="text-primary-custom" style={{ fontFamily: 'serif' }}>distância</i> de um clique.
            </h1>
            <p className="lead text-muted mb-5 pe-lg-5" style={{ fontSize: '1.25rem' }}>
              Compre produtos, solicite serviços, encontre motoristas e receba tudo de forma rápida, segura e conveniente.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white p-2 rounded-pill-custom shadow-sm-custom border d-flex align-items-center mb-4">
              <FontAwesomeIcon icon={faSearch} className="text-muted ms-3 me-2" />
              <input 
                type="text" 
                className="form-control border-0 shadow-none bg-transparent" 
                placeholder="Pesquisar produtos, serviços ou motoristas..." 
              />
              <button className="btn bg-primary-custom text-white rounded-pill-custom px-4 py-2 fw-bold">
                Pesquisar
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="d-flex flex-wrap gap-3 mb-5">
              <Link to="/shop" className="btn bg-black text-white rounded-pill-custom px-4 py-2 fw-bold d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faShoppingBag} /> Comprar Agora
              </Link>
              <button className="btn bg-cream text-dark border-0 rounded-pill-custom px-4 py-2 fw-bold d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faWrench} /> Solicitar Serviço
              </button>
              <Link to="/signup" className="btn btn-outline-secondary rounded-pill-custom px-4 py-2 fw-bold text-dark border d-flex align-items-center gap-2">
                Tornar-se Fornecedor <FontAwesomeIcon icon={faArrowRight} className="small" />
              </Link>
            </div>
            
            {/* Features Ticker */}
            <div className="d-flex flex-wrap gap-4 text-muted small fw-bold mt-5">
              <span className="d-flex align-items-center gap-2"><FontAwesomeIcon icon={faBolt} className="text-dark" /> Entrega &lt; 30 min</span>
              <span className="d-flex align-items-center gap-2"><FontAwesomeIcon icon={faShieldAlt} className="text-dark" /> Pagamento seguro</span>
              <span className="d-flex align-items-center gap-2"><FontAwesomeIcon icon={faHeadset} className="text-dark" /> Suporte 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Secção Categorias */}
      <section className="py-5 my-5">
        <span className="small-caps text-primary-custom">Categorias</span>
        <div className="d-flex justify-content-between align-items-end mb-4">
          <h2 className="fw-black text-black m-0" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Tudo numa só plataforma.</h2>
          <a href="#" className="text-dark fw-bold text-decoration-none">Ver todas <FontAwesomeIcon icon={faArrowRight} className="small ms-1" /></a>
        </div>
        
        <div className="row g-3">
          {loading ? (
            <div className="col-12 text-center py-5">
              <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
            </div>
          ) : categories.map((cat, idx) => (
            <div className="col-6 col-md-3 col-xl-2" key={cat._id || idx}>
              <div className="bg-white border rounded-4 p-4 h-100 hover-shadow transition-all cursor-pointer">
                <div className="fs-1 mb-3">{cat.icon}</div>
                <h6 className="fw-bold text-black m-0">{cat.name}</h6>
                <small className="text-muted">{cat.shops}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Secção Produtos em Destaque */}
      <section className="py-5 my-5">
        <span className="small-caps text-primary-custom">Em Destaque</span>
        <div className="d-flex justify-content-between align-items-end mb-4">
          <h2 className="fw-black text-black m-0" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Produtos do dia.</h2>
          <Link to="/products" className="text-dark fw-bold text-decoration-none">Explorar <FontAwesomeIcon icon={faArrowRight} className="small ms-1" /></Link>
        </div>
        
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center py-5">
              <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
            </div>
          ) : featuredProducts.map(product => (
              <div className="col-12 col-md-6 col-lg-3" key={product._id}>
                <Link to={`/shop/product/${product._id}`} className="text-decoration-none text-dark">
                  <div className="bg-white border rounded-4 p-3 h-100 hover-shadow transition-all d-flex flex-column">
                    <div className="position-relative mb-3">
                      {product.stock < 5 && (
                        <span className="badge bg-danger position-absolute" style={{ top: '10px', left: '10px', zIndex: 1, letterSpacing: '1px', fontSize: '0.65rem' }}>
                          POUCO STOCK
                        </span>
                      )}
                      <img 
                        src={product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/500?text=Sem+Imagem'} 
                        alt={product.name} 
                        className="img-fluid rounded-3 w-100" 
                        style={{ height: '200px', objectFit: 'cover' }} 
                      />
                    </div>
                    
                    <small className="text-muted">{product.vendor || 'Nhiquela Partner'}</small>
                    <h5 className="fw-bold text-black mb-auto mt-1">{product.name}</h5>
                    
                    <div className="d-flex justify-content-between align-items-center my-3">
                      <span className="fw-black text-black fs-5">{product.price} MZN</span>
                    </div>
                    
                    <div className="d-flex align-items-center gap-3 text-muted small fw-bold mb-3">
                      <span className="text-primary-custom"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.5'}</span>
                      <span><FontAwesomeIcon icon={faMapMarkerAlt} className="text-light" /> Maputo</span>
                    </div>
                    
                    <button className="btn bg-black text-white w-100 fw-bold py-2 rounded-3 mt-auto">
                      <FontAwesomeIcon icon={faShoppingBag} className="me-2" /> Comprar
                    </button>
                  </div>
                </Link>
              </div>
            ))
          }
        </div>
      </section>

      {/* Secção Como Funciona */}
      <section className="bg-black text-white rounded-4 p-5 my-5 mx-n3 mx-md-0 shadow-lg position-relative overflow-hidden">
        <div className="text-center mb-5 position-relative z-1">
          <span className="small-caps text-primary-custom">Como Funciona</span>
          <h2 className="fw-black mt-2" style={{ fontSize: '3rem', letterSpacing: '-1px' }}>Simples como deve ser.</h2>
        </div>
        
        <div className="row g-5 position-relative z-1 pt-4">
          <div className="col-12 col-md-3">
            <h1 className="text-primary-custom fw-black mb-3" style={{ fontSize: '4rem', lineHeight: '1' }}>01</h1>
            <h4 className="fw-bold mb-3">Escolha</h4>
            <p className="text-white-50">Selecione um produto ou serviço entre milhares de opções.</p>
          </div>
          <div className="col-12 col-md-3">
            <h1 className="text-primary-custom fw-black mb-3" style={{ fontSize: '4rem', lineHeight: '1' }}>02</h1>
            <h4 className="fw-bold mb-3">Confirme</h4>
            <p className="text-white-50">Pagamento seguro e confirmação instantânea.</p>
          </div>
          <div className="col-12 col-md-3">
            <h1 className="text-primary-custom fw-black mb-3" style={{ fontSize: '4rem', lineHeight: '1' }}>03</h1>
            <h4 className="fw-bold mb-3">Acompanhe</h4>
            <p className="text-white-50">Siga em tempo real no mapa interativo.</p>
          </div>
          <div className="col-12 col-md-3">
            <h1 className="text-primary-custom fw-black mb-3" style={{ fontSize: '4rem', lineHeight: '1' }}>04</h1>
            <h4 className="fw-bold mb-3">Receba</h4>
            <p className="text-white-50">Entregue no local que indicar, sem complicação.</p>
          </div>
        </div>
      </section>

      {/* Secção Para Fornecedores e Motoristas */}
      <section className="row g-4 my-5">
        <div className="col-md-6">
          <div className="bg-cream rounded-4 p-5 h-100 d-flex flex-column">
            <span className="small-caps text-primary-custom mb-3">Para Fornecedores</span>
            <h2 className="fw-black text-black mb-4 pe-lg-5" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Venda mais sem abrir novas lojas.</h2>
            
            <ul className="list-unstyled mb-5 d-flex flex-column gap-3">
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Maior visibilidade digital</li>
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Mais clientes todos os dias</li>
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Gestão simplificada</li>
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Relatórios avançados de vendas</li>
            </ul>
            
            <div className="mt-auto">
              <Link to="/signup" className="btn bg-black text-white rounded-pill-custom px-4 py-3 fw-bold">
                Tornar-me Fornecedor <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="bg-black text-white rounded-4 p-5 h-100 d-flex flex-column">
            <span className="small-caps text-primary-custom mb-3">Para Motoristas</span>
            <h2 className="fw-black mb-4 pe-lg-5" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Ganhe dinheiro com a sua viatura.</h2>
            
            <ul className="list-unstyled mb-5 d-flex flex-column gap-3 text-white-50">
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Horários 100% flexíveis</li>
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Pagamentos rápidos e seguros</li>
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Mais oportunidades por semana</li>
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Suporte dedicado ao motorista</li>
            </ul>
            
            <div className="mt-auto">
              <Link to="/signup-driver" className="btn bg-primary-custom text-white rounded-pill-custom px-4 py-3 fw-bold">
                Registar Motorista <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Secção CTA (Call to Action) */}
      <section className="bg-primary-custom text-white rounded-4 p-5 my-5 text-center shadow-sm">
        <div className="py-5 px-md-5">
          <h1 className="fw-black mb-4" style={{ fontSize: '3.5rem', letterSpacing: '-1px' }}>
            Pronto para experimentar a Nhiquela?
          </h1>
          <p className="lead text-white-50 mb-5 mx-auto" style={{ maxWidth: '600px' }}>
            A sua próxima entrega, o seu próximo serviço, o seu próximo cliente — tudo a começar agora.
          </p>
          
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
            <Link to="/signup" className="btn bg-white text-dark rounded-pill-custom px-5 py-3 fw-bold shadow-sm">
              Criar conta grátis
            </Link>
            <button className="btn btn-outline-light rounded-pill-custom px-5 py-3 fw-bold border-2">
              Falar com vendas
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
