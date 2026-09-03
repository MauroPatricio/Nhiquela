import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faStar, faMapMarkerAlt, faShoppingBag, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { toast } from 'react-toastify';
import api from '../api';

const DEFAULT_PRODUCT_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23F3F4F6"/><path d="M150 110 L190 170 L110 170 Z" fill="%239CA3AF"/><circle cx="125" cy="125" r="12" fill="%239CA3AF"/><text x="150" y="210" font-family="sans-serif" font-size="14" font-weight="bold" fill="%236B7280" text-anchor="middle">Nhiquela Marketplace</text></svg>`;

export const getProductImageUrl = (product) => {
  if (!product) return DEFAULT_PRODUCT_IMAGE;
  if (typeof product.image === 'string' && product.image.trim()) return product.image;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0];
    if (typeof firstImg === 'string' && firstImg.trim()) return firstImg;
    if (typeof firstImg === 'object' && firstImg !== null && firstImg.url) return firstImg.url;
  }
  return DEFAULT_PRODUCT_IMAGE;
};

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        const data = res.data;
        const productsArray = Array.isArray(data) ? data : (data?.products || []);
        setProducts(productsArray);
      } catch (err) {
        console.warn('Failed to load products', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

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
      image: getProductImageUrl(product),
      seller: sellerObj,
      onSale: Boolean(product.onSale),
      discount: Number(product.discount || 0),
      priceFromSeller: Number(product.priceFromSeller || product.price || 0),
      sellerEarningsAfterDiscount: Number(product.sellerEarningsAfterDiscount || product.price || 0)
    };

    dispatch(addToBasket(formattedItem));
    toast.success(`${formattedItem.name} adicionado ao carrinho!`);
  };

  const handleBuyNow = (product, e) => {
    handleAddToCart(product, e);
    navigate('/shop/cart');
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark m-0" style={{ fontSize: '2.2rem' }}>Catálogo de Produtos</h2>
          <p className="text-muted m-0">Explore e compre produtos disponíveis em Moçambique</p>
        </div>
        <Link to="/shop/cart" className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold">
          Ver Carrinho <FontAwesomeIcon icon={faShoppingBag} className="ms-2" />
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-4 border">
          <h5 className="text-muted">Nenhum produto encontrado.</h5>
        </div>
      ) : (
        <div className="row g-4">
          {products.map((product) => (
            <div className="col-12 col-md-6 col-lg-4 col-xl-3" key={product._id}>
              <div className="bg-white border rounded-4 p-3 h-100 hover-shadow transition-all d-flex flex-column">
                <div className="position-relative mb-3 rounded-3 overflow-hidden bg-light" style={{ height: '190px' }}>
                  <img
                    src={getProductImageUrl(product)}
                    alt={product.nome || product.name}
                    className="img-fluid rounded-3 w-100 h-100 object-fit-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_PRODUCT_IMAGE;
                    }}
                  />
                  {product.countInStock < 5 && (
                    <span className="badge bg-danger position-absolute" style={{ top: '10px', left: '10px' }}>
                      Pouco Stock
                    </span>
                  )}
                </div>

                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                  {product.seller?.name || product.vendor || 'Nhiquela Partner'}
                </small>
                <h5 className="fw-bold text-black mb-auto mt-1">{product.nome || product.name}</h5>

                <div className="d-flex align-items-center gap-3 text-muted small fw-bold my-2">
                  <span className="text-primary-custom"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.8'}</span>
                  <span><FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted" /> Maputo</span>
                </div>

                <div className="d-flex justify-content-between align-items-center my-2">
                  <span className="fw-black text-black fs-4">{Number(product.price || 0).toLocaleString('pt-PT')} MT</span>
                </div>

                <div className="d-flex gap-2 mt-2">
                  <button 
                    className="btn btn-outline-dark flex-grow-1 fw-bold rounded-3 py-2 small"
                    onClick={(e) => handleAddToCart(product, e)}
                  >
                    + Carrinho
                  </button>
                  <button 
                    className="btn bg-primary-custom text-white flex-grow-1 fw-bold rounded-3 py-2 small"
                    onClick={(e) => handleBuyNow(product, e)}
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
