import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faStar, faMapMarkerAlt, faShoppingBag, faEye } from '@fortawesome/free-solid-svg-icons';
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
        <div className="d-flex flex-column gap-3">
          {products.map((product) => (
            <div className="bg-white border rounded-4 p-3 hover-shadow transition-all d-flex align-items-center" key={product._id}>
              <div className="me-4 position-relative" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
                <img
                  src={product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/150?text=Sem+Imagem'}
                  alt={product.name}
                  className="img-fluid rounded-3 w-100 h-100"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              
              <div className="flex-grow-1">
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>{product.vendor || 'Nhiquela Partner'}</small>
                <h5 className="fw-bold text-black mb-1 mt-1">{product.name}</h5>
                
                <div className="d-flex align-items-center gap-3 text-muted small fw-bold mb-2">
                  <span className="text-primary-custom"><FontAwesomeIcon icon={faStar} /> {product.rating || '4.5'}</span>
                  <span><FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted" /> Maputo</span>
                </div>
                
                <span className="fw-black text-black fs-5">{product.price} MT</span>
              </div>
              
              <div className="d-flex align-items-center gap-2 ms-3 border-start ps-3">
                <button className="btn bg-black text-white rounded-circle d-flex justify-content-center align-items-center" style={{ width: '45px', height: '45px' }} title="Comprar">
                  <FontAwesomeIcon icon={faShoppingBag} />
                </button>
                <Link to={`/shop/product/${product._id}`} className="btn btn-outline-primary rounded-circle d-flex justify-content-center align-items-center" style={{ width: '45px', height: '45px' }} title="Ver Detalhes">
                  <FontAwesomeIcon icon={faEye} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
