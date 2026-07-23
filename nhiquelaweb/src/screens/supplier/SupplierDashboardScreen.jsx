import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faShoppingBag, faStar, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import api from '../../api';

export default function SupplierDashboardScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const userInfo = useSelector(selectUser);

  // Exemplo de como um seller buscaria suas métricas (baseado nas rotas reais do backend)
  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        if (!userInfo) return;
        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
        
        // Simula busca por pedidos recentes usando a rota /api/orders/sellerordersview
        // Onde o backend extrai os pedidos atrelados ao vendedor
        const { data } = await api.get('/orders/sellerordersview', config);
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Erro ao buscar dashboard do vendedor:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [userInfo]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0">Bem-vindo, {userInfo?.sellerName || userInfo?.name || 'Vendedor'}!</h2>
        <span className="text-muted small">Resumo do desempenho da sua loja hoje</span>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3 bg-success text-white">
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="opacity-75 mb-1">Vendas (Mês)</h6>
                <h3 className="fw-bold m-0">45,000 MT</h3>
                <small className="opacity-75 d-block mt-2"><FontAwesomeIcon icon={faArrowUp} /> 12% vs Mês Passado</small>
              </div>
              <FontAwesomeIcon icon={faMoneyBillWave} size="3x" className="opacity-50" />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3">
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted mb-1">Pedidos Pendentes</h6>
                <h3 className="fw-bold m-0">{orders.length}</h3>
                <small className="text-muted d-block mt-2">Aguardando Envio</small>
              </div>
              <div className="bg-light text-warning rounded-circle d-flex justify-content-center align-items-center" style={{ width: '60px', height: '60px' }}>
                <FontAwesomeIcon icon={faShoppingBag} size="2x" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm-custom border-0 rounded-3">
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-muted mb-1">Avaliação da Loja</h6>
                <h3 className="fw-bold m-0">4.8 / 5.0</h3>
                <small className="text-muted d-block mt-2">Baseado em 120 reviews</small>
              </div>
              <div className="bg-light text-warning rounded-circle d-flex justify-content-center align-items-center" style={{ width: '60px', height: '60px' }}>
                <FontAwesomeIcon icon={faStar} size="2x" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <h5 className="fw-bold mb-3">Últimos Pedidos Recebidos</h5>
      <div className="card shadow-sm-custom border-0 rounded-3">
        <div className="card-body p-4 text-center text-muted">
          {loading ? 'Carregando dados...' : (
             orders.length > 0 ? (
               <ul className="list-group text-start">
                 {orders.slice(0, 5).map(o => (
                   <li key={o._id} className="list-group-item">{o.code} - {o.totalPrice} MT</li>
                 ))}
               </ul>
             ) : 'Você não possui pedidos recentes.'
          )}
        </div>
      </div>
    </div>
  );
}
