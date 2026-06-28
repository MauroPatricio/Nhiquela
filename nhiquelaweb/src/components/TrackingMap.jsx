import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import { SOCKET_URL } from '../api';

// Fix default marker icon URLs (Leaflet's default images) – required for Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

/**
 * TrackingMap – shows driver position and ETA for a given order.
 * Props:
 *   orderId   – MongoDB order identifier (string)
 *   destination { lng, lat } – coordinates of the delivery destination
 */
const TrackingMap = ({ orderId, destination }) => {
  const [position, setPosition] = useState(null); // { lat, lng }
  const [eta, setEta] = useState(null);
  const socket = io(SOCKET_URL || 'http://localhost:5002');

  // Join order‑specific room
  useEffect(() => {
    if (!orderId) return;
    socket.emit('join', `order_${orderId}`);
    socket.on('trackingUpdate', data => {
      setPosition({ lat: data.latitude, lng: data.longitude });
    });
    // Cleanup on unmount
    return () => {
      socket.emit('leave', `order_${orderId}`);
      socket.off('trackingUpdate');
    };
  }, [orderId, socket]);

  // Fetch ETA whenever we have a driver position
  useEffect(() => {
    if (!position) return;
    const fetchEta = async () => {
      try {
        const res = await fetch(
          `/api/tracking/eta?orderId=${orderId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        const json = await res.json();
        setEta(json.eta);
      } catch (e) {
        console.error('Failed to fetch ETA', e);
      }
    };
    fetchEta();
  }, [position, orderId]);

  const driverIcon = new L.Icon({
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    shadowSize: [41, 41],
  });

  const destPosition = { lat: destination.lat, lng: destination.lng };

  return (
    <MapContainer
      center={position || destPosition}
      zoom={13}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      {position && (
        <Marker position={position} icon={driverIcon}> 
          <Popup>
            Driver location<br />
            {eta && (
              <>ETA: {eta.durationMin} min ({eta.distanceKm} km)</>
            )}
          </Popup>
        </Marker>
      )}
      <Marker position={destPosition}> 
        <Popup>Destino</Popup>
      </Marker>
    </MapContainer>
  );
};

export default TrackingMap;
