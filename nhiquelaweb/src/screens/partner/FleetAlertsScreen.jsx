import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api';
 import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
 import {
   faExclamationTriangle,
   faCheckCircle,
   faFilter,
   faWrench,
   faGasPump,
   faTachometerAlt,
   faCheck,
   faShieldVirus,
   faBell,
   faCalendarAlt,
   faUser,
   faPhone,
   faEnvelope,
 } from '@fortawesome/free-solid-svg-icons';
 import { toast } from 'react-toastify';
 import './FleetOperations.css';

export default function FleetAlertsScreen() {
  const { userInfo } = useSelector((state) => state.user);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/fleet/alerts?status=${filterStatus}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setAlerts(data);
    } catch (err) {
      toast.error('Erro ao carregar alertas: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterStatus]);

  const handleResolveAlert = async (id) => {
    try {
      await api.put(
        `/fleet/alerts/${id}/resolve`,
        { status: 'RESOLVED' },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      toast.success('Alerta marcado como resolvido!');
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="fleet-ops-wrapper">
      {/* 1. Hero Header */}
      <div className="fleet-hero-header hero-alerts">
        <div>
          <div className="fleet-hero-badge">
            <FontAwesomeIcon icon={faShieldVirus} /> Auditoria Operacional & Fraude
          </div>
          <h1 className="fleet-hero-title">
            <FontAwesomeIcon icon={faBell} className="text-rose-400" />
            Central de Alertas & Anomalias
          </h1>
          <p className="fleet-hero-subtitle">
            Deteção inteligente de manutenções vencidas, abastecimentos atípicos e oscilações/regressões no odómetro para proteção do património da frota.
          </p>
        </div>
      </div>

      {/* 2. Toolbar & Filter Pills */}
      <div className="fleet-toolbar-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FontAwesomeIcon icon={faFilter} style={{ color: '#64748b' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#334155' }}>Filtrar Estado:</span>
        </div>

        <div className="fleet-filter-pills">
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`fleet-filter-pill ${filterStatus === 'PENDING' ? 'active-pending' : ''}`}
          >
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '0.4rem' }} />
            Pendentes ({filterStatus === 'PENDING' ? alerts.length : '—'})
          </button>
          <button
            onClick={() => setFilterStatus('RESOLVED')}
            className={`fleet-filter-pill ${filterStatus === 'RESOLVED' ? 'active-resolved' : ''}`}
          >
            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.4rem' }} />
            Resolvidos ({filterStatus === 'RESOLVED' ? alerts.length : '—'})
          </button>
        </div>
      </div>

      {/* 3. Lista de Alertas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          A carregar alertas e anomalias...
        </div>
      ) : alerts.length === 0 ? (
        <div className="fleet-table-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '3rem', color: '#10b981', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', margin: 0 }}>
            Tudo em ordem!
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Nenhum alerta {filterStatus === 'PENDING' ? 'pendente' : 'resolvido'} encontrado na frota.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';
            const isMaintenance = alert.type?.includes('MAINTENANCE');
            const isFuel = alert.type?.includes('FUEL');
            const isOdometer = alert.type?.includes('ODOMETER');

            return (
              <div
                key={alert._id}
                className={`fleet-alert-box ${
                  isCritical ? 'alert-border-danger' : alert.severity === 'MEDIUM' ? 'alert-border-warn' : 'alert-border-success'
                }`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flex: 1 }}>
                  <div
                    className="alert-icon-wrap"
                    style={{
                      background: isCritical ? '#fff1f2' : isMaintenance ? '#fffbeb' : '#f0fdfa',
                      color: isCritical ? '#e11d48' : isMaintenance ? '#d97706' : '#0d9488',
                    }}
                  >
                    <FontAwesomeIcon
                      icon={isFuel ? faGasPump : isOdometer ? faTachometerAlt : faWrench}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <span
                        className={`ops-badge ${
                          isCritical ? 'badge-danger' : alert.severity === 'MEDIUM' ? 'badge-warn' : 'badge-info'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      {alert.vehicle?.plateNumber && (
                        <span className="vehicle-plate-pill">
                          <span className="vehicle-plate-flag" />
                          {alert.vehicle.plateNumber}
                        </span>
                      )}
                      {alert.vehicle?.brand && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                          {alert.vehicle.brand} {alert.vehicle.model}
                        </span>
                      )}
                      {alert.vehicle?.assignedDriver && (
                        <div className="fleet-driver-pill" style={{ padding: '0.2rem 0.5rem' }}>
                          <div className="fleet-driver-avatar" style={{ width: 22, height: 22, fontSize: '0.65rem' }}>
                            {alert.vehicle.assignedDriver.profileImage ? (
                              <img src={alert.vehicle.assignedDriver.profileImage} alt={alert.vehicle.assignedDriver.name} />
                            ) : (
                              <span>{alert.vehicle.assignedDriver.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}</span>
                            )}
                            <span className={alert.vehicle.assignedDriver.isOnline ? 'driver-online-dot' : 'driver-offline-dot'} />
                          </div>
                          <span className="fleet-driver-name" style={{ fontSize: '0.72rem' }}>
                            {alert.vehicle.assignedDriver.name}
                          </span>
                          {alert.vehicle.assignedDriver.phoneNumber && (
                            <a
                              href={`tel:${alert.vehicle.assignedDriver.phoneNumber}`}
                              title={`Ligar: ${alert.vehicle.assignedDriver.phoneNumber}`}
                              style={{ color: '#10b981', fontSize: '0.68rem', marginLeft: '0.2rem' }}
                            >
                              <FontAwesomeIcon icon={faPhone} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                      {alert.title}
                    </h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.84rem', color: '#475569', lineHeight: '1.4' }}>
                      {alert.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                      <FontAwesomeIcon icon={faCalendarAlt} />
                      Registado em: {new Date(alert.createdAt).toLocaleString('pt-MZ')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center' }}>
                  {alert.status === 'PENDING' ? (
                    <button
                      onClick={() => handleResolveAlert(alert._id)}
                      className="btn-ops-emerald"
                      style={{ padding: '0.6rem 1.1rem', fontSize: '0.82rem' }}
                    >
                      <FontAwesomeIcon icon={faCheck} /> Marcar Resolvido
                    </button>
                  ) : (
                    <span className="ops-badge badge-ok" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                      <FontAwesomeIcon icon={faCheckCircle} /> Resolvido
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

