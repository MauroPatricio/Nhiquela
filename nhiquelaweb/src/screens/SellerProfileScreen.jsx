import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faStore, faMapMarkerAlt, faPhone, faEnvelope,
  faCheckCircle, faStar, faBox, faSpinner, faShoppingCart,
  faExternalLinkAlt, faClock, faTag, faPlus, faFire, faWineGlass
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { selectUser } from '../store/features/userSlice';
import api from '../api';

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

export default function SellerProfileScreen() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL'); // 'ALL', 'BEST', 'PROMO', or category name

  useEffect(() => {
    if (!sellerId) return;
    setLoadingSeller(true);
    api.get(`/users/${sellerId}`)
      .catch(() => api.get(`/providers/${sellerId}`))
      .then(({ data }) => setSeller(data))
      .catch(() => toast.error('Não foi possível carregar os dados da loja.'))
      .finally(() => setLoadingSeller(false));
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return;
    setLoadingProducts(true);
    api.get(`/products?seller=${sellerId}`)
      .then(({ data }) => {
        const list = data.products || data.data || data;
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [sellerId]);

  const sellerInfo = seller?.seller || {};
  const sellerName = seller?.name || sellerInfo.name || 'Loja Parceira';
  const sellerLogo = sellerInfo.logo || sellerInfo.image || seller?.profileImage || 'https://via.placeholder.com/120?text=Loja';
  const rating = sellerInfo.rating || 4.8;
  const address = sellerInfo.address || 'Maputo';
  const description = sellerInfo.description || 'Loja parceira verificada no ecossistema Nhiquela.';

  // Extrair categorias dos produtos da loja
  const storeCategories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      if (p.category?.name) cats.add(p.category.name);
      else if (typeof p.category === 'string') cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filtragem por Tab
  const filteredProducts = useMemo(() => {
    if (activeCategoryTab === 'BEST') {
      return [...products].sort((a, b) => (b.numReviews || 0) - (a.numReviews || 0));
    }
    if (activeCategoryTab === 'PROMO') {
      return products.filter(p => p.onSale || p.discount > 0);
    }
    if (activeCategoryTab !== 'ALL') {
      return products.filter(p => (p.category?.name || p.category) === activeCategoryTab);
    }
    return products;
  }, [products, activeCategoryTab]);

  const handleAddToCart = (product) => {
    dispatch(addToBasket({
      _id: product._id,
      name: product.nome || product.name,
      price: Number(product.price || 0),
      image: product.image || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150?text=Sem+Imagem'),
      seller: { _id: sellerId, name: sellerName },
      onSale: Boolean(product.onSale),
      discount: Number(product.discount || 0),
      priceFromSeller: Number(product.priceFromSeller || product.price || 0),
    }));
    toast.success(`"${product.nome || product.name}" adicionado ao carrinho!`);
  };

  if (loadingSeller) {
    return (
      <div className="container py-5 text-center">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
        <p className="text-muted mt-3">A carregar loja...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Botão Voltar */}
      <button className="btn btn-light rounded-circle shadow-sm mb-3" onClick={() => navigate(-1)}>
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>

      {/* BANNER & HEADER DA LOJA */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
        <div className="bg-primary-custom text-white p-4 p-md-5 d-flex flex-column flex-md-row align-items-center gap-4">
          <img 
            src={sellerLogo} 
            alt={sellerName} 
            className="rounded-circle border border-4 border-white object-fit-cover shadow-sm flex-shrink-0"
            style={{ width: '110px', height: '110px' }}
          />
          <div className="text-center text-md-start">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-2 mb-1">
              <h2 className="fw-black text-white m-0">{sellerName}</h2>
              <FontAwesomeIcon icon={faCheckCircle} className="text-warning fs-5" title="Loja Verificada" />
            </div>
            <p className="text-white-50 mb-2 small">{description}</p>
            <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-3 small fw-bold text-white">
              <span className="bg-white text-dark px-3 py-1 rounded-pill">⭐ {rating} (Verificado)</span>
              <span>•</span>
              <span><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" /> {address}</span>
              <span>•</span>
              <span><FontAwesomeIcon icon={faClock} className="me-1" /> Entrega em 25–40 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE CATEGORIAS DA LOJA */}
      <div className="d-flex flex-wrap gap-2 mb-4 pb-2 border-bottom">
        <button 
          className={`btn rounded-pill px-4 fw-bold ${activeCategoryTab === 'ALL' ? 'bg-primary-custom text-white' : 'btn-light'}`}
          onClick={() => setActiveCategoryTab('ALL')}
        >
          Todos os Produtos ({products.length})
        </button>
        <button 
          className={`btn rounded-pill px-4 fw-bold ${activeCategoryTab === 'BEST' ? 'bg-primary-custom text-white' : 'btn-light'}`}
          onClick={() => setActiveCategoryTab('BEST')}
        >
          🔥 Mais Vendidos
        </button>
        <button 
          className={`btn rounded-pill px-4 fw-bold ${activeCategoryTab === 'PROMO' ? 'bg-primary-custom text-white' : 'btn-light'}`}
          onClick={() => setActiveCategoryTab('PROMO')}
        >
          🏷️ Promoções
        </button>
        {storeCategories.map(cat => (
          <button 
            key={cat}
            className={`btn rounded-pill px-4 fw-bold ${activeCategoryTab === cat ? 'bg-primary-custom text-white' : 'btn-light'}`}
            onClick={() => setActiveCategoryTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID DE PRODUTOS DA LOJA */}
      {loadingProducts ? (
        <div className="text-center py-5 text-muted">A carregar catálogo da loja...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
          <h6 className="fw-bold text-dark">Nenhum produto encontrado nesta categoria.</h6>
        </div>
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
                  <h6 className="fw-bold text-black mb-2 text-truncate">{product.nome || product.name}</h6>
                  <div className="d-flex align-items-baseline gap-2 mb-2">
                    <span className="fw-black text-black fs-5">
                      {product.price?.toLocaleString('pt-PT')} MT
                    </span>
                  </div>
                  <div className="small text-muted fw-bold mb-3">
                    <FontAwesomeIcon icon={faClock} className="me-1" /> 25-40 min
                  </div>
                </Link>

                <button 
                  className="btn bg-primary-custom text-white fw-bold rounded-3 py-2 small w-100 mt-auto"
                  onClick={() => handleAddToCart(product)}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-1" /> Adicionar ao Carrinho
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
