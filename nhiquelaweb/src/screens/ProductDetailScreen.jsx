import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMinus, faPlus, faShoppingCart, faSpinner, faStar, faStore, faMapMarkerAlt, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { selectUser } from '../store/features/userSlice';
import api from '../api';

export default function ProductDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
      } catch (error) {
        console.error('Erro ao carregar produto:', error);
        toast.error('Não foi possível carregar os detalhes do produto.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  const getImageSrc = () => {
    if (!product) return null;
    if (product.image) return product.image;
    if (product.images && product.images.length > 0) return product.images[0];
    return null;
  };

  const getSellerName = () => {
    if (!product) return 'Nhiquela Partner';
    if (product.seller?.userId?.name) return product.seller.userId.name;
    if (product.seller?.name) return product.seller.name;
    return 'Nhiquela Partner';
  };

  const getSellerId = () => {
    if (!product) return null;
    // seller._id is the Seller document id; we need the User id to navigate to /seller/:userId
    return product.seller?.userId?._id || product.seller?.userId || product.seller?._id || null;
  };

  const getSellerLocation = () => {
    if (!product?.seller) return null;
    const lat = parseFloat(product.seller.latitude || product.seller.lat || 0);
    const lng = parseFloat(product.seller.longitude || product.seller.lng || 0);
    if (lat && lng) return { lat, lng };
    return null;
  };

  const addToCartHandler = () => {
    if (!userInfo) {
      toast.info('Faça login para adicionar ao carrinho');
      navigate('/login');
      return;
    }
    dispatch(addToBasket({ ...product, quantity }));
    toast.success('Adicionado ao carrinho com sucesso!');
    navigate('/shop/cart');
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
      </div>
    );
  }

  if (!product) {
    return <div className="container py-5 text-center">Produto não encontrado</div>;
  }

  const imageSrc = getImageSrc();

  return (
    <div className="container py-4">
      <Link to="/shop" className="text-decoration-none text-muted mb-4 d-inline-block">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Voltar aos produtos
      </Link>
      
      <div className="card border-0 shadow-sm-custom rounded-4 overflow-hidden">
        <div className="row g-0">
          {/* Imagem */}
          <div className="col-md-6 bg-light d-flex align-items-center justify-content-center p-5">
            {imageSrc ? (
              <img 
                src={imageSrc} 
                alt={product.nome || product.name} 
                className="img-fluid rounded-4 shadow-sm"
                style={{ maxHeight: '400px', objectFit: 'contain' }} 
              />
            ) : (
              <div className="text-muted fs-5">Sem Imagem</div>
            )}
          </div>
          
          {/* Detalhes */}
          <div className="col-md-6 p-5 d-flex flex-column">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge bg-light text-dark fs-6">
                <FontAwesomeIcon icon={faStar} className="text-warning me-1"/>
                {product.rating || 0} ({product.numReviews || 0} avaliações)
              </span>
              {product.productType === 'DIGITAL' ? (
                <span className="badge bg-purple text-white fs-6" style={{ backgroundColor: '#9333EA' }}>
                  ⚡ Produto Digital / Licença
                </span>
              ) : (
                <span className="badge bg-secondary-subtle text-dark fs-6">
                  📦 Produto Físico (com entrega)
                </span>
              )}
            </div>
            
            <h2 className="fw-bold mb-2">{product.nome || product.name}</h2>
            <p className="text-muted mb-1">
              Vendido por:{' '}
              {getSellerId() ? (
                <Link
                  to={`/shop/seller/${getSellerId()}`}
                  className="fw-bold text-primary-custom text-decoration-none"
                  style={{ cursor: 'pointer' }}
                >
                  <FontAwesomeIcon icon={faStore} className="me-1" size="sm" />
                  {getSellerName()}
                </Link>
              ) : (
                <span className="fw-bold">{getSellerName()}</span>
              )}
            </p>
            {getSellerLocation() && (
              <p className="mb-3">
                <a
                  href={`https://www.google.com/maps?q=${getSellerLocation().lat},${getSellerLocation().lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted small text-decoration-none"
                >
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-primary-custom" />
                  Ver localização do fornecedor
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="ms-1" size="xs" />
                </a>
              </p>
            )}

            {product.brand && (
              <p className="text-muted mb-2">Marca: <span className="fw-semibold">{product.brand}</span></p>
            )}

            {product.countInStock !== undefined && (
              <p className="mb-3">
                {product.countInStock > 0 ? (
                  <span className="badge bg-success-subtle text-success">Em stock ({product.countInStock})</span>
                ) : (
                  <span className="badge bg-danger-subtle text-danger">Esgotado</span>
                )}
              </p>
            )}
            
            <h3 className="text-primary-custom fw-bold mb-4">{product.price} MT</h3>
            
            {product.description && (
              <div className="mb-4">
                <h6 className="fw-bold mb-2">Descrição</h6>
                <p className="text-muted">{product.description}</p>
              </div>
            )}
            
            <hr className="my-4"/>
            
            <div className="d-flex align-items-center gap-4 mt-auto">
              <div className="d-flex align-items-center border rounded-pill px-3 py-2 bg-light">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                  className="btn btn-sm btn-link text-dark text-decoration-none"
                >
                  <FontAwesomeIcon icon={faMinus} />
                </button>
                <span className="fw-bold px-4 fs-5">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.countInStock || 99, quantity + 1))} 
                  className="btn btn-sm btn-link text-dark text-decoration-none"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
              
              <button 
                onClick={addToCartHandler} 
                disabled={addingToCart || product.countInStock === 0}
                className="btn bg-primary-custom text-white flex-grow-1 py-3 rounded-pill fw-bold fs-5 shadow-sm"
              >
                {addingToCart ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                ) : (
                  <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                )}
                {product.countInStock === 0 ? 'Esgotado' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
