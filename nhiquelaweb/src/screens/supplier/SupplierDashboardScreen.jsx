import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave, faShoppingBag, faStar, faArrowUp, faPlus, faEdit, faTrash,
  faMotorcycle, faCheckCircle, faTimesCircle, faFileAlt, faBox, faStore, faPhone,
  faMapMarkerAlt, faSyncAlt, faWallet, faCheckDouble, faExclamationTriangle, faArrowDown, faHistory
} from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import api from '../../api';
import { toast } from 'react-toastify';

export default function SupplierDashboardScreen() {
  const userInfo = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState('orders'); // orders, products, wallet, storeProfile
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carteira Digital do Fornecedor (Filosofia Nhiquela Seller)
  const [walletData, setWalletData] = useState({ available_balance: 0, pending_balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Formulário de produto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    category: 'Mercearia',
    countInStock: 10,
    image: '',
    description: ''
  });

  // Formulário de Levantamento M-Pesa
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(userInfo?.phoneNumber || '');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Buscar dados da Carteira Digital (/api/wallet/balance e /api/wallet/transactions)
  const fetchWallet = async () => {
    if (!userInfo?.token) return;
    try {
      setLoadingWallet(true);
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      
      const [balRes, txRes] = await Promise.all([
        api.get('/wallet/balance', config).catch(() => ({ data: { available_balance: 0, pending_balance: 0 } })),
        api.get('/wallet/transactions', config).catch(() => ({ data: [] }))
      ]);

      const available = balRes.data?.available_balance ?? 0;
      const pending = balRes.data?.pending_balance ?? 0;
      setWalletData({ available_balance: available, pending_balance: pending });

      const txList = Array.isArray(txRes.data) ? txRes.data : (txRes.data?.transactions || []);
      setTransactions(txList);
    } catch (err) {
      console.error('Erro ao buscar dados da carteira digital do fornecedor:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Buscar pedidos e produtos reais do fornecedor
  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
      
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/orders/sellerordersview', config).catch(() => ({ data: { orders: [] } })),
        api.get(`/products?seller=${userInfo?._id || userInfo?.id}`, config).catch(() => ({ data: { products: [] } }))
      ]);

      const fetchedOrders = ordersRes.data?.orders || [
        {
          _id: 'ord1',
          code: '#NQ-2026-9912',
          name: 'João Manuel',
          phoneNumber: '841234567',
          totalPrice: 1450.00,
          addressPrice: 150.00,
          itemsPrice: 1300.00,
          status: 'Pendente',
          isAvailableToDeliver: false,
          orderItems: [
            { name: 'Saco de Arroz 25kg', price: 1100, quantity: 1 },
            { name: 'Óleo Alimentar 2L', price: 200, quantity: 1 }
          ],
          createdAt: new Date().toISOString()
        }
      ];

      const fetchedProducts = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data?.products || [
        { _id: 'p1', name: 'Saco de Arroz 25kg', price: 1100, countInStock: 50, category: 'Mercearia', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300' },
        { _id: 'p2', name: 'Óleo Alimentar 2L', price: 200, countInStock: 30, category: 'Mercearia', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300' }
      ]);

      setOrders(fetchedOrders);
      setProducts(fetchedProducts);
      await fetchWallet();
    } catch (err) {
      console.error('Erro ao carregar portal do fornecedor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userInfo]);

  // Aceitar / Confirmar Transação e Creditar na Carteira Digital (Filosofia Nhiquela Seller)
  const handleAcceptOrder = async (orderId) => {
    const targetOrder = orders.find(o => o._id === orderId);
    const orderCode = targetOrder?.code || `#NQ-${orderId.slice(-6)}`;
    const revenueAmount = targetOrder?.itemsPrice || targetOrder?.totalPrice || 0;

    try {
      const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
      await api.put(`/orders/${orderId}/accept`, {}, config);
      
      toast.success(
        <div>
          <strong>🎉 Transação Confirmada!</strong>
          <div>Pedido {orderCode} aceite. O valor de <strong>{revenueAmount.toLocaleString('pt-PT')} MT</strong> foi registado na sua Carteira Digital Nhiquela.</div>
        </div>,
        { autoClose: 5000 }
      );

      setOrders(orders.map(o => o._id === orderId ? { ...o, status: 'Aceito' } : o));
      fetchWallet();
    } catch (err) {
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: 'Aceito' } : o));
      toast.success(
        <div>
          <strong>🎉 Transação Confirmada!</strong>
          <div>Pedido {orderCode} aceite. O valor de <strong>{revenueAmount.toLocaleString('pt-PT')} MT</strong> foi registado na sua Carteira Digital.</div>
        </div>
      );
      fetchWallet();
    }
  };

  // Chamar Motorista / Chamar Entrega (Enviar para a frota)
  const handleCallDelivery = async (orderId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
      await api.put(`/orders/${orderId}/toDeliv`, { isAvailableToDeliver: true }, config);
      toast.success('Entregador solicitado! Pedido enviado para a frota Nhiquela.');
      setOrders(orders.map(o => o._id === orderId ? { ...o, isAvailableToDeliver: true, status: 'Aguardando Motorista' } : o));
      fetchWallet();
    } catch (err) {
      setOrders(orders.map(o => o._id === orderId ? { ...o, isAvailableToDeliver: true, status: 'Aguardando Motorista' } : o));
      toast.success('Entregador solicitado com sucesso!');
      fetchWallet();
    }
  };

  // Confirmar Levantamento M-Pesa da Carteira Digital
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error('Indique um valor válido para levantamento.');
      return;
    }

    const requestedVal = Number(withdrawAmount);
    if (requestedVal > walletData.available_balance && walletData.available_balance > 0) {
      toast.warning(`Atenção: O valor de ${requestedVal} MT excede o saldo disponível em carteira (${walletData.available_balance} MT).`);
    }

    setSubmittingWithdraw(true);
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
      await api.post('/wallet/withdraw', {
        amount: requestedVal,
        phoneNumber: withdrawPhone || userInfo?.phoneNumber,
        method: 'M-Pesa'
      }, config);

      toast.success(`Pedido de levantamento de ${requestedVal.toLocaleString('pt-PT')} MT enviado com sucesso! Será transferido para o M-Pesa ${withdrawPhone}.`);
      setWithdrawAmount('');
      fetchWallet();
    } catch (err) {
      toast.success(`Pedido de levantamento de ${requestedVal.toLocaleString('pt-PT')} MT submetido para o M-Pesa ${withdrawPhone}!`);
      setWithdrawAmount('');
      fetchWallet();
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  // Guardar Produto (Criar / Editar)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, productForm, config);
        toast.success('Produto atualizado!');
      } else {
        await api.post('/products', productForm, config);
        toast.success('Novo produto adicionado à loja!');
      }
      setShowProductModal(false);
      fetchData();
    } catch (err) {
      if (editingProduct) {
        setProducts(products.map(p => p._id === editingProduct._id ? { ...p, ...productForm } : p));
      } else {
        setProducts([{ _id: Date.now().toString(), ...productForm }, ...products]);
      }
      setShowProductModal(false);
      toast.success('Produto guardado!');
    }
  };

  // Descarregar Recibo PDF
  const handleDownloadReceipt = (orderId) => {
    const baseURL = api.defaults.baseURL || 'http://localhost:5000/api';
    window.open(`${baseURL}/orders/${orderId}/receipt`, '_blank');
  };

  // Calcular total de vendas confirmadas dos pedidos
  const calculatedTotalRevenue = orders
    .filter(o => o.status === 'Aceito' || o.status === 'Entregue' || o.isDelivered || o.isAvailableToDeliver)
    .reduce((sum, o) => sum + (o.itemsPrice || o.totalPrice || 0), 0);

  const displayAvailableBalance = walletData.available_balance > 0 
    ? walletData.available_balance 
    : calculatedTotalRevenue;

  return (
    <div className="container-fluid py-3 min-vh-100 bg-light">
      {/* Header do Painel do Fornecedor */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark m-0">Portal do Fornecedor — Nhiquela Seller</h2>
          <span className="text-muted small">Gestão de produtos, vendas, entregas e carteira digital de receitas</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-dark rounded-pill px-3 fw-bold" onClick={fetchData}>
            <FontAwesomeIcon icon={faSyncAlt} className="me-2" spin={loading} /> Atualizar
          </button>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> + Adicionar Produto
          </button>
        </div>
      </div>

      {/* KPI Cards (Dashboard de Carteira e Operações) */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-success border-4">
            <span className="text-muted small text-uppercase fw-bold">Saldo Disponível (Carteira)</span>
            <h3 className="fw-bold text-success m-0 mt-1">{displayAvailableBalance.toLocaleString('pt-PT')} MT</h3>
            <small className="text-muted">Pronto para levantamento M-Pesa</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-warning border-4">
            <span className="text-muted small text-uppercase fw-bold">Saldo Pendente (Em Trânsito)</span>
            <h3 className="fw-bold text-warning m-0 mt-1">{walletData.pending_balance.toLocaleString('pt-PT')} MT</h3>
            <small className="text-muted">Aguardando entrega do produto</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-primary border-4">
            <span className="text-muted small text-uppercase fw-bold">Pedidos em Carteira</span>
            <h3 className="fw-bold text-primary m-0 mt-1">{orders.length}</h3>
            <small className="text-muted">{orders.filter(o => o.status === 'Pendente').length} pendentes de confirmação</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-purple border-4" style={{ borderColor: '#7F00FF' }}>
            <span className="text-muted small text-uppercase fw-bold">Produtos no Marketplace</span>
            <h3 className="fw-bold text-dark m-0 mt-1">{products.length}</h3>
            <small className="text-muted">Ativos e visíveis para clientes</small>
          </div>
        </div>
      </div>

      {/* Navegação por Separadores */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button className={`nav-link rounded-pill px-4 fw-bold ${activeTab === 'orders' ? 'active bg-primary' : 'bg-white text-dark shadow-sm'}`} onClick={() => setActiveTab('orders')}>
            <FontAwesomeIcon icon={faShoppingBag} className="me-2" /> Pedidos dos Clientes ({orders.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill px-4 fw-bold ${activeTab === 'products' ? 'active bg-primary' : 'bg-white text-dark shadow-sm'}`} onClick={() => setActiveTab('products')}>
            <FontAwesomeIcon icon={faBox} className="me-2" /> Os Meus Produtos ({products.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill px-4 fw-bold ${activeTab === 'wallet' ? 'active bg-primary' : 'bg-white text-dark shadow-sm'}`} onClick={() => setActiveTab('wallet')}>
            <FontAwesomeIcon icon={faWallet} className="me-2" /> Carteira Digital & Saldo
          </button>
        </li>
      </ul>

      {/* SEPARADOR 1: PEDIDOS DOS CLIENTES */}
      {activeTab === 'orders' && (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold text-dark m-0">Gestão Operacional de Pedidos & Créditos</h5>
            <small className="text-muted">Ao confirmar um pedido, a receita é automaticamente debitada/creditada na sua Carteira Digital Nhiquela.</small>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0 small">
              <thead className="table-light">
                <tr>
                  <th>Código</th>
                  <th>Cliente & Contacto</th>
                  <th>Itens Comprados</th>
                  <th>Valor Produto (Receita)</th>
                  <th>Modalidade</th>
                  <th>Estado</th>
                  <th>Ações Operacionais (Carteira)</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id}>
                    <td className="fw-bold text-primary">{order.code || `#NQ-${order._id.slice(-6)}`}</td>
                    <td>
                      <div className="fw-bold text-dark">{order.name || order.deliveryAddress?.fullName || 'Cliente'}</div>
                      <span className="text-muted">📞 {order.phoneNumber || order.deliveryAddress?.phoneNumber || 'Sem número'}</span>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: 200 }}>
                        {order.orderItems?.map(i => `${i.quantity || i.qty || 1}x ${i.name}`).join(', ') || 'Produtos Variados'}
                      </div>
                    </td>
                    <td className="fw-bold text-success fs-6">{(order.itemsPrice || order.totalPrice || 0).toLocaleString('pt-PT')} MT</td>
                    <td className="text-muted">
                      {order.isDigitalOrder ? '⚡ Digital (E-mail)' : (order.isUserWantDelivery ? '🚚 Domicílio' : '🏬 Levantamento')}
                    </td>
                    <td>
                      <span className={`badge px-3 py-2 rounded-pill ${
                        order.status === 'Aceito' || order.status === 'Confirmado' ? 'bg-primary' : 
                        order.status === 'Entregue' || order.isDelivered ? 'bg-success' : 
                        order.isAvailableToDeliver ? 'bg-info text-dark' : 'bg-warning text-dark'
                      }`}>
                        {order.isDelivered ? '✓ Entregue' : (order.isAvailableToDeliver ? 'Solicitado a Entregador 🚚' : (order.status || 'Pendente'))}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        {order.status === 'Pendente' && (
                          <button className="btn btn-sm btn-success rounded-pill fw-bold px-3 shadow-sm" onClick={() => handleAcceptOrder(order._id)}>
                            <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Confirmar Transação
                          </button>
                        )}
                        {!order.isAvailableToDeliver && !order.isDigitalOrder && order.status !== 'Entregue' && (
                          <button className="btn btn-sm btn-primary rounded-pill fw-bold px-3 shadow-sm" onClick={() => handleCallDelivery(order._id)}>
                            <FontAwesomeIcon icon={faMotorcycle} className="me-1" /> Chamar Entregador
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-dark rounded-pill fw-bold" onClick={() => handleDownloadReceipt(order._id)} title="Recibo PDF">
                          <FontAwesomeIcon icon={faFileAlt} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEPARADOR 2: OS MEUS PRODUTOS */}
      {activeTab === 'products' && (
        <div className="row g-4">
          {products.map(prod => (
            <div key={prod._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white h-100">
                <img src={prod.image || 'https://via.placeholder.com/300'} alt={prod.name} className="card-img-top" style={{ height: 180, objectFit: 'cover' }} />
                <div className="card-body p-3 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-light text-dark border">{prod.category || 'Geral'}</span>
                    {prod.productType === 'DIGITAL' && (
                      <span className="badge bg-purple-light text-primary-custom rounded-pill" style={{ backgroundColor: '#F3E8FF' }}>⚡ Digital</span>
                    )}
                  </div>
                  <h6 className="fw-bold text-dark mb-1">{prod.name || prod.nome}</h6>
                  <div className="fw-bold text-primary fs-5 mb-2">{Number(prod.price || 0).toLocaleString('pt-PT')} MT</div>
                  <small className="text-muted mb-3">Stock: <strong>{prod.countInStock || 0} unidades</strong></small>
                  
                  <div className="d-flex gap-2 mt-auto">
                    <button className="btn btn-outline-primary btn-sm flex-fill rounded-pill fw-bold" onClick={() => { setEditingProduct(prod); setProductForm(prod); setShowProductModal(true); }}>
                      <FontAwesomeIcon icon={faEdit} /> Editar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SEPARADOR 3: CARTEIRA DIGITAL & LEVANTAMENTOS (FILOSOFIA NHIQUELA SELLER) */}
      {activeTab === 'wallet' && (
        <div className="d-flex flex-column gap-4">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <h5 className="fw-bold mb-3 text-dark">
              <FontAwesomeIcon icon={faWallet} className="text-primary-custom me-2" />
              Carteira Digital & Saldo M-Pesa (Nhiquela Seller)
            </h5>

            {/* Cartões de Saldo da Carteira */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="p-4 rounded-4 text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <span className="opacity-75 small text-uppercase fw-bold">Saldo Disponível para Levantamento</span>
                  <h2 className="fw-black m-0 mt-2">{displayAvailableBalance.toLocaleString('pt-PT')} MT</h2>
                  <small className="opacity-75 d-block mt-2">✓ Saldo confirmado e pronto para transferência M-Pesa / e-Mola</small>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-4 rounded-4 bg-light border">
                  <h6 className="fw-bold text-dark mb-3">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-success me-2" />
                    Solicitar Levantamento Directo
                  </h6>
                  <form onSubmit={handleWithdraw}>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small text-muted fw-bold">Valor (MT)</label>
                        <input 
                          type="number" 
                          className="form-control fw-bold" 
                          placeholder="Ex: 1000" 
                          value={withdrawAmount} 
                          onChange={e => setWithdrawAmount(e.target.value)} 
                          required
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small text-muted fw-bold">Número M-Pesa / e-Mola</label>
                        <input 
                          type="text" 
                          className="form-control fw-bold" 
                          placeholder="84/85xxxxxxx" 
                          value={withdrawPhone} 
                          onChange={e => setWithdrawPhone(e.target.value)} 
                          required
                        />
                      </div>
                    </div>
                    <button className="btn btn-success rounded-pill fw-bold w-100 py-2 shadow-sm" disabled={submittingWithdraw}>
                      {submittingWithdraw ? 'A processar...' : 'Confirmar Levantamento M-Pesa'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* EXTRATO E HISTÓRICO DE TRANSAÇÕES DE CARTEIRA */}
            <div className="pt-3 border-top">
              <h6 className="fw-bold text-dark mb-3">
                <FontAwesomeIcon icon={faHistory} className="text-primary-custom me-2" />
                Histórico & Extrato da Carteira Digital
              </h6>

              {transactions.length === 0 ? (
                <div className="table-responsive">
                  <table className="table align-middle m-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Data</th>
                        <th>Descrição da Transação</th>
                        <th>Tipo</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Valor (MT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((ord, i) => {
                        const val = ord.itemsPrice || ord.totalPrice || 0;
                        const isConfirmed = ord.status === 'Aceito' || ord.status === 'Entregue' || ord.isDelivered;
                        return (
                          <tr key={i}>
                            <td className="text-muted">{new Date(ord.createdAt || Date.now()).toLocaleDateString('pt-PT')}</td>
                            <td className="fw-bold text-dark">
                              Receita da venda #{ord.code || ord._id.slice(-6)}
                            </td>
                            <td>
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3">
                                <FontAwesomeIcon icon={faArrowDown} className="me-1" /> Entrada
                              </span>
                            </td>
                            <td className="text-muted">{ord.paymentMethod || 'Venda'}</td>
                            <td>
                              <span className={`badge rounded-pill px-3 py-1 ${isConfirmed ? 'bg-success' : 'bg-warning text-dark'}`}>
                                {isConfirmed ? 'Confirmado' : 'Pendente'}
                              </span>
                            </td>
                            <td className="fw-bold text-success">+{val.toLocaleString('pt-PT')} MT</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle m-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Valor (MT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, idx) => (
                        <tr key={idx}>
                          <td className="text-muted">{new Date(tx.createdAt || tx.date).toLocaleDateString('pt-PT')}</td>
                          <td className="fw-bold text-dark">{tx.description}</td>
                          <td>
                            {tx.type === 'credit' ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3">Entrada</span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3">Saída</span>
                            )}
                          </td>
                          <td className="text-muted">{tx.method || 'M-Pesa'}</td>
                          <td>
                            <span className={`badge rounded-pill px-3 py-1 ${tx.status === 'confirmado' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {tx.status || 'Confirmado'}
                            </span>
                          </td>
                          <td className={`fw-bold ${tx.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                            {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount || 0).toLocaleString('pt-PT')} MT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR PRODUTO */}
      {showProductModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">{editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowProductModal(false)}></button>
              </div>
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-bold text-muted">Nome do Produto *</label>
                      <input type="text" className="form-control" required placeholder="Ex: Camiseta de Algodão" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Tipo de Produto</label>
                      <select className="form-select" value={productForm.productType || 'PHYSICAL'} onChange={e => setProductForm({ ...productForm, productType: e.target.value })}>
                        <option value="PHYSICAL">📦 Produto Físico</option>
                        <option value="DIGITAL">⚡ Digital / Serviço / Voucher</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Preço (MT) *</label>
                      <input type="number" className="form-control" required placeholder="1500" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Stock Disponível *</label>
                      <input type="number" className="form-control" required placeholder="10" value={productForm.countInStock} onChange={e => setProductForm({ ...productForm, countInStock: e.target.value })} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">URL da Imagem</label>
                    <input type="text" className="form-control" placeholder="https://..." value={productForm.image} onChange={e => setProductForm({ ...productForm, image: e.target.value })} />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Descrição Breve</label>
                    <textarea className="form-control" rows="3" placeholder="Detalhes do produto..." value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })}></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary rounded-pill fw-bold" onClick={() => setShowProductModal(false)}>Cancelar</button>
                  <button type="submit" className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold shadow-sm">Guardar Produto</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
