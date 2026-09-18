import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt,
  faCar,
  faUser,
  faExclamationTriangle,
  faPlus,
  faTimes,
  faHistory,
  faCheckCircle,
  faArrowTrendUp,
  faPhone,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import './FleetOperations.css';

export default function FleetOdometerScreen() {
  const { userInfo } = useSelector((state) => state.user);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [odometerInput, setOdometerInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const fetchVehicles = async () => {
    try {
      const { data } = await api.get('/fleet/vehicles', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicle(data[0]._id);
        fetchOdometerLogs(data[0]._id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      toast.error('Erro ao carregar veículos: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const fetchOdometerLogs = async (vId) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/fleet/odometer/${vId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setLogs(data);
    } catch (err) {
      toast.error('Erro ao carregar leituras: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleVehicleChange = (vId) => {
    setSelectedVehicle(vId);
    fetchOdometerLogs(vId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return toast.error('Selecione um veículo.');
    try {
      const res = await api.post(
        '/fleet/odometer',
        {
          vehicleId: selectedVehicle,
          odometer: Number(odometerInput),
          notes: notesInput,
        },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );

      if (res.data.isRegressive) {
        toast.warning('Atenção: A leitura submetida é inferior à anterior! Foi gerado um alerta de anomalia.');
      } else {
        toast.success('Leitura do odómetro atualizada!');
      }

      setShowModal(false);
      setOdometerInput('');
      setNotesInput('');
      fetchOdometerLogs(selectedVehicle);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const currentVeh = vehicles.find((v) => v._id === selectedVehicle);

  return (
    <div className="fleet-ops-wrapper">
      {/* 1. Hero Header */}
      <div className="fleet-hero-header hero-odometer">
        <div>
          <div className="fleet-hero-badge">
            <FontAwesomeIcon icon={faHistory} /> Auditoria & Telemetria
          </div>
          <h1 className="fleet-hero-title">
            <FontAwesomeIcon icon={faTachometerAlt} className="text-emerald-400" />
            Histórico de Odómetro
          </h1>
          <p className="fleet-hero-subtitle">
            Registo contínuo de quilometragem, histórico de viagens/abastecimentos e auditoria automática de leituras regressivas.
          </p>
        </div>
        <div className="fleet-hero-actions">
          <button
            onClick={() => {
              if (currentVeh) setOdometerInput(currentVeh.currentOdometer || 0);
              setShowModal(true);
            }}
            className="btn-ops-emerald"
          >
            <FontAwesomeIcon icon={faPlus} />
            Registar Leitura Manual
          </button>
        </div>
      </div>

      {/* 2. Toolbar de Seleção de Veículo */}
      <div className="fleet-toolbar-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <FontAwesomeIcon icon={faCar} style={{ color: '#059669', fontSize: '1.25rem' }} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>
              Selecionar Viatura da Frota
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>
              {currentVeh ? `${currentVeh.plateNumber} — ${currentVeh.brand} ${currentVeh.model}` : 'Sem viatura'}
            </div>
          </div>
        </div>

        <div>
          <select
            value={selectedVehicle}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="fleet-input-control"
            style={{ width: 'auto', minWidth: '260px' }}
          >
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.plateNumber} — {v.brand} {v.model} ({v.currentOdometer?.toLocaleString()} km)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Card de Telemetria do Veículo Ativo */}
      {currentVeh && (
        <div
          style={{
            background: 'linear-gradient(135deg, #090d16 0%, #06231c 50%, #170d2c 100%)',
            borderRadius: '24px',
            padding: '1.75rem 2.25rem',
            color: '#ffffff',
            boxShadow: '0 12px 30px -8px rgba(6, 35, 28, 0.4)',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span className="vehicle-plate-pill" style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                <span className="vehicle-plate-flag" />
                {currentVeh.plateNumber}
              </span>
              <span className="ops-badge badge-ok">
                <FontAwesomeIcon icon={faCheckCircle} /> {currentVeh.type}
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0 0 0.25rem 0', color: '#ffffff' }}>
              {currentVeh.brand} {currentVeh.model} ({currentVeh.year})
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Consumo Alvo: {currentVeh.targetConsumption || 10} L/100km • Tanque: {currentVeh.fuelCapacity || 60}L
            </p>
            {currentVeh.assignedDriver && (
              <div style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
                <div className="fleet-driver-pill" style={{ background: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}>
                  <div className="fleet-driver-avatar">
                    {currentVeh.assignedDriver.profileImage ? (
                      <img src={currentVeh.assignedDriver.profileImage} alt={currentVeh.assignedDriver.name} />
                    ) : (
                      <span>{currentVeh.assignedDriver.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}</span>
                    )}
                    <span className={currentVeh.assignedDriver.isOnline ? 'driver-online-dot' : 'driver-offline-dot'} />
                  </div>
                  <div className="fleet-driver-meta">
                    <span className="fleet-driver-name" style={{ color: '#ffffff' }}>
                      {currentVeh.assignedDriver.name} (Motorista Atribuído)
                    </span>
                    <div className="fleet-driver-contact">
                      {currentVeh.assignedDriver.phoneNumber && (
                        <a href={`tel:${currentVeh.assignedDriver.phoneNumber}`} style={{ color: '#6ee7b7' }}>
                          <FontAwesomeIcon icon={faPhone} style={{ fontSize: '0.6rem', marginRight: '0.15rem' }} />
                          {currentVeh.assignedDriver.phoneNumber}
                        </a>
                      )}
                      {currentVeh.assignedDriver.email && (
                        <a href={`mailto:${currentVeh.assignedDriver.email}`} style={{ color: '#c4b5fd' }}>
                          <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '0.6rem', marginRight: '0.15rem' }} />
                          {currentVeh.assignedDriver.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: '800', display: 'block' }}>
              Quilometragem Atual
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#34d399', letterSpacing: '-0.02em', display: 'block', lineHeight: '1.1' }}>
              {currentVeh.currentOdometer?.toLocaleString()} <span style={{ fontSize: '1.1rem', color: '#a7f3d0', fontWeight: '700' }}>km</span>
            </span>
          </div>
        </div>
      )}

      {/* 4. Tabela de Leituras */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          A carregar leituras...
        </div>
      ) : logs.length === 0 ? (
        <div className="fleet-table-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <FontAwesomeIcon icon={faTachometerAlt} style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', margin: 0 }}>
            Nenhuma leitura registada para este veículo
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            As leituras automáticas de abastecimentos, viagens ou registos manuais surgirão aqui.
          </p>
        </div>
      ) : (
        <div className="fleet-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Quilometragem (Km)</th>
                  <th>Origem do Registo</th>
                  <th>Motorista / Responsável</th>
                  <th>Observações / Auditoria</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isAnomaly = log.notes && log.notes.includes('[ANOMALIA]');
                  return (
                    <tr
                      key={log._id}
                      style={{
                        background: isAnomaly ? 'rgba(254, 242, 242, 0.75)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>
                          {new Date(log.date).toLocaleDateString('pt-MZ')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {new Date(log.date).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: isAnomaly ? '#e11d48' : '#0f172a' }}>
                          {log.odometer?.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>km</span>
                        </div>
                      </td>
                      <td>
                        <span className={`ops-badge ${log.source === 'MANUAL' ? 'badge-purple' : log.source === 'FUEL_LOG' ? 'badge-info' : 'badge-ok'}`}>
                          {log.source === 'MANUAL' ? 'Manual' : log.source === 'FUEL_LOG' ? 'Abastecimento' : log.source}
                        </span>
                      </td>
                      <td>
                        {log.driver ? (
                          <div className="fleet-driver-pill">
                            <div className="fleet-driver-avatar">
                              {log.driver.profileImage ? (
                                <img src={log.driver.profileImage} alt={log.driver.name} />
                              ) : (
                                <span>{log.driver.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}</span>
                              )}
                              <span className={log.driver.isOnline ? 'driver-online-dot' : 'driver-offline-dot'} />
                            </div>
                            <div className="fleet-driver-meta">
                              <span className="fleet-driver-name">{log.driver.name}</span>
                              <div className="fleet-driver-contact">
                                {log.driver.phoneNumber && (
                                  <a href={`tel:${log.driver.phoneNumber}`}>
                                    <FontAwesomeIcon icon={faPhone} style={{ fontSize: '0.6rem', color: '#10b981', marginRight: '0.15rem' }} />
                                    {log.driver.phoneNumber}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                            Gestor de Frota
                          </span>
                        )}
                      </td>
                      <td>
                        {isAnomaly && (
                          <span className="ops-badge badge-danger" style={{ marginRight: '0.5rem' }}>
                            <FontAwesomeIcon icon={faExclamationTriangle} /> Regressão
                          </span>
                        )}
                        <span style={{ color: '#475569', fontSize: '0.82rem' }}>{log.notes || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal de Nova Leitura */}
      {showModal && (
        <div className="fleet-modal-overlay">
          <div className="fleet-modal-content">
            <div className="fleet-modal-header header-emerald">
              <h3 className="fleet-modal-title">
                <FontAwesomeIcon icon={faTachometerAlt} /> Registar Leitura de Odómetro
              </h3>
              <button onClick={() => setShowModal(false)} className="fleet-modal-close-btn">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="fleet-modal-body">
              <form onSubmit={handleSubmit} className="fleet-form-grid">
                <div>
                  <label className="fleet-form-label">Nova Quilometragem (km) *</label>
                  <input
                    type="number"
                    required
                    value={odometerInput}
                    onChange={(e) => setOdometerInput(e.target.value)}
                    className="fleet-input-control"
                    style={{ fontSize: '1.25rem', fontWeight: '900', color: '#047857' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Atual: {currentVeh?.currentOdometer?.toLocaleString()} km
                  </span>
                </div>

                <div>
                  <label className="fleet-form-label">Notas / Justificação da Alteração</label>
                  <textarea
                    rows={3}
                    placeholder="ex: Verificação no pátio da empresa"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="fleet-input-control"
                    style={{ resize: 'vertical' }}
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
                  <button type="submit" className="btn-ops-emerald">
                    Guardar Leitura
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

