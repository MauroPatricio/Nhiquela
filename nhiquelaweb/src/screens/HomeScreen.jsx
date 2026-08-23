import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBolt, faShieldAlt, faHeadset, faMapMarkerAlt, faStar, faArrowRight, faShoppingBag, faWrench, faSpinner, faStore, faMotorcycle, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../api';

export default function HomeScreen() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
        const prodData = prodRes.data;
        const prodArray = Array.isArray(prodData) ? prodData : (prodData?.products || []);
        setFeaturedProducts(prodArray);
      } catch (error) {
        console.warn('Falha ao carregar dados do backend', error);
        setFeaturedProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => socket.disconnect();
  }, []);

  const handleAddToCart = (product, e) => {
    e.preventDefault();
    e.stopPropagation();

    const sellerObj = typeof product.seller === 'object' && product.seller !== null
      ? product.seller
      : { _id: product.seller || 'seller_default', name: product.vendor || 'Nhiquela Partner' };

    const formattedItem = {
      _id: product._id,
      name: product.name,
      price: Number(product.price || 0),
      image: product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/150?text=Sem+Imagem',
      seller: sellerObj,
      onSale: Boolean(product.onSale),
      discount: Number(product.discount || 0),
      priceFromSeller: Number(product.priceFromSeller || product.price || 0),
      sellerEarningsAfterDiscount: Number(product.sellerEarningsAfterDiscount || product.price || 0)
    };

    dispatch(addToBasket(formattedItem));
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const handleBuyNow = (product, e) => {
    handleAddToCart(product, e);
    navigate('/shop/cart');
  };

  const filteredProducts = searchQuery.trim()
    ? featuredProducts.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : featuredProducts;

  return (
    <div className="pb-5 container">
      {/* Secção Hero */}
      <section className="py-5 my-md-4">
        <div className="row align-items-center">
          <div className="col-lg-8 col-xl-7">
            <h1 className="fw-black mb-4 text-black" style={{ fontSize: '4.2rem', lineHeight: '1.1', letterSpacing: '-2px' }}>
              Tudo o que precisa, entregue à <i className="text-primary-custom" style={{ fontFamily: 'serif' }}>distância</i> de um clique.
            </h1>
            <p className="lead text-muted mb-5 pe-lg-5" style={{ fontSize: '1.25rem' }}>
              Compre produtos, solicite serviços, encontre motoristas e receba tudo de forma rápida, segura e conveniente em Moçambique.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white p-2 rounded-pill-custom shadow-sm border d-flex align-items-center mb-4">
              <FontAwesomeIcon icon={faSearch} className="text-muted ms-3 me-2" />
              <input 
                type="text" 
                className="form-control border-0 shadow-none bg-transparent" 
                placeholder="Pesquisar produtos, serviços ou fornecedores..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn bg-primary-custom text-white rounded-pill-custom px-4 py-2 fw-bold">
                Pesquisar
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="d-flex flex-wrap gap-3 mb-5">
              <Link to="/products" className="btn bg-black text-white rounded-pill-custom px-4 py-2 fw-bold d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faShoppingBag} /> Explorar Produtos
              </Link>
              <Link to="/shop/document-order" className="btn bg-cream text-dark border-0 rounded-pill-custom px-4 py-2 fw-bold d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faWrench} /> Pedidos & Documentos
              </Link>
              <Link to="/signup" className="btn btn-outline-secondary rounded-pill-custom px-4 py-2 fw-bold text-dark border d-flex align-items-center gap-2">
                Tornar-se Fornecedor <FontAwesomeIcon icon={faArrowRight} className="small" />
              </Link>
            </div>
            
            {/* Features Ticker */}
            <div className="d-flex flex-wrap gap-4 text-muted small fw-bold mt-4">
              <span className="d-flex align-items-center gap-2"><FontAwesomeIcon icon={faBolt} className="text-primary-custom" /> Entrega &lt; 30 min</span>
              <span className="d-flex align-items-center gap-2"><FontAwesomeIcon icon={faShieldAlt} className="text-primary-custom" /> Pagamento seguro (M-Pesa / e-Mola)</span>
              <span className="d-flex align-items-center gap-2"><FontAwesomeIcon icon={faHeadset} className="text-primary-custom" /> Suporte 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Secção Categorias */}
      <section className="py-4 my-4">
        <span className="small-caps text-primary-custom">Categorias</span>
        <div className="d-flex justify-content-between align-items-end mb-4">
          <h2 className="fw-black text-black m-0" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Tudo numa só plataforma.</h2>
          <Link to="/products" className="text-dark fw-bold text-decoration-none">Ver todas <FontAwesomeIcon icon={faArrowRight} className="small ms-1" /></Link>
        </div>
        
        <div className="row g-3">
          {loading ? (
            <div className="col-12 text-center py-5">
              <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
            </div>
          ) : categories.map((cat, idx) => (
            <div className="col-6 col-md-3 col-xl-2" key={cat._id || idx}>
              <Link to="/products" className="text-decoration-none">
                <div className="bg-white border rounded-4 p-4 h-100 hover-shadow transition-all cursor-pointer text-center">
                  <div className="fs-1 mb-3">{cat.icon}</div>
                  <h6 className="fw-bold text-black m-0">{cat.name}</h6>
                  <small className="text-muted">{cat.shops}</small>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Secção Produtos em Destaque */}
      <section className="py-4 my-4">
        <span className="small-caps text-primary-custom">Em Destaque</span>
        <div className="d-flex justify-content-between align-items-end mb-4">
          <h2 className="fw-black text-black m-0" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Produtos disponíveis.</h2>
          <Link to="/products" className="text-dark fw-bold text-decoration-none">Explorar Catálogo <FontAwesomeIcon icon={faArrowRight} className="small ms-1" /></Link>
        </div>
        
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center py-5">
              <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-12 text-center py-5 bg-white rounded-4 border">
              <h5 className="text-muted">Nenhum produto encontrado.</h5>
            </div>
          ) : filteredProducts.slice(0, 8).map(product => (
              <div className="col-12 col-md-6 col-lg-3" key={product._id}>
                <div className="bg-white border rounded-4 p-3 h-100 hover-shadow transition-all d-flex flex-column">
                  <Link to={`/shop/product/${product._id}`} className="text-decoration-none text-dark">
                    <div className="position-relative mb-3">
                      {product.countInStock < 5 && (
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
                    
                    <small className="text-muted">{product.seller?.name || product.vendor || 'Nhiquela Partner'}</small>
                    <h5 className="fw-bold text-black mb-auto mt-1">{product.name}</h5>
                    
                    <div className="d-flex justify-content-between align-items-center my-3">
                      <span className="fw-black text-black fs-5">{product.price} MT</span>
                    </div>
                    
                    <div className="d-flex align-items-center gap-3 text-muted small fw-bold mb-3">
                      <span className="text-primary-custom"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.5'}</span>
                      <span><FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted" /> Maputo</span>
                    </div>
                  </Link>

                  <div className="d-flex gap-2 mt-auto">
                    <button 
                      className="btn btn-outline-dark flex-grow-1 fw-bold rounded-3 py-2 small"
                      onClick={(e) => handleAddToCart(product, e)}
                    >
                      <FontAwesomeIcon icon={faPlus} className="me-1" /> Carrinho
                    </button>
                    <button 
                      className="btn bg-primary-custom text-white flex-grow-1 fw-bold rounded-3 py-2 small"
                      onClick={(e) => handleBuyNow(product, e)}
                    >
                      <FontAwesomeIcon icon={faShoppingBag} className="me-1" /> Comprar
                    </button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </section>

      {/* Secção Como Funciona */}
      <section className="bg-black text-white rounded-4 p-5 my-5 shadow-lg position-relative overflow-hidden">
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
            <p className="text-white-50">Pagamento seguro via M-Pesa, e-Mola ou numerário.</p>
          </div>
          <div className="col-12 col-md-3">
            <h1 className="text-primary-custom fw-black mb-3" style={{ fontSize: '4rem', lineHeight: '1' }}>03</h1>
            <h4 className="fw-bold mb-3">Acompanhe</h4>
            <p className="text-white-50">Siga em tempo real no mapa interativo com GPS.</p>
          </div>
          <div className="col-12 col-md-3">
            <h1 className="text-primary-custom fw-black mb-3" style={{ fontSize: '4rem', lineHeight: '1' }}>04</h1>
            <h4 className="fw-bold mb-3">Receba</h4>
            <p className="text-white-50">Entrega rápida na sua porta ou levantamento no local.</p>
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
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Gestão simplificada no App nhiquelaseller</li>
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Carteira digital integrada para receita</li>
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
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> App exclusiva nhiqueladriver com GPS</li>
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Suporte dedicado ao motorista</li>
            </ul>
            
            <div className="mt-auto">
              <Link to="/signup" className="btn bg-primary-custom text-white rounded-pill-custom px-4 py-3 fw-bold">
                Registar Motorista <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
