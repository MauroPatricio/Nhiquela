import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer } from '@react-google-maps/api';
import api from '../../api';
import { toast } from 'react-toastify';

const containerStyle = {
  width: '100%',
  height: '70vh'
};

// Maputo, Moçambique center (default)
const defaultCenter = {
  lat: -25.9692,
  lng: 32.5732
};

const libraries = ['visualization'];

export default function LiveMapScreen() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '', 
    libraries
  });

  const [drivers, setDrivers] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      const [driversRes, heatmapRes] = await Promise.all([
        api.get('/admin-ops/live-map'),
        api.get('/admin-ops/heatmap')
      ]);

      setDrivers(driversRes.data);

      if (window.google) {
        const hData = heatmapRes.data
          .filter(req => req.pickupAddress && req.pickupAddress.latitude && req.pickupAddress.longitude)
          .map(req => new window.google.maps.LatLng(req.pickupAddress.latitude, req.pickupAddress.longitude));
        setHeatmapData(hData);
      }
    } catch (error) {
      toast.error('Erro ao buscar dados ao vivo.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchLiveData();
      // Polling every 30 seconds
      const interval = setInterval(fetchLiveData, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoaded]);

  const forceOffline = async (driverId) => {
    if (!window.confirm('Forçar este motorista a ficar offline?')) return;
    try {
      await api.post(`/admin-ops/driver/${driverId}/force-offline`);
      toast.success('Motorista colocado offline.');
      fetchLiveData();
    } catch (error) {
      toast.error('Erro ao forçar offline.');
    }
  };

  if (!isLoaded) return <div>Carregando Mapa...</div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Monitoramento ao Vivo (Live Ops)</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-4 py-2 rounded font-semibold ${showHeatmap ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {showHeatmap ? 'Ocultar Heatmap' : 'Mostrar Heatmap de Procura'}
          </button>
          <button onClick={fetchLiveData} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
            {loading ? 'Atualizando...' : 'Atualizar Agora'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex-1 relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={drivers.length > 0 && drivers[0].locationGeo?.coordinates 
            ? { lat: drivers[0].locationGeo.coordinates[1], lng: drivers[0].locationGeo.coordinates[0] } 
            : defaultCenter}
          zoom={12}
          onLoad={(map) => setMap(map)}
        >
          {showHeatmap && heatmapData.length > 0 && (
            <HeatmapLayer data={heatmapData} options={{ radius: 25, opacity: 0.8 }} />
          )}

          {drivers.map(driver => {
            if (!driver.locationGeo || !driver.locationGeo.coordinates) return null;
            const position = { 
              lat: driver.locationGeo.coordinates[1], 
              lng: driver.locationGeo.coordinates[0] 
            };
            return (
              <Marker 
                key={driver._id} 
                position={position}
                onClick={() => {
                  forceOffline(driver._id);
                }}
                icon={{
                  url: driver.status === 'Em Entrega' ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                }}
                title={`${driver.name} - ${driver.status} (Clique para opções)`}
              />
            );
          })}
        </GoogleMap>

        {/* Legenda Flutuante */}
        <div className="absolute bottom-6 left-6 bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="font-bold text-sm mb-2 text-gray-700">Legenda</h3>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
            <span className="text-sm text-gray-600">Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
            <span className="text-sm text-gray-600">Em Entrega</span>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded-xl shadow border border-gray-100">
        <h2 className="font-semibold text-lg text-gray-800 mb-2">Motoristas Ativos ({drivers.length})</h2>
        <div className="flex flex-wrap gap-4">
          {drivers.map(d => (
            <div key={d._id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg min-w-[200px]">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                {d.deliveryman?.photo ? (
                  <img src={d.deliveryman.photo} alt={d.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">?</div>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{d.name}</p>
                <p className="text-xs text-gray-500">{d.status}</p>
              </div>
              <button 
                onClick={() => forceOffline(d._id)} 
                className="ml-auto text-red-500 hover:text-red-700 text-xs font-semibold"
              >
                Offline
              </button>
            </div>
          ))}
          {drivers.length === 0 && <p className="text-gray-500">Nenhum motorista ativo no momento.</p>}
        </div>
      </div>
    </div>
  );
}
