import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faStar, faMapMarkerAlt, faShoppingBag, faEye, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { addToBasket } from '../store/features/basketSlice';
import { toast } from 'react-toastify';
import api from '../api';

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
    e.preventDefault();
    e.stopPropagation();

    // Normalizar objeto do vendedor para compatibilidade com o Redux basket
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
                <div className="position-relative mb-3">
                  <img
                    src={product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/300?text=Sem+Imagem'}
                    alt={product.name}
                    className="img-fluid rounded-3 w-100"
                    style={{ height: '190px', objectFit: 'cover' }}
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
                <h5 className="fw-bold text-black mb-auto mt-1">{product.name}</h5>

                <div className="d-flex align-items-center gap-3 text-muted small fw-bold my-2">
                  <span className="text-primary-custom"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.8'}</span>
                  <span><FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted" /> Maputo</span>
                </div>

                <div className="d-flex justify-content-between align-items-center my-2">
                  <span className="fw-black text-black fs-4">{product.price} MT</span>
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
