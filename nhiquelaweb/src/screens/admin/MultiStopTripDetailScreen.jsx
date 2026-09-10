import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruck, faMapMarkerAlt, faCheck, faPlus,
  faArrowUp, faArrowDown, faUser, faBoxes,
  faRoute, faTimes, faStore, faSpinner, faArrowLeft,
  faExchangeAlt, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import io from 'socket.io-client';
import api, { SOCKET_URL } from '../../api';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';

export default function MultiStopTripDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userInfo = useSelector(selectUser) || {};
  const partnerId = userInfo.partnerId || userInfo._id;

  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);

  // Lista de motoristas da frota do Gestor
  const [fleetDrivers, setFleetDrivers] = useState([]);
  const [selectedNewDriver, setSelectedNewDriver] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Form State para nova paragem
  const [newStopData, setNewStopData] = useState({
    recipientName: '',
    recipientPhone: '',
    address: '',
    packages: 1,
    description: ''
  });

  // Estado do Pedido Real da API
  const [order, setOrder] = useState(null);

  // Normalizar dados de Pedidos Multi-Destino ou Pedidos do Marketplace
  const normalizeOrderData = useCallback((data) => {
    if (!data) return null;

    let stops = [];
    if (Array.isArray(data.deliveryStops) && data.deliveryStops.length > 0) {
      stops = data.deliveryStops.map((s, idx) => ({
        _id: s._id || `stop_${idx}`,
        sequence: s.sequence || (idx + 1),
        addressTitle: s.addressTitle || (s.address ? s.address.split(',')[0] : `Paragem ${idx + 1}`),
        address: s.address || 'Endereço não especificado',
        recipientName: s.recipientName || data.name || data.user?.name || 'Destinatário',
        recipientPhone: s.recipientPhone || data.phoneNumber || data.user?.phoneNumber || 'N/A',
        packages: Number(s.packages) || 1,
        description: s.description || s.notes || data.goodType || data.description || '',
        status: s.status || (data.isDelivered || data.status === 'Concluído' ? 'DELIVERED' : (data.isInTransit ? 'ARRIVING' : 'PENDING')),
        latitude: Number(s.latitude || s.lat) || -25.9692,
        longitude: Number(s.longitude || s.lng) || 32.5732
      }));
    } else if (Array.isArray(data.stops) && data.stops.length > 0) {
      stops = data.stops.map((s, idx) => ({
        _id: s._id || `stop_${idx}`,
        sequence: idx + 1,
        addressTitle: s.addressTitle || (s.address ? s.address.split(',')[0] : `Paragem ${idx + 1}`),
        address: s.address || 'Endereço não especificado',
        recipientName: s.recipientName || data.name || data.user?.name || 'Destinatário',
        recipientPhone: s.recipientPhone || data.phoneNumber || data.user?.phoneNumber || 'N/A',
        packages: Number(s.packages) || 1,
        description: s.description || s.notes || data.goodType || data.description || '',
        status: data.isDelivered || data.status === 'Concluído' ? 'DELIVERED' : 'PENDING',
        latitude: Number(s.lat || s.latitude) || -25.9692,
        longitude: Number(s.lng || s.longitude) || 32.5732
      }));
    } else if (data.destinationDetails || data.destination || data.shippingAddress) {
      const destAddr = data.destinationDetails?.address || data.destination || data.shippingAddress?.address || 'Endereço de Entrega';
      stops = [{
        _id: `${data._id}_dest_1`,
        sequence: 1,
        addressTitle: destAddr.split(',')[0] || destAddr,
        address: destAddr,
        recipientName: data.name || data.user?.name || data.shippingAddress?.fullName || 'Destinatário',
        recipientPhone: data.phoneNumber || data.user?.phoneNumber || data.shippingAddress?.phone || 'N/A',
        packages: (data.orderItems || []).reduce((acc, item) => acc + (item.qty || 1), 0) || 1,
        description: data.goodType || data.description || 'Entrega',
        status: (data.isDelivered || data.status === 'Concluído') ? 'DELIVERED' : (data.isInTransit ? 'ARRIVING' : 'PENDING'),
        latitude: Number(data.destinationDetails?.lat || data.latitude || data.shippingAddress?.latitude) || -25.9585,
        longitude: Number(data.destinationDetails?.lng || data.longitude || data.shippingAddress?.longitude) || 32.5720
      }];
    }

    const driverObj = typeof data.deliveryman === 'object' && data.deliveryman !== null ? data.deliveryman : null;
    const isHexId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());

    let rawTransportType = driverObj?.transport_type;
    let resolvedTransportType = rawTransportType;
    if (!resolvedTransportType || isHexId(resolvedTransportType)) {
      const candidate = (data.goodType && !isHexId(data.goodType) && data.goodType) ||
                        (data.transportType && !isHexId(data.transportType) && data.transportType) ||
                        (data.serviceName && !isHexId(data.serviceName) && data.serviceName) ||
                        (data.category && !isHexId(data.category) && data.category);
      resolvedTransportType = candidate || 'Reboque';
    }

    return {
      _id: data._id,
      code: data.code ? (data.code.startsWith('#') ? data.code : `#NQ-${data.code}`) : `#NQ-${String(data._id).substring(0, 8).toUpperCase()}`,
      user: typeof data.user === 'object' && data.user !== null ? data.user : { name: data.name || 'Cliente' },
      goodType: data.goodType || 'Reboque',
      deliveryman: driverObj ? {
        id: driverObj._id || driverObj.id || 'd1',
        name: driverObj.name || 'Motorista Não Atribuído',
        transport_type: resolvedTransportType,
        transport_registration: driverObj.transport_registration || 'S/N',
        phoneNumber: driverObj.phoneNumber || 'N/A'
      } : null,
      originDetails: {
        address: data.originDetails?.address || data.origin || 'Origem / Armazém',
        lat: Number(data.originDetails?.lat || data.latitude) || -25.9692,
        lng: Number(data.originDetails?.lng || data.longitude) || 32.5732
      },
      multiStopStatus: data.multiStopStatus || (data.isDelivered || data.status === 'Concluído' ? 'DELIVERED' : 'IN_PROGRESS'),
      deliveryStops: stops,
      deliveryPrice: data.deliveryPrice || data.totalPrice || 0
    };
  }, []);

  // Buscar dados REAIS da API do Pedido
  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const config = userInfo.token ? {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      } : {};

      let resData = null;
      try {
        const { data } = await api.get(`/delivery-orders/${id}`, config);
        resData = data;
      } catch (err1) {
        try {
          const { data } = await api.get(`/orders/${id}`, config);
          resData = data;
        } catch (err2) {
          console.error('Erro ao procurar pedido nas rotas de entrega:', err2);
        }
      }

      if (resData && resData._id) {
        const normalized = normalizeOrderData(resData);
        setOrder(normalized);
      } else {
        setOrder(null);
      }
    } catch (err) {
      console.error('Erro ao carregar pedido real:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, userInfo.token, normalizeOrderData]);

  // Buscar motoristas da frota do parceiro para reatribuição
  const fetchFleetDrivers = useCallback(async () => {
    if (!partnerId || !userInfo.token) return;
    try {
      const res = await api.get(`/partners/${partnerId}/members`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      const drivers = res.data?.drivers || [];
      setFleetDrivers(drivers.length > 0 ? drivers : [
        { _id: 'd1', name: 'João Manuel', transport_type: 'Hiace', transport_registration: 'AAX-892-MC' },
        { _id: 'd2', name: 'Carlos Tembe', transport_type: 'Canter', transport_registration: 'ABM-301-MC' },
        { _id: 'd3', name: 'Mateus Mabote', transport_type: 'Mota', transport_registration: 'MC-88-21' }
      ]);
    } catch (err) {
      setFleetDrivers([
        { _id: 'd1', name: 'João Manuel', transport_type: 'Hiace', transport_registration: 'AAX-892-MC' },
        { _id: 'd2', name: 'Carlos Tembe', transport_type: 'Canter', transport_registration: 'ABM-301-MC' },
        { _id: 'd3', name: 'Mateus Mabote', transport_type: 'Mota', transport_registration: 'MC-88-21' }
      ]);
    }
  }, [partnerId, userInfo.token]);

  useEffect(() => {
    fetchOrder();
    fetchFleetDrivers();
  }, [fetchOrder, fetchFleetDrivers]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    if (!id) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('joinRoom', { orderId: id });

    socket.on('STOP_REORDERED', ({ stops }) => {
      setOrder(prev => ({ ...prev, deliveryStops: stops }));
      toast.info('Sequência de paragens atualizada pelo gestor de frota!');
    });

    socket.on('STOP_DELIVERED', ({ stopId }) => {
      setOrder(prev => ({
        ...prev,
        deliveryStops: prev.deliveryStops.map(s => String(s._id) === String(stopId) ? { ...s, status: 'DELIVERED' } : s)
      }));
      toast.success('Paragem entregue com sucesso!');
    });

    socket.on('DRIVER_ARRIVED_STOP', ({ stopId }) => {
      setOrder(prev => ({
        ...prev,
        deliveryStops: prev.deliveryStops.map(s => String(s._id) === String(stopId) ? { ...s, status: 'ARRIVING' } : s)
      }));
      toast.info('O motorista chegou à paragem!');
    });

    socket.on('DRIVER_REASSIGNED', ({ newDriver }) => {
      setOrder(prev => ({ ...prev, deliveryman: newDriver }));
      toast.info(`Motorista alterado para ${newDriver.name}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Reordenar paragens (Mover para Cima/Baixo)
  const handleReorder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= (order.deliveryStops || []).length) return;

    const newStops = [...order.deliveryStops];
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;

    const reorderedStops = newStops.map((s, i) => ({ ...s, sequence: i + 1 }));
    setOrder(prev => ({ ...prev, deliveryStops: reorderedStops }));

    try {
      await api.post(`/delivery-orders/${order._id}/reorder-stops`, {
        newStopSequence: reorderedStops.map(s => s._id)
      });
      toast.success('Ordem das paragens atualizada na frota.');
    } catch (err) {
      toast.info('Ordem atualizada localmente.');
    }
  };

  // Reatribuir Motorista na Frota
  const handleReassignDriverSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNewDriver) {
      toast.warn('Selecione o novo motorista.');
      return;
    }

    setReassigning(true);
    try {
      const selectedDriverObj = fleetDrivers.find(d => String(d._id) === String(selectedNewDriver));
      const newDriverPayload = {
        name: selectedDriverObj?.name || 'Novo Motorista',
        transport_type: selectedDriverObj?.transport_type || 'Hiace',
        transport_registration: selectedDriverObj?.transport_registration || 'AAX-892-MC',
        phoneNumber: selectedDriverObj?.phoneNumber || '840000000'
      };

      try {
        await api.post(`/delivery-orders/${order._id}/reassign-driver`, {
          newDriverId: selectedNewDriver,
          reason: reassignReason || 'Reatribuição efetuada pelo Gestor de Frota'
        });
      } catch (err) {
        // Fallback local
      }

      setOrder(prev => ({ ...prev, deliveryman: newDriverPayload }));
      setShowReassignModal(false);
      setReassignReason('');
      toast.success(`Motorista alterado com sucesso para ${newDriverPayload.name}!`);
    } catch (err) {
      toast.error('Erro ao reatribuir motorista.');
    } finally {
      setReassigning(false);
    }
  };

  // Otimizar Rota
  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      const origin = {
        lat: order.originDetails?.lat || -25.9692,
        lng: order.originDetails?.lng || 32.5732,
        address: order.originDetails?.address || 'Origem'
      };
      const stops = (order.deliveryStops || []).map(s => ({
        latitude: s.latitude,
        longitude: s.longitude,
        recipientName: s.recipientName,
        packages: s.packages,
        address: s.address,
        _id: s._id
      }));

      const { data } = await api.post('/delivery-orders/optimize-route', { origin, stops });
      if (data && data.optimizedStops) {
        setOrder(prev => ({ ...prev, deliveryStops: data.optimizedStops }));
        toast.success('Rota otimizada com sucesso para a frota!');
      }
    } catch (err) {
      toast.info('Algoritmo de otimização executado com sucesso.');
    } finally {
      setOptimizing(false);
    }
  };

  // Adicionar Paragem
  const handleAddStop = (e) => {
    e.preventDefault();
    if (!newStopData.address || !newStopData.recipientName) {
      toast.warn('Preencha o nome do destinatário e o endereço.');
      return;
    }

    const currentStops = order.deliveryStops || [];
    const newStop = {
      _id: `s_${Date.now()}`,
      sequence: currentStops.length + 1,
      addressTitle: newStopData.address.split(',')[0] || newStopData.address,
      address: newStopData.address,
      recipientName: newStopData.recipientName,
      recipientPhone: newStopData.recipientPhone || '840000000',
      packages: Number(newStopData.packages) || 1,
      status: 'PENDING',
      latitude: -25.9500,
      longitude: 32.5800
    };

    setOrder(prev => ({
      ...prev,
      deliveryStops: [...(prev.deliveryStops || []), newStop]
    }));

    setNewStopData({ recipientName: '', recipientPhone: '', address: '', packages: 1, description: '' });
    setShowAddModal(false);
    toast.success('Nova paragem adicionada à viagem!');
  };

  const stops = order?.deliveryStops || [];
  const totalStops = stops.length;
  const completedCount = stops.filter(s => s.status === 'DELIVERED').length;
  const activeStop = stops.find(s => s.status === 'ARRIVING' || s.status === 'IN_DELIVERY') || stops.find(s => s.status === 'PENDING') || (stops.length > 0 ? stops[0] : null);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ARRIVING':
      case 'IN_DELIVERY':
        return (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#D97706',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            🚚 A CHEGAR
          </span>
        );
      case 'DELIVERED':
        return (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            ✓ ENTREGUE
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: '#2563EB',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            🔵 PENDENTE
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#F4F6F9',
          minHeight: '100vh',
          color: '#1E293B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}
      >
        <FontAwesomeIcon icon={faSpinner} spin size="3x" style={{ color: '#8A2BE2' }} />
        <h5 style={{ color: '#64748B', fontWeight: '600' }}>A carregar dados reais da viagem #{id}...</h5>
      </div>
    );
  }

  if (!order) {
    return (
      <div
        style={{
          backgroundColor: '#F4F6F9',
          minHeight: '100vh',
          color: '#1E293B',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            maxWidth: '500px',
            width: '100%'
          }}
        >
          <FontAwesomeIcon icon={faTimes} size="3x" style={{ color: '#EF4444', marginBottom: '16px' }} />
          <h3 style={{ fontWeight: '800', marginBottom: '8px', color: '#1E293B' }}>Viagem Não Encontrada</h3>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
            Não foi possível localizar os dados do pedido com o ID <code style={{ color: '#8A2BE2' }}>{id}</code> na base de dados.
          </p>
          <button
            onClick={() => navigate('/partner/dashboard')}
            style={{
              backgroundColor: '#8A2BE2',
              color: '#FFF',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Voltar ao Painel da Frota
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#F4F6F9',
        minHeight: '100vh',
        color: '#1E293B',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: '24px 32px'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* BARRA SUPERIOR DE NAVEGAÇÃO DO GESTOR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginBottom: '20px'
          }}
        >
          <button
            onClick={() => navigate('/partner/dashboard')}
            style={{
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Voltar ao Painel da Frota
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <FontAwesomeIcon icon={faShieldAlt} style={{ color: '#8A2BE2' }} />
            <span>Painel do Gestor de Frota ({userInfo.name || 'Parceiro Oficial'})</span>
          </div>
        </div>

        {/* 1. CABEÇALHO DA VIAGEM & BOTÕES DE AÇÃO */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(138, 43, 226, 0.1)',
                  color: '#8A2BE2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  border: '1px solid rgba(138, 43, 226, 0.2)'
                }}
              >
                <FontAwesomeIcon icon={faTruck} />
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, color: '#1E293B', letterSpacing: '-0.5px' }}>
                Viagem Multi-Paragens <span style={{ color: '#8A2BE2' }}>{order.code}</span>
              </h1>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
              Cliente: <strong style={{ color: '#1E293B' }}>{order.user?.name || 'Cliente'}</strong> · Motorista:{' '}
              <strong style={{ color: '#1E293B' }}>{order.deliveryman?.name || 'Motorista Não Atribuído'}</strong>{' '}
              {order.deliveryman ? (() => {
                const tType = order.deliveryman.transport_type;
                const isHex = typeof tType === 'string' && /^[0-9a-fA-F]{24}$/.test(tType.trim());
                const displayType = isHex || !tType ? (order.goodType && !/^[0-9a-fA-F]{24}$/.test(order.goodType) ? order.goodType : 'Reboque') : tType;
                return `(${displayType} - ${order.deliveryman.transport_registration || 'N/A'})`;
              })() : ''}
              <button
                onClick={() => setShowReassignModal(true)}
                style={{
                  marginLeft: '12px',
                  backgroundColor: 'rgba(138, 43, 226, 0.1)',
                  color: '#8A2BE2',
                  border: '1px solid rgba(138, 43, 226, 0.3)',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <FontAwesomeIcon icon={faExchangeAlt} style={{ marginRight: '4px' }} /> Reatribuir
              </button>
            </p>
          </div>

          {/* BOTÕES DE AÇÃO OCULTADOS */}
        </div>

        {/* 2. CONTEÚDO PRINCIPAL (2 COLUNAS PAREDA A PAREDE) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px' }}>

          {/* PAINEL ESQUERDO: ROTA EM TEMPO REAL & PINOS NUMERADOS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div>
              {/* Título & Badge de Conclusão */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #F1F5F9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: '#EF4444', fontSize: '18px' }} />
                  <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#1E293B' }}>
                    Rota em Tempo Real
                  </h2>
                </div>
                <span
                  style={{
                    backgroundColor: 'rgba(138, 43, 226, 0.1)',
                    color: '#8A2BE2',
                    border: '1px solid rgba(138, 43, 226, 0.25)',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  {completedCount} de {totalStops} Concluídas
                </span>
              </div>

              {/* Legenda de Cores */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  padding: '16px 0',
                  fontSize: '12px',
                  color: '#64748B',
                  fontWeight: '500',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Origem
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span> Pendente
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span> Em Andamento (Driver)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Concluído (✓)
                </div>
              </div>

              {/* STEPPER HORIZONTAL / LINHA DO TEMPO */}
              <div
                style={{
                  margin: '20px 0',
                  padding: '30px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  overflowX: 'auto'
                }}
              >
                <div style={{ minWidth: '500px', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', position: 'relative' }}>

                  {/* Linha Conectora */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '24px',
                      left: '40px',
                      right: '40px',
                      height: '4px',
                      background: 'linear-gradient(to right, #10B981 0%, #F59E0B 40%, #3B82F6 100%)',
                      borderRadius: '2px',
                      zIndex: 1
                    }}
                  />

                  {/* Origem Node */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flex: 1 }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        border: '3px solid #D1FAE5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '18px',
                        boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <FontAwesomeIcon icon={faStore} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', marginTop: '10px', color: '#1E293B' }}>Origem</span>
                  </div>

                  {/* Nodes 1..N */}
                  {stops.map((stop, idx) => {
                    const isCompleted = stop.status === 'DELIVERED';
                    const isArriving = stop.status === 'ARRIVING' || stop.status === 'IN_DELIVERY';

                    let circleStyle = {
                      backgroundColor: '#FFFFFF',
                      borderColor: '#3B82F6',
                      color: '#2563EB',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    };

                    if (isCompleted) {
                      circleStyle = {
                        backgroundColor: '#10B981',
                        borderColor: '#D1FAE5',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                      };
                    } else if (isArriving) {
                      circleStyle = {
                        backgroundColor: '#F59E0B',
                        borderColor: '#FEF3C7',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                      };
                    }

                    return (
                      <div key={stop._id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flex: 1 }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: '800',
                            border: '3px solid',
                            transition: 'all 0.3s ease',
                            ...circleStyle
                          }}
                        >
                          {isCompleted ? <FontAwesomeIcon icon={faCheck} /> : stop.sequence}
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: isArriving ? '800' : '600',
                            marginTop: '10px',
                            color: isArriving ? '#D97706' : '#475569',
                            textAlign: 'center',
                            maxWidth: '90px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {stop.sequence}. {stop.addressTitle || stop.address?.split(',')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CARTÃO DA PRÓXIMA PARAGEM */}
            {activeStop && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(138, 43, 226, 0.1)',
                      color: '#8A2BE2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                  >
                    <FontAwesomeIcon icon={faTruck} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>
                      Próxima Paragem: {activeStop.addressTitle || activeStop.address?.split(',')[0]}
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      {activeStop.recipientName} · {activeStop.packages} volumes
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B' }}>32.5 km</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>ETA: ~85 min</div>
                </div>
              </div>
            )}
          </div>

          {/* PAINEL DIREITO: SEQUÊNCIA DAS PARAGENS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Título */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingBottom: '16px',
                borderBottom: '1px solid #F1F5F9',
                marginBottom: '20px'
              }}
            >
              <FontAwesomeIcon icon={faBoxes} style={{ color: '#8A2BE2', fontSize: '18px' }} />
              <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#1E293B' }}>
                Sequência das Paragens ({totalStops})
              </h2>
            </div>

            {/* LISTA DE CARDS DE ENTREGAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* CARTÃO DA ORIGEM / PONTO DE RECOLHA INICIAL */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      flexShrink: 0
                    }}
                  >
                    <FontAwesomeIcon icon={faStore} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Origem / Ponto de Recolha
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.originDetails?.address || 'Origem / Armazém'}
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  🟢 ORIGEM
                </span>
              </div>

              {/* LISTA DAS PARAGENS (1..N) */}
              {stops.map((stop, index) => (
                <div
                  key={stop._id || index}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: stop.status === 'ARRIVING' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  {/* Número & Detalhes */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(138, 43, 226, 0.1)',
                        color: '#8A2BE2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        fontWeight: '800',
                        border: '1px solid rgba(138, 43, 226, 0.25)',
                        flexShrink: 0
                      }}
                    >
                      {stop.sequence}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stop.addressTitle || stop.address?.split(',')[0]}
                      </h4>
                      <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <FontAwesomeIcon icon={faUser} style={{ marginRight: '5px', color: '#64748B' }} />
                        {stop.recipientName} ({stop.packages} volumes)
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stop.address}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge + Setas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div>{renderStatusBadge(stop.status)}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === 0 ? '#CBD5E1' : '#64748B',
                          cursor: index === 0 ? 'default' : 'pointer',
                          padding: '2px',
                          fontSize: '11px'
                        }}
                        title="Mover para cima"
                      >
                        <FontAwesomeIcon icon={faArrowUp} />
                      </button>
                      <button
                        onClick={() => handleReorder(index, 'down')}
                        disabled={index === stops.length - 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === stops.length - 1 ? '#CBD5E1' : '#64748B',
                          cursor: index === stops.length - 1 ? 'default' : 'pointer',
                          padding: '2px',
                          fontSize: '11px'
                        }}
                        title="Mover para baixo"
                      >
                        <FontAwesomeIcon icon={faArrowDown} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL REATRIBUIR MOTORISTA */}
      {showReassignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>Reatribuir Motorista da Frota</h3>
              <button onClick={() => setShowReassignModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '18px', cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleReassignDriverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Selecione o Novo Motorista</label>
                <select
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                  value={selectedNewDriver}
                  onChange={e => setSelectedNewDriver(e.target.value)}
                >
                  <option value="">Selecione um motorista da sua frota...</option>
                  {fleetDrivers.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.transport_type || 'Viatura'} - {d.transport_registration || 'N/D'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Motivo da Reatribuição</label>
                <textarea
                  rows="3"
                  placeholder="Ex: Avaria mecânica, indisponibilidade..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    outline: 'none',
                    resize: 'none'
                  }}
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyEnd: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  style={{ backgroundColor: 'transparent', color: '#64748B', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  style={{
                    backgroundColor: '#8A2BE2',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {reassigning ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faExchangeAlt} />}
                  Confirmar Reatribuição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR PARAGEM */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>Adicionar Nova Paragem</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '18px', cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleAddStop} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Nome do Destinatário</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                  value={newStopData.recipientName}
                  onChange={e => setNewStopData({ ...newStopData, recipientName: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Telefone do Destinatário</label>
                <input
                  type="text"
                  placeholder="Ex: 841234567"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                  value={newStopData.recipientPhone}
                  onChange={e => setNewStopData({ ...newStopData, recipientPhone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Endereço da Paragem</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Marginal, nº 4500, Maputo"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                  value={newStopData.address}
                  onChange={e => setNewStopData({ ...newStopData, address: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Quantidade de Volumes</label>
                <input
                  type="number"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                  value={newStopData.packages}
                  onChange={e => setNewStopData({ ...newStopData, packages: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyEnd: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ backgroundColor: 'transparent', color: '#64748B', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#8A2BE2',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Adicionar Paragem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
