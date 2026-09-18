import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
 import api from '../../api';
 import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
 import {
   faGasPump,
   faPlus,
   faTachometerAlt,
   faMoneyBillWave,
   faReceipt,
   faTimes,
   faCheck,
   faCar,
   faBurn,
   faCoins,
   faRoute,
   faUser,
   faPhone,
   faEnvelope,
 } from '@fortawesome/free-solid-svg-icons';
 import { toast } from 'react-toastify';
 import './FleetOperations.css';

export default function FleetFuelScreen() {
  const { userInfo } = useSelector((state) => state.user);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicle: '',
    date: new Date().toISOString().split('T')[0],
    gasStation: 'Total Moçambique',
    odometer: 0,
    liters: 40,
    pricePerLiter: 85,
    totalCost: 3400,
    receiptUrl: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fRes, vRes] = await Promise.all([
        api.get('/fleet/fuel', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
        api.get('/fleet/vehicles', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
      ]);
      setFuelLogs(fRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      toast.error('Erro ao carregar dados: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLitersOrPriceChange = (liters, price) => {
    const l = Number(liters);
    const p = Number(price);
    const total = l > 0 && p > 0 ? Number((l * p).toFixed(2)) : 0;
    setFormData((prev) => ({
      ...prev,
      liters: l,
      pricePerLiter: p,
      totalCost: total,
    }));
  };

  const handleVehicleSelect = (vId) => {
    const v = vehicles.find((item) => item._id === vId);
    setFormData((prev) => ({
      ...prev,
      vehicle: vId,
      odometer: v ? v.currentOdometer : 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle) return toast.error('Selecione um veículo.');
    try {
      await api.post('/fleet/fuel', formData, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success('Abastecimento registado com sucesso!');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // KPIs
  const totalLiters = fuelLogs.reduce((sum, f) => sum + (f.liters || 0), 0);
  const totalExpense = fuelLogs.reduce((sum, f) => sum + (f.totalCost || 0), 0);
  const avgPrice = fuelLogs.length > 0 ? (totalExpense / (totalLiters || 1)).toFixed(2) : 0;
  const totalLogs = fuelLogs.length;

  return (
    <div className="fleet-ops-wrapper">
      {/* 1. Hero Header */}
      <div className="fleet-hero-header hero-fuel">
        <div>
          <div className="fleet-hero-badge">
            <FontAwesomeIcon icon={faGasPump} /> Gestão de Energia & Consumos
          </div>
          <h1 className="fleet-hero-title">
            <FontAwesomeIcon icon={faBurn} className="text-teal-400" />
            Controlo de Combustível
          </h1>
          <p className="fleet-hero-subtitle">
            Registo detalhado de abastecimentos, telemetria de consumo (L/100km, km/L), deteção de anomalias e custo real por quilómetro percorrido.
          </p>
        </div>
        <div className="fleet-hero-actions">
          <button
            onClick={() => {
              if (vehicles.length === 0) return toast.error('Registe um veículo primeiro.');
              handleVehicleSelect(vehicles[0]._id);
              setShowModal(true);
            }}
            className="btn-ops-teal"
          >
            <FontAwesomeIcon icon={faPlus} />
            Registar Abastecimento
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Volume Total</div>
              <div className="fleet-kpi-value" style={{ color: '#0d9488' }}>
                {totalLiters.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>L</span>
              </div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#f0fdfa', color: '#0d9488' }}>
              <FontAwesomeIcon icon={faGasPump} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Litros abastecidos na frota</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Despesa Acumulada</div>
              <div className="fleet-kpi-value">
                {totalExpense.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>MT</span>
              </div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7f00ff' }}>
              <FontAwesomeIcon icon={faCoins} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Investimento total em combustível</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Preço Médio / Litro</div>
              <div className="fleet-kpi-value" style={{ color: '#2563eb' }}>
                {avgPrice} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>MT/L</span>
              </div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FontAwesomeIcon icon={faMoneyBillWave} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Média ponderada praticada</div>
        </div>

        <div className="fleet-kpi-card">
          <div className="fleet-kpi-top">
            <div>
              <div className="fleet-kpi-label">Total de Registos</div>
              <div className="fleet-kpi-value" style={{ color: '#059669' }}>{totalLogs}</div>
            </div>
            <div className="fleet-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <FontAwesomeIcon icon={faReceipt} />
            </div>
          </div>
          <div className="fleet-kpi-sub">Entradas auditadas</div>
        </div>
      </div>

      {/* 3. Tabela de Abastecimentos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          A carregar abastecimentos...
        </div>
      ) : fuelLogs.length === 0 ? (
        <div className="fleet-table-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <FontAwesomeIcon icon={faGasPump} style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', margin: 0 }}>
            Nenhum abastecimento registado
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Clique no botão acima para adicionar comprovativos e abastecimentos dos veículos.
          </p>
        </div>
      ) : (
        <div className="fleet-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>Data / Posto</th>
                  <th>Veículo / Motorista</th>
                  <th>Odómetro</th>
                  <th>Litros / Preço</th>
                  <th>Custo Total</th>
                  <th>Km Percorridos</th>
                  <th>Consumo (L/100km)</th>
                  <th>Custo / Km</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>
                        {new Date(log.date).toLocaleDateString('pt-MZ')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.gasStation}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="vehicle-plate-pill">
                          <span className="vehicle-plate-flag" />
                          {log.vehicle?.plateNumber || 'N/A'}
                        </span>
                      </div>
                      {(() => {
                        const driver = log.driver || log.vehicle?.assignedDriver;
                        if (!driver) {
                          return (
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.25rem' }}>
                              Sem motorista associado
                            </div>
                          );
                        }
                        return (
                          <div style={{ marginTop: '0.45rem' }}>
                            <div className="fleet-driver-pill">
                              <div className="fleet-driver-avatar">
                                {driver.profileImage ? (
                                  <img src={driver.profileImage} alt={driver.name} />
                                ) : (
                                  <span>{driver.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}</span>
                                )}
                                <span className={driver.isOnline ? 'driver-online-dot' : 'driver-offline-dot'} />
                              </div>
                              <div className="fleet-driver-meta">
                                <span className="fleet-driver-name">{driver.name}</span>
                                <div className="fleet-driver-contact">
                                  {driver.phoneNumber && (
                                    <a href={`tel:${driver.phoneNumber}`} title={`Ligar: ${driver.phoneNumber}`}>
                                      <FontAwesomeIcon icon={faPhone} style={{ fontSize: '0.6rem', color: '#10b981', marginRight: '0.15rem' }} />
                                      {driver.phoneNumber}
                                    </a>
                                  )}
                                  {driver.email && (
                                    <a href={`mailto:${driver.email}`} title={`Email: ${driver.email}`}>
                                      <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '0.6rem', color: '#6366f1', marginRight: '0.15rem' }} />
                                      {driver.email}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: '#334155' }}>
                        {log.odometer?.toLocaleString()} km
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '800', color: '#0d9488' }}>{log.liters} L</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>@{log.pricePerLiter} MT/L</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '900', color: '#0f172a' }}>
                        {log.totalCost?.toLocaleString()} MT
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: '#334155' }}>
                        {log.calculatedKmDriven > 0 ? `${log.calculatedKmDriven} km` : '—'}
                      </div>
                    </td>
                    <td>
                      {log.calculatedL100km > 0 ? (
                        <span className="ops-badge badge-warn">
                          {log.calculatedL100km} L/100km
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      {log.calculatedCostPerKm > 0 ? (
                        <span className="ops-badge badge-info">
                          {log.calculatedCostPerKm} MT/km
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Modal de Abastecimento */}
      {showModal && (
        <div className="fleet-modal-overlay">
          <div className="fleet-modal-content">
            <div className="fleet-modal-header header-teal">
              <h3 className="fleet-modal-title">
                <FontAwesomeIcon icon={faGasPump} /> Registar Abastecimento
              </h3>
              <button onClick={() => setShowModal(false)} className="fleet-modal-close-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="fleet-modal-body">
              <form onSubmit={handleSubmit} className="fleet-form-grid">
                <div>
                  <label className="fleet-form-label">Veículo *</label>
                  <select
                    required
                    value={formData.vehicle}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="fleet-input-control"
                  >
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.plateNumber} — {v.brand} {v.model} ({v.currentOdometer?.toLocaleString()} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fleet-form-grid fleet-form-grid-2">
                  <div>
                    <label className="fleet-form-label">Data do Abastecimento *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="fleet-input-control"
                    />
                  </div>
                  <div>
                    <label className="fleet-form-label">Posto de Combustível</label>
                    <input
                      type="text"
                      placeholder="ex: Total, Engen, Petromoc"
                      value={formData.gasStation}
                      onChange={(e) => setFormData({ ...formData, gasStation: e.target.value })}
                      className="fleet-input-control"
                    />
                  </div>
                </div>

                <div>
                  <label className="fleet-form-label">Quilometragem no Momento (km) *</label>
                  <input
                    type="number"
                    required
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: Number(e.target.value) })}
                    className="fleet-input-control"
                    style={{ fontSize: '1rem', fontWeight: '800' }}
                  />
                </div>

                <div className="fleet-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  <div>
                    <label className="fleet-form-label">Litros *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.liters}
                      onChange={(e) => handleLitersOrPriceChange(e.target.value, formData.pricePerLiter)}
                      className="fleet-input-control"
                      style={{ fontWeight: '800' }}
                    />
                  </div>
                  <div>
                    <label className="fleet-form-label">Preço/Litro (MT) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.pricePerLiter}
                      onChange={(e) => handleLitersOrPriceChange(formData.liters, e.target.value)}
                      className="fleet-input-control"
                    />
                  </div>
                  <div>
                    <label className="fleet-form-label">Custo Total (MT)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.totalCost}
                      onChange={(e) => setFormData({ ...formData, totalCost: Number(e.target.value) })}
                      className="fleet-input-control"
                      style={{ fontWeight: '900', color: '#0d9488' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="fleet-form-label">URL do Comprovativo / Foto (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.receiptUrl}
                    onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                    className="fleet-input-control"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '14px',
                      background: '#f1f5f9',
                      border: 'none',
                      color: '#475569',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-ops-teal">
                    Guardar Abastecimento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

