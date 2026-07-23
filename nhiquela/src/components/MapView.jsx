// src/components/MapView.jsx
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon images (Leaflet expects images in static folder)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

/**
 * MapView – reusable Leaflet map component.
 * Props:
 *   center: { lat, lng } – initial map centre.
 *   zoom: number – initial zoom level (default 13).
 *   markers: array of { position: { lat, lng }, popup?: string } – optional markers.
 *   darkMode?: boolean – if true, uses a dark tile layer.
 */
const MapView = ({ center, zoom = 13, markers = [], darkMode = false }) => {
  const mapRef = useRef();

  // When centre changes, smoothly pan the map.
  const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
    }, [center, map]);
    return null;
  };

  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      whenCreated={mapInstance => (mapRef.current = mapInstance)}
    >
      <TileLayer attribution='&copy; OpenStreetMap contributors' url={tileUrl} />
      <ChangeView center={center} />
      {markers.map((m, idx) => (
        <Marker key={idx} position={m.position}>
          {m.popup && <Popup>{m.popup}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
