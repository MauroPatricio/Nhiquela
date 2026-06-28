import { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMinus, faPlus, faShoppingCart, faSpinner, faStar } from '@fortawesome/free-solid-svg-icons';
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
    // Mock Product instead of api.get
    setProduct({
      _id: id,
      name: 'Produto Mockado',
      price: '850',
      vendor: 'Nhiquela Partner',
      rating: 4.8,
      desc: 'Descrição detalhada do produto...',
      images: [{url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'}],
      stock: 10
    });
    setLoading(false);
  }, [id, navigate]);

  const addToCartHandler = () => {
    if (!userInfo) {
      toast.info('Faça login para adicionar ao carrinho');
      navigate('/login');
      return;
    }
    
    // Como mock, assumimos que seller é um objeto para a lógica do redux
    const productToAdd = {
      ...product,
      seller: { _id: 'vendor_1', name: product.vendor },
      quantity
    };

    dispatch(addToBasket(productToAdd));
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

  return (
    <div className="container py-4">
      <Link to="/shop" className="text-decoration-none text-muted mb-4 d-inline-block">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Voltar aos produtos
      </Link>
      
      <div className="card border-0 shadow-sm-custom rounded-4 overflow-hidden">
        <div className="row g-0">
          <div className="col-md-6 bg-light d-flex align-items-center justify-content-center p-5">
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[0].url} 
                alt={product.name} 
                className="img-fluid rounded-4 shadow-sm"
                style={{ maxHeight: '400px', objectFit: 'contain' }} 
              />
            ) : (
              <div className="text-muted">Sem Imagem</div>
            )}
          </div>
          
          <div className="col-md-6 p-5 d-flex flex-column">
            <span className="badge bg-light text-dark align-self-start mb-3 fs-6">
              <FontAwesomeIcon icon={faStar} className="text-warning me-1"/> 
              {product.rating || 'N/A'} Avaliações
            </span>
            
            <h2 className="fw-bold mb-2">{product.name}</h2>
            <p className="text-muted mb-4">Vendido por: <span className="fw-bold">{product.vendor || 'Nhiquela Partner'}</span></p>
            
            <h3 className="text-primary-custom fw-bold mb-4">{product.price} MZN</h3>
            
            <div className="mb-4">
              <h6 className="fw-bold mb-2">Descrição</h6>
              <p className="text-muted">{product.desc || 'Nenhuma descrição fornecida pelo fornecedor para este produto.'}</p>
            </div>
            
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
                  onClick={() => setQuantity(quantity + 1)} 
                  className="btn btn-sm btn-link text-dark text-decoration-none"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
              
              <button 
                onClick={addToCartHandler} 
                disabled={addingToCart}
                className="btn bg-primary-custom text-white flex-grow-1 py-3 rounded-pill fw-bold fs-5 shadow-sm"
              >
                {addingToCart ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                ) : (
                  <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                )}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
