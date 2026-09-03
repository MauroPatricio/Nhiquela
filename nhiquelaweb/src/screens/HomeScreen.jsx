import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faBolt, faShieldAlt, faHeadset, faMapMarkerAlt, faStar, faArrowRight,
  faShoppingBag, faWrench, faSpinner, faStore, faMotorcycle, faPlus, faCheckCircle,
  faTag, faFilter, faClock, faRedo, faHeart, faFire, faThumbsUp
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { selectUser } from '../store/features/userSlice';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../api';

const DEFAULT_PRODUCT_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23F3F4F6"/><path d="M150 110 L190 170 L110 170 Z" fill="%239CA3AF"/><circle cx="125" cy="125" r="12" fill="%239CA3AF"/><text x="150" y="210" font-family="sans-serif" font-size="14" font-weight="bold" fill="%236B7280" text-anchor="middle">Nhiquela Marketplace</text></svg>`;

const getProductImageUrl = (product) => {
  if (!product) return DEFAULT_PRODUCT_IMAGE;
  if (typeof product.image === 'string' && product.image.trim()) return product.image;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0];
    if (typeof firstImg === 'string' && firstImg.trim()) return firstImg;
    if (typeof firstImg === 'object' && firstImg !== null && firstImg.url) return firstImg.url;
  }
  return DEFAULT_PRODUCT_IMAGE;
};

