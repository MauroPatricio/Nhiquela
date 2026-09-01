import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash, faMinus, faPlus, faArrowLeft, faStore,
  faShoppingCart, faExclamationTriangle, faMapMarkerAlt, faLock
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectBasketItems, selectBasketTotal,
  removeFromBasket, clearBasket, addToBasket
} from '../store/features/basketSlice';
import { selectUser } from '../store/features/userSlice';

export default function CartScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userInfo = useSelector(selectUser);
  const cartItems = useSelector(selectBasketItems);
  const cartTotal = useSelector(selectBasketTotal);

  // Enforce login
  useEffect(() => {
    if (!userInfo) {
      toast.info('Faça login para ver o seu carrinho.');
      navigate('/login?redirect=/shop/cart');
    }
  }, [userInfo, navigate]);

  // Detect multiple sellers — only 1 seller allowed
  const sellerIds = [...new Set(cartItems.map(i => i.seller?._id || i.seller).filter(Boolean))];
  const hasMultipleSellers = sellerIds.length > 1;

  const handleRemoveFromCart = (item) => {
    dispatch(removeFromBasket(item));
    toast.success('Produto removido do carrinho.');
  };

  const handleDecrement = (item) => {
    if ((item.quantity || 1) <= 1) {
      dispatch(removeFromBasket(item));
    } else {
      // Re-add with decremented quantity — simple approach matching basket logic
      dispatch(removeFromBasket(item));
      dispatch(addToBasket({ ...item, quantity: (item.quantity || 1) - 1 }));
    }
  };

  const handleClearCart = () => {
    dispatch(clearBasket());
    toast.info('Carrinho esvaziado.');
  };

  const handleCheckout = () => {
    if (!userInfo) {
      toast.warning('Faça login para continuar.');
      navigate('/login?redirect=/shop/checkout');
      return;
    }
    if (hasMultipleSellers) {
      toast.error('O carrinho contém produtos de múltiplos fornecedores. Mantenha apenas um fornecedor por pedido.');
      return;
    }
    navigate('/shop/checkout');
  };

  if (!userInfo) return null;

  return (
    <div className="container py-4">
      <Link to="/shop" className="text-decoration-none text-muted mb-4 d-inline-block">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Continuar a Comprar
      </Link>

      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="fw-bold m-0">
          <FontAwesomeIcon icon={faShoppingCart} className="me-2 text-primary-custom" />
          Carrinho
        </h2>
        {cartItems.length > 0 && (
          <button onClick={handleClearCart} className="btn btn-outline-danger btn-sm rounded-pill px-3">
            <FontAwesomeIcon icon={faTrash} className="me-1" /> Esvaziar
          </button>
        )}
      </div>

      {/* Alert: Multiple Sellers */}
      {hasMultipleSellers && (
        <div className="alert alert-warning border-0 rounded-4 d-flex align-items-start gap-3 mb-4 shadow-sm">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning fs-5 mt-1 flex-shrink-0" />
          <div>
            <strong>Fornecedores misturados!</strong>
            <p className="mb-0 small text-muted">
              O seu carrinho tem produtos de {sellerIds.length} fornecedores diferentes.
              Apenas é permitido finalizar compras de <strong>um único fornecedor</strong> por pedido.
              Remova os produtos do fornecedor que não deseja para continuar.
            </p>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Items list */}
        <div className="col-lg-8">
          {cartItems.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
              <FontAwesomeIcon icon={faShoppingCart} size="3x" className="text-muted mb-3" />
              <h5 className="fw-bold text-dark">O seu carrinho está vazio</h5>
              <p className="text-muted mb-4">Explore os nossos produtos e adicione ao carrinho.</p>
              <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold">
                Ver Produtos
              </Link>
            </div>
          ) : (
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-0">

                {/* Group by seller */}
                {sellerIds.map(sid => {
                  const sellerItems = cartItems.filter(i => (i.seller?._id || i.seller) === sid);
                  const sellerName = sellerItems[0]?.seller?.name ||
                    sellerItems[0]?.seller?.userId?.name ||
                    sellerItems[0]?.seller?.sellerName || 'Fornecedor';
                  const isConflict = hasMultipleSellers;

                  return (
                    <div key={sid} className={`border-bottom ${isConflict ? 'border-warning' : ''}`}>
                      {/* Seller header */}
                      <div className={`px-4 py-2 d-flex align-items-center gap-2 ${isConflict ? 'bg-warning-subtle' : 'bg-light'}`}>
                        <FontAwesomeIcon icon={faStore} className={isConflict ? 'text-warning' : 'text-primary-custom'} />
                        <span className="fw-bold small">{sellerName}</span>
                        {isConflict && (
                          <span className="badge bg-warning text-dark ms-auto small">
                            Conflito
                          </span>
                        )}
                      </div>

                      <ul className="list-group list-group-flush">
                        {sellerItems.map((item) => (
                          <li key={item._id + (item.quantity || 1)} className="list-group-item px-4 py-3">
                            <div className="d-flex align-items-center gap-3">
                              {/* Image */}
                              {item.image || (item.images?.length > 0) ? (
                                <img
                                  src={item.image || item.images[0]}
                                  alt={item.nome || item.name}
                                  className="rounded-3 border flex-shrink-0"
                                  style={{ width: '72px', height: '72px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div
                                  className="bg-light rounded-3 border flex-shrink-0 d-flex justify-content-center align-items-center"
                                  style={{ width: '72px', height: '72px' }}
                                >
                                  <span className="small text-muted">Sem<br/>Imagem</span>
                                </div>
                              )}

                              {/* Details */}
                              <div className="flex-grow-1 min-w-0">
                                <h6 className="fw-bold mb-1 text-truncate">{item.nome || item.name}</h6>
                                <span className="text-primary-custom fw-bold">{Number(item.price).toLocaleString()} MT</span>
                              </div>

                              {/* Quantity & Remove */}
                              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                <div className="d-flex align-items-center border rounded-pill px-2 bg-light">
                                  <button
                                    onClick={() => handleDecrement(item)}
                                    className="btn btn-sm btn-link text-dark text-decoration-none p-1"
                                  >
                                    <FontAwesomeIcon icon={faMinus} size="xs" />
                                  </button>
                                  <span className="fw-bold px-2 small">{item.quantity || 1}</span>
                                  <button
                                    onClick={() => dispatch(addToBasket({ ...item, quantity: 1 }))}
                                    className="btn btn-sm btn-link text-dark text-decoration-none p-1"
                                  >
                                    <FontAwesomeIcon icon={faPlus} size="xs" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveFromCart(item)}
                                  className="btn btn-light text-danger rounded-circle p-2"
                                  title="Remover"
                                  style={{ width: '36px', height: '36px' }}
                                >
                                  <FontAwesomeIcon icon={faTrash} size="xs" />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 rounded-4 sticky-top" style={{ top: '20px' }}>
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4 border-bottom pb-3">Resumo do Pedido</h5>

              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted">Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'})</span>
                <span className="fw-bold">{cartTotal.toLocaleString()} MT</span>
              </div>
              <div className="d-flex justify-content-between mb-3 small">
                <span className="text-muted">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-primary-custom" />
                  Taxa de Entrega
                </span>
                <span className="text-success fw-bold">Calculado no Checkout</span>
              </div>

              <hr />

              <div className="d-flex justify-content-between mb-4">
                <span className="fw-bold fs-5">Total</span>
                <span className="fw-bold fs-5 text-primary-custom">{cartTotal.toLocaleString()} MT</span>
              </div>

              {/* GPS note */}
              <div className="alert alert-info border-0 rounded-3 small p-2 mb-3 d-flex gap-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-primary-custom mt-1 flex-shrink-0" />
                <span>A localização GPS será pedida no checkout para calcular a taxa de entrega real.</span>
              </div>

              {hasMultipleSellers ? (
                <button disabled className="btn btn-secondary w-100 py-3 rounded-pill fw-bold fs-6">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                  Remova Conflitos
                </button>
              ) : !userInfo ? (
                <button
                  onClick={() => navigate('/login?redirect=/shop/checkout')}
                  className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold fs-6"
                >
                  <FontAwesomeIcon icon={faLock} className="me-2" />
                  Entrar para Continuar
                </button>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                  className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold fs-6"
                >
                  Avançar para Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
