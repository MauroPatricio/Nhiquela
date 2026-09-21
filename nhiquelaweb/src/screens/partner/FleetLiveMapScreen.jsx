import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import api from '../../api';
import { toast } from 'react-toastify';
import { FaTruck, FaSyncAlt, FaTimes, FaBatteryFull, FaTachometerAlt, FaRoute } from 'react-icons/fa';
import './FleetLiveMap.css';

const createCustomIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-vehicle-marker',
    html: `<div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px ${color}; display: flex; align-items: center; justify-content: center;">
      <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const iconMoving = createCustomIcon('#22c55e');
const iconIdle = createCustomIcon('#eab308');
const iconOffline = createCustomIcon('#94a3b8');

export default function FleetLiveMapScreen() {
  const [liveData, setLiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [filterState, setFilterState] = useState('ALL');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerMapRef = useRef(new Map());

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fleet/live');
      setLiveData(res.data);
    } catch (error) {
      toast.error('Erro ao carregar dados da frota em tempo real.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    
    socket.on('fleet_location_update', (data) => {
      if (!data || !data.driverId) return;
      setLiveData((prev) =>
        prev.map((item) => {
          if (item.driver && String(item.driver._id) === String(data.driverId)) {
            const speed = data.speedKmh !== undefined ? data.speedKmh : Math.round((data.speed || 0) * 3.6);
            const isOffline = data.isOnline === false || data.availability === 'paused' || data.availability === 'inactive';
            const newState = isOffline ? 'OFFLINE' : (speed > 3 ? 'MOVING' : 'IDLE');

            return {
              ...item,
              state: newState,
              lastLocation: {
                latitude: data.latitude,
                longitude: data.longitude,
                speedKmh: speed,
                heading: data.heading || 0,
                batteryLevel: data.batteryLevel,
                updatedAt: data.capturedAt || new Date().toISOString(),
              },
            };
          }
          return item;
        })
      );
    });

    socket.on('driver_availability_updated', (data) => {
      if (!data || !data.driverId) return;
      setLiveData((prev) =>
        prev.map((item) => {
          if (item.driver && String(item.driver._id) === String(data.driverId)) {
            const isOnline = data.isOnline !== undefined ? data.isOnline : data.availability === 'active';
            const speed = item.lastLocation?.speedKmh || 0;
            return {
              ...item,
              state: isOnline ? (speed > 3 ? 'MOVING' : 'IDLE') : 'OFFLINE',
            };
          }
          return item;
        })
      );
    });

    socket.on('fleet_tracking_started', (data) => {
      if (!data || !data.driverId) return;
      setLiveData((prev) =>
        prev.map((item) => {
          if (item.driver && String(item.driver._id) === String(data.driverId)) {
            return { ...item, state: 'IDLE' };
          }
          return item;
        })
      );
    });

    socket.on('fleet_tracking_stopped', (data) => {
      if (!data || !data.driverId) return;
      setLiveData((prev) =>
        prev.map((item) => {
          if (item.driver && String(item.driver._id) === String(data.driverId)) {
            return { ...item, state: 'OFFLINE' };
          }
          return item;
        })
      );
    });

    const interval = setInterval(fetchLiveData, 20000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Inicializar o Mapa Leaflet via ref DOM
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-25.9692, 32.5732], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const hasCenteredRef = useRef(false);

  // Atualizar Marcadores no Mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markerMapRef.current.forEach((marker) => map.removeLayer(marker));
    markerMapRef.current.clear();

    const filtered = liveData.filter((item) => {
      if (filterState === 'ALL') return true;
      return item.state === filterState;
    });

    const latLngs = [];

    filtered.forEach((item) => {
      if (!item.lastLocation?.latitude || !item.lastLocation?.longitude) return;

      let icon = iconOffline;
      if (item.state === 'MOVING') icon = iconMoving;
      else if (item.state === 'IDLE') icon = iconIdle;

      const lat = Number(item.lastLocation.latitude);
      const lng = Number(item.lastLocation.longitude);
      latLngs.push([lat, lng]);

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; padding: 4px;">
          <h4 style="margin: 0; font-weight: bold; font-size: 14px; color: #0f172a;">${item.vehicle.plateNumber}</h4>
          <p style="margin: 2px 0; font-size: 12px; color: #475569;">${item.vehicle.brand} ${item.vehicle.model}</p>
          <p style="margin: 2px 0; font-size: 12px;">Motorista: <strong>${item.driver ? item.driver.name : 'Sem motorista'}</strong></p>
          <p style="margin: 2px 0; font-size: 12px;">Velocidade: <strong>${item.lastLocation.speedKmh} km/h</strong></p>
          <p style="margin: 2px 0; font-size: 12px;">Estado: <strong>${item.state === 'MOVING' ? '🟢 Em Movimento' : item.state === 'IDLE' ? '🟡 Parado (Online)' : '⚪ Offline'}</strong></p>
        </div>
      `);

      marker.on('click', () => setSelectedVehicle(item));
      markerMapRef.current.set(item.vehicle._id, marker);
    });

    if (latLngs.length > 0 && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
      } else {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [liveData, filterState]);

  const totalVehicles = liveData.length;
  const onlineCount = liveData.filter((d) => d.state !== 'OFFLINE').length;
  const movingCount = liveData.filter((d) => d.state === 'MOVING').length;
  const idleCount = liveData.filter((d) => d.state === 'IDLE').length;

  const filteredData = liveData.filter((item) => {
    if (filterState === 'ALL') return true;
    return item.state === filterState;
  });

  return (
    <div className="fleet-live-page">
      {/* Glass Hero Banner */}
      <div className="live-hero-card">
        <div>
          <h1 className="live-hero-title">
            <FaTruck /> Gestão de Frota em Tempo Real (Live Ops)
          </h1>
          <p className="live-hero-subtitle">
            Telemetria e rastreamento GPS em direto dos veículos operacionais da Nhiquela
          </p>
        </div>
        <button onClick={fetchLiveData} className="btn-live-refresh">
          <FaSyncAlt className={loading ? 'animate-spin' : ''} />
          {loading ? 'A atualizar...' : 'Atualizar Posições'}
        </button>
      </div>

      {/* KPI Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          className={`live-kpi-card ${filterState === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterState('ALL')}
        >
          <span className="live-kpi-label">Frota Total</span>
          <p className="live-kpi-value text-slate-100">{totalVehicles} Viaturas</p>
          <p className="text-xs text-sky-400 font-medium mt-1">Todas as viaturas cadastradas</p>
        </div>

        <div
          className={`live-kpi-card ${filterState === 'MOVING' ? 'active' : ''}`}
          onClick={() => setFilterState('MOVING')}
        >
          <span className="live-kpi-label">Em Movimento</span>
          <p className="live-kpi-value text-emerald-400">{movingCount} Viaturas</p>
          <p className="text-xs text-emerald-400 font-medium mt-1">🟢 Velocidade &gt; 3 km/h</p>
        </div>

        <div
          className={`live-kpi-card ${filterState === 'IDLE' ? 'active' : ''}`}
          onClick={() => setFilterState('IDLE')}
        >
          <span className="live-kpi-label">Parados (Online)</span>
          <p className="live-kpi-value text-amber-400">{idleCount} Viaturas</p>
          <p className="text-xs text-amber-400 font-medium mt-1">🟡 Motorista Online em repouso</p>
        </div>

        <div
          className={`live-kpi-card ${filterState === 'OFFLINE' ? 'active' : ''}`}
          onClick={() => setFilterState('OFFLINE')}
        >
          <span className="live-kpi-label">Offline</span>
          <p className="live-kpi-value text-slate-400">{totalVehicles - onlineCount} Viaturas</p>
          <p className="text-xs text-slate-400 font-medium mt-1">⚪ Sessão encerrada</p>
        </div>
      </div>

      {/* Main Map & Vehicle List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa Interativo */}
        <div className="lg:col-span-2 live-map-wrapper">
          <div ref={mapContainerRef} style={{ height: '620px', width: '100%' }} />
        </div>

        {/* Painel Lateral de Lista e Detalhes da Viatura */}
        <div className="live-sidebar-panel flex flex-col" style={{ maxHeight: '620px' }}>
          <h2 className="font-bold text-lg text-slate-100 mb-3 flex items-center justify-between">
            <span>Lista de Viaturas</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-bold">
              {filteredData.length}
            </span>
          </h2>

          {selectedVehicle && (
            <div className="selected-vehicle-drawer">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-sky-300 uppercase bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30">
                    Viatura Selecionada
                  </span>
                  <h3 className="font-bold text-xl text-white mt-1">{selectedVehicle.vehicle.plateNumber}</h3>
                  <p className="text-xs text-slate-300">
                    {selectedVehicle.vehicle.brand} {selectedVehicle.vehicle.model} ({selectedVehicle.vehicle.type})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-slate-400 hover:text-white text-sm p-1"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">Motorista:</span>
                  <p className="font-semibold text-slate-100">{selectedVehicle.driver?.name || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">Velocidade:</span>
                  <p className="font-semibold text-sky-400">{selectedVehicle.lastLocation?.speedKmh || 0} km/h</p>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">Odómetro:</span>
                  <p className="font-semibold text-slate-100">{selectedVehicle.vehicle.currentOdometer || 0} km</p>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">Bateria:</span>
                  <p className="font-semibold text-emerald-400">
                    {selectedVehicle.lastLocation?.batteryLevel ? `${Math.round(selectedVehicle.lastLocation.batteryLevel * 100)}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 overflow-y-auto custom-scroll pr-1 flex-1">
            {filteredData.map((item) => (
              <div
                key={item.vehicle._id}
                onClick={() => {
                  setSelectedVehicle(item);
                  if (item.lastLocation && mapInstanceRef.current) {
                    mapInstanceRef.current.setView([item.lastLocation.latitude, item.lastLocation.longitude], 14);
                  }
                }}
                className={`live-vehicle-card ${selectedVehicle?.vehicle?._id === item.vehicle._id ? 'selected' : ''}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      item.state === 'MOVING'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : item.state === 'IDLE'
                        ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                        : 'bg-slate-400'
                    }`} />
                    <h4 className="font-bold text-sm text-slate-100">{item.vehicle.plateNumber}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.driver ? item.driver.name : 'Sem motorista atribuído'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-sky-400">
                    {item.lastLocation ? `${item.lastLocation.speedKmh} km/h` : 'Offline'}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
                    {item.state}
                  </p>
                </div>
              </div>
            ))}

            {filteredData.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-6">Nenhuma viatura encontrada para este filtro.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
