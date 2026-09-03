import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBox, faHeart, faMapMarkerAlt, faCreditCard, faBell, faTicketAlt,
  faStar, faUser, faCog, faRedo, faSignOutAlt, faCheckCircle, faClock,
  faSpinner, faTruck, faChevronRight, faSearch, faPlus, faEye, faMobileAlt, faShoppingCart
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, logout } from '../store/features/userSlice';
import { addToBasket } from '../store/features/basketSlice';
import api from '../api';

export default function CustomerPortalScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'favorites', 'addresses', 'payments', 'coupons', 'reviews', 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

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

  if (!userInfo) return null;

  return (
    <div className="container py-5">
      {/* HEADER DO CLIENTE */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-primary-custom text-white fw-bold d-flex justify-content-center align-items-center fs-3 shadow-sm" style={{ width: '65px', height: '65px' }}>
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
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'orders' ? 'bg-primary-custom text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                onClick={() => setActiveTab('orders')}
              >
                Meus Pedidos ({orders.length})
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'favorites' ? 'bg-primary-custom text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                onClick={() => setActiveTab('favorites')}
              >
                Favoritos
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'addresses' ? 'bg-primary-custom text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                onClick={() => setActiveTab('addresses')}
              >
                Endereços
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'payments' ? 'bg-primary-custom text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                onClick={() => setActiveTab('payments')}
              >
                Pagamentos
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'coupons' ? 'bg-primary-custom text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                onClick={() => setActiveTab('coupons')}
              >
                Cupons
              </button>
              <button 
                className={`nav-link text-start rounded-3 fw-bold p-3 transition-all ${activeTab === 'profile' ? 'bg-primary-custom text-white shadow-sm' : 'text-dark hover-bg-light'}`}
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
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-3" />
                  <div>A carregar o seu histórico de pedidos...</div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <h5>Ainda não efetuou nenhum pedido.</h5>
                  <Link to="/shop" className="btn bg-primary-custom text-white rounded-pill px-4 mt-3 fw-bold">
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

                      {/* Footer do Pedido com Botão Ver Detalhes (Olho) e Comprar Novamente */}
                      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pt-2 gap-2">
                        <div>
                          <span className="text-muted small me-2">Total Pago:</span>
                          <span className="fw-black text-primary-custom fs-5">{Number(order.totalPrice || 0).toLocaleString('pt-PT')} MT</span>
                        </div>

                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-outline-dark rounded-pill btn-sm fw-bold px-3 d-flex align-items-center gap-1 shadow-sm"
                            onClick={() => setSelectedOrder(order)}
                            title="Ver Todos os Detalhes do Pedido"
                          >
                            <FontAwesomeIcon icon={faEye} /> Ver Detalhes
                          </button>
                          <button 
                            className="btn btn-outline-primary rounded-pill btn-sm fw-bold px-3 d-flex align-items-center gap-1 shadow-sm"
                            onClick={() => handleReorder(order)}
                          >
                            <FontAwesomeIcon icon={faRedo} /> Comprar Novamente
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
                <button className="btn btn-primary bg-primary-custom rounded-pill btn-sm fw-bold px-3">
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

          {activeTab === 'profile' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h4 className="fw-black text-dark mb-4">Perfil & Configurações</h4>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Nome Completo</label>
                    <input type="text" className="form-control" defaultValue={userInfo.name} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Telemóvel</label>
                    <input type="text" className="form-control" defaultValue={userInfo.phoneNumber} readOnly />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label small fw-bold text-muted">E-mail</label>
                    <input type="email" className="form-control" defaultValue={userInfo.email} readOnly />
                  </div>
                </div>
                <button className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold">Guardar Alterações</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES DO PEDIDO (AO CLICAR NO OLHO) */}
      {selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-5 border-0 shadow-lg overflow-hidden">
              {/* Header do Modal */}
              <div className="modal-header bg-white border-bottom p-4">
                <div>
                  <h5 className="modal-title fw-black text-dark m-0">
                    <FontAwesomeIcon icon={faEye} className="text-primary-custom me-2" />
                    Detalhes do Pedido #{selectedOrder.code || String(selectedOrder._id).slice(-6)}
                  </h5>
                  <small className="text-muted">Realizado em {new Date(selectedOrder.createdAt).toLocaleString('pt-PT')}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>

              {/* Corpo do Modal */}
              <div className="modal-body p-4 bg-light" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Badge de Estado */}
                <div className="d-flex align-items-center justify-content-between bg-white p-3 rounded-4 border mb-3 shadow-sm">
                  <span className="fw-bold text-dark">Estado Atual:</span>
                  <span className={`badge rounded-pill px-3 py-2 fw-bold ${selectedOrder.isDelivered ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {selectedOrder.isDelivered ? '✓ Entregue' : (selectedOrder.status || 'Pendente / Em Processamento')}
                  </span>
                </div>

                {/* Banner App Mobile Rastreamento */}
                <div className="alert border-0 rounded-4 p-3 mb-3 shadow-sm" style={{ backgroundColor: '#F3E8FF', borderLeft: '4px solid #7F00FF' }}>
                  <div className="d-flex align-items-center gap-3">
                    <FontAwesomeIcon icon={faMobileAlt} className="text-primary-custom fs-3 flex-shrink-0" />
                    <small className="text-dark" style={{ lineHeight: '1.4' }}>
                      📱 O acompanhamento em tempo real (preparação, motorista e localização no mapa) está disponível no app <strong>Nhiquela</strong> na <strong>Play Store</strong>.
                    </small>
                  </div>
                </div>

                {/* Lista de Produtos do Pedido */}
                <div className="bg-white p-3 rounded-4 border mb-3 shadow-sm">
                  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                    <FontAwesomeIcon icon={faShoppingCart} className="me-2 text-primary-custom" />
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

                {/* Dados de Entrega & Pagamento */}
                <div className="bg-white p-3 rounded-4 border shadow-sm">
                  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                    <FontAwesomeIcon icon={faTruck} className="me-2 text-primary-custom" />
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
                    <span className="fw-black text-primary-custom fs-4">{Number(selectedOrder.totalPrice || 0).toLocaleString('pt-PT')} MT</span>
                  </div>
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="modal-footer bg-white border-top p-3 d-flex justify-content-between">
                <button className="btn btn-outline-secondary rounded-pill px-4 fw-bold btn-sm" onClick={() => setSelectedOrder(null)}>
                  Fechar
                </button>
                <button className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold btn-sm shadow-sm" onClick={() => { setSelectedOrder(null); handleReorder(selectedOrder); }}>
                  <FontAwesomeIcon icon={faRedo} className="me-1" /> Comprar Novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
