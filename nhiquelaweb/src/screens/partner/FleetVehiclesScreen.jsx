import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api';
import './FleetVehicles.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faPlus,
  faEdit,
  faTrash,
  faUser,
  faTachometerAlt,
  faGasPump,
  faWeightHanging,
  faTimes,
  faCheck,
  faRoad,
  faPhone,
  faEnvelope,
  faSyncAlt,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

export default function FleetVehiclesScreen() {
  const { userInfo } = useSelector((state) => state.user);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    type: 'Ligeiro',
    capacityKg: 1000,
    fuelType: 'Gasóleo',
    fuelTankCapacityLiters: 60,
    targetConsumptionL100km: 10.0,
    currentOdometer: 0,
    status: 'Operacional',
    assignedDriver: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const partnerId = userInfo?.partnerId || userInfo?._id || 'me';
      const [vRes, dRes] = await Promise.all([
        api.get('/fleet/vehicles', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
        api.get(`/partners/${partnerId}/members`, { headers: { Authorization: `Bearer ${userInfo.token}` } }).catch(() => ({ data: { drivers: [] } })),
      ]);
      setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
      const driverList = Array.isArray(dRes.data)
        ? dRes.data
        : (dRes.data?.drivers || dRes.data?.members || []);
      setDrivers(driverList);
    } catch (err) {
      toast.error('Erro ao carregar dados: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncVehicles = async () => {
    try {
      setSyncing(true);
      const res = await api.post('/fleet/sync-driver-vehicles', {}, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success(res.data?.message || 'Viaturas dos motoristas sincronizadas com sucesso!');
      await fetchData();
    } catch (err) {
      toast.error('Erro ao sincronizar viaturas: ' + (err.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleDriverSelect = (driverId) => {
    const selectedD = (Array.isArray(drivers) ? drivers : []).find((d) => String(d._id) === String(driverId));
    const nextForm = { ...formData, assignedDriver: driverId };

    if (selectedD?.deliveryman?.transport_registration && (!formData.plateNumber || formData.plateNumber.trim() === '')) {
      nextForm.plateNumber = selectedD.deliveryman.transport_registration.toUpperCase();
      if (selectedD.deliveryman.transport_brand) nextForm.brand = selectedD.deliveryman.transport_brand;
      if (selectedD.deliveryman.transport_model) nextForm.model = selectedD.deliveryman.transport_model;
      else if (selectedD.deliveryman.transport_type) nextForm.model = selectedD.deliveryman.transport_type;

      if (selectedD.deliveryman.transport_type) {
        const t = String(selectedD.deliveryman.transport_type).toLowerCase();
        if (t.includes('moto') || t.includes('motor')) nextForm.type = 'Motociclo';
        else if (t.includes('van') || t.includes('carrinha')) nextForm.type = 'Van';
        else if (t.includes('pesado') || t.includes('camiao')) nextForm.type = 'Pesado';
        else nextForm.type = 'Ligeiro';
      }
    }
    setFormData(nextForm);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormData({
      plateNumber: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      type: 'Ligeiro',
      capacityKg: 1000,
      fuelType: 'Gasóleo',
      fuelTankCapacityLiters: 60,
      targetConsumptionL100km: 10.0,
      currentOdometer: 0,
      status: 'Operacional',
      assignedDriver: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (v) => {
    setEditingVehicle(v);
    setFormData({
      plateNumber: v.plateNumber || '',
      brand: v.brand || '',
      model: v.model || '',
      year: v.year || new Date().getFullYear(),
      type: v.type || 'Ligeiro',
      capacityKg: v.capacityKg || 0,
      fuelType: v.fuelType || 'Gasóleo',
      fuelTankCapacityLiters: v.fuelTankCapacityLiters || 60,
      targetConsumptionL100km: v.targetConsumptionL100km || 10.0,
      currentOdometer: v.currentOdometer || 0,
      status: v.status || 'Operacional',
      assignedDriver: v.assignedDriver?._id || v.assignedDriver || '',
      notes: v.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await api.put(`/fleet/vehicles/${editingVehicle._id}`, formData, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await api.post('/fleet/vehicles', formData, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success('Veículo registado com sucesso!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este veículo da frota?')) return;
    try {
      await api.delete(`/fleet/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success('Veículo removido com sucesso!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="fleet-vehicles-wrapper">
      {/* Header Banner */}
      <div className="fleet-page-header">
        <div>
          <h1 className="fleet-header-title">
            <span className="fleet-header-icon-box">
              <FontAwesomeIcon icon={faCar} />
            </span>
            Veículos da Frota
          </h1>
          <p className="fleet-header-subtitle">
            Gira os veículos, motoristas associados, estado operacional e capacidade de carga.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncVehicles}
            disabled={syncing}
            className="btn-add-vehicle"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 8px 18px -4px rgba(2, 132, 199, 0.35)',
              opacity: syncing ? 0.7 : 1,
            }}
            title="Importar e sincronizar viaturas cadastradas no perfil dos motoristas"
          >
            <FontAwesomeIcon icon={faSyncAlt} spin={syncing} />
            <span>{syncing ? 'A Sincronizar...' : 'Sincronizar Motoristas'}</span>
          </button>
          <button onClick={openCreateModal} className="btn-add-vehicle">
            <FontAwesomeIcon icon={faPlus} />
            <span>Adicionar Veículo</span>
          </button>
        </div>
      </div>

      {/* Grid de Veículos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b', fontWeight: 600 }}>
          A carregar veículos...
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{ background: '#ffffff', padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '24px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
          <FontAwesomeIcon icon={faCar} style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#475569', margin: 0 }}>Nenhum veículo registado na frota</h4>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Pode sincronizar automaticamente as viaturas cadastradas pelos seus motoristas ou adicionar manualmente.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSyncVehicles}
              disabled={syncing}
              className="btn-add-vehicle"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 8px 18px -4px rgba(2, 132, 199, 0.35)',
                opacity: syncing ? 0.7 : 1,
              }}
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={syncing} />
              <span>{syncing ? 'A Sincronizar...' : 'Sincronizar Viaturas dos Motoristas'}</span>
            </button>
            <button
              onClick={openCreateModal}
              className="btn-add-vehicle"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Registar Manualmente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="fleet-vehicles-grid">
          {vehicles.map((v) => (
            <div key={v._id} className="vehicle-card">
              <div className="vehicle-card-top">
                <div>
                  <span className="vehicle-type-tag">{v.type}</span>
                  <div>
                    <span className="vehicle-plate-main">{v.plateNumber}</span>
                  </div>
                  <h4 className="vehicle-model-desc">
                    {v.brand} {v.model} <span>({v.year})</span>
                  </h4>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor:
                      v.status === 'Operacional'
                        ? '#ecfdf5'
                        : v.status === 'Em Manutenção'
                        ? '#fffbeb'
                        : '#f1f5f9',
                    color:
                      v.status === 'Operacional'
                        ? '#047857'
                        : v.status === 'Em Manutenção'
                        ? '#b45309'
                        : '#64748b',
                    border: `1px solid ${
                      v.status === 'Operacional'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : v.status === 'Em Manutenção'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : '#cbd5e1'
                    }`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor:
                        v.status === 'Operacional'
                          ? '#10b981'
                          : v.status === 'Em Manutenção'
                          ? '#f59e0b'
                          : '#94a3b8',
                    }}
                  ></span>
                  {v.status}
                </span>
              </div>

              {/* 4-Quadrant Specs Matrix */}
              <div className="vehicle-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Odómetro</span>
                  <span className="spec-value">
                    <FontAwesomeIcon icon={faTachometerAlt} style={{ color: '#059669', fontSize: '0.85rem' }} />
                    {v.currentOdometer?.toLocaleString()} km
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Combustível</span>
                  <span className="spec-value">
                    <FontAwesomeIcon icon={faGasPump} style={{ color: '#0d9488', fontSize: '0.85rem' }} />
                    {v.fuelType} ({v.fuelTankCapacityLiters}L)
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Capacidade</span>
                  <span className="spec-value">
                    <FontAwesomeIcon icon={faWeightHanging} style={{ color: '#d97706', fontSize: '0.85rem' }} />
                    {v.capacityKg} kg
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Consumo Alvo</span>
                  <span className="spec-value">
                    <FontAwesomeIcon icon={faRoad} style={{ color: '#6366f1', fontSize: '0.85rem' }} />
                    {v.targetConsumptionL100km} L/100km
                  </span>
                </div>
              </div>

              {/* Driver and Actions */}
              <div className="vehicle-card-bottom">
                <div className="vehicle-driver-info">
                  <div className="driver-avatar-circle">
                    {v.assignedDriver?.profileImage ? (
                      <img src={v.assignedDriver.profileImage} alt={v.assignedDriver.name} />
                    ) : (
                      <span>{v.assignedDriver?.name ? v.assignedDriver.name.charAt(0).toUpperCase() : <FontAwesomeIcon icon={faUser} />}</span>
                    )}
                    {v.assignedDriver && (
                      <span className={v.assignedDriver.isOnline ? 'driver-online-dot' : 'driver-offline-dot'} />
                    )}
                  </div>
                  <div className="driver-meta-box">
                    <span className="driver-meta-name">
                      {v.assignedDriver?.name || 'Sem motorista atribuído'}
                    </span>
                    {v.assignedDriver && (
                      <div className="driver-meta-contacts">
                        {v.assignedDriver.phoneNumber && (
                          <a
                            href={`tel:${v.assignedDriver.phoneNumber}`}
                            title={`Ligar: ${v.assignedDriver.phoneNumber}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FontAwesomeIcon icon={faPhone} style={{ fontSize: '0.65rem', marginRight: '0.2rem', color: '#10b981' }} />
                            {v.assignedDriver.phoneNumber}
                          </a>
                        )}
                        {v.assignedDriver.email && (
                          <a
                            href={`mailto:${v.assignedDriver.email}`}
                            title={`Email: ${v.assignedDriver.email}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '0.65rem', marginRight: '0.2rem', color: '#6366f1' }} />
                            {v.assignedDriver.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="vehicle-actions-group">
                  <button
                    onClick={() => openEditModal(v)}
                    className="btn-vehicle-action btn-action-edit"
                    title="Editar Veículo"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    onClick={() => handleDelete(v._id)}
                    className="btn-vehicle-action btn-action-delete"
                    title="Eliminar Veículo"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fleet-modal-overlay">
          <div className="fleet-modal-content">
            <div className="fleet-modal-header">
              <h3 className="fleet-modal-title">
                {editingVehicle ? 'Editar Veículo' : 'Registar Novo Veículo'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Matrícula *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: ABC-123-MC"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    className="fleet-input-control"
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Toyota"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="fleet-input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Hilux"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="fleet-input-control"
                  />
                </div>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Ano *</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="fleet-input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="fleet-input-control"
                  >
                    <option value="Ligeiro">Ligeiro</option>
                    <option value="Pesado">Pesado</option>
                    <option value="Motociclo">Motociclo</option>
                    <option value="Van">Van / Cativa</option>
                  </select>
                </div>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Combustível</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="fleet-input-control"
                  >
                    <option value="Gasóleo">Gasóleo</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Elétrico">Elétrico</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Depósito (L)</label>
                  <input
                    type="number"
                    value={formData.fuelTankCapacityLiters}
                    onChange={(e) => setFormData({ ...formData, fuelTankCapacityLiters: Number(e.target.value) })}
                    className="fleet-input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Odómetro Atual (km)</label>
                  <input
                    type="number"
                    value={formData.currentOdometer}
                    onChange={(e) => setFormData({ ...formData, currentOdometer: Number(e.target.value) })}
                    className="fleet-input-control"
                  />
                </div>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Consumo Alvo (L/100km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.targetConsumptionL100km}
                    onChange={(e) => setFormData({ ...formData, targetConsumptionL100km: Number(e.target.value) })}
                    className="fleet-input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Motorista Responsável</label>
                  <select
                    value={formData.assignedDriver}
                    onChange={(e) => handleDriverSelect(e.target.value)}
                    className="fleet-input-control"
                  >
                    <option value="">Sem Motorista Atribuído</option>
                    {(Array.isArray(drivers) ? drivers : []).map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.phoneNumber || d.email})
                      </option>
                    ))}
                  </select>
                  {formData.assignedDriver && (() => {
                    const selectedD = (Array.isArray(drivers) ? drivers : []).find(
                      (d) => String(d._id) === String(formData.assignedDriver)
                    );
                    if (!selectedD) return null;
                    const hasDriverVehicle = Boolean(selectedD.deliveryman?.transport_registration);

                    return (
                      <div className="driver-selected-preview" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="fleet-driver-avatar">
                            {selectedD.profileImage ? (
                              <img src={selectedD.profileImage} alt={selectedD.name} />
                            ) : (
                              <span>{selectedD.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}</span>
                            )}
                            <span className={selectedD.isOnline ? 'driver-online-dot' : 'driver-offline-dot'} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{selectedD.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                              {selectedD.phoneNumber && <span>📞 {selectedD.phoneNumber}</span>}
                              {selectedD.email && <span>✉️ {selectedD.email}</span>}
                            </div>
                          </div>
                        </div>

                        {hasDriverVehicle && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              paddingTop: '0.5rem',
                              borderTop: '1px dashed #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              fontSize: '0.75rem',
                            }}
                          >
                            <span style={{ color: '#0d9488', fontWeight: 700 }}>
                              🚗 Viatura no perfil: {selectedD.deliveryman.transport_registration} ({selectedD.deliveryman.transport_type || 'Geral'})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  plateNumber: selectedD.deliveryman.transport_registration?.toUpperCase() || prev.plateNumber,
                                  brand: selectedD.deliveryman.transport_brand || prev.brand || 'Viatura',
                                  model: selectedD.deliveryman.transport_model || selectedD.deliveryman.transport_type || prev.model || 'Geral',
                                }));
                                toast.info('Dados da viatura do motorista preenchidos no formulário!');
                              }}
                              style={{
                                background: '#ecfdf5',
                                border: '1px solid #10b981',
                                color: '#047857',
                                borderRadius: '8px',
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Preencher Formulário
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="fleet-input-group" style={{ margin: 0 }}>
                  <label className="fleet-input-label">Estado Operacional</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="fleet-input-control"
                  >
                    <option value="Operacional">Operacional</option>
                    <option value="Em Manutenção">Em Manutenção</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-add-vehicle"
                  style={{ padding: '0.65rem 1.5rem' }}
                >
                  <FontAwesomeIcon icon={faCheck} />
                  <span>Guardar Veículo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

