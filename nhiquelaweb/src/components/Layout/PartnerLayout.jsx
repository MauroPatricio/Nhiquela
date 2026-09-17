import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import './PartnerLayout.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faUsers,
  faSignOutAlt,
  faBars,
  faTimes,
  faShieldAlt,
  faArrowLeft,
  faUser,
  faCar,
  faWrench,
  faGasPump,
  faTachometerAlt,
  faExclamationTriangle,
  faChartBar,
} from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, setUserLogout } from '../../store/features/userSlice';

export default function PartnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userInfo = useSelector(selectUser) || {};

  if (!userInfo || !userInfo.token) {
    return <Navigate to="/login" replace />;
  }

  // Permitir acesso a utilizadores com role PARTNER, isPartner, partnerId, ADMIN ou papel dinâmico de frota
  const isPartnerUser = 
    userInfo.isAdmin || 
    userInfo.role === 'ADMIN' || 
    userInfo.role === 'PARTNER' || 
    userInfo.isPartner || 
    Boolean(userInfo.partnerId) || 
    (userInfo.roleId && typeof userInfo.roleId === 'object' && userInfo.roleId.name && (
      userInfo.roleId.name.toLowerCase().includes('parceiro') ||
      userInfo.roleId.name.toLowerCase().includes('gestor') ||
      userInfo.roleId.name.toLowerCase().includes('frota')
    ));

  if (!isPartnerUser) {
    return <Navigate to="/" replace />;
  }

  const menuSections = [
    {
      title: 'Visão Geral & KPIs',
      items: [
        { name: 'Dashboard (KPIs)', path: '/partner/dashboard', icon: faChartLine },
        { name: 'Dashboard Frota', path: '/partner/fleet', icon: faChartBar },
      ],
    },
    {
      title: 'Operações de Frota',
      items: [
        { name: 'Veículos', path: '/partner/fleet/vehicles', icon: faCar },
        { name: 'Manutenções', path: '/partner/fleet/maintenance', icon: faWrench },
        { name: 'Combustível', path: '/partner/fleet/fuel', icon: faGasPump },
        { name: 'Odómetro', path: '/partner/fleet/odometer', icon: faTachometerAlt },
        { name: 'Alertas & Anomalias', path: '/partner/fleet/alerts', icon: faExclamationTriangle },
        { name: 'Relatórios de Frota', path: '/partner/fleet/reports', icon: faChartBar },
      ],
    },
    {
      title: 'Administração & Equipa',
      items: [
        { name: 'Minha Equipa / Motoristas', path: '/partner/members', icon: faUsers },
        { name: 'Meu Perfil', path: '/partner/profile', icon: faUser },
      ],
    },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = () => {
    dispatch(setUserLogout());
    navigate('/login');
  };

  return (
    <div className="partner-shell-container">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div className="partner-backdrop-mobile d-lg-none" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar Executiva do Parceiro */}
      <aside className={`partner-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="partner-brand-header">
          <div>
            <h5 className="partner-brand-logo">
              nhiquela<span className="brand-suffix">.parceiro</span>
            </h5>
            <span className="partner-brand-tagline">Gestão de Frota & KPIs</span>
          </div>
          <button className="btn-sidebar-close d-lg-none" onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Profile Card */}
        <NavLink
          to="/partner/profile"
          onClick={() => setSidebarOpen(false)}
          className="partner-profile-card"
        >
          <div className="partner-avatar-wrap">
            {userInfo.profileImage || userInfo.sellerLogo || userInfo.seller?.logo || userInfo.logo ? (
              <img
                src={userInfo.profileImage || userInfo.sellerLogo || userInfo.seller?.logo || userInfo.logo}
                alt={userInfo.name || 'Parceiro'}
                className="partner-avatar-img"
              />
            ) : (
              <FontAwesomeIcon icon={faShieldAlt} style={{ color: '#ffffff', fontSize: '1.2rem' }} />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h6 className="partner-name">{userInfo.name || 'Gestor de Frota'}</h6>
            <span className="partner-badge-pill">
              Parceiro Oficial 🛡️
            </span>
          </div>
        </NavLink>

        {/* Nav Menu Categorizado */}
        <div className="partner-nav-scroll">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx} className="mb-2">
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item, iIdx) => (
                <NavLink
                  key={iIdx}
                  to={item.path}
                  end={item.path === '/partner/fleet' || item.path === '/partner/dashboard'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `partner-nav-link ${isActive ? 'active' : ''}`}
                >
                  <div className="partner-nav-icon">
                    <FontAwesomeIcon icon={item.icon} />
                  </div>
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="partner-sidebar-footer">
          {userInfo.isAdmin && (
            <NavLink to="/admin/dashboard" className="btn-sidebar-footer btn-sidebar-admin">
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Voltar ao Admin</span>
            </NavLink>
          )}
          <button onClick={handleLogout} className="btn-sidebar-footer btn-sidebar-logout">
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Content Area Shell */}
      <main className="partner-content-main">
        {/* Header Mobile Topbar */}
        <div className="partner-mobile-topbar d-lg-none">
          <button className="btn-mobile-toggle" onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faBars} />
          </button>
          <div className="text-end">
            <h6 className="m-0 fw-bold" style={{ color: '#ffffff', fontSize: '0.9rem' }}>
              nhiquela<span style={{ color: '#34d399' }}>.parceiro</span>
            </h6>
          </div>
        </div>

        <div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

