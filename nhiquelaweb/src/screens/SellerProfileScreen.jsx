import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faStore, faMapMarkerAlt, faPhone, faEnvelope,
  faCheckCircle, faStar, faBox, faSpinner, faShoppingCart,
  faExternalLinkAlt, faClock, faTag
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { selectUser } from '../store/features/userSlice';
import api from '../api';

export default function SellerProfileScreen() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [sellerLocation, setSellerLocation] = useState(null);

  // Fetch seller data
  useEffect(() => {
    if (!sellerId) return;
    setLoadingSeller(true);
    api.get(`/users/${sellerId}`)
      .then(({ data }) => {
        setSeller(data);
        // Extract GPS coords from seller profile
        const lat = parseFloat(data.seller?.latitude || data.seller?.lat || 0);
        const lng = parseFloat(data.seller?.longitude || data.seller?.lng || 0);
        if (lat && lng) setSellerLocation({ lat, lng });
      })
      .catch(() => toast.error('Não foi possível carregar os dados do fornecedor.'))
      .finally(() => setLoadingSeller(false));
  }, [sellerId]);

  // Fetch seller's products
  useEffect(() => {
    if (!sellerId) return;
    setLoadingProducts(true);
    api.get(`/products?seller=${sellerId}&limit=20`)
      .then(({ data }) => {
        const list = data.products || data.data || data;
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [sellerId]);

  const addToCartHandler = (product) => {
    if (!userInfo) {
      toast.info('Faça login para adicionar ao carrinho');
      navigate('/login');
      return;
    }
    dispatch(addToBasket({ ...product, quantity: 1 }));
    toast.success(`"${product.nome || product.name}" adicionado ao carrinho!`);
  };

  const getProductImage = (product) => {
    if (product.image) return product.image;
    if (product.images?.length > 0) return product.images[0];
    return null;
  };

  const isOpen = seller?.seller?.openstore !== false;

  if (loadingSeller) {
    return (
      <div className="container py-5 text-center">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
        <p className="text-muted mt-3">A carregar perfil do fornecedor...</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="container py-5 text-center">
        <h5 className="text-muted">Fornecedor não encontrado.</h5>
        <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 mt-3">Voltar à Loja</Link>
      </div>
    );
  }

  const sellerInfo = seller.seller || {};
  const sellerName = seller.name || sellerInfo.name || 'Fornecedor';
  const sellerImage = sellerInfo.image || sellerInfo.logo || null;
  const rating = sellerInfo.rating || 0;
  const reviewCount = sellerInfo.numReviews || 0;
  const address = sellerInfo.address || sellerInfo.location || '';
  const description = sellerInfo.description || sellerInfo.bio || '';
  const openHours = sellerInfo.openHours || '';

  return (
    <div className="container py-4" style={{ maxWidth: '1100px' }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn btn-link text-muted text-decoration-none mb-4 ps-0 fw-bold">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Voltar
      </button>

      {/* ─── Hero Card ─── */}
      <div
        className="card border-0 rounded-4 overflow-hidden mb-5 shadow"
        style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7F00FF 60%, #A855F7 100%)' }}
      >
        <div className="card-body p-5 text-white">
          <div className="row align-items-center g-4">
            {/* Avatar */}
            <div className="col-auto">
              {sellerImage ? (
                <img
                  src={sellerImage}
                  alt={sellerName}
                  className="rounded-4 border border-white border-3 shadow"
                  style={{ width: '110px', height: '110px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-4 border border-white border-3 shadow d-flex align-items-center justify-content-center bg-white"
                  style={{ width: '110px', height: '110px' }}
                >
                  <FontAwesomeIcon icon={faStore} size="3x" className="text-primary-custom" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="col">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h2 className="fw-bold m-0">{sellerName}</h2>
                {isOpen ? (
                  <span className="badge bg-success rounded-pill">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Aberto
                  </span>
                ) : (
                  <span className="badge bg-secondary rounded-pill">Fechado</span>
                )}
              </div>

              {sellerInfo.subcategoryId?.name && (
                <p className="mb-2 opacity-75 small">
                  <FontAwesomeIcon icon={faTag} className="me-1" />
                  {sellerInfo.subcategoryId.name}
                </p>
              )}

              {rating > 0 && (
                <div className="d-flex align-items-center gap-1 mb-2">
                  {[1,2,3,4,5].map(s => (
                    <FontAwesomeIcon key={s} icon={faStar} className={s <= Math.round(rating) ? 'text-warning' : 'opacity-25'} size="sm" />
                  ))}
                  <span className="ms-1 small opacity-75">({reviewCount} avaliações)</span>
                </div>
              )}

              <div className="d-flex flex-wrap gap-3 mt-2">
                {address && (
                  <span className="small opacity-75">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                    {address}
                  </span>
                )}
                {sellerLocation && (
                  <a
                    href={`https://www.google.com/maps?q=${sellerLocation.lat},${sellerLocation.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="small text-white-50 text-decoration-none"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="me-1" />
                    Ver no Mapa
                  </a>
                )}
                {openHours && (
                  <span className="small opacity-75">
                    <FontAwesomeIcon icon={faClock} className="me-1" />
                    {openHours}
                  </span>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="col-md-auto text-md-end text-start mt-3 mt-md-0">
              {seller.phoneNumber && (
                <div className="mb-2">
                  <a href={`tel:${seller.phoneNumber}`} className="text-white text-decoration-none small">
                    <FontAwesomeIcon icon={faPhone} className="me-2" />
                    {seller.phoneNumber}
                  </a>
                </div>
              )}
              {seller.email && (
                <div>
                  <a href={`mailto:${seller.email}`} className="text-white text-decoration-none small">
                    <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                    {seller.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {description && (
            <p className="mt-4 mb-0 opacity-75" style={{ maxWidth: '700px', lineHeight: '1.6' }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="row g-3 mb-5">
        {[
          { icon: faBox, label: 'Produtos', value: products.length || '…', color: '#7F00FF' },
          { icon: faStar, label: 'Avaliação', value: rating ? `${rating.toFixed(1)} ★` : '—', color: '#F59E0B' },
          { icon: faCheckCircle, label: 'Estado', value: isOpen ? 'Aberto' : 'Fechado', color: isOpen ? '#10B981' : '#6B7280' },
          { icon: faMapMarkerAlt, label: 'Localização', value: sellerLocation ? 'GPS disponível' : 'Não disponível', color: '#3B82F6' },
        ].map((stat, i) => (
          <div key={i} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 text-center h-100">
              <FontAwesomeIcon icon={stat.icon} size="2x" style={{ color: stat.color }} className="mb-2" />
              <div className="fw-bold fs-5">{stat.value}</div>
              <div className="text-muted small">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Products Grid ─── */}
      <h4 className="fw-bold mb-4">
        <FontAwesomeIcon icon={faBox} className="me-2 text-primary-custom" />
        Produtos de {sellerName}
      </h4>

      {loadingProducts ? (
        <div className="text-center py-5">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom" />
        </div>
      ) : products.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
          <FontAwesomeIcon icon={faBox} size="3x" className="text-muted mb-3" />
          <h6 className="text-muted">Este fornecedor ainda não tem produtos publicados.</h6>
        </div>
      ) : (
        <div className="row g-4">
          {products.map((product) => {
            const img = getProductImage(product);
            return (
              <div key={product._id} className="col-6 col-md-4 col-lg-3">
                <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden product-card-hover">
                  <Link to={`/shop/product/${product.slug || product._id}`} className="text-decoration-none">
                    <div className="bg-light" style={{ height: '160px', overflow: 'hidden' }}>
                      {img ? (
                        <img
                          src={img}
                          alt={product.nome || product.name}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover', transition: 'transform 0.3s' }}
                          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                          <FontAwesomeIcon icon={faBox} size="2x" className="text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="card-body p-3">
                      <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '14px', lineHeight: '1.3' }}>
                        {product.nome || product.name}
                      </h6>
                      {product.onSale ? (
                        <div>
                          <span className="text-primary-custom fw-bold">{product.discount} MT</span>
                          <span className="text-muted text-decoration-line-through ms-2 small">{product.price} MT</span>
                        </div>
                      ) : (
                        <span className="text-primary-custom fw-bold">{product.price} MT</span>
                      )}
                    </div>
                  </Link>
                  <div className="card-footer border-0 bg-white p-3 pt-0">
                    <button
                      onClick={() => addToCartHandler(product)}
                      className="btn bg-primary-custom text-white w-100 rounded-pill py-2 fw-bold"
                      style={{ fontSize: '13px' }}
                    >
                      <FontAwesomeIcon icon={faShoppingCart} className="me-1" size="sm" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
