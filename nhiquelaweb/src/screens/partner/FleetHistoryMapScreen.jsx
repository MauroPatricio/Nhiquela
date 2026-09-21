import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api';
import { toast } from 'react-toastify';
import { FaPlay, FaPause, FaHistory, FaCalendarAlt, FaTruck, FaTachometerAlt, FaRoute } from 'react-icons/fa';
import './FleetHistory.css';

const iconStart = new L.DivIcon({
  className: 'marker-start',
  html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; color: white; font-weight: bold; font-size: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(16,185,129,0.6);">IN</div>`,
  iconSize: [24, 24],
});

const iconEnd = new L.DivIcon({
  className: 'marker-end',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; color: white; font-weight: bold; font-size: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(239,68,68,0.6);">FIM</div>`,
  iconSize: [24, 24],
});

const iconMovingPlayer = new L.DivIcon({
  className: 'marker-player',
  html: `<div style="background-color: #38bdf8; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 16px rgba(56,189,248,0.9); display: flex; align-items: center; justify-content: center;">
    <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function FleetHistoryMapScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [points, setPoints] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reprodutor de Rota
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineLayerRef = useRef(null);
  const playerMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await api.get('/fleet/vehicles');
        setVehicles(res.data);
        if (res.data.length > 0) {
          setSelectedVehicleId(res.data[0]._id);
        }
      } catch (err) {
        toast.error('Erro ao carregar veículos.');
      }
    };
    fetchVehicles();
  }, []);

  const fetchHistory = async () => {
    if (!selectedVehicleId) return;
    try {
      setLoading(true);
      setIsPlaying(false);
      setCurrentIndex(0);

      const res = await api.get('/fleet/history', {
        params: {
          vehicleId: selectedVehicleId,
          date: selectedDate,
        },
      });

      setPoints(res.data.points || []);
      setTrips(res.data.trips || []);
    } catch (err) {
      toast.error('Erro ao buscar histórico da rota.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVehicleId) {
      fetchHistory();
    }
  }, [selectedVehicleId, selectedDate]);

  // Inicializar o Mapa Leaflet via ref DOM
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-25.9692, 32.5732], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Atualizar Rota e Marcadores no Mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineLayerRef.current) map.removeLayer(polylineLayerRef.current);
    if (startMarkerRef.current) map.removeLayer(startMarkerRef.current);
    if (endMarkerRef.current) map.removeLayer(endMarkerRef.current);

    if (points.length === 0) return;

    const coords = points.map((p) => [p.latitude, p.longitude]);
    const polyline = L.polyline(coords, { color: '#38bdf8', weight: 5, opacity: 0.85 }).addTo(map);
    polylineLayerRef.current = polyline;

    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    startMarkerRef.current = L.marker(coords[0], { icon: iconStart })
      .bindPopup(`Início (${new Date(points[0].capturedAt).toLocaleTimeString()})`)
      .addTo(map);

    endMarkerRef.current = L.marker(coords[coords.length - 1], { icon: iconEnd })
      .bindPopup(`Fim (${new Date(points[points.length - 1].capturedAt).toLocaleTimeString()})`)
      .addTo(map);
  }, [points]);

  // Atualizar Posição do Marcador do Reprodutor
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || points.length === 0) return;

    const currentP = points[currentIndex];
    if (!currentP) return;

    if (playerMarkerRef.current) {
      playerMarkerRef.current.setLatLng([currentP.latitude, currentP.longitude]);
    } else {
      const marker = L.marker([currentP.latitude, currentP.longitude], { icon: iconMovingPlayer }).addTo(map);
      playerMarkerRef.current = marker;
    }
  }, [currentIndex, points]);

  // Controlo do Player de Rota
  useEffect(() => {
    if (isPlaying && points.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, points, playbackSpeed]);

  const currentPoint = points[currentIndex] || null;
  let maxSpeed = 0;
  points.forEach((p) => {
    if (p.speedKmh > maxSpeed) maxSpeed = p.speedKmh;
  });

  const totalDistKm = trips.length > 0 ? trips.reduce((acc, t) => acc + (t.distanceKm || 0), 0) : 0;

  return (
    <div className="fleet-history-page">
      {/* Glass Hero Banner */}
      <div className="history-hero-card">
        <div>
          <h1 className="history-hero-title">
            <FaHistory /> Histórico de Rotas & Reprodução de Percurso
          </h1>
          <p className="history-hero-subtitle">
            Análise temporal detalhada e simulação animada do percurso efetuado pela frota
          </p>
        </div>

        {/* Bar de Filtros */}
        <div className="history-filter-bar">
          <div className="flex items-center gap-2">
            <FaTruck className="text-indigo-400" />
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="history-select"
            >
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.plateNumber} — {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="history-date-input"
            />
          </div>

          <button onClick={fetchHistory} className="btn-history-fetch">
            {loading ? 'A carregar...' : 'Buscar Rota'}
          </button>
        </div>
      </div>

      {/* Resumo Rápido (KPI Cards Glowing) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="history-kpi-card">
          <span className="history-kpi-label">Pontos GPS Gravados</span>
          <p className="history-kpi-value text-slate-100">{points.length}</p>
        </div>
        <div className="history-kpi-card">
          <span className="history-kpi-label">Distância Percorrida</span>
          <p className="history-kpi-value text-sky-400">{totalDistKm.toFixed(1)} km</p>
        </div>
        <div className="history-kpi-card">
          <span className="history-kpi-label">Velocidade Máxima</span>
          <p className="history-kpi-value text-rose-400">{maxSpeed} km/h</p>
        </div>
        <div className="history-kpi-card">
          <span className="history-kpi-label">Viagens Registadas</span>
          <p className="history-kpi-value text-emerald-400">{trips.length} Viagens</p>
        </div>
      </div>

      {/* Main Container: Map + Route Player */}
      <div className="history-map-wrapper">
        {/* Controls de Reprodução Animada */}
        {points.length > 0 && (
          <div className="route-player-container">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(!isPlaying)} className="btn-player-play">
                {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
              </button>
              <div>
                <span className="text-xs text-slate-400">Ponto {currentIndex + 1} de {points.length}</span>
                {currentPoint && (
                  <p className="text-sm font-bold text-slate-100">
                    {new Date(currentPoint.capturedAt).toLocaleTimeString()} — <span className="text-sky-400">{currentPoint.speedKmh} km/h</span>
                  </p>
                )}
              </div>
            </div>

            {/* Slider Timeline */}
            <div className="flex-1 max-w-md mx-4">
              <input
                type="range"
                min="0"
                max={points.length - 1}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                className="player-timeline-slider"
              />
            </div>

            {/* Velocidade de Reprodução */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Velocidade:</span>
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`speed-badge-btn ${playbackSpeed === spd ? 'active' : ''}`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mapa da Rota */}
        <div ref={mapContainerRef} style={{ height: '580px', width: '100%' }} />
      </div>
    </div>
  );
}
