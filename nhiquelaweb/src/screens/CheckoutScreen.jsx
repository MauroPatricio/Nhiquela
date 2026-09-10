import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faMapMarkerAlt, faCreditCard, faMotorcycle, faStore, 
  faCheckCircle, faMoneyBillWave, faPhoneAlt, faUser, faLock, faSignInAlt, faUserPlus,
  faUpload, faSpinner, faImage, faCopy, faBank, faMobileAlt, faTimesCircle, faEnvelope
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
  const [address, setAddress] = useState('');
  const [digitalRecipientEmail, setDigitalRecipientEmail] = useState(userInfo?.email || '');

  // Detect digital products
  const hasDigitalItems = cartItems.some(
    item => item.productType === 'DIGITAL'
  );

  // GPS State
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | requesting | granted | denied
  const [deliveryFeeCalculated, setDeliveryFeeCalculated] = useState(350);
  
  const [step, setStep] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(null);

  // Estados para Login Rápido caso cliente não esteja autenticado
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Seller data (for bank account display)
  const [sellerData, setSellerData] = useState(null);
  const [loadingSeller, setLoadingSeller] = useState(false);

  // Payment proof upload
  const [proofFile, setProofFile] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const proofInputRef = useRef(null);

  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  const isTransferMethod = paymentMethod && !paymentMethod.toLowerCase().includes('dinheiro');

  // Enforce login
  useEffect(() => {
    if (!userInfo) {
      toast.info('Faça login para finalizar a compra.');
      navigate('/login?redirect=/shop/checkout');
    }
  }, [userInfo, navigate]);

  // Force no delivery fee for digital items
  useEffect(() => {
    if (hasDigitalItems) {
      setIsUserWantDelivery(false);
    }
  }, [hasDigitalItems]);

  // Request GPS on mount (only for physical items requiring delivery)
  useEffect(() => {
    if (!userInfo || hasDigitalItems) return;
    setLocationStatus('requesting');
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
        toast.success('Localização obtida! A taxa de entrega será calculada com base na sua posição.', { autoClose: 3000 });
      },
      () => {
        setLocationStatus('denied');
        toast.warning('Localização não disponível. A taxa de entrega será estimada (350 MT).', { autoClose: 4000 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [userInfo]);

  useEffect(() => {
    if (cartItems.length === 0 && !orderCreatedSuccess) {
      toast.warning('O seu carrinho está vazio.');
      navigate('/shop/cart');
    }
  }, [cartItems, navigate, orderCreatedSuccess]);

  // Fetch seller data to show bank accounts
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;
    const sellerId = cartItems[0]?.seller?._id || cartItems[0]?.seller;
    if (!sellerId) return;
    setLoadingSeller(true);
    api.get(`/users/${sellerId}`)
      .then(({ data }) => setSellerData(data))
      .catch(() => {})
      .finally(() => setLoadingSeller(false));
  }, [cartItems]);

  // Fetch payment methods from API
  useEffect(() => {
    setLoadingPaymentMethods(true);
    api.get('/payment-methods')
      .catch(() => api.get('/payments'))
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.data || data?.paymentMethods || []);
        const activeList = list.filter(pm => pm.status === 'Ativo' || pm.status === undefined || pm.isActive !== false);
        if (activeList.length > 0) {
          setAvailablePaymentMethods(activeList);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPaymentMethods(false));
  }, []);

  useEffect(() => {
    if (userInfo) {
      if (!fullName) setFullName(userInfo.name || '');
      if (!phoneNumber) setPhoneNumber(userInfo.phoneNumber || '');
      if (!digitalRecipientEmail) setDigitalRecipientEmail(userInfo.email || '');
    }
  }, [userInfo]);

  // A taxa de transporte não é somada ao total da compra; é paga diretamente ao estafeta na recepção do produto
  const deliveryFee = 0;
  const totalPrice = cartTotal;

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

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setUploadingProof(true);
    setProofUrl('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userInfo?.token}` },
        timeout: 30000,
      });
      const url = data.secure_url || data.url || '';
      if (!url) throw new Error('URL não retornada');
      setProofUrl(url);
      toast.success('Comprovativo carregado com sucesso!');
    } catch (err) {
      setProofFile(null);
      setProofUrl('');
      toast.error(`Erro ao enviar comprovativo: ${err.message || 'Tente novamente'}`);
    } finally {
      setUploadingProof(false);
    }
  };

  const placeOrderHandler = async () => {
    if (!userInfo) {
      toast.info('Por favor, inicie sessão ou cadastre-se para finalizar a compra.');
      return;
    }

    if (hasDigitalItems) {
      if (!digitalRecipientEmail || !String(digitalRecipientEmail).includes('@')) {
        toast.error('Por favor, indique um e-mail válido para envio do produto digital.');
        return;
      }
    } else if (isUserWantDelivery && (!address || !String(address).trim())) {
      toast.error('Por favor, indique o endereço de entrega.');
      return;
    }
    if (!phoneNumber || !String(phoneNumber).trim()) {
      toast.error('Por favor, indique o número de telemóvel para contacto.');
      return;
    }
    if (isTransferMethod && !proofUrl) {
      toast.error('Por favor, faça o upload do comprovativo de pagamento antes de confirmar.');
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

      const finalAddress = hasDigitalItems
        ? `Envio Digital (E-mail: ${digitalRecipientEmail || userInfo?.email})`
        : (isUserWantDelivery ? address : 'Levantamento no Estabelecimento');

      const orderPayload = {
        orderItems: orderItems,
        address: finalAddress,
        deliveryAddress: {
          fullName: fullName || userInfo?.name || 'Cliente',
          address: finalAddress,
          phoneNumber: String(phoneNumber || userInfo?.phoneNumber || ''),
          email: digitalRecipientEmail || userInfo?.email || '',
          alternativePhoneNumber: ''
        },
        digitalRecipientEmail: hasDigitalItems ? (digitalRecipientEmail || userInfo?.email) : undefined,
        userLocation: (hasDigitalItems || !userLocation) ? null : { lat: userLocation.lat, lng: userLocation.lng },
        paymentProofUrl: proofUrl || undefined,
        seller: sellerId,
        isUserWantDelivery: hasDigitalItems ? false : isUserWantDelivery,
        paymentMethod: paymentMethod,
        itemsPrice: cartTotal,
        deliveryPrice: hasDigitalItems ? 0 : deliveryFee,
        taxPrice: 0,
        totalPrice: totalPrice,
        ivaTax: 0,
        addressPrice: hasDigitalItems ? 0 : deliveryFee,
        itemsPriceForSeller: cartTotal,
        user: { _id: userInfo._id, name: userInfo.name, phoneNumber: userInfo.phoneNumber, email: userInfo.email },
        isPaid: false,
        stepStatus: 1,
        sellerPriceWithDeliver: totalPrice
      };

      const { data } = await api.post('/orders', orderPayload, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      
      const newOrder = data.order || data;
      setOrderCreatedSuccess({
        ...newOrder,
        items: orderItems,
        totalAmount: totalPrice,
        deliveryType: hasDigitalItems ? 'Envio Digital (E-mail)' : (isUserWantDelivery ? 'Entrega ao Domicílio' : 'Levantamento no Estabelecimento'),
        paymentMethodName: paymentMethod,
        recipientAddress: finalAddress,
        recipientPhone: String(phoneNumber || userInfo?.phoneNumber || ''),
        recipientName: fullName || userInfo?.name || 'Cliente'
      });
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
    const orderCode = orderCreatedSuccess.code || (orderCreatedSuccess._id ? orderCreatedSuccess._id.substring(18).toUpperCase() : 'N/A');
    const orderItemsList = orderCreatedSuccess.items || orderCreatedSuccess.orderItems || [];

    return (
      <div className="container py-5 my-3" style={{ maxWidth: '780px' }}>
        <div className="bg-white p-4 p-md-5 rounded-5 shadow-sm border">
          {/* Ícone & Título de Sucesso */}
          <div className="text-center mb-4">
            <div className="bg-success text-white rounded-circle d-flex justify-content-center align-items-center mx-auto mb-3 shadow-sm" style={{ width: '75px', height: '75px' }}>
              <FontAwesomeIcon icon={faCheckCircle} size="3x" />
            </div>
            <h2 className="fw-black text-dark mb-1">Pedido Confirmado!</h2>
            <p className="text-muted mb-2">
              O seu pedido foi registado e enviado para processamento pelo fornecedor.
            </p>
            <span className="badge bg-purple-light text-primary-custom px-3 py-2 rounded-pill fs-6 fw-bold border border-primary-subtle" style={{ backgroundColor: '#F3E8FF' }}>
              Código do Pedido: #{orderCode}
            </span>
          </div>

          {/* BANNER DE SEGUIMENTO NO APLICATIVO MOBILE (PLAY STORE) */}
          <div className="alert border-0 rounded-4 p-4 mb-4 shadow-sm" style={{ backgroundColor: '#F3E8FF', borderLeft: '5px solid #7F00FF' }}>
            <div className="d-flex align-items-start gap-3">
              <div className="rounded-circle bg-primary-custom text-white p-2 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                <FontAwesomeIcon icon={faMobileAlt} size="lg" />
              </div>
              <div>
                <h6 className="fw-bold text-dark mb-1">
                  📱 Acompanhe o estado do seu pedido no App Mobile
                </h6>
                <p className="text-muted small mb-0" style={{ lineHeight: '1.5' }}>
                  O estado do seu pedido em tempo real (preparação, atribuição do estafeta e mapa de rastreamento) pode ser acompanhado no aplicativo mobile disponível na <strong>Play Store</strong> com o nome <strong className="text-primary-custom">nhiquela</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* DETALHES COMPLETOS DO PEDIDO */}
          <div className="bg-light p-4 rounded-4 mb-4 border">
            <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
              <FontAwesomeIcon icon={faShoppingCart} className="me-2 text-primary-custom" />
              Produtos do Pedido ({orderItemsList.length})
            </h6>

            <div className="d-flex flex-column gap-3 mb-4">
              {orderItemsList.map((item, idx) => (
                <div key={idx} className="d-flex align-items-center justify-content-between bg-white p-3 rounded-3 border">
                  <div className="d-flex align-items-center gap-3">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="rounded-3 object-fit-cover" style={{ width: '50px', height: '50px' }} />
                    ) : (
                      <div className="bg-light rounded-3 d-flex align-items-center justify-content-center text-muted fw-bold" style={{ width: '50px', height: '50px' }}>📦</div>
                    )}
                    <div>
                      <h6 className="fw-bold text-dark mb-0 small text-truncate" style={{ maxWidth: '280px' }}>{item.name}</h6>
                      <small className="text-muted">Qtd: {item.quantity || 1} x {Number(item.price || 0).toLocaleString('pt-PT')} MT</small>
                    </div>
                  </div>
                  <span className="fw-bold text-dark">
                    {(Number(item.price || 0) * (item.quantity || 1)).toLocaleString('pt-PT')} MT
                  </span>
                </div>
              ))}
            </div>

            <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
              <FontAwesomeIcon icon={faUser} className="me-2 text-primary-custom" />
              Informações de Entrega & Pagamento
            </h6>

            <div className="row g-2 small text-muted mb-3">
              <div className="col-12 col-md-6">
                <span className="d-block">Cliente: <strong className="text-dark">{orderCreatedSuccess.recipientName}</strong></span>
                <span className="d-block">Telemóvel: <strong className="text-dark">{orderCreatedSuccess.recipientPhone}</strong></span>
              </div>
              <div className="col-12 col-md-6">
                <span className="d-block">Modalidade: <strong className="text-dark">{orderCreatedSuccess.deliveryType}</strong></span>
                <span className="d-block">Pagamento: <strong className="text-dark">{orderCreatedSuccess.paymentMethodName}</strong></span>
              </div>
              <div className="col-12 mt-2">
                <span className="d-block">Endereço / Destino: <strong className="text-dark">{orderCreatedSuccess.recipientAddress}</strong></span>
              </div>
            </div>

            <div className="border-top pt-3 d-flex justify-content-between align-items-center">
              <span className="fw-bold fs-5 text-dark">Total do Pedido:</span>
              <span className="fw-black fs-4 text-primary-custom">
                {Number(orderCreatedSuccess.totalAmount || orderCreatedSuccess.totalPrice || totalPrice).toLocaleString('pt-PT')} MT
              </span>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
            <Link to="/shop/account" className="btn btn-outline-dark rounded-pill px-4 py-3 fw-bold flex-grow-1">
              Ver Meus Pedidos
            </Link>
            <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 py-3 fw-bold flex-grow-1 shadow-sm">
              Continuar a Comprar
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
      
      <h2 className="fw-bold mb-4 text-dark">Finalizar Compra</h2>

      {/* GPS Status Banner — apenas para produtos físicos com entrega */}
      {!hasDigitalItems && isUserWantDelivery && (
        <div className={`alert border-0 rounded-4 d-flex align-items-center gap-3 mb-4 shadow-sm ${
          locationStatus === 'granted' ? 'alert-success' :
          locationStatus === 'requesting' ? 'alert-info' : 'alert-warning'
        }`}>
          <FontAwesomeIcon
            icon={faMapMarkerAlt}
            className={`fs-4 flex-shrink-0 ${locationStatus === 'granted' ? 'text-success' : locationStatus === 'requesting' ? 'text-info' : 'text-warning'}`}
            spin={locationStatus === 'requesting'}
          />
          <div>
            {locationStatus === 'requesting' && (
              <><strong>A obter localização GPS...</strong><br/><small className="text-muted">Por favor, autorize o acesso à sua localização para calcular a taxa de entrega.</small></>
            )}
            {locationStatus === 'granted' && (
              <><strong>✓ Localização obtida com sucesso!</strong><br/><small className="text-muted">Lat: {userLocation?.lat?.toFixed(4)}, Lng: {userLocation?.lng?.toFixed(4)} — A taxa será calculada com base na distância real.</small></>
            )}
            {locationStatus === 'denied' && (
              <><strong>Localização não disponível</strong><br/><small className="text-muted">Sem GPS, a taxa de entrega estimada é de 350 MT. Active a localização no browser para melhor precisão.</small></>
            )}
          </div>
        </div>
      )}

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
          
          {/* Opção de Modalidade (Apenas para produtos físicos) */}
          {!hasDigitalItems ? (
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
                      <small className="text-muted">Entregue na sua morada (Valor do transporte pago ao estafeta no momento da entrega)</small>
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
          ) : (
            <div className="card border-0 shadow-sm-custom rounded-4 mb-4" style={{ backgroundColor: '#FAF5FF', borderLeft: '4px solid #7F00FF' }}>
              <div className="card-body p-4 d-flex align-items-center gap-3">
                <div className="rounded-circle p-3 d-flex justify-content-center align-items-center text-white" style={{ backgroundColor: '#7F00FF', width: '50px', height: '50px' }}>
                  <FontAwesomeIcon icon={faEnvelope} size="lg" />
                </div>
                <div>
                  <h6 className="fw-bold m-0 text-dark">⚡ Pedido de Produto Digital</h6>
                  <p className="text-muted mb-0 small">
                    Os produtos digitais são enviados por e-mail e disponibilizados na sua conta após a confirmação do pagamento. <strong>Sem cobrança de taxa de transporte.</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Etapa 1: Dados do Cliente e Endereço */}
          <div className={`card border-0 shadow-sm-custom rounded-4 mb-4 ${step !== 1 ? 'opacity-75' : ''}`}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center">
              <span className="badge bg-primary-custom rounded-circle me-3 p-2 d-flex justify-content-center align-items-center" style={{ width: '30px', height: '30px' }}>1</span>
              <h5 className="m-0 fw-bold">
                {hasDigitalItems ? 'Contacto & E-mail para Envio Digital' : isUserWantDelivery ? 'Endereço de Entrega & Contacto' : 'Contacto para Levantamento'}
              </h5>
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

                {hasDigitalItems ? (
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">E-mail para Recebimento do Produto Digital <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><FontAwesomeIcon icon={faEnvelope} className="text-primary-custom" /></span>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={digitalRecipientEmail} 
                        onChange={(e) => setDigitalRecipientEmail(e.target.value)} 
                        placeholder="exemplo@email.com"
                        required
                      />
                    </div>
                    <small className="text-muted">Os códigos/licenças e instruções serão enviados para este endereço de e-mail.</small>
                  </div>
                ) : isUserWantDelivery && (
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

                {/* Seller Bank Accounts — shown for transfer methods */}
                {isTransferMethod && (
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3 text-muted" style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>
                      <FontAwesomeIcon icon={faBank} className="me-2 text-primary-custom" />
                      Contas do Fornecedor
                    </h6>

                    {loadingSeller ? (
                      <div className="text-center py-3">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-primary-custom" />
                        <span className="ms-2 text-muted small">A carregar dados do fornecedor...</span>
                      </div>
                    ) : sellerData ? (
                      <div className="card border-0 rounded-4 shadow-sm mb-3" style={{ background: '#F3E8FF', borderLeft: '4px solid #7F00FF' }}>
                        <div className="card-body p-4">
                          <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">
                            {sellerData.name || sellerData.seller?.name || 'Fornecedor'}
                          </h6>

                          {/* M-Pesa / e-Mola */}
                          {(sellerData.seller?.phoneNumberAccount || sellerData.phoneNumber) && (
                            <div className="bg-white rounded-3 p-3 mb-2 d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-bold small text-dark">
                                  <FontAwesomeIcon icon={faMobileAlt} className="me-2 text-success" />
                                  {sellerData.seller?.bankAccount || 'M-Pesa / e-Mola'}
                                </div>
                                <div className="text-muted small">Titular: {sellerData.name}</div>
                                <div className="fw-bold text-dark">{sellerData.seller?.phoneNumberAccount || sellerData.phoneNumber}</div>
                              </div>
                              <button
                                className="btn btn-sm btn-outline-secondary rounded-pill"
                                onClick={() => {
                                  navigator.clipboard?.writeText(sellerData.seller?.phoneNumberAccount || sellerData.phoneNumber || '');
                                  toast.success('Número copiado!');
                                }}
                              >
                                <FontAwesomeIcon icon={faCopy} />
                              </button>
                            </div>
                          )}

                          {/* Bank Account */}
                          {(sellerData.seller?.accountNumber || sellerData.seller?.bankAccount) && (
                            <div className="bg-white rounded-3 p-3 mb-2 d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-bold small text-dark">
                                  <FontAwesomeIcon icon={faBank} className="me-2 text-primary-custom" />
                                  {sellerData.seller?.accountType || 'Conta Bancária'}
                                </div>
                                <div className="text-muted small">Titular: {sellerData.name}</div>
                                <div className="fw-bold text-dark">{sellerData.seller?.accountNumber || sellerData.seller?.bankAccount}</div>
                              </div>
                              <button
                                className="btn btn-sm btn-outline-secondary rounded-pill"
                                onClick={() => {
                                  navigator.clipboard?.writeText(sellerData.seller?.accountNumber || sellerData.seller?.bankAccount || '');
                                  toast.success('Número copiado!');
                                }}
                              >
                                <FontAwesomeIcon icon={faCopy} />
                              </button>
                            </div>
                          )}

                          {/* Alternative account */}
                          {sellerData.seller?.alternativeAccountNumber && (
                            <div className="bg-white rounded-3 p-3 mb-2 d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-bold small text-dark">
                                  <FontAwesomeIcon icon={faMobileAlt} className="me-2 text-warning" />
                                  {sellerData.seller?.alternativeAccountType || 'Conta Alternativa'}
                                </div>
                                <div className="fw-bold text-dark">{sellerData.seller?.alternativeAccountNumber}</div>
                              </div>
                              <button
                                className="btn btn-sm btn-outline-secondary rounded-pill"
                                onClick={() => {
                                  navigator.clipboard?.writeText(sellerData.seller?.alternativeAccountNumber || '');
                                  toast.success('Número copiado!');
                                }}
                              >
                                <FontAwesomeIcon icon={faCopy} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning rounded-3 small">Dados bancários do fornecedor não disponíveis.</div>
                    )}

                    {/* Proof Upload */}
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2 text-muted" style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>
                        <FontAwesomeIcon icon={faUpload} className="me-2 text-primary-custom" />
                        Comprovativo de Pagamento <span className="text-danger">*</span>
                      </h6>
                      <p className="text-muted small mb-3">Após efectuar a transferência, envie o comprovativo para confirmar o pagamento.</p>

                      {/* Hidden file input */}
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleProofUpload}
                      />

                      {/* Upload area */}
                      {!proofFile ? (
                        <div
                          onClick={() => proofInputRef.current?.click()}
                          className="border border-dashed rounded-4 p-4 text-center cursor-pointer"
                          style={{ borderColor: '#7F00FF', backgroundColor: '#FAF5FF', cursor: 'pointer' }}
                        >
                          <FontAwesomeIcon icon={faUpload} size="2x" className="text-primary-custom mb-2" />
                          <p className="mb-0 fw-bold text-primary-custom small">Clique para seleccionar o comprovativo</p>
                          <p className="text-muted mb-0" style={{ fontSize: '11px' }}>JPG, PNG ou PDF — máx. 5MB</p>
                        </div>
                      ) : (
                        <div className={`border rounded-4 p-3 d-flex align-items-center gap-3 ${
                          uploadingProof ? 'border-info bg-info-subtle' :
                          proofUrl ? 'border-success bg-success-subtle' : 'border-danger bg-danger-subtle'
                        }`}>
                          <FontAwesomeIcon
                            icon={uploadingProof ? faSpinner : proofUrl ? faImage : faTimesCircle}
                            spin={uploadingProof}
                            className={uploadingProof ? 'text-info' : proofUrl ? 'text-success' : 'text-danger'}
                            size="2x"
                          />
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-bold small text-truncate">{proofFile.name}</div>
                            {uploadingProof && <div className="text-info small">A enviar...</div>}
                            {proofUrl && <div className="text-success small">✓ Enviado com sucesso</div>}
                          </div>
                          {proofUrl && (
                            <a href={proofUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success rounded-pill">
                              Ver
                            </a>
                          )}
                          <button
                            onClick={() => { setProofFile(null); setProofUrl(''); }}
                            className="btn btn-sm btn-outline-secondary rounded-circle"
                            style={{ width: '32px', height: '32px' }}
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="d-flex flex-column gap-3 mb-4">
                  {loadingPaymentMethods ? (
                    <div className="text-center py-3">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-primary-custom" />
                      <span className="ms-2 text-muted small">A carregar formas de pagamento disponíveis...</span>
                    </div>
                  ) : availablePaymentMethods.length > 0 ? (
                    availablePaymentMethods.map((pm) => {
                      const pmName = pm.name || pm.title || 'Forma de Pagamento';
                      const pmDesc = pm.description || 'Método de pagamento ativo na plataforma';
                      return (
                        <label 
                          key={pm._id || pmName} 
                          className={`border rounded-4 p-3 d-flex align-items-center cursor-pointer ${paymentMethod === pmName ? 'border-primary bg-light shadow-sm' : ''}`}
                        >
                          <input 
                            type="radio" 
                            name="payment" 
                            className="form-check-input me-3" 
                            checked={paymentMethod === pmName} 
                            onChange={() => setPaymentMethod(pmName)} 
                          />
                          <div className="flex-grow-1">
                            <h6 className="fw-bold m-0 text-dark">{pmName}</h6>
                            <small className="text-muted">{pmDesc}</small>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <>
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
                    </>
                  )}
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
                <span>Entrega / Transporte</span>
                <span className="fw-bold">
                  {hasDigitalItems ? (
                    <span className="text-dark">Grátis (Envio por E-mail)</span>
                  ) : isUserWantDelivery ? (
                    <span className="text-primary-custom fw-bold">Pago ao estafeta na entrega</span>
                  ) : (
                    <span className="text-dark">Grátis (Levantamento na Loja)</span>
                  )}
                </span>
              </div>
              {!hasDigitalItems && isUserWantDelivery && (
                <div className="alert alert-light border rounded-3 p-2 mb-3 text-muted small" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  ℹ️ <strong>Nota:</strong> O valor do transporte não é cobrado no checkout e será pago diretamente ao estafeta no momento da entrega do produto.
                </div>
              )}
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
