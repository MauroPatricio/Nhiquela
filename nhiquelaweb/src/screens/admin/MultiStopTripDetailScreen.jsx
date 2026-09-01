import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMotorcycle, faMapMarkerAlt, faCheckCircle, faExclamationTriangle,
  faClock, faUser, faPhone, faTruck, faExchangeAlt, faFileAlt, faMoneyBillWave,
  faHistory, faCamera, faSignature, faEllipsisV, faArrowLeft, faRoute, faSyncAlt,
  faTimesCircle, faBoxes, faSearch, faChevronRight, faShieldAlt, faFileImport,
  faFileExport, faBolt, faCalendarCheck, faListAlt, faSlidersH, faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api';
import { toast } from 'react-toastify';

export default function MultiStopTripDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [activeDriverTab, setActiveDriverTab] = useState('todo'); // todo, completed
  const [isOnDuty, setIsOnDuty] = useState(true);

  // Mock / API state para o painel de rotas e despacho multi-destino
  const [kpiMetrics, setKpiMetrics] = useState({
    scheduled: 239,
    unscheduled: 1,
    total: 240,
    activeRoutes: 6
  });

  const [selectedDriver, setSelectedDriver] = useState({
    name: 'João Manuel (Bruce)',
    phone: '849998877',
    vehicle: 'Toyota Hiace — MZ-XX-XX',
    photo: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
    status: 'ON DUTY'
  });

  // Lista de paragens do motorista selecionado
  const [driverStops, setDriverStops] = useState([
    { id: 's1', type: 'Delivery', time: '08:30 AM', address: 'Costa do Sol, Av. Marginal 15029', recipient: 'João Silva', packages: 3, status: 'COMPLETED', seq: 1 },
    { id: 's2', type: 'Delivery', time: '10:04 AM', address: 'Baixa de Maputo, Av. 25 de Setembro', recipient: 'Maria Santos', packages: 2, status: 'COMPLETED', seq: 2 },
    { id: 's3', type: 'Pickup', time: '11:25 AM', address: 'Matola Gare, Rua da Mozal 7927', recipient: 'Carlos Tembe', packages: 5, status: 'IN_PROGRESS', seq: 3, isProblem: true },
    { id: 's4', type: 'Depot', time: '12:45 PM', address: 'Marracuene, Vila Sede', recipient: 'Ana Paula', packages: 1, status: 'PENDING', seq: 4 },
  ]);

  // Rotas multi-zona no mapa
  const [routeZones, setRouteZones] = useState([
    { id: 'z1', name: 'Zona Azul (Costa do Sol / Baixa)', color: '#007bff', stops: 11, status: 'IN_PROGRESS' },
    { id: 'z2', name: 'Zona Verde (Matola)', color: '#28a745', stops: 10, status: 'IN_PROGRESS' },
    { id: 'z3', name: 'Zona Amarela (Marracuene)', color: '#ffc107', stops: 8, status: 'PENDING' },
    { id: 'z4', name: 'Zona Púrpura (Zimpeto)', color: '#6f42c1', stops: 6, status: 'IN_PROGRESS' },
  ]);

  // Timeline de Gantt (Horas)
  const hours = ['6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM'];

  return (
    <div className="container-fluid py-3 bg-light min-vh-100">
      {/* 1. TOP HEADER & KPI METRICS BAR (Fidelidade ao Mockup de Referência) */}
      <div className="card border-0 shadow-sm rounded-4 bg-white mb-3 p-3">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          {/* Métricas Numéricas Rápidas */}
          <div className="d-flex align-items-center gap-4 border-end pe-4">
            <button className="btn btn-outline-secondary btn-sm rounded-circle" onClick={() => navigate('/admin/orders')}>
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>

            <div className="text-center">
              <h3 className="fw-bold text-dark m-0">{kpiMetrics.scheduled}</h3>
              <span className="text-muted small text-uppercase fw-bold">Scheduled</span>
            </div>
            <div className="text-center">
              <h3 className="fw-bold text-danger m-0">{kpiMetrics.unscheduled}</h3>
              <span className="text-muted small text-uppercase fw-bold">Unscheduled</span>
            </div>
            <div className="text-center">
              <h3 className="fw-bold text-primary m-0">{kpiMetrics.total}</h3>
              <span className="text-muted small text-uppercase fw-bold">Total</span>
            </div>
            <div className="text-center">
              <h3 className="fw-bold text-purple m-0" style={{ color: '#6f42c1' }}>{kpiMetrics.activeRoutes}</h3>
              <span className="text-muted small text-uppercase fw-bold">Routes</span>
            </div>
          </div>

          {/* Barra de Ações: Importar, Planear, Exportar */}
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-dark rounded-pill px-3 fw-bold shadow-sm" onClick={() => toast.info('A carregar ficheiro de pedidos...')}>
              <FontAwesomeIcon icon={faFileImport} className="me-2" /> Import
            </button>
            <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" onClick={() => toast.success('Motor preditivo de otimização ativado!')}>
              <FontAwesomeIcon icon={faBolt} className="me-2" /> Plan / Planear
            </button>
            <div className="dropdown">
              <button className="btn btn-secondary rounded-pill px-3 fw-bold dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <FontAwesomeIcon icon={faFileExport} className="me-2" /> Export
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3">
                <li><button className="dropdown-item" onClick={() => toast.info('Exportando PDF...')}>Relatório em PDF</button></li>
                <li><button className="dropdown-item" onClick={() => toast.info('Exportando Excel...')}>Planilha Excel</button></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LAYOUT PRINCIPAL: SIDEBAR DE MOTORISTAS/PEDIDOS + MAPA DE ROTAS MULTI-ZONA */}
      <div className="row g-3">
        {/* COLUNA ESQUERDA: SIDEBAR DE MOTORISTA & PARAGENS (ESTILO MOBILE DOCKS) */}
        <div className="col-12 col-lg-4 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
            {/* Header do Motorista */}
            <div className="p-3 border-bottom bg-dark text-white d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: 36, height: 36 }}>
                  {selectedDriver.name.charAt(0)}
                </div>
                <div>
                  <h6 className="fw-bold m-0 text-white">{selectedDriver.name}</h6>
                  <span className="small text-white-50">{selectedDriver.vehicle}</span>
                </div>
              </div>

              {/* Toggle ON DUTY */}
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={isOnDuty}
                  onChange={() => setIsOnDuty(!isOnDuty)}
                />
                <span className="small fw-bold text-success ms-1">{isOnDuty ? 'ON DUTY' : 'OFF'}</span>
              </div>
            </div>

            {/* Separadores TO DO / COMPLETED */}
            <div className="d-flex border-bottom bg-light">
              <button
                className={`flex-fill py-2 fw-bold border-0 bg-transparent ${activeDriverTab === 'todo' ? 'border-bottom border-primary border-3 text-primary' : 'text-muted'}`}
                onClick={() => setActiveDriverTab('todo')}
              >
                TO DO ({driverStops.filter(s => s.status !== 'COMPLETED').length})
              </button>
              <button
                className={`flex-fill py-2 fw-bold border-0 bg-transparent ${activeDriverTab === 'completed' ? 'border-bottom border-primary border-3 text-primary' : 'text-muted'}`}
                onClick={() => setActiveDriverTab('completed')}
              >
                COMPLETED ({driverStops.filter(s => s.status === 'COMPLETED').length})
              </button>
            </div>

            {/* Lista de Entregas / Paragens */}
            <div className="p-2 overflow-auto" style={{ maxHeight: '480px' }}>
              {driverStops
                .filter(s => activeDriverTab === 'completed' ? s.status === 'COMPLETED' : s.status !== 'COMPLETED')
                .map((stop) => (
                  <div
                    key={stop.id}
                    className={`card border-0 shadow-sm rounded-3 p-3 mb-2 cursor-pointer ${stop.isProblem ? 'border-start border-danger border-4 bg-danger bg-opacity-10' : 'bg-light'}`}
                    onClick={() => toast.info(`Paragem #${stop.seq}: ${stop.recipient}`)}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge bg-secondary text-white fw-bold">
                        <FontAwesomeIcon icon={stop.type === 'Delivery' ? faTruck : faBoxes} className="me-1" />
                        {stop.type} - {stop.time}
                      </span>
                      <span className="fw-bold text-muted small">#{stop.seq}</span>
                    </div>
                    <div className="fw-bold text-dark text-truncate">{stop.address}</div>
                    <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
                      <span>Destinatário: <strong>{stop.recipient}</strong></span>
                      <span className="badge bg-purple text-white" style={{ backgroundColor: '#6f42c1' }}>{stop.packages} vol</span>
                    </div>

                    {stop.isProblem && (
                      <div className="mt-2 text-danger small fw-bold d-flex align-items-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" /> Ocorrência: Cliente ausente
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: MAPA MULTI-ZONA EM TEMPO REAL & GANTT TIMELINE */}
        <div className="col-12 col-lg-8 col-xl-9">
          {/* CARTÃO DO MAPA EM TEMPO REAL */}
          <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden mb-3">
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white">
              <div className="d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-primary fs-5" />
                <h6 className="fw-bold m-0 text-dark">Mapa de Rotas e Despacho em Tempo Real (Maputo Multi-Zone)</h6>
              </div>
              <div className="d-flex gap-2">
                <span className="badge bg-success px-3 py-2 rounded-pill">6 Frotas em Trânsito 🟢</span>
              </div>
            </div>

            {/* Renderização do Mapa com Zonas de Cor e Waypoints Numerados */}
            <div className="w-100 position-relative" style={{ height: '420px', backgroundColor: '#e5e9ec' }}>
              <div
                className="w-100 h-100 p-4 d-flex flex-column justify-content-between"
                style={{
                  backgroundImage: 'radial-gradient(#abb2b9 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  backgroundColor: '#f4f6f7'
                }}
              >
                {/* Visualizador de Zonas de Rota */}
                <div className="d-flex flex-wrap gap-2">
                  {routeZones.map(z => (
                    <div key={z.id} className="badge p-2 text-white shadow-sm d-flex align-items-center gap-2 rounded-3" style={{ backgroundColor: z.color }}>
                      <FontAwesomeIcon icon={faLayerGroup} />
                      <span>{z.name} ({z.stops} paragens)</span>
                    </div>
                  ))}
                </div>

                {/* Waypoints Numerados Simulados no Mapa */}
                <div className="d-flex justify-content-around align-items-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(num => (
                    <div
                      key={num}
                      className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center shadow-lg"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: num <= 3 ? '#007bff' : (num <= 6 ? '#28a745' : (num <= 8 ? '#ffc107' : '#6f42c1')),
                        fontSize: '13px'
                      }}
                      title={`Paragem ${num}`}
                    >
                      {num}
                    </div>
                  ))}
                </div>

                {/* Motorista Ativo no Mapa */}
                <div className="align-self-center bg-dark text-white px-4 py-2 rounded-pill shadow-lg d-flex align-items-center gap-2">
                  <FontAwesomeIcon icon={faMotorcycle} className="text-warning fa-bounce" />
                  <span className="fw-bold">João Manuel (#NQ-00851)</span>
                  <span className="badge bg-primary rounded-pill">Paragem 3 de 4</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. TIMELINE HORIZONTAL GANTT SCHEDULE (Parte Inferior do Mockup) */}
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold m-0 text-dark">
                <FontAwesomeIcon icon={faClock} className="me-2 text-primary" /> Timeline de Execução e Janelas de Entrega (Gantt)
              </h6>
              <span className="small text-muted">Horário Local (CAT)</span>
            </div>

            {/* Grid de Horas (6 AM -> 2 PM) */}
            <div className="table-responsive">
              <div className="d-flex border-bottom pb-2 pt-1 min-w-600">
                {hours.map((h, i) => (
                  <div key={i} className="flex-fill text-center small fw-bold text-muted border-start">
                    {h}
                  </div>
                ))}
              </div>

              {/* Barras Coloridas do Gantt por Rota */}
              <div className="d-flex flex-column gap-2 py-3 min-w-600">
                <div className="d-flex align-items-center">
                  <span className="small fw-bold text-dark" style={{ width: '80px' }}>Rota Azul</span>
                  <div className="flex-fill bg-light rounded-pill overflow-hidden" style={{ height: '14px' }}>
                    <div className="bg-primary h-100 rounded-pill" style={{ width: '65%', marginLeft: '10%' }} />
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  <span className="small fw-bold text-dark" style={{ width: '80px' }}>Rota Verde</span>
                  <div className="flex-fill bg-light rounded-pill overflow-hidden" style={{ height: '14px' }}>
                    <div className="bg-success h-100 rounded-pill" style={{ width: '80%', marginLeft: '0%' }} />
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  <span className="small fw-bold text-dark" style={{ width: '80px' }}>Rota Amarela</span>
                  <div className="flex-fill bg-light rounded-pill overflow-hidden" style={{ height: '14px' }}>
                    <div className="bg-warning h-100 rounded-pill" style={{ width: '40%', marginLeft: '30%' }} />
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  <span className="small fw-bold text-dark" style={{ width: '80px' }}>Rota Púrpura</span>
                  <div className="flex-fill bg-light rounded-pill overflow-hidden" style={{ height: '14px' }}>
                    <div className="bg-purple h-100 rounded-pill" style={{ backgroundColor: '#6f42c1', width: '50%', marginLeft: '20%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
