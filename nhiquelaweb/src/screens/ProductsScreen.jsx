import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faStar, faMapMarkerAlt, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import api from '../api';

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="container py-5">
      <h2 className="fw-bold mb-4" style={{ fontSize: '2rem' }}>Produtos</h2>
      {loading ? (
        <div className="text-center py-5">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary-custom" />
        </div>
      ) : (
        <div className="row g-4">
          {products.map((product) => (
            <div className="col-12 col-md-6 col-lg-3" key={product._id}>
              <Link to={`/shop/product/${product._id}`} className="text-decoration-none text-dark">
                <div className="bg-white border rounded-4 p-3 h-100 hover-shadow transition-all d-flex flex-column">
                  <div className="position-relative mb-3">
                    <img
                      src={product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/500?text=Sem+Imagem'}
                      alt={product.name}
                      className="img-fluid rounded-3 w-100"
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                  </div>
                  <small className="text-muted">{product.vendor || 'Nhiquela Partner'}</small>
                  <h5 className="fw-bold text-black mb-auto mt-1">{product.name}</h5>
                  <div className="d-flex justify-content-between align-items-center my-3">
                    <span className="fw-black text-black fs-5">{product.price} MZN</span>
                  </div>
                  <div className="d-flex align-items-center gap-3 text-muted small fw-bold mb-3">
                    <span className="text-primary-custom"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.5'}</span>
                    <span><FontAwesomeIcon icon={faMapMarkerAlt} className="text-light" /> Maputo</span>
                  </div>
                  <button className="btn bg-black text-white w-100 fw-bold py-2 rounded-3 mt-auto">
                    <FontAwesomeIcon icon={faShoppingBag} className="me-2" /> Comprar
                  </button>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