export const getStoreLogoUrl = (seller) => {
  if (!seller) return null;
  const rawPath = seller.logo || seller.seller?.logo || seller.profileImage || seller.seller?.image || seller.image;
  if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) return null;
  const cleanPath = rawPath.trim();
  if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) return cleanPath;
  const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${SOCKET_URL}${formattedPath}`;
};

export default function HomeScreen() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [previousOrders, setPreviousOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userInfo = useSelector(selectUser);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
    });

    socket.on('newProduct', (newProduct) => {
      setFeaturedProducts((prev) => [newProduct, ...prev.slice(0, 19)]);
    });

    const loadData = async () => {
      try {
        setLoading(true);

        const [catRes, prodRes, sellersRes] = await Promise.all([
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/products').catch(() => ({ data: [] })),
          api.get('/providers').catch(() => api.get('/users/sellers')).catch(() => ({ data: [] }))
        ]);

        const catData = catRes.data;
        const cats = Array.isArray(catData) ? catData : (catData?.categories || []);
        setCategories(cats.map(c => ({
          name: c.name || c.nome || 'Categoria',
          count: c.productCount || c.count || 0,
          icon: c.icon || '📦',
          _id: c._id
        })));

        const prodData = prodRes.data;
        const prodArray = Array.isArray(prodData) ? prodData : (prodData?.products || []);
        setFeaturedProducts(prodArray);

        const sellerData = sellersRes.data;
        const sellerArray = Array.isArray(sellerData) ? sellerData : (sellerData?.providers || sellerData?.sellers || []);
        setSellers(sellerArray);

        // Se o utilizador estiver autenticado, carregar pedidos anteriores para a funcionalidade "Comprar novamente"
        if (userInfo && userInfo.token) {
          try {
            const ordersRes = await api.get('/orders/mine', {
              headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setPreviousOrders(ordersRes.data || []);
          } catch {
            /* ignorar silenciosamente */
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do ecossistema:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => socket.disconnect();
  }, [userInfo]);

  const filteredProducts = useMemo(() => {
    return featuredProducts.filter(product => {
      const matchesCategory = selectedCategory === 'ALL' || 
        (product.category?._id || product.category) === selectedCategory ||
        product.category?.name === selectedCategory;

      const matchesSearch = !searchQuery.trim() || 
        (product.name || product.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.seller?.name || product.vendor || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [featuredProducts, selectedCategory, searchQuery]);

  const dailyDeals = useMemo(() => {
    return featuredProducts.filter(p => p.onSale || p.discount > 0).slice(0, 8);
  }, [featuredProducts]);

  const bestSellers = useMemo(() => {
    return [...featuredProducts].sort((a, b) => (b.numReviews || 0) - (a.numReviews || 0)).slice(0, 8);
  }, [featuredProducts]);

  const handleAddToCart = (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const sellerObj = typeof product.seller === 'object' && product.seller !== null
      ? product.seller
      : { _id: product.seller || 'seller_default', name: product.vendor || 'Nhiquela Partner' };

    const formattedItem = {
      _id: product._id,
      name: product.nome || product.name,
      price: Number(product.price || 0),
      image: product.image || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150?text=Sem+Imagem'),
      seller: sellerObj,
      onSale: Boolean(product.onSale),
      discount: Number(product.discount || 0),
      priceFromSeller: Number(product.priceFromSeller || product.price || 0),
    };

    dispatch(addToBasket(formattedItem));
    toast.success(`"${formattedItem.name}" adicionado ao carrinho!`, {
      position: "top-right",
      autoClose: 2000,
    });
  };

  const handleBuyNow = (product, e) => {
    handleAddToCart(product, e);
    navigate('/shop/cart');
  };

  const handleReorderAll = (order) => {
    if (!order.orderItems || !order.orderItems.length) return;
    order.orderItems.forEach(item => {
      dispatch(addToBasket({
        _id: item.product || item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        seller: item.seller || { name: 'Fornecedor' }
      }));
    });
    toast.success('Itens do pedido adicionados ao carrinho!');
    navigate('/shop/cart');
  };

  return (
    <div className="pb-5 container">
      
      {/* SECÇÃO HERO & PESQUISA INTELIGENTE */}
      <section className="py-4 my-md-3">
        <div className="row align-items-center">
          <div className="col-lg-8 col-xl-7">
            <span className="badge bg-primary-custom text-white px-3 py-2 rounded-pill fw-bold mb-3 d-inline-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faBolt} /> O Maior Marketplace Multi-Loja de Moçambique
            </span>
            <h1 className="fw-black mb-3 text-black" style={{ fontSize: '3.5rem', lineHeight: '1.1', letterSpacing: '-2px' }}>
              Tudo o que precisa, entregue à <i className="text-primary-custom" style={{ fontFamily: 'serif' }}>distância</i> de um clique.
            </h1>
            <p className="lead text-muted mb-4 pe-lg-5" style={{ fontSize: '1.15rem' }}>
              Compre produtos de dezenas de lojas parceiras, acompanhe entregas em tempo real e receba onde estiver.
            </p>
            
            {/* Barra de Pesquisa Avançada */}
            <div className="bg-white p-2 rounded-pill-custom shadow-sm border d-flex align-items-center mb-4">
              <FontAwesomeIcon icon={faSearch} className="text-muted ms-3 me-2" />
              <input 
                type="text" 
                className="form-control border-0 shadow-none bg-transparent fs-6" 
                placeholder="Pesquisar por produto (ex: Cîroc, Whisky, Coca-Cola)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                className="btn bg-primary-custom text-white rounded-pill-custom px-4 py-2 fw-bold"
                onClick={() => searchQuery.trim() && navigate(`/shop/search?q=${encodeURIComponent(searchQuery)}`)}
              >
                Pesquisar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 COMPRAR NOVAMENTE (Para Utilizadores Autenticados com Pedidos Anteriores) */}
      {previousOrders.length > 0 && (
        <section className="mb-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-gradient-primary text-white" style={{ background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <span className="badge bg-white text-dark rounded-pill px-3 py-1 fw-bold mb-1">
                  <FontAwesomeIcon icon={faRedo} className="me-1 text-primary-custom" /> Recorrência
                </span>
                <h4 className="fw-black m-0 text-white">Comprar Novamente</h4>
                <small className="text-white-50">Comprou estes produtos nos seus últimos pedidos</small>
              </div>
            </div>

            <div className="row g-3">
              {previousOrders.slice(0, 3).map((order) => (
                <div key={order._id} className="col-md-4">
                  <div className="bg-white text-dark rounded-3 p-3 h-100 d-flex flex-column shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold text-truncate small" style={{ maxWidth: '150px' }}>
                        Pedido #{String(order.code || order._id).slice(-6)}
                      </span>
                      <small className="text-muted">{new Date(order.createdAt).toLocaleDateString('pt-PT')}</small>
                    </div>
                    <div className="small text-muted mb-3 flex-grow-1">
                      {order.orderItems?.map(i => i.name).join(', ') || 'Produtos Variados'}
                    </div>
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <span className="fw-bold text-primary-custom">{Number(order.totalPrice || 0).toLocaleString('pt-PT')} MT</span>
                      <button 
                        className="btn btn-outline-primary btn-sm rounded-pill fw-bold"
                        onClick={() => handleReorderAll(order)}
                      >
                        <FontAwesomeIcon icon={faRedo} className="me-1" /> Reordenar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 🏷️ CATEGORIAS POPULARES */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-primary-custom" /> Categorias Populares
          </h4>
          <span className="text-muted small fw-bold">{categories.length} categorias</span>
        </div>

        <div className="d-flex flex-wrap gap-2 pb-2">
          <button
            className={`btn rounded-pill px-4 py-2 fw-bold text-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-black text-white shadow-sm'
                : 'bg-light text-dark border hover-bg-cream'
            }`}
            onClick={() => setSelectedCategory('ALL')}
          >
            Todas as Categorias
          </button>

          {categories.map((cat) => (
            <button
              key={cat._id}
              className={`btn rounded-pill px-4 py-2 fw-bold text-nowrap d-flex align-items-center gap-2 transition-all ${
                selectedCategory === cat._id || selectedCategory === cat.name
                  ? 'bg-primary-custom text-white shadow-sm'
                  : 'bg-white text-dark border hover-bg-light'
              }`}
              onClick={() => setSelectedCategory(cat._id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 🔥 OFERTAS DO DIA */}
      {dailyDeals.length > 0 && (
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <span className="badge bg-danger text-white rounded-pill px-3 py-1 fw-bold mb-1">
                <FontAwesomeIcon icon={faFire} className="me-1" /> Imperdível
              </span>
              <h3 className="fw-black text-black m-0">Ofertas do Dia</h3>
            </div>
          </div>

          <div className="row g-4">
            {dailyDeals.map((product) => (
              <div key={product._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card h-100 border-danger border-opacity-20 shadow-sm rounded-4 p-3 d-flex flex-column bg-white hover-lift">
                  <span className="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 m-3 rounded-2 fw-bold small z-1">
                    DESCONTO ESPECIAIS
                  </span>
                  <Link to={`/shop/product/${product.slug || product._id}`} className="text-decoration-none text-dark flex-grow-1">
                    <div className="position-relative mb-3 overflow-hidden rounded-3 bg-light" style={{ height: '180px' }}>
                      <img 
                        src={getProductImageUrl(product)} 
                        alt={product.nome || product.name} 
                        className="img-fluid rounded-3 w-100 h-100 object-fit-cover" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_PRODUCT_IMAGE;
                        }}
                      />
                    </div>
                    <div className="text-muted small mb-1"><FontAwesomeIcon icon={faStore} className="text-primary-custom me-1" /> {product.seller?.name || 'Fornecedor Parceiro'}</div>
                    <h6 className="fw-bold text-black mb-2 text-truncate">{product.nome || product.name}</h6>
                    <div className="d-flex align-items-baseline gap-2 mb-2">
                      <span className="fw-black text-danger fs-5">{product.price?.toLocaleString('pt-PT')} MT</span>
                    </div>
                  </Link>
                  <button className="btn bg-primary-custom text-white fw-bold rounded-3 py-2 small w-100 mt-auto" onClick={(e) => handleAddToCart(product, e)}>
                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 🏪 LOJAS EM DESTAQUE */}
      {sellers.length > 0 && (
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="fw-black text-black m-0">Lojas & Fornecedores em Destaque</h3>
              <span className="text-muted small">Parceiros verificados com entrega rápida em Maputo</span>
            </div>
          </div>

          <div className="row g-4">
            {sellers.slice(0, 4).map((seller) => {
              const storeLogoUrl = getStoreLogoUrl(seller);
              const storeProvince = seller.seller?.province || seller.province || seller.seller?.address || 'Maputo';

              return (
                <div key={seller._id} className="col-12 col-sm-6 col-md-3">
                  <div className="card h-100 border-0 shadow-sm rounded-4 p-3 bg-white text-center hover-lift">
                    <div className="d-flex justify-content-center mb-3">
                      {storeLogoUrl ? (
                        <img 
                          src={storeLogoUrl} 
                          alt={seller.name || seller.seller?.name || 'Loja'} 
                          className="rounded-circle border border-2 border-primary-custom object-fit-cover shadow-sm"
                          style={{ width: '70px', height: '70px' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="rounded-circle border border-2 border-primary-custom text-primary-custom align-items-center justify-content-center shadow-sm fw-bold fs-4"
                        style={{ width: '70px', height: '70px', backgroundColor: '#F3E8FF', display: storeLogoUrl ? 'none' : 'flex' }}
                      >
                        <FontAwesomeIcon icon={faStore} />
                      </div>
                    </div>
                    <h6 className="fw-bold text-dark mb-1 text-truncate">{seller.name || seller.seller?.name || 'Loja Parceira'}</h6>
                    <div className="d-flex align-items-center justify-content-center gap-2 text-muted small mb-3">
                      <span className="text-warning fw-bold"><FontAwesomeIcon icon={faStar} /> 4.8</span>
                      <span>•</span>
                      <span className="fw-bold text-dark"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-primary-custom" /> {storeProvince}</span>
                    </div>
                    <Link to={`/shop/seller/${seller._id}`} className="btn btn-outline-primary rounded-pill btn-sm fw-bold mt-auto">
                      Visitar Loja
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 🏆 PRODUTOS MAIS VENDIDOS & TODOS OS PRODUTOS */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-black text-black m-0">Catálogo de Produtos</h3>
            <span className="text-muted small">Produtos disponíveis para entrega rápida</span>
          </div>
          <Link to="/products" className="text-primary-custom text-decoration-none fw-bold small">
            Ver Todos ({filteredProducts.length}) <FontAwesomeIcon icon={faArrowRight} className="ms-1" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-3" />
            <div>A carregar produtos da base de dados...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
            <h5 className="fw-bold text-dark mb-2">Nenhum produto encontrado</h5>
            <p className="text-muted mb-0">Não foram encontrados produtos para os critérios de pesquisa selecionados.</p>
          </div>
        ) : (
          <div className="row g-4">
            {filteredProducts.map((product) => (
              <div key={product._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card h-100 border-0 shadow-sm-custom rounded-4 p-3 d-flex flex-column bg-white position-relative hover-lift">
                  <Link to={`/shop/product/${product.slug || product._id}`} className="text-decoration-none text-dark flex-grow-1">
                    <div className="position-relative mb-3 overflow-hidden rounded-3 bg-light" style={{ height: '180px' }}>
                      <img 
                        src={getProductImageUrl(product)} 
                        alt={product.nome || product.name} 
                        className="img-fluid rounded-3 w-100 h-100 object-fit-cover" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_PRODUCT_IMAGE;
                        }}
                      />
                    </div>
                    
                    <div className="text-muted small d-flex align-items-center gap-1 mb-1">
                      <FontAwesomeIcon icon={faStore} className="text-primary-custom" />
                      <span className="fw-bold text-truncate" style={{ maxWidth: '180px' }}>
                        {product.seller?.name || product.vendor || 'Fornecedor Nhiquela'}
                      </span>
                    </div>

                    <h6 className="fw-bold text-black mb-2 text-truncate">{product.nome || product.name}</h6>
                    
                    <div className="d-flex align-items-baseline gap-2 mb-2">
                      <span className="fw-black text-black fs-5">
                        {product.price?.toLocaleString('pt-PT')} MT
                      </span>
                    </div>
                    
                    <div className="d-flex align-items-center gap-3 text-muted small fw-bold mb-3">
                      <span className="text-warning"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.8'}</span>
                      <span><FontAwesomeIcon icon={faClock} className="me-1" /> 30-45 min</span>
                    </div>
                  </Link>

                  <div className="d-flex gap-2 mt-auto pt-2 border-top">
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
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
