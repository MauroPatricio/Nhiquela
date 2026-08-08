import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMapMarkerAlt, faCreditCard, faMotorcycle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/features/userSlice';
import { selectBasketItems, selectBasketTotal } from '../store/features/basketSlice';
import api from '../api';

export default function CheckoutScreen() {
  const userInfo = useSelector(selectUser);
  const cartItems = useSelector(selectBasketItems);
  const cartTotal = useSelector(selectBasketTotal);
  
  const [step, setStep] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const navigate = useNavigate();

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
    if (cartItems.length === 0) {
      toast.warning('Seu carrinho está vazio.');
      navigate('/shop/cart');
    }
  }, [userInfo, cartItems, navigate]);

  const deliveryFee = 350; // Fixo para exemplo
  const totalPrice = cartTotal + deliveryFee;

  const placeOrderHandler = async () => {
    setPlacingOrder(true);
    try {
      const orderItems = cartItems.map(item => ({
        ...item,
        quantity: item.quantity || 1,
        product: item._id
      }));

      const orderPayload = {
        orderItems: orderItems,
        address: "Av. Eduardo Mondlane, Prédio 104, 3º Andar. Maputo, Moçambique",
        isUserWantDelivery: true,
        paymentMethod: paymentMethod,
        itemsPrice: cartTotal,
        deliveryPrice: deliveryFee,
        taxPrice: 0,
        totalPrice: totalPrice,
        ivaTax: 0,
        siteTax: 0,
        addressPrice: deliveryFee,
        itemsPriceForSeller: cartTotal,
        user: { _id: userInfo._id },
        isPaid: false,
        stepStatus: 0,
        sellerPriceWithDeliver: totalPrice
      };

      const { data } = await api.post('/orders', orderPayload, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      
      toast.success(data.mensagem || 'Pedido realizado com sucesso!');
      
      // Limpa o carrinho local e redireciona (o ideal seria chamar API pra limpar)
      navigate('/shop');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao processar o pedido');
    } finally {
      setPlacingOrder(false);
    }
  };



  return (
    <div className="container py-4" style={{ maxWidth: '900px' }}>
      <Link to="/cart" className="text-decoration-none text-muted mb-4 d-inline-block">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Voltar ao Carrinho
      </Link>
      
      <h2 className="fw-bold mb-4">Finalizar Compra</h2>

      <div className="row g-4">
        <div className="col-md-8">
          {/* Etapa 1: Endereço de Entrega */}
          <div className={`card border-0 shadow-sm-custom rounded-3 mb-4 ${step !== 1 ? 'opacity-75' : ''}`}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center">
              <span className="badge bg-primary-custom rounded-circle me-3 p-2" style={{ width: '30px' }}>1</span>
              <h5 className="m-0 fw-bold">Endereço de Entrega</h5>
            </div>
            {step === 1 && (
              <div className="card-body p-4">
                <div className="border rounded-3 p-3 mb-3 d-flex align-items-start bg-light border-primary">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-primary-custom mt-1 me-3 fs-5" />
                  <div>
                    <h6 className="fw-bold m-0">Minha Casa</h6>
                    <p className="text-muted m-0 small">Av. Eduardo Mondlane, Prédio 104, 3º Andar. Maputo, Moçambique</p>
                  </div>
                </div>
                <button className="btn btn-outline-secondary btn-sm mb-3">+ Adicionar novo endereço</button>
                <div>
                  <button className="btn bg-primary-custom text-white px-4" onClick={() => setStep(2)}>Continuar para Entrega</button>
                </div>
              </div>
            )}
          </div>

          {/* Etapa 2: Método de Entrega */}
          <div className={`card border-0 shadow-sm-custom rounded-3 mb-4 ${step !== 2 ? 'opacity-75' : ''}`}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center">
              <span className={`badge rounded-circle me-3 p-2 ${step >= 2 ? 'bg-primary-custom' : 'bg-secondary'}`} style={{ width: '30px' }}>2</span>
              <h5 className="m-0 fw-bold">Opções de Entrega</h5>
            </div>
            {step === 2 && (
              <div className="card-body p-4">
                <div className="border rounded-3 p-3 mb-3 d-flex align-items-center justify-content-between bg-light border-primary">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faMotorcycle} className="text-primary-custom me-3 fs-4" />
                    <div>
                      <h6 className="fw-bold m-0">Entrega Nhiquela (Moto)</h6>
                      <small className="text-muted">Chega em aproximadamente 45 mins</small>
                    </div>
                  </div>
                  <span className="fw-bold">{deliveryFee} MT</span>
                </div>
                <div>
                  <button className="btn bg-primary-custom text-white px-4" onClick={() => setStep(3)}>Continuar para Pagamento</button>
                </div>
              </div>
            )}
          </div>

          {/* Etapa 3: Pagamento */}
          <div className={`card border-0 shadow-sm-custom rounded-3 ${step !== 3 ? 'opacity-75' : ''}`}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center">
              <span className={`badge rounded-circle me-3 p-2 ${step === 3 ? 'bg-primary-custom' : 'bg-secondary'}`} style={{ width: '30px' }}>3</span>
              <h5 className="m-0 fw-bold">Pagamento</h5>
            </div>
            {step === 3 && (
              <div className="card-body p-4">
                <div className="d-flex flex-column gap-3 mb-4">
                  <label className={`border rounded-3 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === 'M-Pesa' ? 'border-primary bg-light' : ''}`}>
                    <input type="radio" name="payment" className="form-check-input me-3" checked={paymentMethod === 'M-Pesa'} onChange={() => setPaymentMethod('M-Pesa')} />
                    <div className="flex-grow-1">
                      <h6 className="fw-bold m-0">M-Pesa</h6>
                      <small className="text-muted">Pagamento móvel rápido e seguro</small>
                    </div>
                  </label>
                  <label className={`border rounded-3 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === 'e-Mola' ? 'border-primary bg-light' : ''}`}>
                    <input type="radio" name="payment" className="form-check-input me-3" checked={paymentMethod === 'e-Mola'} onChange={() => setPaymentMethod('e-Mola')} />
                    <div className="flex-grow-1">
                      <h6 className="fw-bold m-0">e-Mola</h6>
                      <small className="text-muted">Pague com sua carteira e-Mola</small>
                    </div>
                  </label>
                  <label className={`border rounded-3 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === 'Carteira Nhiquela' ? 'border-primary bg-light' : ''}`}>
                    <input type="radio" name="payment" className="form-check-input me-3" checked={paymentMethod === 'Carteira Nhiquela'} onChange={() => setPaymentMethod('Carteira Nhiquela')} />
                    <div className="flex-grow-1">
                      <h6 className="fw-bold m-0">Carteira Nhiquela</h6>
                      <small className="text-muted">Use o seu saldo da plataforma</small>
                    </div>
                  </label>
                </div>

                <button 
                  onClick={placeOrderHandler} 
                  disabled={placingOrder} 
                  className="btn btn-success text-white w-100 py-3 rounded-pill fw-bold fs-5 shadow-sm"
                >
                  {placingOrder ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ) : null}
                  Confirmar e Pagar {totalPrice.toLocaleString()} MT
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Lateral */}
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3 sticky-top" style={{ top: '20px' }}>
            <div className="card-body p-4">
              <h6 className="fw-bold border-bottom pb-3 mb-3">Resumo da Compra</h6>
              <div className="d-flex justify-content-between mb-2 small text-muted">
                <span>Produtos ({cartItems.length})</span>
                <span>{cartTotal.toLocaleString()} MT</span>
              </div>
              <div className="d-flex justify-content-between mb-3 small text-muted">
                <span>Entrega</span>
                <span>{step >= 2 ? `${deliveryFee} MT` : 'A calcular'}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold fs-5">Total</span>
                <span className="fw-bold fs-4 text-primary-custom">
                  {step >= 2 ? totalPrice.toLocaleString() : cartTotal.toLocaleString()} <small className="fs-6">MT</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
