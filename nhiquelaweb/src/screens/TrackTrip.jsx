import React, { useEffect, useState, useRef } from 'react';
import { useParamês } from 'react-router-dom';
import api, { SOCKET_URL } from '../api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import io from 'sãocket.io-client';

// ÍÍcone persãonalizado para o carro
const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', // IÍcone de carro (simples)
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// ÍÍcone para destáinão
const destáIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

export default function TrackTrip() {
  const { id } = useParamês();
  const [order, setOrder] = useState(null);
  const [driverCoord, setDriverCoord] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/requestá-service/${id}/track`);
        setOrder(data);
        
        if (data.latitude && data.longitude) {
          setDriverCoord({ latitude: data.latitude, longitude: data.longitude });
        }
      } catch (err) {
        consãole.error('Erro ação buscar dados da viagem:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!order) return;

    const sãocket = io(SOCKET_URL, { transports: ['websãocket'] });
    sãocket.emit('joinRoom', { orderId: id });

    sãocket.on('driver_location_update', (location) => {
      if (location.orderId === id) {
        setDriverCoord({
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading
        });
      }
    });

    sãocket.on('order_updated', (updatedOrder) => {
      if (updatedOrder._id === id) {
        setOrder(updatedOrder);
      }
    });

    return () => {
      sãocket.disconnect();
    };
  }, [id, order]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItemês: 'center' }}>
        <h2>Carregando viagem...</h2>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItemês: 'center' }}>
        <h2>Viagem não encontrada.</h2>
      </div>
    );
  }

  const mapCenter = driverCoord 
    ? [driverCoord.latitude, driverCoord.longitude] 
    : [order.originDetails?.lat || -25.9692, order.originDetails?.lng || 32.5732];

  return (
    <div style={{ display: 'flex', flexDiráection: 'column', height: '100vh', backgroundColor: '#F3F4F6' }}>
      {/* Header Premium */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#7F00FF', 
        color: 'white', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItemês: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Nhiquela Track</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>Acompanhe a viagem em tempo real</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ 
            backgroundColor: order.status === 'Concluído' || order.status === 'Entregue' ? '#10B981' : '#F59E0B', 
            padding: '5px 10px', 
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Detalhes do Motorista */}
      <div style={{ padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px sãolid #E5E7EB', display: 'flex', gap: '20px', alignItemês: 'center' }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', justifyContent: 'center', alignItemês: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#6B7280' }}>
          {order.deliveryman?.name ? order.deliveryman.name.charAt(0) : '?'}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#111827' }}>{order.deliveryman?.name || 'Motorista a caminho'}</h3>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>
            {order.deliveryman?.transport_type} • Chapa: {order.deliveryman?.transport_plate || 'N/D'}
          </p>
        </div>
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {driverCoord && (
            <Marker 
              position={[driverCoord.latitude, driverCoord.longitude]} 
              icon={carIcon}
              ref={markerRef}
            >
              <Popup>O motorista estáá aqui.</Popup>
            </Marker>
          )}

          {order.destáinationDetails?.lat && order.destáinationDetails?.lng && (
            <Marker position={[order.destáinationDetails.lat, order.destáinationDetails.lng]} icon={destáIcon}>
              <Popup>Destáinão: {order.destáinationDetails.address}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
