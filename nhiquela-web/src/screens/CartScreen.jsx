import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMinus, faPlus, faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { selectBasketItems, selectBasketTotal, removeFromBasket } from '../store/features/basketSlice';
import { selectUser } from '../store/features/userSlice';

export default function CartScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const userInfo = useSelector(selectUser);
  const cartItems = useSelector(selectBasketItems);
  const cartTotal = useSelector(selectBasketTotal);

  useEffect(() => {
    if (!userInfo) {
      toast.info('Faça login para ver o seu carrinho.');
      navigate('/login');
    }
  }, [userInfo, navigate]);

  const handleRemoveFromCart = (item) => {
    dispatch(removeFromBasket(item));
    toast.success('Produto removido');
  };

  const decrementItem = (item) => {
    // Para simplificar, neste mock apenas removemos, ou podemos adicionar action específica
    dispatch(removeFromBasket(item));
  };

  const incrementItem = (item) => {
    // Para simplificar no web mock
    toast.info('Para alterar quantidade, adicione novamente o produto.');
  };

  return (
    <div className="container py-4">
      <Link to="/shop" className="text-decoration-none text-muted mb-4 d-inline-block">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Continuar Comprando
      </Link>
      
      <h2 className="fw-bold mb-4">Seu Carrinho</h2>

      <div className="row g-4">
        <div className="col-lg-8">
          {cartItems.length === 0 ? (
            <div className="alert alert-info border-0 shadow-sm rounded-3">Seu carrinho está vazio.</div>
          ) : (
            <div className="card shadow-sm-custom border-0 rounded-3">
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {cartItems.map((item) => (
                    <li key={item._id} className="list-group-item p-4">
                      <div className="d-flex align-items-center">
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0].url} alt={item.name} className="rounded-3 border me-3" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                        ) : (
                          <div className="bg-light rounded-3 border me-3 d-flex justify-content-center align-items-center" style={{ width: '80px', height: '80px' }}>
                            <span className="small text-muted">Sem Imagem</span>
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <h6 className="fw-bold m-0">{item.name}</h6>
                          <h6 className="text-primary-custom fw-bold m-0 mt-2">{item.price} MZN</h6>
                        </div>
                        
                        <div className="d-flex align-items-center gap-3">
                          <div className="d-flex align-items-center border rounded-pill px-2 py-1">
                            <button onClick={() => decrementItem(item)} className="btn btn-sm btn-link text-dark text-decoration-none"><FontAwesomeIcon icon={faMinus} /></button>
                            <span className="fw-bold px-3">{item.quantity || 1}</span>
                            <button onClick={() => incrementItem(item)} className="btn btn-sm btn-link text-dark text-decoration-none"><FontAwesomeIcon icon={faPlus} /></button>
                          </div>
                          <button onClick={() => handleRemoveFromCart(item)} className="btn btn-light text-danger rounded-circle p-2" title="Remover">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm-custom border-0 rounded-3">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">Resumo do Pedido</h5>
              
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal ({cartItems.length} itens)</span>
                <span className="fw-bold">{cartTotal.toLocaleString()} MZN</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Taxa de Entrega Estimada</span>
                <span className="text-success fw-bold">Calculado no Checkout</span>
              </div>
              
              <hr />
              
              <div className="d-flex justify-content-between mb-4">
                <span className="fw-bold fs-5">Total</span>
                <span className="fw-bold fs-5 text-primary-custom">{cartTotal.toLocaleString()} MZN</span>
              </div>

              <Link to="/checkout" className={`btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold fs-6 ${cartItems.length === 0 ? 'disabled' : ''}`}>
                Avançar para Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
