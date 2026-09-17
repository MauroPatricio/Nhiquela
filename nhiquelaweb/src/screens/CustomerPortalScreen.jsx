import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBox, faHeart, faMapMarkerAlt, faCreditCard, faBell, faTicketAlt,
  faStar, faUser, faCog, faRedo, faSignOutAlt, faCheckCircle, faClock,
  faSpinner, faTruck, faChevronRight, faSearch, faPlus, faEye, faMobileAlt,
  faShoppingCart, faSave, faLock, faPhone, faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectUser, logout, setUserLogin } from '../store/features/userSlice';
import { addToBasket } from '../store/features/basketSlice';
import api from '../api';

export default function CustomerPortalScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'favorites', 'addresses', 'payments', 'coupons', 'reviews', 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Estados de edição do Perfil do Cliente
  const [profileName, setProfileName] = useState(userInfo?.name || '');
  const [profilePhone, setProfilePhone] = useState(userInfo?.phoneNumber || '');
  const [profileEmail, setProfileEmail] = useState(userInfo?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sincroniza campos do formulário quando userInfo é carregado/atualizado
  useEffect(() => {
    if (userInfo) {
      setProfileName(userInfo.name || '');
      setProfilePhone(userInfo.phoneNumber || '');
      setProfileEmail(userInfo.email || '');
    }
  }, [userInfo]);

  // Enforce Login
  useEffect(() => {
    if (!userInfo) {
      toast.info('Faça login para aceder à Área Minha Nhiquela');
      navigate('/login?redirect=/shop/account');
    }
  }, [userInfo, navigate]);

  // Fetch Orders
  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!userInfo?.token) return;
      setLoadingOrders(true);
      try {
        const { data } = await api.get('/orders/mine', {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        const ordersList = Array.isArray(data) ? data : (data.orders || []);
        setOrders(ordersList);
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        toast.error('Erro ao carregar os seus pedidos.');
      } finally {
        setLoadingOrders(false);
      }
    };

    if (activeTab === 'orders' && userInfo) {
      fetchUserOrders();
    }
  }, [activeTab, userInfo]);

  const handleLogout = () => {
    dispatch(logout());
    toast.info('Sessão terminada.');
    navigate('/shop');
  };

  const handleReorder = (order) => {
    if (!order.orderItems || order.orderItems.length === 0) return;
    order.orderItems.forEach(item => {
      dispatch(addToBasket({
        _id: item.product || item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        seller: item.seller,
        quantity: item.qty || item.quantity || 1
      }));
    });
    toast.success('Itens do pedido adicionados ao carrinho!');
    navigate('/shop/cart');
  };

  // Atualizar dados de Perfil do Cliente (mesmos campos do App Mobile)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.warn('O nome completo é obrigatório.');
      return;
    }
    if (profilePassword && profilePassword !== profileConfirmPassword) {
      toast.error('As palavras-passes não coincidem.');
      return;
    }

    setSavingProfile(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      };

      const payload = {
        name: profileName,
        phoneNumber: profilePhone,
        email: profileEmail,
        ...(profilePassword ? { password: profilePassword } : {})
      };

      const { data } = await api.put('/users/profile', payload, config);

      const updatedUser = {
        ...userInfo,
        ...data,
        token: data.token || userInfo.token
      };

      dispatch(setUserLogin(updatedUser));
      toast.success('Perfil atualizado com sucesso!');
      setProfilePassword('');
      setProfileConfirmPassword('');
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      toast.error(err.response?.data?.message || 'Erro ao guardar as alterações.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!userInfo) return null;

  return (
    <div className="container py-5">
      {/* HEADER DO CLIENTE */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle text-white fw-bold d-flex justify-content-center align-items-center fs-3 shadow-sm" style={{ width: '65px', height: '65px', backgroundColor: '#7F00FF' }}>
              {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="fw-black text-dark mb-1">{userInfo.name || 'Cliente Nhiquela'}</h4>
              <span className="text-muted small me-3">📧 {userInfo.email}</span>
              <span className="text-muted small">📱 {userInfo.phoneNumber || 'Sem número'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-danger rounded-pill fw-bold btn-sm px-4">
            <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Sair da Conta
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* NAVEGAÇÃO LATERAL (TABS) */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white sticky-top" style={{ top: '20px' }}>
            <div className="nav flex-column nav-pills gap-2">
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'orders' ? 'text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                style={activeTab === 'orders' ? { backgroundColor: '#7F00FF' } : {}}
                onClick={() => setActiveTab('orders')}
              >
                Meus Pedidos ({orders.length})
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'favorites' ? 'text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                style={activeTab === 'favorites' ? { backgroundColor: '#7F00FF' } : {}}
                onClick={() => setActiveTab('favorites')}
              >
                Favoritos
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'addresses' ? 'text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                style={activeTab === 'addresses' ? { backgroundColor: '#7F00FF' } : {}}
                onClick={() => setActiveTab('addresses')}
              >
                Endereços
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'payments' ? 'text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                style={activeTab === 'payments' ? { backgroundColor: '#7F00FF' } : {}}
                onClick={() => setActiveTab('payments')}
              >
                Pagamentos
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'coupons' ? 'text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                style={activeTab === 'coupons' ? { backgroundColor: '#7F00FF' } : {}}
                onClick={() => setActiveTab('coupons')}
              >
                Cupons
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'profile' ? 'text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                style={activeTab === 'profile' ? { backgroundColor: '#7F00FF' } : {}}
                onClick={() => setActiveTab('profile')}
              >
                Perfil & Conta
              </button>
            </div>
          </div>
        </div>

        {/* CONTEÚDO DA TAB SELECIONADA */}
        <div className="col-md-9">
          {activeTab === 'orders' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h4 className="fw-black text-dark mb-4">Meus Pedidos</h4>

              {loadingOrders ? (
                <div className="text-center py-5 text-muted">
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: '#7F00FF' }} className="mb-3" />
                  <div>A carregar o seu histórico de pedidos...</div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <h5>Ainda não efetuou nenhum pedido.</h5>
                  <Link to="/shop" className="btn text-white rounded-pill px-4 mt-3 fw-bold" style={{ backgroundColor: '#7F00FF' }}>
                    Fazer a Primeira Compra
                  </Link>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {orders.map((order) => (
                    <div key={order._id} className="border rounded-4 p-3 p-md-4 hover-shadow transition-all">
                      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-bottom pb-3 mb-3 gap-2">
                        <div>
                          <span className="fw-bold text-dark fs-5">Pedido #{String(order.code || order._id).slice(-6)}</span>
                          <span className="text-muted small d-block">{new Date(order.createdAt).toLocaleString('pt-PT')}</span>
                        </div>
                        <span className={`badge rounded-pill px-3 py-2 fw-bold ${order.isDelivered ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {order.isDelivered ? 'Entregue' : (order.status || 'Pendente')}
                        </span>
                      </div>

                      {/* Lista de Itens do Pedido */}
                      <div className="mb-3">
                        {order.orderItems?.map((item, idx) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between py-2 border-bottom last-border-0">
                            <div className="d-flex align-items-center gap-3">
                              <img src={item.image || 'https://via.placeholder.com/50'} alt={item.name} className="rounded-3 object-fit-cover" style={{ width: '50px', height: '50px' }} />
                              <div>
                                <h6 className="fw-bold text-dark m-0">{item.name}</h6>
                                <small className="text-muted">Qtd: {item.qty || item.quantity || 1}</small>
                              </div>
                            </div>
                            <span className="fw-bold text-dark">{Number(item.price || 0).toLocaleString('pt-PT')} MT</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer do Pedido */}
                      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pt-2 gap-2">
                        <div>
                          <span className="text-muted small me-2">Total Pago:</span>
                          <span className="fw-black fs-5" style={{ color: '#7F00FF' }}>{Number(order.totalPrice || 0).toLocaleString('pt-PT')} MT</span>
                        </div>

                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-outline-dark rounded-pill btn-sm fw-bold px-3 d-flex align-items-center gap-1 shadow-sm"
                            onClick={() => setSelectedOrder(order)}
                            title="Ver Todos os Detalhes do Pedido"
                          >
                            <FontAwesomeIcon icon={faEye} /> {t('common.viewDetails', 'Ver Detalhes')}
                          </button>
                          <button 
                            className="btn rounded-pill btn-sm fw-bold px-3 d-flex align-items-center gap-1 shadow-sm text-white"
                            style={{ backgroundColor: '#7F00FF' }}
                            onClick={() => handleReorder(order)}
                          >
                            <FontAwesomeIcon icon={faRedo} /> {t('home.buyAgain', 'Comprar Novamente')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white text-center py-5">
              <FontAwesomeIcon icon={faHeart} size="3x" className="text-danger mb-3" />
              <h5 className="fw-bold text-dark">Seus Produtos Favoritos</h5>
              <p className="text-muted mb-4">Adicione produtos aos seus favoritos para comprar com 1 clique.</p>
              <Link to="/shop" className="btn btn-outline-primary rounded-pill px-4 fw-bold">Explorar Marketplace</Link>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-black text-dark m-0">Meus Endereços</h4>
                <button className="btn text-white rounded-pill btn-sm fw-bold px-3" style={{ backgroundColor: '#7F00FF' }}>
                  <FontAwesomeIcon icon={faPlus} className="me-1" /> Adicionar Novo
                </button>
              </div>
              <div className="border rounded-4 p-3 bg-light d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold text-dark mb-1">Endereço Principal (Maputo)</h6>
                  <p className="text-muted small mb-0">{userInfo.address || 'Av. Eduardo Mondlane, Maputo'}</p>
                </div>
                <span className="badge bg-success rounded-pill px-3 py-1">Padrão</span>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h4 className="fw-black text-dark mb-4">Métodos de Pagamento</h4>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded-4 p-3 bg-light d-flex align-items-center gap-3">
                    <span className="badge bg-danger p-2 rounded-circle fw-bold">M</span>
                    <div>
                      <h6 className="fw-bold text-dark m-0">M-Pesa</h6>
                      <small className="text-muted">{userInfo.phoneNumber}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'coupons' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white text-center py-5">
              <FontAwesomeIcon icon={faTicketAlt} size="3x" className="text-warning mb-3" />
              <h5 className="fw-bold text-dark">Meus Cupons & Descontos</h5>
              <p className="text-muted">Nenhum cupom ativo no momento. Fique atento às notificações da Nhiquela!</p>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white text-center py-5">
              <FontAwesomeIcon icon={faStar} size="3x" className="text-warning mb-3" />
              <h5 className="fw-bold text-dark">Minhas Avaliações</h5>
              <p className="text-muted">Ainda não avaliou nenhuma loja ou produto.</p>
            </div>
          )}

          {/* TAB PERFIL & CONFIGURAÇÕES (INTERATIVO COM BACKEND & REDUX) */}
          {activeTab === 'profile' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h4 className="fw-black text-dark mb-4">Perfil & Configurações</h4>

              <form onSubmit={handleSaveProfile}>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Nome Completo</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0"><FontAwesomeIcon icon={faUser} className="text-muted" /></span>
                      <input 
                        type="text" 
                        className="form-control border-start-0 bg-light" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        required
                        placeholder="Insira o seu nome"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Telemóvel</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0"><FontAwesomeIcon icon={faPhone} className="text-muted" /></span>
                      <input 
                        type="tel" 
                        className="form-control border-start-0 bg-light" 
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="Ex: 840575992"
                      />
                    </div>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label small fw-bold text-muted">E-mail</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0"><FontAwesomeIcon icon={faEnvelope} className="text-muted" /></span>
                      <input 
                        type="email" 
                        className="form-control border-start-0 bg-light" 
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        required
                        placeholder="teste2@gmail.com"
                      />
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold text-dark mt-4 mb-3">
                  <FontAwesomeIcon icon={faLock} className="text-muted me-2" /> Alterar Palavra-Passe (Opcional)
                </h6>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Nova Palavra-Passe</label>
                    <input 
                      type="password" 
                      className="form-control bg-light"
                      placeholder="Mínimo 6 caracteres"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Confirmar Palavra-Passe</label>
                    <input 
                      type="password" 
                      className="form-control bg-light"
                      placeholder="Repita a palavra-passe"
                      value={profileConfirmPassword}
                      onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={savingProfile}
                  className="btn text-white rounded-pill px-4 py-2.5 fw-bold shadow-sm"
                  style={{ backgroundColor: '#7F00FF' }}
                >
                  {savingProfile ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      A guardar alterações...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="me-2" />
                      Guardar Alterações
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES DO PEDIDO */}
      {selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-5 border-0 shadow-lg overflow-hidden">
              {/* Header do Modal */}
              <div className="modal-header bg-white border-bottom p-4">
                <div>
                  <h5 className="modal-title fw-black text-dark m-0">
                    <FontAwesomeIcon icon={faEye} className="me-2" style={{ color: '#7F00FF' }} />
                    Detalhes do Pedido #{selectedOrder.code || String(selectedOrder._id).slice(-6)}
                  </h5>
                  <small className="text-muted">Realizado em {new Date(selectedOrder.createdAt).toLocaleString('pt-PT')}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>

              {/* Corpo do Modal */}
              <div className="modal-body p-4 bg-light" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="d-flex align-items-center justify-content-between bg-white p-3 rounded-4 border mb-3 shadow-sm">
                  <span className="fw-bold text-dark">Estado Atual:</span>
                  <span className={`badge rounded-pill px-3 py-2 fw-bold ${selectedOrder.isDelivered ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {selectedOrder.isDelivered ? '✓ Entregue' : (selectedOrder.status || 'Pendente / Em Processamento')}
                  </span>
                </div>

                <div className="alert border-0 rounded-4 p-3 mb-3 shadow-sm" style={{ backgroundColor: '#F3E8FF', borderLeft: '4px solid #7F00FF' }}>
                  <div className="d-flex align-items-center gap-3">
                    <FontAwesomeIcon icon={faMobileAlt} style={{ color: '#7F00FF' }} className="fs-3 flex-shrink-0" />
                    <small className="text-dark" style={{ lineHeight: '1.4' }}>
                      📱 O acompanhamento em tempo real (preparação, motorista e localização no mapa) está disponível no app <strong>Nhiquela</strong> na <strong>Play Store</strong>.
                    </small>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-4 border mb-3 shadow-sm">
                  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                    <FontAwesomeIcon icon={faShoppingCart} className="me-2" style={{ color: '#7F00FF' }} />
                    Produtos ({selectedOrder.orderItems?.length || 0})
                  </h6>
                  <div className="d-flex flex-column gap-2">
                    {selectedOrder.orderItems?.map((item, idx) => (
                      <div key={idx} className="d-flex align-items-center justify-content-between p-2 rounded-3 border-bottom last-border-0">
                        <div className="d-flex align-items-center gap-3">
                          <img src={item.image || 'https://via.placeholder.com/50'} alt={item.name} className="rounded-3 object-fit-cover" style={{ width: '45px', height: '45px' }} />
                          <div>
                            <h6 className="fw-bold text-dark m-0 small text-truncate" style={{ maxWidth: '250px' }}>{item.name}</h6>
                            <small className="text-muted">Qtd: {item.qty || item.quantity || 1} x {Number(item.price || 0).toLocaleString('pt-PT')} MT</small>
                          </div>
                        </div>
                        <span className="fw-bold text-dark">{((item.qty || item.quantity || 1) * Number(item.price || 0)).toLocaleString('pt-PT')} MT</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-4 border shadow-sm">
                  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                    <FontAwesomeIcon icon={faTruck} className="me-2" style={{ color: '#7F00FF' }} />
                    Entrega & Pagamento
                  </h6>
                  <div className="row g-2 small text-muted">
                    <div className="col-12 col-md-6">
                      <span className="d-block">Modalidade: <strong className="text-dark">{selectedOrder.isUserWantDelivery ? 'Entrega ao Domicílio' : 'Levantamento no Estabelecimento'}</strong></span>
                      <span className="d-block">Endereço Destino: <strong className="text-dark">{selectedOrder.deliveryAddress?.address || selectedOrder.address || 'Maputo'}</strong></span>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="d-block">Pagamento: <strong className="text-dark">{selectedOrder.paymentMethod || 'M-Pesa / Carteira'}</strong></span>
                      <span className="d-block">Estado Pagamento: <strong className={selectedOrder.isPaid ? 'text-success fw-bold' : 'text-warning fw-bold'}>{selectedOrder.isPaid ? '✓ Pago' : 'Pendente (Pago na Entrega)'}</strong></span>
                    </div>
                  </div>
                  <div className="border-top mt-3 pt-3 d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">Total Pago:</span>
                    <span className="fw-black fs-4" style={{ color: '#7F00FF' }}>{Number(selectedOrder.totalPrice || 0).toLocaleString('pt-PT')} MT</span>
                  </div>
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="modal-footer bg-white border-top p-3 d-flex justify-content-between">
                <button className="btn btn-outline-secondary rounded-pill px-4 fw-bold btn-sm" onClick={() => setSelectedOrder(null)}>
                  {t('common.cancel', 'Fechar')}
                </button>
                <button className="btn text-white rounded-pill px-4 fw-bold btn-sm shadow-sm" style={{ backgroundColor: '#7F00FF' }} onClick={() => { setSelectedOrder(null); handleReorder(selectedOrder); }}>
                  <FontAwesomeIcon icon={faRedo} className="me-1" /> {t('home.buyAgain', 'Comprar Novamente')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
