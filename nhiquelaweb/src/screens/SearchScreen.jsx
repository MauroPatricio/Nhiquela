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
  }, []);

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
            {filteredProducts.map((product) => (
              <div key={product._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card h-100 border-0 shadow-sm rounded-4 p-3 d-flex flex-column bg-white hover-lift">
                  <Link to={`/shop/product/${product.slug || product._id}`} className="text-decoration-none text-dark flex-grow-1">
                    <div className="position-relative mb-3 overflow-hidden rounded-3 bg-light" style={{ height: '180px' }}>
                      {product.onSale && (
                        <span className="position-absolute top-0 start-0 bg-danger text-white small-caps px-2 py-1 m-2 rounded-2 fw-bold z-1">
                          PROMOÇÃO
                        </span>
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

                    <div className="d-flex align-items-center gap-3 text-muted small fw-bold mb-3">
                      <span className="text-warning"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.8'}</span>
                      <span><FontAwesomeIcon icon={faClock} className="me-1" /> 25-40 min</span>
                      <span className="text-success"><FontAwesomeIcon icon={faCheckCircle} /> Em estoque</span>
                    </div>
                  </Link>

                  <button 
                    className="btn bg-primary-custom text-white fw-bold rounded-3 py-2 small w-100 mt-auto"
                    onClick={(e) => handleAddToCart(product, e)}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            ))}
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
                        <span className="fw-bold text-dark"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-primary-custom" /> {storeProvince}</span>
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
