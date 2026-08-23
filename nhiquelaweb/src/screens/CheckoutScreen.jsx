import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faMapMarkerAlt, faCreditCard, faMotorcycle, faStore, 
  faCheckCircle, faMoneyBillWave, faPhoneAlt, faUser, faLock, faSignInAlt, faUserPlus
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUserLogin } from '../store/features/userSlice';
import { selectBasketItems, selectBasketTotal, clearBasket } from '../store/features/basketSlice';
import api from '../api';

export default function CheckoutScreen() {
  const userInfo = useSelector(selectUser);
  const cartItems = useSelector(selectBasketItems);
  const cartTotal = useSelector(selectBasketTotal);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isUserWantDelivery, setIsUserWantDelivery] = useState(true);
  const [fullName, setFullName] = useState(userInfo?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(userInfo?.phoneNumber || '');
  const [address, setAddress] = useState('Av. Eduardo Mondlane, Prédio 104, 3º Andar. Maputo');
  
  const [step, setStep] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(null);

  // Estados para Login Rápido caso cliente não esteja autenticado
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0 && !orderCreatedSuccess) {
      toast.warning('O seu carrinho está vazio.');
      navigate('/shop/cart');
    }
  }, [cartItems, navigate, orderCreatedSuccess]);

  useEffect(() => {
    if (userInfo) {
      if (!fullName) setFullName(userInfo.name || '');
      if (!phoneNumber) setPhoneNumber(userInfo.phoneNumber || '');
    }
  }, [userInfo]);

  const deliveryFee = isUserWantDelivery ? 350 : 0;
  const totalPrice = cartTotal + deliveryFee;

  const handleQuickLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const loginPayload = {
        email: loginEmailOrPhone.includes('@') ? loginEmailOrPhone.trim().toLowerCase() : undefined,
        phoneNumber: !loginEmailOrPhone.includes('@') ? loginEmailOrPhone.replace(/\s+/g, '') : undefined,
        password: loginPassword,
      };
      if (!loginPayload.email && !loginPayload.phoneNumber) {
        loginPayload.email = loginEmailOrPhone.trim();
      }

      const { data } = await api.post('/users/signin', loginPayload);
      dispatch(setUserLogin(data));
      toast.success(`Bem-vindo, ${data.name}! Continue a sua compra.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao efetuar login. Verifique as credenciais.');
    } finally {
      setLoggingIn(false);
    }
  };

  const placeOrderHandler = async () => {
    if (!userInfo) {
      toast.info('Por favor, inicie sessão ou cadastre-se para finalizar a compra.');
      return;
    }

    if (isUserWantDelivery && (!address || !address.trim())) {
      toast.error('Por favor, indique o endereço de entrega.');
      return;
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      toast.error('Por favor, indique o número de telemóvel para contacto.');
      return;
    }

    setPlacingOrder(true);
    try {
      const orderItems = cartItems.map(item => ({
        _id: item._id,
        product: item._id,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price,
        image: item.image || (item.images && item.images[0]?.url) || '',
        seller: item.seller?._id || item.seller,
        onSale: item.onSale,
        discount: item.discount,
        priceFromSeller: item.priceFromSeller,
        sellerEarningsAfterDiscount: item.sellerEarningsAfterDiscount
      }));

      const sellerId = orderItems[0]?.seller || null;

      const orderPayload = {
        orderItems: orderItems,
        address: isUserWantDelivery ? address : 'Levantamento no Estabelecimento',
        deliveryAddress: {
          fullName: fullName || userInfo?.name || 'Cliente',
          address: isUserWantDelivery ? address : 'Levantamento no Estabelecimento',
          phoneNumber: String(phoneNumber || userInfo?.phoneNumber || ''),
          alternativePhoneNumber: ''
        },
        seller: sellerId,
        isUserWantDelivery: isUserWantDelivery,
        paymentMethod: paymentMethod,
        itemsPrice: cartTotal,
        deliveryPrice: deliveryFee,
        taxPrice: 0,
        totalPrice: totalPrice,
        ivaTax: 0,
        addressPrice: deliveryFee,
        itemsPriceForSeller: cartTotal,
        user: { _id: userInfo._id, name: userInfo.name, phoneNumber: userInfo.phoneNumber },
        isPaid: false,
        stepStatus: 1, // Pendente / Criado
        sellerPriceWithDeliver: totalPrice
      };

      const { data } = await api.post('/orders', orderPayload, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      
      const newOrder = data.order || data;
      setOrderCreatedSuccess(newOrder);
      dispatch(clearBasket());
      toast.success('Pedido realizado com sucesso!');
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast.error(error.response?.data?.message || 'Erro ao processar o pedido.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (orderCreatedSuccess) {
    return (
      <div className="container py-5 my-5 text-center" style={{ maxWidth: '650px' }}>
        <div className="bg-white p-5 rounded-5 shadow border">
          <div className="bg-success text-white rounded-circle d-flex justify-content-center align-items-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
            <FontAwesomeIcon icon={faCheckCircle} size="3x" />
          </div>
          <h2 className="fw-bold text-dark mb-2">Pedido Confirmado!</h2>
          <p className="text-muted fs-5 mb-4">
            O seu pedido <span className="fw-bold text-primary-custom">#{orderCreatedSuccess.code || orderCreatedSuccess._id}</span> foi recebido com sucesso e enviado ao fornecedor.
          </p>

          <div className="bg-light p-4 rounded-4 text-start mb-4 border">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Tipo de Entrega:</span>
              <span className="fw-bold">{orderCreatedSuccess.isUserWantDelivery ? 'Entrega ao Domicílio' : 'Levantamento no Estabelecimento'}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Método de Pagamento:</span>
              <span className="fw-bold">{orderCreatedSuccess.paymentMethod || paymentMethod}</span>
            </div>
            <div className="d-flex justify-content-between mb-0">
              <span className="text-muted">Valor Total:</span>
              <span className="fw-bold text-success fs-5">{orderCreatedSuccess.totalPrice || totalPrice} MT</span>
            </div>
          </div>

          <div className="d-flex gap-3 justify-content-center">
            <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 py-3 fw-bold">
              Continuar a Comprar
            </Link>
            <Link to="/" className="btn btn-outline-dark rounded-pill px-4 py-3 fw-bold">
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: '950px' }}>
      <Link to="/shop/cart" className="text-decoration-none text-muted mb-4 d-inline-block fw-bold">
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Voltar ao Carrinho
      </Link>
      
      <h2 className="fw-bold mb-4 text-dark">Finalizar Compra Web</h2>

      {/* Banner de Autenticação se não estiver logado */}
      {!userInfo && (
        <div className="card border-primary bg-purple-light shadow-sm rounded-4 mb-4" style={{ backgroundColor: '#F3E8FF', borderColor: '#7F00FF' }}>
          <div className="card-body p-4">
            <div className="row align-items-center g-3">
              <div className="col-md-7">
                <h5 className="fw-bold text-dark mb-1">
                  <FontAwesomeIcon icon={faSignInAlt} className="text-primary-custom me-2" />
                  Identificação do Cliente
                </h5>
                <p className="text-muted mb-0 small">
                  Já possui conta no app ou web? Faça login rápido ou registe-se como cliente para concluir o seu pedido.
                </p>
              </div>
              <div className="col-md-5 text-md-end d-flex gap-2 justify-content-md-end">
                <Link to="/signup?redirect=/shop/checkout" className="btn btn-outline-dark rounded-pill fw-bold btn-sm px-3">
                  <FontAwesomeIcon icon={faUserPlus} className="me-1" /> Criar Conta
                </Link>
              </div>
            </div>

            {/* Form de Login Rápido no Checkout */}
            <form onSubmit={handleQuickLogin} className="mt-3 pt-3 border-top border-purple">
              <div className="row g-2 align-items-center">
                <div className="col-md-5">
                  <input 
                    type="text" 
                    className="form-control form-control-sm bg-white" 
                    placeholder="E-mail ou Telemóvel (ex: 841234567)" 
                    value={loginEmailOrPhone}
                    onChange={(e) => setLoginEmailOrPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <input 
                    type="password" 
                    className="form-control form-control-sm bg-white" 
                    placeholder="Sua Senha" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <button type="submit" className="btn bg-primary-custom text-white btn-sm w-100 rounded-pill fw-bold" disabled={loggingIn}>
                    {loggingIn ? 'A entrar...' : 'Entrar e Continuar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-4">
        <div className="col-md-8">
          
          {/* Opção de Modalidade (Entrega vs Levantamento) */}
          <div className="card border-0 shadow-sm-custom rounded-4 mb-4">
            <div className="card-header bg-white border-bottom p-3">
              <h5 className="m-0 fw-bold">Modalidade do Pedido</h5>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-6">
                  <div 
                    className={`p-3 rounded-4 border text-center cursor-pointer transition-all ${isUserWantDelivery ? 'border-primary bg-purple-light shadow-sm' : 'bg-light'}`}
                    style={{ borderColor: isUserWantDelivery ? '#7F00FF' : '#E5E7EB', backgroundColor: isUserWantDelivery ? '#F3E8FF' : '#F9FAFB' }}
                    onClick={() => setIsUserWantDelivery(true)}
                  >
                    <FontAwesomeIcon icon={faMotorcycle} className="fs-3 mb-2 text-primary-custom" />
                    <h6 className="fw-bold m-0 text-dark">Entrega ao Domicílio</h6>
                    <small className="text-muted">Entregue na sua morada (350 MT)</small>
                  </div>
                </div>
                <div className="col-6">
                  <div 
                    className={`p-3 rounded-4 border text-center cursor-pointer transition-all ${!isUserWantDelivery ? 'border-primary bg-purple-light shadow-sm' : 'bg-light'}`}
                    style={{ borderColor: !isUserWantDelivery ? '#7F00FF' : '#E5E7EB', backgroundColor: !isUserWantDelivery ? '#F3E8FF' : '#F9FAFB' }}
                    onClick={() => setIsUserWantDelivery(false)}
                  >
                    <FontAwesomeIcon icon={faStore} className="fs-3 mb-2 text-primary-custom" />
                    <h6 className="fw-bold m-0 text-dark">Levantamento na Loja</h6>
                    <small className="text-muted">Levante no estabelecimento (0 MT)</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Etapa 1: Dados do Cliente e Endereço */}
          <div className={`card border-0 shadow-sm-custom rounded-4 mb-4 ${step !== 1 ? 'opacity-75' : ''}`}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center">
              <span className="badge bg-primary-custom rounded-circle me-3 p-2 d-flex justify-content-center align-items-center" style={{ width: '30px', height: '30px' }}>1</span>
              <h5 className="m-0 fw-bold">{isUserWantDelivery ? 'Endereço de Entrega & Contacto' : 'Contacto para Levantamento'}</h5>
            </div>
            {step === 1 && (
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Nome do Destinatário</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><FontAwesomeIcon icon={faUser} className="text-muted" /></span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="Nome completo"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Telemóvel para Contacto</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><FontAwesomeIcon icon={faPhoneAlt} className="text-muted" /></span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      placeholder="Ex: +258 84 123 4567"
                    />
                  </div>
                </div>

                {isUserWantDelivery && (
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">Endereço Completo</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><FontAwesomeIcon icon={faMapMarkerAlt} className="text-primary-custom" /></span>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="Rua, Prédio, Bairro, Cidade..."
                      />
                    </div>
                  </div>
                )}

                <button className="btn bg-primary-custom text-white px-4 py-2 rounded-pill fw-bold" onClick={() => setStep(2)}>
                  Continuar para Pagamento
                </button>
              </div>
            )}
          </div>

          {/* Etapa 2: Pagamento */}
          <div className={`card border-0 shadow-sm-custom rounded-4 ${step !== 2 ? 'opacity-75' : ''}`}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center">
              <span className={`badge rounded-circle me-3 p-2 d-flex justify-content-center align-items-center ${step === 2 ? 'bg-primary-custom' : 'bg-secondary'}`} style={{ width: '30px', height: '30px' }}>2</span>
              <h5 className="m-0 fw-bold">Método de Pagamento</h5>
            </div>
            {step === 2 && (
              <div className="card-body p-4">
                <div className="d-flex flex-column gap-3 mb-4">
                  <label className={`border rounded-4 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === 'M-Pesa' ? 'border-primary bg-light' : ''}`}>
                    <input type="radio" name="payment" className="form-check-input me-3" checked={paymentMethod === 'M-Pesa'} onChange={() => setPaymentMethod('M-Pesa')} />
                    <div className="flex-grow-1">
                      <h6 className="fw-bold m-0 text-dark">M-Pesa</h6>
                      <small className="text-muted">Pagamento móvel rápido e seguro</small>
                    </div>
                  </label>
                  <label className={`border rounded-4 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === 'e-Mola' ? 'border-primary bg-light' : ''}`}>
                    <input type="radio" name="payment" className="form-check-input me-3" checked={paymentMethod === 'e-Mola'} onChange={() => setPaymentMethod('e-Mola')} />
                    <div className="flex-grow-1">
                      <h6 className="fw-bold m-0 text-dark">e-Mola</h6>
                      <small className="text-muted">Pague via carteira e-Mola</small>
                    </div>
                  </label>
                  <label className={`border rounded-4 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === 'Transferência bancária' ? 'border-primary bg-light' : ''}`}>
                    <input type="radio" name="payment" className="form-check-input me-3" checked={paymentMethod === 'Transferência bancária'} onChange={() => setPaymentMethod('Transferência bancária')} />
                    <div className="flex-grow-1">
                      <h6 className="fw-bold m-0 text-dark">Transferência Bancária / Móvel</h6>
                      <small className="text-muted">Transferência direta para o fornecedor</small>
                    </div>
                  </label>
                  <label className={`border rounded-4 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === 'Dinheiro' ? 'border-primary bg-light' : ''}`}>
                    <input type="radio" name="payment" className="form-check-input me-3" checked={paymentMethod === 'Dinheiro'} onChange={() => setPaymentMethod('Dinheiro')} />
                    <div className="flex-grow-1">
                      <h6 className="fw-bold m-0 text-dark">Dinheiro / Na Entrega</h6>
                      <small className="text-muted">Pagamento presencial em numerário</small>
                    </div>
                  </label>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary px-3 rounded-pill fw-bold" onClick={() => setStep(1)}>
                    Voltar
                  </button>
                  <button 
                    onClick={placeOrderHandler} 
                    disabled={placingOrder} 
                    className="btn btn-success text-white flex-grow-1 py-3 rounded-pill fw-bold fs-5 shadow-sm"
                  >
                    {placingOrder ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : null}
                    Confirmar e Finalizar ({totalPrice.toLocaleString()} MT)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Lateral */}
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-4 sticky-top" style={{ top: '20px' }}>
            <div className="card-body p-4">
              <h6 className="fw-bold border-bottom pb-3 mb-3 text-dark">Resumo da Compra</h6>
              <div className="d-flex justify-content-between mb-2 small text-muted">
                <span>Produtos ({cartItems.length})</span>
                <span className="fw-bold text-dark">{cartTotal.toLocaleString()} MT</span>
              </div>
              <div className="d-flex justify-content-between mb-3 small text-muted">
                <span>Entrega</span>
                <span className="fw-bold text-dark">{isUserWantDelivery ? `${deliveryFee} MT` : 'Grátis (Levantamento)'}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold fs-5 text-dark">Total</span>
                <span className="fw-bold fs-4 text-primary-custom">
                  {totalPrice.toLocaleString()} <small className="fs-6">MT</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
