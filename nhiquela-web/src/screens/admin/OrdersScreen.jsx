import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen, faMotorcycle, faUser, faClock, faCheckCircle, faSpinner, faMapMarkerAlt, faExchangeAlt, faMoneyBillWave, faRoute, faTimes, faEye, faMap, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const OrderTiming = ({ order }) => {
  const [elapsed, setElapsed] = useState('--');
  const isCompleted = order.status === 'Entregue' || order.status === 'Cancelada';

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
    <>
      <div className="text-muted small mt-1">
        <span className="fw-bold">Solicitação:</span> {new Date(order.createdAt).toLocaleString('pt-PT')}
      </div>
      <div className="text-muted small mt-1">
        <span className="fw-bold">Conclusão:</span> {isCompleted ? new Date(order.deliveryDate || order.updatedAt || order.createdAt).toLocaleString('pt-PT') : 'A decorrer...'}
      </div>
      <div className="small mt-1">
        <span className="fw-bold text-dark">Duração:</span> <span className={isCompleted ? "text-success fw-bold" : "text-danger fw-bold"}><FontAwesomeIcon icon={faClock} className="me-1"/>{elapsed}</span>
      </div>
    </>
  );
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customersMap, setCustomersMap] = useState({});
  const [driversMap, setDriversMap] = useState({});
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

  useEffect(() => {
    fetchOrdersAndRelatedData();
  }, []);

  const fetchOrdersAndRelatedData = async () => {
    setLoading(true);
    try {
      const [ordersRes, requestsRes, custRes, driversRes] = await Promise.all([
        api.get('/orders'),
        api.get('/requestdeliver/admin'),
        api.get('/customers'),
        api.get('/drivers')
      ]);

      // Create maps for quick lookup O(1)
      const cMap = {};
      custRes.data.forEach(c => cMap[c._id] = c.name);
      setCustomersMap(cMap);

      const dMap = {};
      driversRes.data.forEach(d => dMap[d._id] = d.name);
      setDriversMap(dMap);

      // Sort by newest first
      const ordersArray = ordersRes.data.orders || [];
      const formattedOrders = ordersArray.map(o => ({ ...o, orderType: 'Pedido' }));

      const requestsArray = requestsRes.data.deliverRequests || [];
      const formattedRequests = requestsArray.map(r => ({ ...r, orderType: 'Encomenda' }));

      const combinedOrders = [...formattedOrders, ...formattedRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(combinedOrders);

    } catch (error) {
      console.error('Erro ao carregar encomendas:', error);
      toast.error('Erro ao carregar a mesa de encomendas.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}`, { status: newStatus });
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Estado da encomenda atualizado para ${newStatus}`);
    } catch (error) {
      toast.error('Erro ao atualizar estado da encomenda.');
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
          <button className="btn btn-sm btn-outline-danger fw-bold shadow-sm" onClick={exportToPDF}>PDF</button>
          <button className="btn btn-sm btn-outline-success fw-bold shadow-sm" onClick={exportToExcel}>Excel</button>
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
                      <div className="fw-bold text-dark text-uppercase bg-light d-inline-block px-2 py-1 rounded border mb-1">
                        #{order.code || order._id.slice(-6)}
                      </div>
                      <span className={`badge ms-2 ${order.orderType === 'Pedido' ? 'bg-primary-custom' : 'bg-warning text-dark'}`}>
                        {order.orderType}
                      </span>
                      <OrderTiming order={order} />
                    </td>
                    <td>
                      <div className="fw-bold text-dark"><FontAwesomeIcon icon={faUser} className="text-muted me-2" />{order.user?.name || order.name || customersMap[order.user] || 'Cliente Desconhecido'}</div>
                      <div className="text-muted small"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" /> {order.deliveryAddress?.address || order.destination || 'Morada de Entrega'}</div>
                    </td>
                    <td>
                      {order.deliveryman && order.deliveryman.name ? (
                        <div>
                          <div className="fw-bold text-primary-custom"><FontAwesomeIcon icon={faMotorcycle} className="me-2" />{order.deliveryman.name}</div>
                        </div>
                      ) : (
                        <span className="badge bg-light text-muted border text-uppercase">Sem Motorista</span>
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
                        <div className="dropdown">
                        <button className="btn btn-sm btn-outline-primary fw-bold rounded-pill dropdown-toggle shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                          <FontAwesomeIcon icon={faExchangeAlt} className="me-1" /> Mudar Estado
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                          <li><button className="dropdown-item fw-bold text-warning" onClick={() => handleStatusChange(order._id, 'Pendente')}><FontAwesomeIcon icon={faClock} className="me-2" />Pendente</button></li>
                          <li><button className="dropdown-item fw-bold text-info" onClick={() => handleStatusChange(order._id, 'Em Preparação')}><FontAwesomeIcon icon={faBoxOpen} className="me-2" />Em Preparação</button></li>
                          <li><button className="dropdown-item fw-bold text-primary" onClick={() => handleStatusChange(order._id, 'A Caminho')}><FontAwesomeIcon icon={faMotorcycle} className="me-2" />A Caminho</button></li>
                          <li><hr className="dropdown-divider" /></li>
                          <li><button className="dropdown-item fw-bold text-success" onClick={() => handleStatusChange(order._id, 'Entregue')}><FontAwesomeIcon icon={faCheckCircle} className="me-2" />Entregue</button></li>
                          <li><button className="dropdown-item fw-bold text-danger" onClick={() => handleStatusChange(order._id, 'Cancelada')}><FontAwesomeIcon icon={faTimes} className="me-2" />Cancelada</button></li>
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">Detalhes da Encomenda <span className="text-primary-custom">#{selectedOrder._id.slice(-6).toUpperCase()}</span></h5>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="text-muted small"><FontAwesomeIcon icon={faClock} className="me-1" /> {new Date(selectedOrder.createdAt).toLocaleString('pt-PT')}</div>
                  <span className={`badge rounded-pill px-3 py-2 fw-bold ${getStatusBadgeClass(selectedOrder.status)}`}>
                    <FontAwesomeIcon icon={getStatusIcon(selectedOrder.status)} className="me-2" />
                    {selectedOrder.status}
                  </span>
                </div>

                <div className="bg-light rounded-4 p-3 mb-3 border">
                  <div className="d-flex mb-2">
                    <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faUser} /></div>
                    <div className="fw-bold text-dark">{customersMap[selectedOrder.customerId] || 'Cliente Desconhecido'}</div>
                  </div>
                  <div className="d-flex mb-2">
                    <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faMotorcycle} /></div>
                    <div className="fw-bold text-dark">{selectedOrder.driverId ? driversMap[selectedOrder.driverId] || 'Motorista Desconhecido' : 'Ainda sem Motorista'}</div>
                  </div>
                  <div className="d-flex mb-2">
                    <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faMap} /></div>
                    <div className="fw-bold text-dark">Província: <span className="text-primary-custom">{selectedOrder.province || 'Maputo Cidade'}</span></div>
                  </div>
                  <div className="d-flex">
                    <div className="text-muted" style={{width: '30px'}}><FontAwesomeIcon icon={faMapMarkerAlt} /></div>
                    <div className="fw-bold text-dark">Morada de Entrega</div>
                  </div>
                </div>

                <div className="border rounded-3 p-3 text-center bg-white mb-4">
                  <div className="text-muted small fw-bold mb-1">Valor Total a Pagar</div>
                  <h3 className="fw-bold m-0 text-success"><FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />{Number(selectedOrder.amount).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</h3>
                </div>

                <button type="button" className="btn btn-light w-100 fw-bold border py-2" onClick={() => setSelectedOrder(null)}>
                  Fechar Detalhes
                </button>
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
