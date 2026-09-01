import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faBolt, faShieldAlt, faHeadset, faMapMarkerAlt, faStar, faArrowRight,
  faShoppingBag, faWrench, faSpinner, faStore, faMotorcycle, faPlus, faCheckCircle,
  faTag, faFilter
} from '@fortawesome/free-solid-svg-icons';
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
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' ou ID da categoria

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // Conexão Socket.IO em tempo real
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
    });

    socket.on('newProduct', (newProduct) => {
      setFeaturedProducts((prev) => [newProduct, ...prev.slice(0, 19)]);
    });

    const loadData = async () => {
      try {
        setLoading(true);

        const [catRes, prodRes] = await Promise.all([
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/products').catch(() => ({ data: [] }))
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
      } catch (error) {
        console.error('Erro ao carregar dados do backend:', error);
        setFeaturedProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => socket.disconnect();
  }, []);

  // Filtragem Dinâmica por Categoria e Pesquisa (Idêntico ao Nhiquela Mobile)
  const filteredProducts = useMemo(() => {
    return featuredProducts.filter(product => {
      const matchesCategory = selectedCategory === 'ALL' || 
        (product.category?._id || product.category) === selectedCategory ||
        product.category?.name === selectedCategory;

      const matchesSearch = !searchQuery.trim() || 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.seller?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [featuredProducts, selectedCategory, searchQuery]);

  const handleAddToCart = (product, e) => {
    e.preventDefault();
    e.stopPropagation();

    const sellerObj = typeof product.seller === 'object' && product.seller !== null
      ? product.seller
      : { _id: product.seller || 'seller_default', name: product.vendor || 'Nhiquela Partner' };

    const formattedItem = {
      _id: product._id,
      name: product.nome || product.name,
      price: Number(product.price || 0),
      image: product.image || (product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/150?text=Sem+Imagem'),
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

  return (
    <div className="pb-5 container">
      {/* Secção Hero */}
      <section className="py-4 my-md-3">
        <div className="row align-items-center">
          <div className="col-lg-8 col-xl-7">
            <h1 className="fw-black mb-3 text-black" style={{ fontSize: '3.8rem', lineHeight: '1.1', letterSpacing: '-2px' }}>
              Tudo o que precisa, entregue à <i className="text-primary-custom" style={{ fontFamily: 'serif' }}>distância</i> de um clique.
            </h1>
            <p className="lead text-muted mb-4 pe-lg-5" style={{ fontSize: '1.2rem' }}>
              Compre produtos reais, solicite serviços e receba tudo de forma rápida e conveniente em Moçambique — à semelhança da App Nhiquela Mobile.
            </p>
            
            {/* Barra de Pesquisa */}
            <div className="bg-white p-2 rounded-pill-custom shadow-sm border d-flex align-items-center mb-4">
              <FontAwesomeIcon icon={faSearch} className="text-muted ms-3 me-2" />
              <input 
                type="text" 
                className="form-control border-0 shadow-none bg-transparent" 
                placeholder="Pesquisar por produto, marca ou fornecedor..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn bg-primary-custom text-white rounded-pill-custom px-4 py-2 fw-bold">
                Pesquisar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECÇÃO DE CATEGORIAS EM PÍLULAS (Estilo Nhiquela Mobile) */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark m-0">
            <FontAwesomeIcon icon={faFilter} className="me-2 text-primary-custom" /> Categorias do Mercado
          </h4>
          <span className="text-muted small fw-bold">{categories.length} categorias disponíveis</span>
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
              {cat.count > 0 && (
                <span className="badge rounded-circle bg-cream text-dark ms-1">
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* SECÇÃO DE PRODUTOS (Grid Estilo Nhiquela Mobile) */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-black text-black m-0">Produtos em Destaque</h3>
            <span className="text-muted small">Produtos reais vindos da base de dados do ecossistema Nhiquela</span>
          </div>
          <Link to="/products" className="text-primary-custom text-decoration-none fw-bold small">
            Ver Todos os Produtos ({filteredProducts.length}) <FontAwesomeIcon icon={faArrowRight} className="ms-1" />
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
                      {product.onSale && (
                        <span className="position-absolute top-0 start-0 bg-danger text-white small-caps px-2 py-1 m-2 rounded-2 fw-bold z-1">
                          PROMOÇÃO
                        </span>
                      )}
                      <img 
                        src={product.image || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/500?text=Sem+Imagem')} 
                        alt={product.nome || product.name} 
                        className="img-fluid rounded-3 w-100 h-100" 
                        style={{ objectFit: 'cover' }} 
                      />
                    </div>
                    
                    {/* Fornecedor / Loja (Badging Nhiquela Mobile) */}
                    <div className="text-muted small d-flex align-items-center gap-1 mb-1">
                      <FontAwesomeIcon icon={faStore} className="text-primary-custom" />
                      <span className="fw-bold text-truncate" style={{ maxWidth: '180px' }}>
                        {product.seller?.name || product.vendor || 'Fornecedor Nhiquela'}
                      </span>
                    </div>

                    <h6 className="fw-bold text-black mb-2 text-truncate">{product.nome || product.name}</h6>
                    
                    {/* Preço em Meticais */}
                    <div className="d-flex align-items-baseline gap-2 mb-2">
                      <span className="fw-black text-black fs-5">
                        {product.price?.toLocaleString('pt-PT')} MT
                      </span>
                      {product.discount > 0 && (
                        <span className="text-muted text-decoration-line-through small">
                          {(product.price + product.discount).toLocaleString('pt-PT')} MT
                        </span>
                      )}
                    </div>
                    
                    <div className="d-flex align-items-center gap-3 text-muted small fw-bold mb-3">
                      <span className="text-warning"><FontAwesomeIcon icon={faStar} /> {product.rating || '5.0'}</span>
                      <span><FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted me-1" /> Maputo</span>
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

      {/* Banner de Apelo aos Fornecedores */}
      <section className="row g-4 my-5">
        <div className="col-md-6">
          <div className="bg-cream rounded-4 p-5 h-100 d-flex flex-column">
            <span className="small-caps text-primary-custom mb-3">Para Fornecedores</span>
            <h2 className="fw-black text-black mb-4 pe-lg-5" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Venda mais sem abrir novas lojas.</h2>
            
            <ul className="list-unstyled mb-4 d-flex flex-column gap-3">
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Maior visibilidade digital no ecossistema Nhiquela</li>
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Mais clientes todos os dias</li>
              <li className="d-flex align-items-center gap-3"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Gestão simplificada no App nhiquelaseller & Web</li>
            </ul>
            
            <div className="mt-auto">
              <Link to="/supplier/dashboard" className="btn bg-black text-white rounded-pill-custom px-4 py-3 fw-bold">
                Aceder ao Portal do Fornecedor <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="bg-black text-white rounded-4 p-5 h-100 d-flex flex-column">
            <span className="small-caps text-primary-custom mb-3">Para Motoristas</span>
            <h2 className="fw-black mb-4 pe-lg-5" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Ganhe dinheiro com a sua viatura.</h2>
            
            <ul className="list-unstyled mb-4 d-flex flex-column gap-3 text-white-50">
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Horários 100% flexíveis</li>
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> Pagamentos rápidos via M-Pesa</li>
              <li className="d-flex align-items-center gap-3 text-white"><div className="rounded-circle bg-primary-custom" style={{ width: '6px', height: '6px' }}></div> App exclusiva nhiqueladriver com GPS</li>
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
