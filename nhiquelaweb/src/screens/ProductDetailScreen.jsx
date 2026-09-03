import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faMinus, faPlus, faShoppingCart, faSpinner, faStar, 
  faStore, faTruck, faCheckCircle, faShoppingBag, faShieldAlt, faRedo,
  faBolt, faBoxOpen, faInfoCircle, faTag, faCertificate, faMapMarkerAlt, faFileCode, faKey
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
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

export default function ProductDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);

        // Buscar produtos relacionados
        const relRes = await api.get(`/products?category=${data.category?._id || data.category}&limit=4`);
        const relList = relRes.data?.products || relRes.data || [];
        setRelatedProducts(relList.filter(p => p._id !== data._id));
      } catch (error) {
        console.error('Erro ao carregar produto:', error);
        toast.error('Não foi possível carregar os detalhes do produto.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProductDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
        <p className="text-muted mt-3">A carregar detalhes do produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-5 text-center">
        <h5>Produto não encontrado.</h5>
        <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 mt-3">Voltar à Loja</Link>
      </div>
    );
  }

  const sellerObj = typeof product.seller === 'object' && product.seller !== null
    ? product.seller
    : { _id: product.seller || 'seller_default', name: product.vendor || 'Nhiquela Partner' };

  const isDigital = product.productType === 'DIGITAL';

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      dispatch(addToBasket({
        _id: product._id,
        name: product.nome || product.name,
        price: Number(product.price || 0),
        image: getProductImageUrl(product),
        seller: sellerObj,
        onSale: Boolean(product.onSale),
        discount: Number(product.discount || 0),
        priceFromSeller: Number(product.priceFromSeller || product.price || 0),
        productType: isDigital ? 'DIGITAL' : 'PHYSICAL',
        digitalType: product.digitalType || 'KEY',
      }));
    }
    toast.success(`${quantity}x "${product.nome || product.name}" adicionado(s) ao carrinho!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/shop/cart');
  };

  return (
    <div className="container py-4">
      {/* Botão Voltar */}
      <button className="btn btn-light rounded-circle shadow-sm mb-4" onClick={() => navigate(-1)}>
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-5 bg-white">
        <div className="row g-0">
          {/* Imagem Grande do Produto */}
          <div className="col-md-6 bg-light d-flex align-items-center justify-content-center p-4 p-md-5 position-relative">
            {/* Badge de Tipo de Produto (Digital vs Físico) */}
            <div className="position-absolute top-0 start-0 m-4 z-1">
              {isDigital ? (
                <span className="badge bg-purple-light text-primary-custom px-3 py-2 rounded-pill fw-bold border border-primary-subtle shadow-sm" style={{ backgroundColor: '#F3E8FF' }}>
                  <FontAwesomeIcon icon={faBolt} className="me-1 text-primary-custom" /> Produto Digital / Licença
                </span>
              ) : (
                <span className="badge bg-light text-dark px-3 py-2 rounded-pill fw-bold border shadow-sm">
                  <FontAwesomeIcon icon={faBoxOpen} className="me-1 text-muted" /> Produto Físico
                </span>
              )}
            </div>

            <img 
              src={getProductImageUrl(product)} 
              alt={product.nome || product.name} 
              className="img-fluid rounded-4 shadow-sm object-fit-cover w-100" 
              style={{ maxHeight: '420px' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_PRODUCT_IMAGE;
              }}
            />
          </div>

          {/* Detalhes do Produto */}
          <div className="col-md-6 p-4 p-md-5 d-flex flex-column justify-content-between">
            <div>
              {/* Categoria & Vendedor */}
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge bg-light text-dark px-3 py-2 rounded-pill fw-bold border">
                  {product.category?.name || 'Geral'}
                </span>
                <Link to={`/shop/seller/${sellerObj._id}`} className="text-decoration-none text-muted small fw-bold">
                  <FontAwesomeIcon icon={faStore} className="text-primary-custom me-1" /> {sellerObj.name || 'Loja Parceira'}
                </Link>
              </div>

              {/* Título & Avaliação */}
              <h2 className="fw-black text-black mb-2">{product.nome || product.name}</h2>
              <div className="d-flex align-items-center gap-3 mb-3">
                <span className="text-warning fw-bold"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.8'}</span>
                <span className="text-muted">•</span>
                <span className="text-success fw-bold"><FontAwesomeIcon icon={faCheckCircle} /> {product.countInStock > 0 ? 'Em Estoque' : 'Disponível'}</span>
                {isDigital && (
                  <>
                    <span className="text-muted">•</span>
                    <span className="text-primary-custom fw-bold"><FontAwesomeIcon icon={faBolt} /> Licença Automática</span>
                  </>
                )}
              </div>

              {/* Preço */}
              <div className="d-flex align-items-baseline gap-3 mb-4">
                <span className="display-6 fw-black text-primary-custom">
                  {Number(product.price || 0).toLocaleString('pt-PT')} MT
                </span>
                {product.discount > 0 && (
                  <span className="text-muted text-decoration-line-through fs-5">
                    {(product.price + product.discount).toLocaleString('pt-PT')} MT
                  </span>
                )}
              </div>

              {/* Caixa Informativa de Entrega/Disponibilização */}
              {isDigital ? (
                <div className="alert border-0 rounded-4 p-3 mb-4 d-flex align-items-center gap-3" style={{ backgroundColor: '#F3E8FF', borderLeft: '4px solid #7F00FF' }}>
                  <div className="rounded-circle bg-primary-custom text-white p-2 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                    <FontAwesomeIcon icon={faBolt} size="lg" />
                  </div>
                  <div>
                    <div className="fw-bold text-dark">Entrega Digital Instantânea</div>
                    <small className="text-muted">A chave/licença é enviada diretamente por e-mail após a confirmação do pagamento. <strong>Zero taxa de frete.</strong></small>
                  </div>
                </div>
              ) : (
                <div className="alert alert-light border rounded-4 p-3 mb-4 d-flex align-items-center gap-3">
                  <FontAwesomeIcon icon={faTruck} className="text-primary-custom fs-3" />
                  <div>
                    <div className="fw-bold text-dark">Entrega Estimada: 30–45 min</div>
                    <small className="text-muted">Entregue por motorista verificado da Nhiquela em Maputo</small>
                  </div>
                </div>
              )}

              {/* Descrição do Produto */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark mb-2">Descrição do Produto</h6>
                <p className="text-muted small mb-0" style={{ lineHeight: '1.6' }}>
                  {product.description || 'Excelente produto disponível no ecossistema Nhiquela. Qualidade garantida pelo fornecedor parceiro.'}
                </p>
              </div>

              {/* Especificações & Detalhes Técnicos */}
              <div className="card bg-light border-0 rounded-4 p-3 mb-4">
                <h6 className="fw-bold text-dark mb-3 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-primary-custom" /> Ficha Técnica & Especificações
                </h6>
                <div className="row g-2 small">
                  <div className="col-6">
                    <span className="text-muted">Tipo de Produto:</span>
                    <div className="fw-bold text-dark">{isDigital ? 'Digital / Software / Chave' : 'Produto Físico'}</div>
                  </div>
                  {product.brand && (
                    <div className="col-6">
                      <span className="text-muted">Marca:</span>
                      <div className="fw-bold text-dark">{product.brand}</div>
                    </div>
                  )}
                  {product.isGuaranteed && (
                    <div className="col-6">
                      <span className="text-muted">Garantia:</span>
                      <div className="fw-bold text-success">{product.guaranteedPeriod || 'Garantia incluída'}</div>
                    </div>
                  )}
                  {!isDigital && product.countInStock !== undefined && (
                    <div className="col-6">
                      <span className="text-muted">Disponibilidade:</span>
                      <div className="fw-bold text-dark">{product.countInStock} unidades em stock</div>
                    </div>
                  )}
                  {isDigital && product.digitalType && (
                    <div className="col-6">
                      <span className="text-muted">Formato Digital:</span>
                      <div className="fw-bold text-primary-custom">{product.digitalType}</div>
                    </div>
                  )}
                </div>

                {/* Instruções Digitais se aplicável */}
                {isDigital && product.digitalInstructions && (
                  <div className="mt-3 pt-3 border-top">
                    <span className="text-muted small fw-bold d-block mb-1">
                      <FontAwesomeIcon icon={faKey} className="me-1 text-primary-custom" /> Instruções de Resgate / Ativação:
                    </span>
                    <small className="text-dark bg-white p-2 rounded-3 border d-block">{product.digitalInstructions}</small>
                  </div>
                )}
              </div>

              {/* Seletor de Quantidade */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <span className="fw-bold text-dark small">Quantidade:</span>
                <div className="input-group" style={{ width: '130px' }}>
                  <button 
                    className="btn btn-outline-secondary rounded-start-pill"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <FontAwesomeIcon icon={faMinus} />
                  </button>
                  <input 
                    type="text" 
                    className="form-control text-center border-secondary fw-bold" 
                    value={quantity} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-outline-secondary rounded-end-pill"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="d-flex gap-3 pt-3 border-top">
              <button 
                className="btn btn-outline-dark flex-grow-1 py-3 rounded-pill fw-bold fs-6"
                onClick={handleAddToCart}
              >
                <FontAwesomeIcon icon={faShoppingCart} className="me-2" /> Adicionar ao Carrinho
              </button>
              <button 
                className="btn bg-primary-custom text-white flex-grow-1 py-3 rounded-pill fw-bold fs-6 shadow-sm"
                onClick={handleBuyNow}
              >
                <FontAwesomeIcon icon={faShoppingBag} className="me-2" /> Comprar Agora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECÇÃO DE PRODUTOS RELACIONADOS */}
      {relatedProducts.length > 0 && (
        <section className="mb-5">
          <h4 className="fw-bold text-dark mb-3">Produtos Relacionados</h4>
          <div className="row g-4">
            {relatedProducts.map((p) => (
              <div key={p._id} className="col-12 col-sm-6 col-md-3">
                <div className="card h-100 border-0 shadow-sm rounded-4 p-3 bg-white hover-lift">
                  <Link to={`/shop/product/${p.slug || p._id}`} className="text-decoration-none text-dark">
                    <img 
                      src={getProductImageUrl(p)} 
                      alt={p.nome || p.name} 
                      className="img-fluid rounded-3 mb-2 w-100 object-fit-cover" 
                      style={{ height: '150px' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                    <div className="d-flex align-items-center gap-2 mb-1">
                      {p.productType === 'DIGITAL' ? (
                        <span className="badge bg-purple-light text-primary-custom rounded-pill small" style={{ backgroundColor: '#F3E8FF', fontSize: '9px' }}>⚡ Digital</span>
                      ) : (
                        <span className="badge bg-light text-dark rounded-pill border small" style={{ fontSize: '9px' }}>📦 Físico</span>
                      )}
                    </div>
                    <h6 className="fw-bold text-dark text-truncate mb-1">{p.nome || p.name}</h6>
                    <span className="fw-black text-primary-custom fs-6">{Number(p.price || 0).toLocaleString('pt-PT')} MT</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
