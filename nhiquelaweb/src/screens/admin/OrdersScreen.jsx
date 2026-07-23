import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faClock, faCheckCircle, faTimesCircle, faMoneyBillWave, faMotorcycle, faTruck, faUserCircle, faMapMarkerAlt, faExchangeAlt, faBox, faEdit, faTrash, faSearch, faFilter, faFileDownload, faEye, faTimes, faHistory, faCheckDouble, faBoxOpen, faUser, faSpinner, faCalendarAlt, faBolt, faPhone, faUserFriends, faInfoCircle, faRoad, faSync, faRoute } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';
import TripChatPanel from './TripChatPanel';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from '@e965/xlsx';

const OrderTiming = ({ order }) => {
  const [elapsed, setElapsed] = useState('--');
  const isCompleted = ['Entregue', 'Cancelada', 'Cancelado', 'Finalizado', 'Concluído', 'Concluído'].includes(order.status);

  useEffect(() => {
    const calculateStaticDiff = () => {
      const end = order.deliveryDate ? new Date(order.deliveryDate) : new Date(order.updatedAt || order.createdAt);
      const diff = Math.floor((end - new Date(order.createdAt)) / 1000);
      if (diff < 0) return '--';
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
    };

    if (isCompleted) {
      setElapsed(calculateStaticDiff());
      return;
    }

    const updateTime = () => {
      const diff = Math.floor((new Date() - new Date(order.createdAt)) / 1000);
      if (diff < 0) return;
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt, order.status, order.updatedAt, order.deliveryDate, isCompleted]);

  return (
    <span className={isCompleted ? "text-success fw-bold" : "text-danger fw-bold"}>
      <FontAwesomeIcon icon={faClock} className="me-1" /> {elapsed}
    </span>
  );
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customersMap, setCustomersMap] = useState({});
  const [driversMap, setDriversMap] = useState({});
  const [subcategoriesMap, setSubcategoriesMap] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');

  // Date filtering logic
  const dateFilteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const m = (orderDate.getMonth() + 1).toString().padStart(2, '0');
    const d = orderDate.getDate().toString().padStart(2, '0');
    
    if (filterMonth && m !== filterMonth) return false;
    if (filterDay && d !== filterDay) return false;
    return true;
  });

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentOrders,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(dateFilteredOrders, 10, ['_id', 'code', 'status', 'orderType']);

  // KPIs Calculation
  const totalPedidos = dateFilteredOrders.length;
  const pedidosConcluídos = dateFilteredOrders.filter(o => ['Entregue', 'Finalizado'].includes(o.status)).length;
  const pedidosEmAndamento = dateFilteredOrders.filter(o => !['Entregue', 'Finalizado', 'Cancelada', 'Cancelado'].includes(o.status)).length;
  const receitaTotal = dateFilteredOrders.reduce((acc, order) => acc + Number(order.totalPrice || order.deliveryPrice || 0), 0);

  useEffect(() => {
    fetchOrdersAndRelatedData();
  }, []);

  const fetchOrdersAndRelatedData = async () => {
    setLoading(true);
    try {
      const [ordersRes, requestsRes, custRes, driversRes, subcatRes, vehicleTypesRes] = await Promise.all([
        api.get('/orders'),
        api.get('/request-service/admin'),
        api.get('/customers'),
        api.get('/drivers'),
        api.get('/provider-subcategories'),
        api.get('/vehicle-types')
      ]);

      // Create maps for quick lookup O(1)
      const cMap = {};
      const customersArray = Array.isArray(custRes.data) ? custRes.data : (custRes.data.customers || custRes.data.users || []);
      customersArray.forEach(c => cMap[c._id] = c);
      setCustomersMap(cMap);

      const dMap = {};
      const driversArray = Array.isArray(driversRes.data) ? driversRes.data : (driversRes.data.drivers || driversRes.data.users || []);
      driversArray.forEach(d => dMap[d._id] = d.name);
      setDriversMap(dMap);

      const sMap = {};
      const subcatArray = Array.isArray(subcatRes.data) ? subcatRes.data : [];
      subcatArray.forEach(s => sMap[s._id] = s.name);

      const vehicleTypesArray = Array.isArray(vehicleTypesRes.data) ? vehicleTypesRes.data : (vehicleTypesRes.data.vehicleTypes || vehicleTypesRes.data.vehicles || vehicleTypesRes.data.data || vehicleTypesRes.data || []);
      vehicleTypesArray.forEach(v => {
        if(v._id && v.name) sMap[v._id] = v.name;
        // fallback to type mapping if structure is different
        if(v._id && v.type) sMap[v._id] = v.type;
      });

      setSubcategoriesMap(sMap);

      // Sort by newest first
      const ordersArray = ordersRes.data.orders || [];
      const formattedOrders = ordersArray.map(o => ({ ...o, orderType: 'Pedido' }));

      const requestsArray = requestsRes.data.deliverRequests || [];
      const formattedRequests = requestsArray.map(r => ({ ...r, orderType: 'Encomenda' }));

      const combinedOrders = [...formattedOrders, ...formattedRequests].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a._id.toString().substring(0, 8), 16) * 1000;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b._id.toString().substring(0, 8), 16) * 1000;
        return dateB - dateA;
      });
      setOrders(combinedOrders);

    } catch (error) {
      console.error('Erro ao carregar encomendas:', error);
      toast.error('Erro ao carregar a mesa de encomendas.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus, type) => {
    try {
      if (type === 'Pedido') {
        await api.put(`/orders/${orderId}`, { status: newStatus });
      } else {
        await api.put(`/request-service/${orderId}/status`, { status: newStatus });
      }
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Estado atualizado para ${newStatus}`);
    } catch (error) {
      toast.error('Erro ao atualizar estado.');
    }
  };

  const handleDeleteOrder = async (orderId, type) => {
    if (window.confirm("Tem a certeza que deseja apagar este pedido?")) {
      try {
        if (type === 'Pedido') {
          await api.delete(`/orders/${orderId}`);
        } else {
          await api.delete(`/request-service/${orderId}`);
        }
        setOrders(orders.filter(o => o._id !== orderId));
        toast.success("Pedido removido com sucesso!");
      } catch (error) {
        console.error("Erro ao apagar:", error);
        toast.error("Erro ao apagar o pedido.");
      }
    }
  };

  const handleForceCancel = async (orderId) => {
    const reason = window.prompt("Motivo para o cancelamento forçado e reembolso?");
    if (!reason) return;
    
    try {
      await api.post(`/admin-ops/trip/${orderId}/force-cancel`, { reason });
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: 'Cancelada', paymentStatus: 'Reembolsado (Admin)' } : o));
      setSelectedOrder(null);
      toast.success("Pedido cancelado e reembolso emitido!");
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao forçar cancelamento.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pendente': return 'bg-warning text-dark';
      case 'Em Preparação': 
      case 'Aceite pelo entregador': return 'bg-info text-dark';
      case 'A Caminho': 
      case 'Em trânsito':
      case 'No destino indicado': return 'bg-primary text-white';
      case 'Entregue': 
      case 'Finalizado': return 'bg-success text-white';
      case 'Cancelada':
      case 'Cancelado': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pendente': return faClock;
      case 'Em Preparação':
      case 'Aceite pelo entregador': return faBoxOpen;
      case 'A Caminho': 
      case 'Em trânsito':
      case 'No destino indicado': return faMotorcycle;
      case 'Entregue': 
      case 'Finalizado': return faCheckCircle;
      default: return faBoxOpen;
    }
  };

  // Export orders to Excel
  const exportToExcel = () => {
    try {
      const data = orders.map((order) => ({
        ID: order._id,
        Código: order.code || order._id.slice(-6),
        Cliente: order.user?.name || order.name || customersMap[order.user]?.name || customersMap[order.customerId]?.name || 'Desconhecido',
        Valor: Number(order.totalPrice || order.deliveryPrice || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' }),
        Estado: order.status,
        Data: new Date(order.createdAt).toLocaleString('pt-PT'),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, 'orders.xlsx');
    } catch (err) {
      console.error('Erro ao exportar para Excel:', err);
      toast.error('Falha ao gerar o Excel.');
    }
  };

  // Export orders to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const tableColumn = ['ID', 'Código', 'Cliente', 'Valor', 'Estado', 'Data'];
      const tableRows = orders.map((order) => [
        order._id,
        order.code || order._id.slice(-6),
        order.user?.name || order.name || customersMap[order.user]?.name || customersMap[order.customerId]?.name || 'Desconhecido',
        Number(order.totalPrice || order.deliveryPrice || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' }),
        order.status,
        new Date(order.createdAt).toLocaleString('pt-PT'),
      ]);
      doc.autoTable({ head: [tableColumn], body: tableRows });
      doc.save('orders.pdf');
    } catch (err) {
      console.error('Erro ao exportar para PDF:', err);
      toast.error('Falha ao gerar o PDF.');
    }
  };


  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold m-0 text-dark">Mesa de Encomendas / Pedidos</h2>
          <span className="text-muted small">Rastreio e gestão de todas as entregas logísticas em tempo real</span>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <div className="position-relative" style={{ width: '200px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control form-control-sm rounded-pill ps-5 bg-white border-0 shadow-sm py-2" 
              placeholder="Pesquisar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="form-select form-select-sm border-0 shadow-sm" value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
            <option value="">Todos os Dias</option>
            {[...Array(31)].map((_, i) => {
              const d = (i + 1).toString().padStart(2, '0');
              return <option key={d} value={d}>{d}</option>
            })}
          </select>
          <select className="form-select form-select-sm border-0 shadow-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="">Todos os Meses</option>
            <option value="01">Janeiro</option>
            <option value="02">Fevereiro</option>
            <option value="03">Março</option>
            <option value="04">Abril</option>
            <option value="05">Maio</option>
            <option value="06">Junho</option>
            <option value="07">Julho</option>
            <option value="08">Agosto</option>
            <option value="09">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>
          <button onClick={fetchOrdersAndRelatedData} className="btn btn-sm btn-outline-primary fw-bold shadow-sm">
            <FontAwesomeIcon icon={faSync} className="me-1" /> Atualizar
          </button>
          <button onClick={exportToPDF} className="btn btn-sm btn-outline-danger fw-bold shadow-sm">PDF</button>
          <button onClick={exportToExcel} className="btn btn-sm btn-outline-success fw-bold shadow-sm">Excel</button>
        </div>
      </div>

      {/* KPIs Display */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 text-center p-3">
            <div className="text-muted small mb-1 fw-bold">Total de Pedidos</div>
            <h3 className="fw-bold text-dark m-0">{totalPedidos}</h3>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 text-center p-3">
            <div className="text-muted small mb-1 fw-bold">Pedidos Concluídos</div>
            <h3 className="fw-bold text-success m-0">{pedidosConcluídos}</h3>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 text-center p-3">
            <div className="text-muted small mb-1 fw-bold">Em Andamento</div>
            <h3 className="fw-bold text-warning m-0">{pedidosEmAndamento}</h3>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 text-center p-3">
            <div className="text-muted small mb-1 fw-bold">Receita Total</div>
            <h3 className="fw-bold text-primary m-0">{receitaTotal.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</h3>
          </div>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">ID Pedido / Data</th>
                  <th className="border-0 text-muted py-3">Cliente</th>
                  <th className="border-0 text-muted py-3">Motorista Atribuído</th>
                  <th className="border-0 text-muted py-3">Valor Total</th>
                  <th className="border-0 text-muted py-3">Estado Atual</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Atualizar Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-3" />
                      <p className="text-muted m-0 fw-bold">A rastrear frota e encomendas...</p>
                    </td>
                  </tr>
                ) : currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <div className="bg-light d-inline-flex p-4 rounded-circle mb-3 shadow-sm text-primary-custom">
                         <FontAwesomeIcon icon={faRoute} size="2x" />
                      </div>
                      <p className="m-0 fw-bold">Nenhuma encomenda/pedido encontrada.</p>
                    </td>
                  </tr>
                ) : currentOrders.map(order => (
                  <tr key={order._id}>
                    <td className="px-4">
                      <div className="d-flex flex-wrap align-items-center mb-1">
                        <div className="fw-bold text-dark text-uppercase bg-light px-2 py-1 rounded border me-2">
                          #{order.code || order._id.slice(-6)}
                        </div>
                        <span className={`badge me-2 ${order.orderType === 'Pedido' ? 'bg-primary-custom' : 'bg-warning text-dark'}`}>
                          {order.orderType}
                        </span>
                        {order.goodType && (
                          <span className="badge me-2 bg-info text-dark">
                            {order.goodType}
                          </span>
                        )}
                        {order.transportType && (
                          <span className="badge me-2 bg-secondary">
                            <FontAwesomeIcon icon={faTruck} className="me-1" />
                            {subcategoriesMap[order.transportType] || order.transportType}
                          </span>
                        )}
                        {order.isScheduled ? (
                          <span className="badge bg-warning text-dark"><FontAwesomeIcon icon={faCalendarAlt} className="me-1"/>Agendado</span>
                        ) : (
                          <span className="badge bg-info text-dark"><FontAwesomeIcon icon={faBolt} className="me-1"/>Agora</span>
                        )}
                      </div>
                      <div className="text-muted small">
                        {new Date(order.createdAt).toLocaleString('pt-PT')}
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark mb-1 text-truncate" style={{maxWidth: '200px'}}>
                        <FontAwesomeIcon icon={faUser} className="text-muted me-2" />
                        {order.user?.name || order.name || customersMap[order.user]?.name || customersMap[order.customerId]?.name || 'Cliente Desconhecido'}
                      </div>
                      <div className="text-muted small text-truncate" style={{maxWidth: '220px'}} title={`${order.pickupAddress?.address || order.origin} -> ${order.deliveryAddress?.address || order.destination}`}>
                        {(order.pickupAddress?.address || order.origin || 'N/A').split(',')[0]} <FontAwesomeIcon icon={faMapMarkerAlt} className="mx-1 text-primary-custom"/> {(order.deliveryAddress?.address || order.destination || 'N/A').split(',')[0]}
                      </div>
                    </td>
                    <td>
                      {order.deliveryman && order.deliveryman.name ? (
                        <>
                          <div className="fw-bold text-primary-custom mb-1"><FontAwesomeIcon icon={faMotorcycle} className="me-2" />{order.deliveryman.name}</div>
                          <div className="text-muted small"><OrderTiming order={order} /></div>
                        </>
                      ) : (
                        <>
                          <div className="mb-1"><span className="badge bg-light text-muted border text-uppercase">Sem Motorista</span></div>
                          <div className="text-muted small"><OrderTiming order={order} /></div>
                        </>
                      )}
                    </td>
                    <td>
                      <div className="fw-bold text-dark fs-5"><FontAwesomeIcon icon={faMoneyBillWave} className="text-success me-1" /> {Number(order.totalPrice || order.deliveryPrice || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill px-3 py-2 fw-bold ${getStatusBadgeClass(order.status)}`}>
                        <FontAwesomeIcon icon={getStatusIcon(order.status)} className="me-2" />
                        {order.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <div className="d-flex justify-content-end align-items-center">
                        <button className="btn btn-sm btn-light text-primary-custom rounded-3 shadow-sm me-2 border" onClick={() => setSelectedOrder(order)} title="Ver Detalhes">
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm me-2 border" onClick={() => handleDeleteOrder(order._id, order.orderType)} title="Apagar Pedido">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                        <div className="dropdown">
                        <button className="btn btn-sm btn-outline-primary fw-bold rounded-pill dropdown-toggle shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                          <FontAwesomeIcon icon={faExchangeAlt} className="me-1" /> Mudar Estado
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                          <li><button className="dropdown-item fw-bold text-warning" onClick={() => handleStatusChange(order._id, 'Pendente', order.orderType)}><FontAwesomeIcon icon={faClock} className="me-2" />Pendente</button></li>
                          <li><button className="dropdown-item fw-bold text-info" onClick={() => handleStatusChange(order._id, 'Em Preparação', order.orderType)}><FontAwesomeIcon icon={faBoxOpen} className="me-2" />Em Preparação</button></li>
                          <li><button className="dropdown-item fw-bold text-primary" onClick={() => handleStatusChange(order._id, 'A Caminho', order.orderType)}><FontAwesomeIcon icon={faMotorcycle} className="me-2" />A Caminho</button></li>
                          <li><hr className="dropdown-divider" /></li>
                          <li><button className="dropdown-item fw-bold text-success" onClick={() => handleStatusChange(order._id, 'Entregue', order.orderType)}><FontAwesomeIcon icon={faCheckCircle} className="me-2" />Entregue</button></li>
                          <li><button className="dropdown-item fw-bold text-danger" onClick={() => handleStatusChange(order._id, 'Cancelada', order.orderType)}><FontAwesomeIcon icon={faTimes} className="me-2" />Cancelada</button></li>
                        </ul>
                      </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls 
            currentPage={currentPage} totalPages={totalPages} 
            onNext={nextPage} onPrev={prevPage} 
            totalItems={totalItems} indexOfFirstItem={indexOfFirstItem} indexOfLastItem={indexOfLastItem}
          />
        </div>
      </div>

      {/* Modal Ver Detalhes da Encomenda */}
      {selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  Detalhes d{selectedOrder.orderType === 'Pedido' ? 'o Pedido' : 'a Encomenda/Serviço'} <span className="text-primary-custom">#{selectedOrder.code || selectedOrder._id.slice(-6).toUpperCase()}</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <div className="d-flex gap-3">
                    <div className="text-muted small">
                      <FontAwesomeIcon icon={faClock} className="me-1" /> {new Date(selectedOrder.createdAt).toLocaleString('pt-PT')}
                    </div>
                    {selectedOrder.isScheduled ? (
                      <span className="badge bg-warning text-dark"><FontAwesomeIcon icon={faCalendarAlt} className="me-1"/>Agendado para {new Date(selectedOrder.scheduledAt).toLocaleString('pt-PT')}</span>
                    ) : (
                      <span className="badge bg-info text-dark"><FontAwesomeIcon icon={faBolt} className="me-1"/>Para agora</span>
                    )}
                  </div>
                  <span className={`badge rounded-pill px-3 py-2 fw-bold ${getStatusBadgeClass(selectedOrder.status)}`}>
                    <FontAwesomeIcon icon={getStatusIcon(selectedOrder.status)} className="me-2" />
                    {selectedOrder.status}
                  </span>
                </div>

                <div className="row g-4 mb-4">
                  {/* Cliente */}
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 text-secondary"><FontAwesomeIcon icon={faUser} className="me-2"/>Dados do Cliente</h6>
                    <div className="bg-light rounded-4 p-3 border h-100">
                      <div className="d-flex align-items-center">
                        <img 
                          src={selectedOrder.user?.profileImage || customersMap[selectedOrder.user]?.profileImage || customersMap[selectedOrder.customerId]?.profileImage || 'https://via.placeholder.com/60'} 
                          alt="User" 
                          className="rounded-circle me-3 border" 
                          style={{ width: '50px', height: '50px', objectFit: 'cover' }} 
                        />
                        <div>
                          <div className="fw-bold text-dark">{selectedOrder.user?.name || selectedOrder.name || customersMap[selectedOrder.user]?.name || customersMap[selectedOrder.customerId]?.name || 'Cliente Desconhecido'}</div>
                          <div className="text-muted small"><FontAwesomeIcon icon={faPhone} className="me-1"/>{selectedOrder.user?.phoneNumber || selectedOrder.phoneNumber || customersMap[selectedOrder.user]?.phoneNumber || customersMap[selectedOrder.customerId]?.phoneNumber || 'Sem número'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Motorista */}
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 text-secondary"><FontAwesomeIcon icon={faMotorcycle} className="me-2"/>Motorista Atribuído</h6>
                    <div className="bg-light rounded-4 p-3 border h-100">
                      {selectedOrder.deliveryman?.name || selectedOrder.driverId ? (
                        <div className="d-flex align-items-center">
                          <img 
                            src={selectedOrder.deliveryman?.profileImage || 'https://via.placeholder.com/60'} 
                            alt="Driver" 
                            className="rounded-circle me-3 border" 
                            style={{ width: '50px', height: '50px', objectFit: 'cover' }} 
                          />
                          <div>
                            <div className="fw-bold text-dark">{selectedOrder.deliveryman?.name || driversMap[selectedOrder.driverId]}</div>
                            {selectedOrder.deliveryman?.phoneNumber && (
                              <div className="text-muted small"><FontAwesomeIcon icon={faPhone} className="me-1"/>{selectedOrder.deliveryman.phoneNumber}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted text-center pt-2">Ainda sem Motorista atribuído</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info do Serviço */}
                <h6 className="fw-bold mb-3 text-secondary"><FontAwesomeIcon icon={faInfoCircle} className="me-2"/>Detalhes do Serviço</h6>
                <div className="bg-light rounded-4 p-3 border mb-4">
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div className="text-muted small">Província</div>
                      <div className="fw-bold text-dark">{selectedOrder.province || 'Maputo Cidade'}</div>
                    </div>
                    {selectedOrder.orderType && (
                      <div className="col-sm-6">
                        <div className="text-muted small">Classificação</div>
                        <div className="fw-bold text-primary-custom">{selectedOrder.orderType}</div>
                      </div>
                    )}
                    {selectedOrder.goodType && (
                      <div className="col-sm-6">
                        <div className="text-muted small">Tipo de Serviço/Bem</div>
                        <div className="fw-bold text-primary-custom">{selectedOrder.goodType}</div>
                      </div>
                    )}
                    {selectedOrder.transportType && (
                      <div className="col-sm-6">
                        <div className="text-muted small">Tipo de Transporte</div>
                        <div className="fw-bold text-primary-custom">{subcategoriesMap[selectedOrder.transportType] || selectedOrder.transportType}</div>
                      </div>
                    )}
                    {selectedOrder.distance && (
                      <div className="col-sm-6">
                        <div className="text-muted small">Distância Estimada</div>
                        <div className="fw-bold text-dark">{selectedOrder.distance}</div>
                      </div>
                    )}
                    {selectedOrder.duration && (
                      <div className="col-sm-6">
                        <div className="text-muted small">Duração Estimada</div>
                        <div className="fw-bold text-dark">{selectedOrder.duration}</div>
                      </div>
                    )}
                    {selectedOrder.paymentMethod && (
                      <div className="col-sm-6">
                        <div className="text-muted small">Método de Pagamento</div>
                        <div className="fw-bold text-dark"><FontAwesomeIcon icon={faCreditCard} className="me-1"/>{selectedOrder.paymentMethod}</div>
                      </div>
                    )}
                  </div>

                  {selectedOrder.notes && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="text-muted small">Observações / Notas</div>
                      <div className="text-dark bg-white p-2 rounded border mt-1 small">{selectedOrder.notes}</div>
                    </div>
                  )}
                </div>

                {/* Moradas e Destinatário */}
                <h6 className="fw-bold mb-3 text-secondary"><FontAwesomeIcon icon={faRoute} className="me-2"/>Rotas e Contatos</h6>
                <div className="bg-light rounded-4 p-3 border mb-4">
                  <div className="d-flex mb-3 pb-3 border-bottom">
                    <div className="text-primary-custom me-3 mt-1"><FontAwesomeIcon icon={faMapMarkerAlt} /></div>
                    <div>
                      <div className="text-muted small fw-bold">Origem</div>
                      <div className="text-dark">{selectedOrder.pickupAddress?.address || selectedOrder.origin || 'Não definida'}</div>
                    </div>
                  </div>
                  
                  <div className="d-flex mb-3 pb-3 border-bottom">
                    <div className="text-success me-3 mt-1"><FontAwesomeIcon icon={faCheckCircle} /></div>
                    <div>
                      <div className="text-muted small fw-bold">Destino</div>
                      <div className="text-dark">{selectedOrder.deliveryAddress?.address || selectedOrder.destination || 'Não definida'}</div>
                    </div>
                  </div>

                  {selectedOrder.recipientName && (
                    <div className="d-flex">
                      <div className="text-secondary me-3 mt-1"><FontAwesomeIcon icon={faUserFriends} /></div>
                      <div>
                        <div className="text-muted small fw-bold">Destinatário</div>
                        <div className="text-dark">{selectedOrder.recipientName} {selectedOrder.recipientPhone ? `(${selectedOrder.recipientPhone})` : ''}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Produtos (Se existirem) */}
                {selectedOrder.products && selectedOrder.products.length > 0 && (
                  <>
                    <h6 className="fw-bold mb-3 text-secondary"><FontAwesomeIcon icon={faBoxOpen} className="me-2"/>Itens do Pedido</h6>
                    <div className="bg-light rounded-4 p-3 border mb-4">
                      <ul className="list-group list-group-flush rounded border">
                        {selectedOrder.products.map((p, idx) => (
                          <li key={idx} className="list-group-item d-flex justify-content-between align-items-center bg-white">
                            <div>
                              <span className="fw-bold">{p.name || p.product?.name || 'Produto'}</span>
                              {p.variant && <span className="text-muted small ms-2">({p.variant})</span>}
                            </div>
                            <span className="badge bg-secondary rounded-pill">x{p.quantity || 1}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Resumo Financeiro */}
                <div className="border rounded-4 p-3 bg-white mb-4 shadow-sm">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Custo dos Produtos/Serviço:</span>
                    <span className="fw-bold text-dark">{Number(selectedOrder.itemsPrice || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Taxa de Entrega:</span>
                    <span className="fw-bold text-dark">{Number(selectedOrder.deliveryPrice || selectedOrder.taxPrice || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                  </div>
                  <hr/>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted fw-bold">Total a Pagar:</span>
                    <h3 className="fw-bold m-0 text-success"><FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />{Number(selectedOrder.totalPrice || selectedOrder.deliveryPrice || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</h3>
                  </div>
                </div>

                {/* Chat Panel Integrado */}
                {!['Cancelada', 'Cancelado', 'Entregue', 'Finalizado'].includes(selectedOrder.status) && (
                  <div className="mb-4">
                    <TripChatPanel tripId={selectedOrder._id} />
                  </div>
                )}

                <button type="button" className="btn btn-primary w-100 fw-bold rounded-pill py-3 shadow-sm mb-3" onClick={() => setSelectedOrder(null)}>
                  Fechar Detalhes
                </button>
                
                {!['Cancelada', 'Cancelado', 'Entregue', 'Finalizado'].includes(selectedOrder.status) && (
                  <button 
                    type="button" 
                    className="btn btn-outline-danger w-100 fw-bold rounded-pill py-3 shadow-sm" 
                    onClick={() => handleForceCancel(selectedOrder._id)}
                  >
                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                    Forçar Cancelamento & Reembolso
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .shadow-sm-custom { box-shadow: 0 4px 20px rgba(0,0,0,0.03) !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
