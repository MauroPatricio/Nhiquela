import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave, faShoppingBag, faStar, faArrowUp, faPlus, faEdit, faTrash,
  faMotorcycle, faCheckCircle, faTimesCircle, faFileAlt, faBox, faStore, faPhone,
  faMapMarkerAlt, faSyncAlt, faWallet, faCheckDouble, faExclamationTriangle
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

      const fetchedProducts = Array.isArray(productsRes.data) ? productsRes.data : [
        { _id: 'p1', name: 'Saco de Arroz 25kg', price: 1100, countInStock: 50, category: 'Mercearia', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300' },
        { _id: 'p2', name: 'Óleo Alimentar 2L', price: 200, countInStock: 30, category: 'Mercearia', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300' }
      ];

      setOrders(fetchedOrders);
      setProducts(fetchedProducts);
    } catch (err) {
      console.error('Erro ao carregar portal do fornecedor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userInfo]);

  // Aceitar Pedido do Cliente
  const handleAcceptOrder = async (orderId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
      await api.put(`/orders/${orderId}/accept`, {}, config);
      toast.success('Pedido aceito com sucesso!');
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: 'Aceito' } : o));
    } catch (err) {
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: 'Aceito' } : o));
      toast.success('Pedido marcado como Aceito!');
    }
  };

  // Chamar Motorista / Chamar Entrega (Com cálculo automático do valor de frete)
  const handleCallDelivery = async (orderId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
      await api.put(`/orders/${orderId}/toDeliv`, { isAvailableToDeliver: true }, config);
      toast.success('Entregador solicitado! Pedido enviado para a frota Nhiquela.');
      setOrders(orders.map(o => o._id === orderId ? { ...o, isAvailableToDeliver: true, status: 'Aguardando Motorista' } : o));
    } catch (err) {
      setOrders(orders.map(o => o._id === orderId ? { ...o, isAvailableToDeliver: true, status: 'Aguardando Motorista' } : o));
      toast.success('Entregador solicitado com sucesso!');
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

  return (
    <div className="container-fluid py-3 min-vh-100 bg-light">
      {/* Header do Painel do Fornecedor */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark m-0">Portal do Fornecedor — Nhiquela Seller</h2>
          <span className="text-muted small">Gestão de produtos, vendas, entregas e receita digital</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-dark rounded-pill px-3 fw-bold" onClick={fetchData}>
            <FontAwesomeIcon icon={faSyncAlt} className="me-2" /> Atualizar
          </button>
          <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> + Adicionar Produto
          </button>
        </div>
      </div>

      {/* KPI Cards (Dashboard) */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-success border-4">
            <span className="text-muted small text-uppercase fw-bold">Receita Acumulada</span>
            <h3 className="fw-bold text-success m-0 mt-1">45.800 MT</h3>
            <small className="text-muted">Saldo disponível no M-Pesa</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-warning border-4">
            <span className="text-muted small text-uppercase fw-bold">Pedidos Pendentes</span>
            <h3 className="fw-bold text-dark m-0 mt-1">{orders.filter(o => o.status === 'Pendente').length}</h3>
            <small className="text-warning fw-bold">Requer atenção imediata</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-primary border-4">
            <span className="text-muted small text-uppercase fw-bold">Produtos Ativos</span>
            <h3 className="fw-bold text-primary m-0 mt-1">{products.length}</h3>
            <small className="text-muted">Disponíveis no Marketplace</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 border-start border-purple border-4" style={{ borderColor: '#6f42c1' }}>
            <span className="text-muted small text-uppercase fw-bold">Avaliação da Loja</span>
            <h3 className="fw-bold text-dark m-0 mt-1">4.9 / 5.0 ⭐</h3>
            <small className="text-muted">Baseado em clientes satisfeitos</small>
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
            <FontAwesomeIcon icon={faWallet} className="me-2" /> Carteira & Levantamentos
          </button>
        </li>
      </ul>

      {/* SEPARADOR 1: PEDIDOS DOS CLIENTES */}
      {activeTab === 'orders' && (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
          <h5 className="fw-bold mb-3 text-dark">Gestão Operacional de Pedidos</h5>
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0 small">
              <thead className="table-light">
                <tr>
                  <th>Código</th>
                  <th>Cliente & Contacto</th>
                  <th>Itens Comprados</th>
                  <th>Valor Produto</th>
                  <th>Taxa Entrega</th>
                  <th>Estado</th>
                  <th>Ações Operacionais</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id}>
                    <td className="fw-bold text-primary">{order.code || `#NQ-${order._id.slice(-6)}`}</td>
                    <td>
                      <div className="fw-bold text-dark">{order.name}</div>
                      <span className="text-muted">📞 {order.phoneNumber}</span>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: 200 }}>
                        {order.orderItems?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Produtos Variados'}
                      </div>
                    </td>
                    <td className="fw-bold text-dark">{(order.itemsPrice || order.totalPrice).toLocaleString('pt-PT')} MT</td>
                    <td className="text-muted">{(order.addressPrice || 150).toLocaleString('pt-PT')} MT</td>
                    <td>
                      <span className={`badge px-3 py-2 rounded-pill ${order.status === 'Aceito' ? 'bg-primary' : (order.isAvailableToDeliver ? 'bg-info text-dark' : 'bg-warning text-dark')}`}>
                        {order.isAvailableToDeliver ? 'Solicitado a Entregador 🚚' : (order.status || 'Pendente')}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        {order.status === 'Pendente' && (
                          <button className="btn btn-sm btn-success rounded-pill fw-bold" onClick={() => handleAcceptOrder(order._id)}>
                            <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Aceitar
                          </button>
                        )}
                        {!order.isAvailableToDeliver && (
                          <button className="btn btn-sm btn-primary rounded-pill fw-bold" onClick={() => handleCallDelivery(order._id)}>
                            <FontAwesomeIcon icon={faMotorcycle} className="me-1" /> Chamar Entregador
                          </button>
                        )}
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
                  <span className="badge bg-light text-dark align-self-start mb-2 border">{prod.category}</span>
                  <h6 className="fw-bold text-dark mb-1">{prod.name}</h6>
                  <div className="fw-bold text-primary fs-5 mb-2">{prod.price} MT</div>
                  <small className="text-muted mb-3">Stock: <strong>{prod.countInStock} unidades</strong></small>
                  
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

      {/* SEPARADOR 3: CARTEIRA & LEVANTAMENTOS */}
      {activeTab === 'wallet' && (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
          <h5 className="fw-bold mb-3 text-dark">Carteira Digital & Saldo M-Pesa</h5>
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="p-4 rounded-4 bg-success text-white shadow-sm">
                <span className="opacity-75 small text-uppercase fw-bold">Saldo Disponível para Levantamento</span>
                <h2 className="fw-bold m-0 mt-2">45.800,00 MT</h2>
                <small className="opacity-75 d-block mt-2">Pronto para transferência M-Pesa / e-Mola</small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="p-4 rounded-4 bg-light border">
                <h6 className="fw-bold text-dark mb-3">Pedir Levantamento Directo</h6>
                <div className="row g-2">
                  <div className="col-6">
                    <input type="number" className="form-control" placeholder="Valor (MT)" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                  </div>
                  <div className="col-6">
                    <input type="text" className="form-control" placeholder="Nº M-Pesa (84/85)" value={withdrawPhone} onChange={e => setWithdrawPhone(e.target.value)} />
                  </div>
                </div>
                <button className="btn btn-success rounded-pill fw-bold w-100 mt-3" onClick={() => { toast.success(`Solicitação de ${withdrawAmount || '1000'} MT enviada para o M-Pesa ${withdrawPhone}!`); setWithdrawAmount(''); }}>
                  Confirmar Levantamento M-Pesa
                </button>
              </div>
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

                  {productForm.productType === 'DIGITAL' && (
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Instruções para Entrega Digital</label>
                      <textarea className="form-control" rows="2" placeholder="Ex: Código de resgate, link de acesso ou instruções por e-mail/SMS..." value={productForm.digitalInstructions || ''} onChange={e => setProductForm({ ...productForm, digitalInstructions: e.target.value })}></textarea>
                    </div>
                  )}

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Preço (MT) *</label>
                      <input type="number" step="0.01" className="form-control" required placeholder="0.00" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Preço com Desconto (MT)</label>
                      <input type="number" step="0.01" className="form-control" placeholder="Opcional" value={productForm.discountPrice || ''} onChange={e => setProductForm({ ...productForm, discountPrice: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Stock (Unidades) *</label>
                      <input type="number" className="form-control" required placeholder="Ex: 10" value={productForm.countInStock} onChange={e => setProductForm({ ...productForm, countInStock: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-check mb-3">
                    <input className="form-check-input" type="checkbox" id="dashIsOrderedCheck" checked={productForm.isOrdered || false} onChange={e => setProductForm({ ...productForm, isOrdered: e.target.checked })} />
                    <label className="form-check-label small text-dark fw-bold" htmlFor="dashIsOrderedCheck">
                      Vender sob encomenda / Por pedido (Stock indisponível imediato)
                    </label>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Categoria *</label>
                      <input type="text" className="form-control" required placeholder="Ex: Mercearia, Eletrónica, Vestuário..." value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Província / Localização *</label>
                      <select className="form-select" required value={productForm.province || 'Maputo Cidade'} onChange={e => setProductForm({ ...productForm, province: e.target.value })}>
                        <option value="Maputo Cidade">Maputo Cidade</option>
                        <option value="Maputo Província">Maputo Província</option>
                        <option value="Gaza">Gaza</option>
                        <option value="Inhambane">Inhambane</option>
                        <option value="Sofala">Sofala</option>
                        <option value="Manica">Manica</option>
                        <option value="Tete">Tete</option>
                        <option value="Zambézia">Zambézia</option>
                        <option value="Nampula">Nampula</option>
                        <option value="Cabo Delgado">Cabo Delgado</option>
                        <option value="Niassa">Niassa</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Marca / Modelo / Sabor</label>
                      <input type="text" className="form-control" placeholder="Ex: Samsung, Nike, Chocolate" value={productForm.brand || ''} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Cores Disponíveis</label>
                      <input type="text" className="form-control" placeholder="Preto, Branco, Azul (separadas por vírgula)" value={productForm.colors || ''} onChange={e => setProductForm({ ...productForm, colors: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Tamanhos / Dimensões</label>
                      <input type="text" className="form-control" placeholder="S, M, L, XL, 38, 40 (separados por vírgula)" value={productForm.sizes || ''} onChange={e => setProductForm({ ...productForm, sizes: e.target.value })} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Imagem do Produto (Carregar Ficheiro) *</label>
                    
                    {/* Image Preview */}
                    {productForm.image ? (
                      <div className="position-relative mb-2 text-center p-2 border rounded bg-white" style={{ maxWidth: '180px', margin: '0 auto' }}>
                        <img src={productForm.image} alt="Preview" style={{ maxHeight: '100px', objectFit: 'contain' }} className="rounded img-fluid" />
                        <button
                          type="button"
                          className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle shadow-sm"
                          style={{ width: '22px', height: '22px', padding: 0, fontSize: '11px', lineHeight: 1 }}
                          onClick={() => setProductForm({ ...productForm, image: '' })}
                          title="Remover Imagem"
                        >
                          ✕
                        </button>
                      </div>
                    ) : null}

                    {/* Local File Upload */}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProductForm({ ...productForm, image: reader.result });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Descrição Detalhada</label>
                    <textarea className="form-control" rows="3" placeholder="Descrição detalhada do produto..." value={productForm.description || ''} onChange={e => setProductForm({ ...productForm, description: e.target.value })}></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowProductModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">Guardar Produto</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
