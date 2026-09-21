import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { toast } from 'react-toastify';
import { FaTruck, FaUser, FaTachometerAlt, FaGasPump, FaWrench, FaHistory, FaArrowLeft } from 'react-icons/fa';

export default function FleetVehicleProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [odometerLogs, setOdometerLogs] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [maintenancePlans, setMaintenancePlans] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        setLoading(true);
        const [vRes, oRes, fRes, mRes, tRes] = await Promise.all([
          api.get(`/fleet/vehicles/${id}`),
          api.get(`/fleet/odometer/${id}`),
          api.get(`/fleet/fuel?vehicleId=${id}`),
          api.get(`/fleet/maintenance?vehicleId=${id}`),
          api.get(`/fleet/trips?vehicleId=${id}`),
        ]);

        setVehicle(vRes.data);
        setOdometerLogs(oRes.data);
        setFuelLogs(fRes.data);
        setMaintenancePlans(mRes.data);
        setTrips(tRes.data);
      } catch (err) {
        toast.error('Erro ao carregar perfil do veículo.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchVehicleData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">A carregar perfil da viatura...</div>;
  if (!vehicle) return <div className="p-8 text-center text-red-500">Veículo não encontrado.</div>;

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold text-sm"
      >
        <FaArrowLeft /> Voltar
      </button>

      {/* Header do Perfil */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white font-bold text-xl px-3 py-1 rounded-lg">
              {vehicle.plateNumber}
            </span>
            <h1 className="text-2xl font-bold text-gray-800">
              {vehicle.brand} {vehicle.model} ({vehicle.year})
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tipo: <strong>{vehicle.type}</strong> | Combustível: <strong>{vehicle.fuelType}</strong> | Cap. Depósito:{' '}
            <strong>{vehicle.fuelTankCapacityLiters}L</strong>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-gray-500 font-semibold uppercase">Odómetro Atual</span>
            <p className="text-2xl font-bold text-blue-600">{vehicle.currentOdometer} km</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 font-semibold uppercase">Consumo Alvo</span>
            <p className="text-2xl font-bold text-green-600">{vehicle.targetConsumptionL100km} L/100km</p>
          </div>
        </div>
      </div>

      {/* Resumo de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <FaUser className="text-blue-600" /> Motorista Atribuído
          </h3>
          {vehicle.assignedDriver ? (
            <div>
              <p className="font-bold text-gray-900 text-lg">{vehicle.assignedDriver.name}</p>
              <p className="text-xs text-gray-500">{vehicle.assignedDriver.phoneNumber}</p>
              <p className="text-xs text-gray-500">{vehicle.assignedDriver.email}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Nenhum motorista atribuído no momento.</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <FaGasPump className="text-yellow-600" /> Abastecimentos ({fuelLogs.length})
          </h3>
          <p className="text-sm text-gray-600">
            Último abastecimento: <strong>{fuelLogs.length > 0 ? `${fuelLogs[0].liters}L` : 'N/A'}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-1">Total abastecido: {fuelLogs.reduce((acc, f) => acc + f.liters, 0)} Litros</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <FaWrench className="text-purple-600" /> Manutenção Preventiva ({maintenancePlans.length})
          </h3>
          <p className="text-sm text-gray-600">
            Planos ativos: <strong>{maintenancePlans.filter((m) => m.status === 'EM_DIA').length} Em Dia</strong>
          </p>
        </div>
      </div>

      {/* Histórico de Viagens */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-6">
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
          <FaHistory className="text-blue-600" /> Viagens Registadas da Viatura ({trips.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-3">Data/Início</th>
                <th className="p-3">Motorista</th>
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
                  <td className="p-3">{t.driver?.name || 'N/A'}</td>
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
                  <td colSpan={6} className="p-4 text-center text-gray-400">
                    Nenhuma viagem registada ainda para esta viatura.
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
