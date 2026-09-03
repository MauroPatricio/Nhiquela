import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash, faMinus, faPlus, faArrowLeft, faStore,
  faShoppingCart, faTruck, faLock, faCheckCircle
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

  // Agrupar produtos por Loja / Fornecedor
  const groupedByStore = useMemo(() => {
    const groups = {};
    cartItems.forEach((item) => {
      const sellerName = item.seller?.name || item.vendor || 'Fornecedor Parceiro';
      const sellerId = item.seller?._id || 'default_store';

      if (!groups[sellerId]) {
        groups[sellerId] = {
          id: sellerId,
          name: sellerName,
          items: []
        };
      }
      groups[sellerId].items.push(item);
    });
    return Object.values(groups);
  }, [cartItems]);

  // Cálculos Financeiros
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + Number(item.price || 0) * (item.quantity || 1), 0);
  }, [cartItems]);

  // 200 MT por loja parceira no carrinho
  const deliveryFee = useMemo(() => {
    if (cartItems.length === 0) return 0;
    return groupedByStore.length * 200;
  }, [groupedByStore, cartItems]);

  const grandTotal = subtotal + deliveryFee;

  const handleIncrement = (item) => {
    dispatch(addToBasket({ ...item, quantity: 1 }));
  };

  const handleDecrement = (item) => {
    if ((item.quantity || 1) <= 1) {
      dispatch(removeFromBasket(item));
    } else {
      dispatch(removeFromBasket(item));
      for (let i = 0; i < item.quantity - 1; i++) {
        dispatch(addToBasket({ ...item, quantity: 1 }));
      }
    }
  };

  const handleRemove = (item) => {
    dispatch(removeFromBasket(item));
    toast.success('Produto removido do carrinho.');
  };

  const handleClear = () => {
    dispatch(clearBasket());
    toast.info('Carrinho esvaziado.');
  };

  const handleCheckout = () => {
    if (!userInfo) {
      toast.info('Faça login para continuar para o pagamento.');
      navigate('/login?redirect=/shop/checkout');
      return;
    }
    navigate('/shop/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="card border-0 shadow-sm rounded-4 p-5 max-w-lg mx-auto bg-white">
          <FontAwesomeIcon icon={faShoppingCart} size="4x" className="text-muted mb-3" />
          <h4 className="fw-bold text-dark mb-2">O seu carrinho está vazio</h4>
          <p className="text-muted mb-4">Explore os produtos do marketplace e adicione os seus itens favoritos.</p>
          <div>
            <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-5 py-3 fw-bold">
              Ir para o Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Botão Voltar */}
      <Link to="/shop" className="text-decoration-none text-muted mb-4 d-inline-block fw-bold">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Continuar a Comprar
      </Link>

      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="fw-black text-dark m-0">
          <FontAwesomeIcon icon={faShoppingCart} className="me-2 text-primary-custom" />
          Carrinho de Compras
        </h2>
        <button onClick={handleClear} className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold">
          <FontAwesomeIcon icon={faTrash} className="me-1" /> Esvaziar Carrinho
        </button>
      </div>

      <div className="row g-4">
        {/* PRODUTOS AGRUPADOS POR LOJA */}
        <div className="col-lg-8">
          {groupedByStore.map((group) => (
            <div key={group.id} className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden bg-white">
              {/* Header da Loja */}
              <div className="bg-light p-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2 fw-bold text-dark">
                  <FontAwesomeIcon icon={faStore} className="text-primary-custom" />
                  <span>{group.name}</span>
                </div>
                <span className="badge bg-white text-muted border rounded-pill px-3 py-1 small">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {/* Lista de Itens da Loja */}
              <div className="p-3">
                {group.items.map((item, idx) => (
                  <div key={item._id || idx} className="d-flex flex-column flex-sm-row align-items-center gap-3 py-3 border-bottom last-border-0">
                    <img 
                      src={item.image || 'https://via.placeholder.com/80'} 
                      alt={item.name} 
                      className="rounded-3 object-fit-cover flex-shrink-0" 
                      style={{ width: '80px', height: '80px' }}
                    />
                    
                    <div className="flex-grow-1 text-center text-sm-start">
                      <h6 className="fw-bold text-dark mb-1">{item.name}</h6>
                      <div className="text-primary-custom fw-black fs-5">
                        {Number(item.price || 0).toLocaleString('pt-PT')} MT
                      </div>
                    </div>

                    {/* Quantidade */}
                    <div className="d-flex align-items-center gap-2">
                      <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => handleDecrement(item)}>
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <span className="fw-bold px-2">{item.quantity || 1}</span>
                      <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => handleIncrement(item)}>
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>

                    {/* Subtotal Item */}
                    <div className="fw-bold text-dark text-nowrap px-2" style={{ minWidth: '90px' }}>
                      {(Number(item.price || 0) * (item.quantity || 1)).toLocaleString('pt-PT')} MT
                    </div>

                    {/* Botão Remover */}
                    <button className="btn btn-link text-danger p-0" onClick={() => handleRemove(item)} title="Remover produto">
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RESUMO DO PEDIDO */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 sticky-top bg-white" style={{ top: '100px' }}>
            <h5 className="fw-black text-dark mb-3">Resumo do Pedido</h5>
            
            <div className="d-flex justify-content-between mb-2 text-muted">
              <span>Subtotal</span>
              <span className="fw-bold text-dark">{subtotal.toLocaleString('pt-PT')} MT</span>
            </div>

            <div className="d-flex justify-content-between mb-3 text-muted">
              <span>Entrega ({groupedByStore.length} {groupedByStore.length === 1 ? 'loja' : 'lojas'})</span>
              <span className="fw-bold text-dark">{deliveryFee.toLocaleString('pt-PT')} MT</span>
            </div>

            <hr className="my-3" />

            <div className="d-flex justify-content-between mb-4">
              <span className="fw-bold fs-5 text-dark">Total</span>
              <span className="fw-black fs-4 text-primary-custom">{grandTotal.toLocaleString('pt-PT')} MT</span>
            </div>

            <button 
              className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold shadow-sm fs-6 mb-3"
              onClick={handleCheckout}
            >
              Continuar para Pagamento
            </button>

            <div className="text-center text-muted small">
              <FontAwesomeIcon icon={faLock} className="me-1 text-success" /> Pagamento 100% Seguro via M-Pesa / e-Mola
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
