import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faStar, faMapMarkerAlt, faClock, faStore, faFilter,
  faPlus, faShoppingBag, faCheckCircle, faTimesCircle, faArrowLeft, faTag
} from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../api';
import { isStoreOpen } from './ProductsScreen';

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

export default function SearchScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('products'); // 'products' ou 'stores'
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [maxPrice, setMaxPrice] = useState(10000);
  const [minRating, setMinRating] = useState(0);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyPromos, setOnlyPromos] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [sellerEtas, setSellerEtas] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSearchData = async () => {
      try {
        setLoading(true);
        const [prodRes, sellersRes, catRes] = await Promise.all([
          api.get('/products'),
          api.get('/providers').catch(() => api.get('/users/sellers')).catch(() => ({ data: [] })),
          api.get('/categories').catch(() => ({ data: [] }))
        ]);

        const prodData = prodRes.data;
        const prodArray = Array.isArray(prodData) ? prodData : (prodData?.products || []);
        setProducts(prodArray);

        const sellerData = sellersRes.data;
        const sellerArray = Array.isArray(sellerData) ? sellerData : (sellerData?.providers || sellerData?.sellers || []);
        setSellers(sellerArray);

        const catData = catRes.data;
        setCategories(Array.isArray(catData) ? catData : (catData?.categories || []));
      } catch (err) {
        console.error('Erro ao pesquisar:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchData();

    const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });
    socket.on('storeStatusChanged', ({ userId, isOpen, openstore }) => {
      const statusValue = isOpen !== undefined ? isOpen : openstore;
      setSellers(prev => prev.map(s => {
        const sId = s._id || s.user || s.id;
        if (String(sId) === String(userId)) {
          return { ...s, openstore: statusValue, seller: { ...s.seller, openstore: statusValue } };
        }
        return s;
      }));
      setProducts(prev => prev.map(p => {
        const sellerObj = p.seller;
        if (sellerObj && typeof sellerObj === 'object') {
          const sId = sellerObj._id || sellerObj.id;
          if (String(sId) === String(userId)) {
            return { ...p, seller: { ...sellerObj, openstore: statusValue } };
          }
        }
        return p;
      }));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords({ lat: -25.9692, lng: 32.5732 }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setUserCoords({ lat: -25.9692, lng: 32.5732 });
    }
  }, []);

  useEffect(() => {
    if (!products || products.length === 0 || !userCoords) return;

    const sellersToFetch = new Map();
    products.forEach(p => {
      if (p.seller) {
        const sId = typeof p.seller === 'object' ? (p.seller._id || p.seller.id) : p.seller;
        if (sId && !sellersToFetch.has(String(sId))) {
          sellersToFetch.set(String(sId), p.seller);
        }
      }
    });

    sellersToFetch.forEach(async (sellerObj, sIdStr) => {
      try {
        const sData = typeof sellerObj === 'object' ? (sellerObj.seller || sellerObj) : {};
        const sLat = parseFloat(sData.latitude || sellerObj.latitude || (sellerObj.locationGeo?.coordinates ? sellerObj.locationGeo.coordinates[1] : 0)) || -25.9535;
        const sLng = parseFloat(sData.longitude || sellerObj.longitude || (sellerObj.locationGeo?.coordinates ? sellerObj.locationGeo.coordinates[0] : 0)) || 32.5892;

        const { data } = await api.get(`/osrm/route?origin=${userCoords.lng},${userCoords.lat}&destination=${sLng},${sLat}`);
        if (data && data.durationMin) {
          setSellerEtas(prev => ({ ...prev, [sIdStr]: `~${data.durationMin} min` }));
        }
      } catch (err) {
        // Fallback
      }
    });
  }, [products, userCoords]);

  const getEtaDisplay = (seller) => {
    if (!seller) return '25-35 min';
    const sId = typeof seller === 'object' ? String(seller._id || seller.id) : String(seller);
    if (sellerEtas[sId]) return sellerEtas[sId];

    const sData = typeof seller === 'object' ? (seller.seller || seller) : {};
    const sLat = parseFloat(sData.latitude || seller.latitude || (seller.locationGeo?.coordinates ? seller.locationGeo.coordinates[1] : 0)) || -25.9535;
    const sLng = parseFloat(sData.longitude || seller.longitude || (seller.locationGeo?.coordinates ? seller.locationGeo.coordinates[0] : 0)) || 32.5892;
    const uLat = userCoords?.lat || -25.9692;
    const uLng = userCoords?.lng || 32.5732;

    const toRad = v => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(sLat - uLat);
    const dLng = toRad(sLng - uLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(uLat)) * Math.cos(toRad(sLat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    const driveMin = Math.round((distanceKm / 35) * 60);
    const totalMin = Math.max(15, driveMin + 12);
    return `~${totalMin} min`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  // Filtragem Dinâmica dos Produtos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const pName = (p.nome || p.name || '').toLowerCase();
      const pSeller = (p.seller?.name || p.vendor || '').toLowerCase();
      const q = query.toLowerCase().trim();

      const matchesQuery = !q || pName.includes(q) || pSeller.includes(q);
      const matchesCat = selectedCategory === 'ALL' || (p.category?._id || p.category) === selectedCategory || p.category?.name === selectedCategory;
      const matchesPrice = Number(p.price || 0) <= maxPrice;
      const matchesRating = Number(p.rating || 4.8) >= minRating;
      const matchesStock = !onlyInStock || (p.countInStock > 0 || p.countInStock === undefined);
      const matchesPromos = !onlyPromos || p.onSale || p.discount > 0;

      return matchesQuery && matchesCat && matchesPrice && matchesRating && matchesStock && matchesPromos;
    });
  }, [products, query, selectedCategory, maxPrice, minRating, onlyInStock, onlyPromos]);

  // Filtragem Dinâmica das Lojas que Vendem
  const filteredSellers = useMemo(() => {
    return sellers.filter(s => {
      const sName = (s.name || s.seller?.name || '').toLowerCase();
      const q = query.toLowerCase().trim();
      const matchesQuery = !q || sName.includes(q);
      const matchesRating = Number(s.rating || 4.8) >= minRating;
      return matchesQuery && matchesRating;
    });
  }, [sellers, query, minRating]);

  const handleAddToCart = (product, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isStoreOpen(product.seller)) {
      toast.error('Esta loja está fechada de momento e não pode receber pedidos.');
      return;
    }

    const sellerObj = typeof product.seller === 'object' && product.seller !== null
      ? product.seller
      : { _id: product.seller || 'seller_default', name: product.vendor || 'Nhiquela Partner' };

    dispatch(addToBasket({
      _id: product._id,
      name: product.nome || product.name,
      price: Number(product.price || 0),
      image: product.image || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150?text=Sem+Imagem'),
      seller: sellerObj,
      onSale: Boolean(product.onSale),
      discount: Number(product.discount || 0),
      priceFromSeller: Number(product.priceFromSeller || product.price || 0),
    }));

    toast.success(`"${product.nome || product.name}" adicionado ao carrinho!`);
  };

  return (
    <div className="container py-4">
      {/* Header de Pesquisa */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-light rounded-circle shadow-sm" onClick={() => navigate(-1)}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <form onSubmit={handleSearchSubmit} className="flex-grow-1 bg-white p-2 rounded-pill shadow-sm border d-flex align-items-center">
          <FontAwesomeIcon icon={faSearch} className="text-muted ms-3 me-2" />
          <input 
            type="text" 
            className="form-control border-0 shadow-none bg-transparent" 
            placeholder="Pesquisar por Cîroc, Bebidas, Lojas, etc..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold">
            Pesquisar
          </button>
        </form>
      </div>

      {/* Tabs: Produtos Relacionados vs Lojas */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div className="nav nav-pills gap-2">
          <button 
            className={`nav-link rounded-pill px-4 fw-bold ${activeTab === 'products' ? 'active bg-primary-custom' : 'bg-light text-dark'}`}
            onClick={() => setActiveTab('products')}
          >
            Produtos Relacionados ({filteredProducts.length})
          </button>
          <button 
            className={`nav-link rounded-pill px-4 fw-bold ${activeTab === 'stores' ? 'active bg-primary-custom' : 'bg-light text-dark'}`}
            onClick={() => setActiveTab('stores')}
          >
            Lojas que Vendem ({filteredSellers.length})
          </button>
        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-light">
        <div className="row g-3 align-items-center">
          <div className="col-md-3">
            <label className="form-label small fw-bold text-muted mb-1"><FontAwesomeIcon icon={faFilter} className="me-1 text-primary-custom" /> Categoria</label>
            <select className="form-select rounded-3 small" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="ALL">Todas as Categorias</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name || c.nome}</option>)}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label small fw-bold text-muted mb-1">Preço Máximo: {maxPrice.toLocaleString('pt-PT')} MT</label>
            <input type="range" className="form-range" min="100" max="20000" step="500" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
          </div>

          <div className="col-md-3">
            <label className="form-label small fw-bold text-muted mb-1">Avaliação Mínima</label>
            <select className="form-select rounded-3 small" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
              <option value="0">Todas as Avaliações</option>
              <option value="4">⭐ 4.0 ou superior</option>
              <option value="4.5">⭐ 4.5 ou superior</option>
            </select>
          </div>

          <div className="col-md-3 d-flex align-items-center gap-3 pt-3">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="promoCheck" checked={onlyPromos} onChange={(e) => setOnlyPromos(e.target.checked)} />
              <label className="form-check-label small fw-bold" htmlFor="promoCheck">Promoções</label>
            </div>
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="stockCheck" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
              <label className="form-check-label small fw-bold" htmlFor="stockCheck">Em Estoque</label>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo dos Resultados */}
      {loading ? (
        <div className="text-center py-5 text-muted">A carregar resultados da pesquisa...</div>
      ) : activeTab === 'products' ? (
        /* PRODUTOS RELACIONADOS */
        filteredProducts.length === 0 ? (
          <div className="text-center py-5 text-muted">Nenhum produto encontrado para a pesquisa "{query}".</div>
        ) : (
          <div className="row g-4">
            {filteredProducts.map((product) => {
              const sellerOpen = isStoreOpen(product.seller);
              return (
                <div key={product._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                  <div className="card h-100 border-0 shadow-sm rounded-4 p-3 d-flex flex-column bg-white hover-lift">
                    <Link to={`/shop/product/${product.slug || product._id}`} className="text-decoration-none text-dark flex-grow-1">
                      <div className="position-relative mb-3 overflow-hidden rounded-3 bg-light" style={{ height: '180px' }}>
                        {product.onSale && (
                          <span className="position-absolute top-0 start-0 bg-danger text-white small-caps px-2 py-1 m-2 rounded-2 fw-bold z-1">
                            PROMOÇÃO
                          </span>
                        )}
                        {!sellerOpen && (
                          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 z-2 rounded-3">
                            <span className="badge bg-danger text-white px-2 py-1 fw-bold shadow-sm">
                              🔴 Loja Fechada
                            </span>
                          </div>
                        )}
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

                      <div className="d-flex align-items-center justify-content-between text-muted small fw-bold mb-3">
                        <span><FontAwesomeIcon icon={faClock} className="me-1" /> {getEtaDisplay(product.seller)}</span>
                        <span className={`badge ${sellerOpen ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fw-bold px-2 py-1 rounded-2`} style={{ fontSize: '11px' }}>
                          {sellerOpen ? '🟢 Aberto' : '🔴 Fechado'}
                        </span>
                      </div>
                    </Link>

                    <button 
                      className={`btn fw-bold rounded-3 py-2 small w-100 mt-auto ${sellerOpen ? 'bg-primary-custom text-white' : 'btn-secondary text-white opacity-75'}`}
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={!sellerOpen}
                    >
                      <FontAwesomeIcon icon={faPlus} className="me-1" /> {sellerOpen ? 'Adicionar ao Carrinho' : 'Loja Fechada'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* LOJAS QUE VENDEM O PRODUTO */
        filteredSellers.length === 0 ? (
          <div className="text-center py-5 text-muted">Nenhuma loja encontrada para a pesquisa "{query}".</div>
        ) : (
          <div className="row g-4">
            {filteredSellers.map((seller) => {
              const storeLogoUrl = getStoreLogoUrl(seller);
              const storeProvince = seller.seller?.province || seller.province || seller.seller?.address || 'Maputo';
              const storeOpen = isStoreOpen(seller);

              return (
                <div key={seller._id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100 border-0 shadow-sm rounded-4 p-4 bg-white d-flex flex-row align-items-center gap-3 hover-lift">
                    {storeLogoUrl ? (
                      <img 
                        src={storeLogoUrl} 
                        alt={seller.name || seller.seller?.name || 'Loja'} 
                        className="rounded-circle border border-2 border-primary-custom object-fit-cover shadow-sm flex-shrink-0"
                        style={{ width: '80px', height: '80px' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="rounded-circle border border-2 border-primary-custom text-primary-custom align-items-center justify-content-center shadow-sm fw-bold fs-3 flex-shrink-0"
                      style={{ width: '80px', height: '80px', backgroundColor: '#F3E8FF', display: storeLogoUrl ? 'none' : 'flex' }}
                    >
                      <FontAwesomeIcon icon={faStore} />
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="fw-bold text-dark mb-1">{seller.name || seller.seller?.name || 'Loja Parceira'}</h5>
                      <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                        <span className="text-warning fw-bold"><FontAwesomeIcon icon={faStar} /> 4.8</span>
                        <span>•</span>
                        <span className={`badge ${storeOpen ? 'bg-success text-white' : 'bg-danger text-white'} rounded-pill px-2 py-1 fw-bold`} style={{ fontSize: '10px' }}>
                          {storeOpen ? '🟢 Aberto' : '🔴 Fechado'}
                        </span>
                      </div>
                      <span className="badge bg-light text-dark rounded-pill border px-3 py-1 fw-bold small">
                        {storeProvince}
                      </span>
                      <div className="mt-3">
                        <Link to={`/shop/seller/${seller._id}`} className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold">
                          Ver Produtos da Loja
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
