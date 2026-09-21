import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaPlus, FaTrash, FaEdit, FaShieldAlt, FaCheck, FaTimes } from 'react-icons/fa';
import './FleetGeofences.css';

export default function FleetGeofencesScreen() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('CUSTOM');
  const [centerLat, setCenterLat] = useState(-25.9692);
  const [centerLng, setCenterLng] = useState(32.5732);
  const [radiusMeters, setRadiusMeters] = useState(300);
  const [editingId, setEditingId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const previewCircleRef = useRef(null);
  const geofenceLayersRef = useRef([]);

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fleet/geofences');
      setGeofences(res.data);
    } catch (err) {
      toast.error('Erro ao buscar zonas geográficas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, []);

  // Inicializar o Mapa Leaflet via ref DOM
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', (e) => {
      setCenterLat(Number(e.latlng.lat.toFixed(6)));
      setCenterLng(Number(e.latlng.lng.toFixed(6)));
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Atualizar Círculo de Pré-visualização do Formulário
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (previewCircleRef.current) {
      map.removeLayer(previewCircleRef.current);
    }

    const circle = L.circle([Number(centerLat), Number(centerLng)], {
      radius: Number(radiusMeters),
      color: '#6366f1',
      fillColor: '#818cf8',
      fillOpacity: 0.35,
    }).addTo(map);

    previewCircleRef.current = circle;
  }, [centerLat, centerLng, radiusMeters]);

  // Desenhar Geofences Existentes no Mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    geofenceLayersRef.current.forEach((layer) => map.removeLayer(layer));
    geofenceLayersRef.current = [];

    geofences.forEach((g) => {
      const color = getTypeHexColor(g.type);
      const circle = L.circle([g.centerLatitude, g.centerLongitude], {
        radius: g.radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.25,
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; padding: 4px;">
          <h4 style="margin: 0; font-weight: bold; font-size: 14px; color: #0f172a;">${g.name}</h4>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${color};">${g.type}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">Raio: ${g.radiusMeters} metros</p>
        </div>
      `);

      geofenceLayersRef.current.push(circle);
    });
  }, [geofences]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warn('Preencha o nome da zona.');
      return;
    }

    try {
      const payload = {
        name,
        description,
        type,
        centerLatitude: Number(centerLat),
        centerLongitude: Number(centerLng),
        radiusMeters: Number(radiusMeters),
      };

      if (editingId) {
        await api.put(`/fleet/geofences/${editingId}`, payload);
        toast.success('Geofence atualizada com sucesso.');
      } else {
        await api.post('/fleet/geofences', payload);
        toast.success('Nova Geofence criada com sucesso.');
      }

      resetForm();
      fetchGeofences();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao guardar Geofence.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem a certeza que deseja eliminar esta zona?')) return;
    try {
      await api.delete(`/fleet/geofences/${id}`);
      toast.success('Geofence eliminada.');
      fetchGeofences();
    } catch (err) {
      toast.error('Erro ao eliminar Geofence.');
    }
  };

  const handleEdit = (g) => {
    setEditingId(g._id);
    setName(g.name);
    setDescription(g.description || '');
    setType(g.type || 'CUSTOM');
    setCenterLat(g.centerLatitude);
    setCenterLng(g.centerLongitude);
    setRadiusMeters(g.radiusMeters || 300);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([g.centerLatitude, g.centerLongitude], 14);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setType('CUSTOM');
    setCenterLat(-25.9692);
    setCenterLng(32.5732);
    setRadiusMeters(300);
  };

  const getTypeHexColor = (t) => {
    switch (t) {
      case 'BASE': return '#3b82f6';
      case 'CUSTOMER': return '#22c55e';
      case 'FUEL_STATION': return '#eab308';
      case 'WORKSHOP': return '#c084fc';
      case 'RESTRICTED': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getTypePillClass = (t) => {
    switch (t) {
      case 'BASE': return 'type-base';
      case 'CUSTOMER': return 'type-customer';
      case 'FUEL_STATION': return 'type-fuel';
      case 'WORKSHOP': return 'type-workshop';
      case 'RESTRICTED': return 'type-restricted';
      default: return 'type-custom';
    }
  };

  return (
    <div className="fleet-geofence-page">
      {/* Premium Hero Banner */}
      <div className="geofence-hero-card">
        <div>
          <span className="geofence-badge">
            <FaShieldAlt /> Módulo de Telemetria & Controlo Operacional
          </span>
          <h1 className="geofence-hero-title">
            <FaMapMarkerAlt /> Gestão de Zonas Geográficas (Geofencing)
          </h1>
          <p className="geofence-hero-subtitle">
            Configure perímetros operacionais com deteção em tempo real de entrada, saída e tempo de permanência
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Criação/Edição */}
        <div className="geofence-glass-panel">
          <div className="geofence-panel-header">
            <span className="flex items-center gap-2">
              {editingId ? <FaEdit className="text-indigo-400" /> : <FaPlus className="text-indigo-400" />}
              {editingId ? 'Editar Zona' : 'Criar Nova Zona'}
            </span>
            {editingId && (
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-bold">
                ID: {editingId.substring(0, 6)}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="geofence-form-group">
              <label className="geofence-label">Nome da Zona *</label>
              <input
                type="text"
                placeholder="Ex: Armazém Central Nhiquela"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="geofence-input"
                required
              />
            </div>

            <div className="geofence-form-group">
              <label className="geofence-label">Tipo de Zona</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="geofence-select"
              >
                <option value="BASE">Base da Frota</option>
                <option value="CUSTOMER">Cliente / Destino</option>
                <option value="FUEL_STATION">Posto de Combustível</option>
                <option value="WORKSHOP">Oficina / Manutenção</option>
                <option value="RESTRICTED">Área Proibida / Restrita</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="geofence-form-group">
                <label className="geofence-label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={centerLat}
                  onChange={(e) => setCenterLat(e.target.value)}
                  className="geofence-input"
                  required
                />
              </div>
              <div className="geofence-form-group">
                <label className="geofence-label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={centerLng}
                  onChange={(e) => setCenterLng(e.target.value)}
                  className="geofence-input"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">💡 Dica: Clique em qualquer ponto do mapa para capturar a coordenada.</p>

            <div className="geofence-form-group">
              <label className="geofence-label">Raio do Perímetro (Metros)</label>
              <input
                type="number"
                min="50"
                max="10000"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="geofence-input"
                required
              />
            </div>

            <div className="geofence-form-group">
              <label className="geofence-label">Descrição / Instruções</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observações operacionais para a frota..."
                className="geofence-textarea"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-geofence-primary">
                {editingId ? <FaCheck /> : <FaPlus />}
                {editingId ? 'Atualizar Zona' : 'Gravar Geofence'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-geofence-secondary">
                  <FaTimes />
                </button>
              )}
            </div>
          </form>

          {/* Lista de Geofences Registadas */}
          <div className="mt-6 border-t border-slate-700/50 pt-4">
            <h3 className="font-bold text-sm text-slate-300 mb-3 uppercase tracking-wider">
              Zonas Ativas ({geofences.length})
            </h3>
            <div className="space-y-2 max-h-52 overflow-y-auto custom-scroll pr-1">
              {geofences.map((g) => (
                <div key={g._id} className="geofence-item-card">
                  <div>
                    <span className={`geofence-type-pill ${getTypePillClass(g.type)}`}>
                      {g.type}
                    </span>
                    <p className="font-bold text-slate-100 text-sm mt-1">{g.name}</p>
                    <p className="text-[11px] text-slate-400">Raio: {g.radiusMeters} metros</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(g)}
                      className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition"
                      title="Editar Zona"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(g._id)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                      title="Eliminar Zona"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {geofences.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">Nenhuma geofence cadastrada.</p>
              )}
            </div>
          </div>
        </div>

        {/* Mapa com a Geofence Atual e Existentes */}
        <div className="lg:col-span-2 geofence-map-wrapper">
          <div ref={mapContainerRef} style={{ height: '620px', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
