import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api, { SOCKET_URL } from '../api';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import io from 'socket.io-client';

const GOOGLE_MAPS_API_KEY = "AIzaSyBipLnxa_lqw1IUKqQovRe_oQpeVvjGZ4s";

const carIconUrl = 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png';
const destIconUrl = 'https://cdn-icons-png.flaticon.com/512/149/149059.png';

export default function TrackTrip() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [driverCoord, setDriverCoord] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const [map, setMap] = useState(null);

  const onLoad = useCallback(function callback(mapInstance) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance) {
    setMap(null);
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/request-service/${id}/track`);
        setOrder(data);
        
        if (data.latitude && data.longitude) {
          setDriverCoord({ latitude: data.latitude, longitude: data.longitude });
        }
      } catch (err) {
        console.error('Erro ao buscar dados da viagem:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!order) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('joinRoom', { orderId: id });

    socket.on('driver_location_update', (location) => {
      if (location.orderId === id) {
        setDriverCoord({
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading
        });
      }
    });

    socket.on('order_updated', (updatedOrder) => {
      if (updatedOrder._id === id) {
        setOrder(updatedOrder);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, order]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <h2>Carregando viagem...</h2>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <h2>Viagem não encontrada.</h2>
      </div>
    );
  }

  const mapCenter = driverCoord 
    ? { lat: driverCoord.latitude, lng: driverCoord.longitude } 
    : { lat: order.originDetails?.lat || -25.9692, lng: order.originDetails?.lng || 32.5732 };

  const destCenter = (order.destinationDetails?.lat && order.destinationDetails?.lng) 
    ? { lat: order.destinationDetails.lat, lng: order.destinationDetails.lng } 
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F3F4F6' }}>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#7F00FF', 
        color: 'white', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
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

      <div style={{ padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#6B7280' }}>
          {order.deliveryman?.name ? order.deliveryman.name.charAt(0) : '?'}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#111827' }}>{order.deliveryman?.name || 'Motorista a caminho'}</h3>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>
            {order.deliveryman?.transport_type} • Chapa: {order.deliveryman?.transport_plate || 'N/D'}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {!isLoaded ? (
            <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <p>Carregando mapa...</p>
            </div>
        ) : (
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={15}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                }}
            >
                {driverCoord && (
                    <Marker 
                        position={{ lat: driverCoord.latitude, lng: driverCoord.longitude }} 
                        icon={{ url: carIconUrl, scaledSize: new window.google.maps.Size(40, 40) }}
                    >
                    </Marker>
                )}

                {destCenter && (
                    <Marker 
                        position={destCenter} 
                        icon={{ url: destIconUrl, scaledSize: new window.google.maps.Size(30, 30) }}
                    >
                    </Marker>
                )}
            </GoogleMap>
        )}
      </div>
    </div>
  );
}
