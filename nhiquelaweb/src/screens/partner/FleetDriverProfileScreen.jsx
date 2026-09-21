import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { toast } from 'react-toastify';
import { FaUser, FaTruck, FaRoute, FaTachometerAlt, FaArrowLeft } from 'react-icons/fa';

export default function FleetDriverProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [trips, setTrips] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        const [dRes, vRes, tRes, hRes] = await Promise.all([
          api.get(`/users/${id}`).catch(() => ({ data: null })),
          api.get(`/fleet/driver-vehicle/${id}`).catch(() => ({ data: null })),
          api.get(`/fleet/trips?driverId=${id}`),
          api.get(`/fleet/history?driverId=${id}`),
        ]);

        if (dRes.data) setDriver(dRes.data);
        if (vRes.data) setVehicle(vRes.data);
        setTrips(tRes.data || []);
        setSessions(hRes.data?.sessions || []);
      } catch (err) {
        toast.error('Erro ao carregar perfil do motorista.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDriverData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">A carregar perfil do motorista...</div>;

  const totalKm = trips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
  const maxSpeed = Math.max(...trips.map((t) => t.maxSpeedKmh || 0), 0);

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold text-sm"
      >
        <FaArrowLeft /> Voltar
      </button>

      {/* Driver Header */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-2xl overflow-hidden">
            {driver?.profileImage || driver?.photo ? (
              <img src={driver.profileImage || driver.photo} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              driver?.name?.charAt(0) || 'M'
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{driver?.name || 'Motorista'}</h1>
            <p className="text-sm text-gray-500">{driver?.phoneNumber} | {driver?.email}</p>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-bold ${
              driver?.availability === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {driver?.availability === 'active' ? '🟢 ONLINE' : '⚪ OFFLINE'}
            </span>
          </div>
        </div>

        <div className="flex gap-6 text-right">
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase">Total Percorrido</span>
            <p className="text-2xl font-bold text-blue-600">{totalKm.toFixed(1)} km</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase">Viagens Realizadas</span>
            <p className="text-2xl font-bold text-green-600">{trips.length}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase">Velocidade Máxima</span>
            <p className="text-2xl font-bold text-red-600">{maxSpeed} km/h</p>
          </div>
        </div>
      </div>

      {/* Viatura Atribuída */}
      {vehicle && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FaTruck className="text-blue-600 text-2xl" />
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{vehicle.plateNumber}</h3>
              <p className="text-xs text-gray-600">{vehicle.brand} {vehicle.model} ({vehicle.type})</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-blue-800">Odómetro: {vehicle.currentOdometer || 0} km</p>
        </div>
      )}

      {/* Tabela de Viagens do Motorista */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
          <FaRoute className="text-blue-600" /> Histórico de Viagens Operacionais ({trips.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-3">Data/Hora</th>
                <th className="p-3">Distância</th>
                <th className="p-3">Duração</th>
                <th className="p-3">Vel. Máxima</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trips.map((t) => (
                <tr key={t._id}>
                  <td className="p-3 font-semibold">{new Date(t.startedAt).toLocaleString()}</td>
                  <td className="p-3 font-bold text-blue-600">{t.distanceKm} km</td>
                  <td className="p-3">{Math.round((t.durationSeconds || 0) / 60)} min</td>
                  <td className="p-3 text-red-600 font-bold">{t.maxSpeedKmh} km/h</td>
                  <td className="p-3">
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-bold">{t.status}</span>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    Nenhuma viagem registada para este motorista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
