import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faUsers, faMotorcycle, faFileDownload, faSignOutAlt, faBars, faTimes, faShieldAlt, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
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

  // Permitir acesso a utilizadores com role PARTNER, isPartner, ou ADMIN
  const isPartnerUser = userInfo.role === 'PARTNER' || userInfo.isPartner || userInfo.isAdmin;
  if (!isPartnerUser) {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { name: 'Dashboard (KPIs)', path: '/partner/dashboard', icon: faChartLine },
    { name: 'Minha Frota', path: '/partner/members', icon: faUsers },
    { name: 'Exportar Relatórios', path: '/partner/reports', icon: faFileDownload },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = () => {
    dispatch(setUserLogout());
    navigate('/login');
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#F4F6F9' }}>
      
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="position-fixed w-100 h-100 bg-dark opacity-50 d-md-none" 
          style={{ zIndex: 1040 }} 
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar do Parceiro */}
      <div 
        className={`bg-white shadow-sm d-flex flex-column position-fixed h-100 transition-all ${sidebarOpen ? 'start-0' : 'start-negative'} start-md-0`} 
        style={{ width: '260px', zIndex: 1050 }}
      >
        <div className="p-4 d-flex justify-content-between align-items-center border-bottom">
          <div>
            <h5 className="fw-bold m-0" style={{ color: '#8a2be2' }}>
              nhiquela<span className="text-dark">.parceiro</span>
            </h5>
            <small className="text-muted fw-bold">Gestão de Frota & KPIs</small>
          </div>
          <button className="btn btn-sm btn-light d-md-none" onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        {/* Foto e Perfil do Parceiro */}
        <div className="p-4 text-center border-bottom" style={{ background: 'linear-gradient(135deg, rgba(138,43,226,0.05) 0%, rgba(138,43,226,0.12) 100%)' }}>
          <div className="text-white rounded-circle d-flex justify-content-center align-items-center mx-auto mb-2 shadow-sm" 
               style={{ width: '60px', height: '60px', fontSize: '24px', backgroundColor: '#8a2be2' }}>
            <FontAwesomeIcon icon={faShieldAlt} />
          </div>
          <h6 className="fw-bold m-0 text-dark text-truncate">{userInfo.name || 'Gestor de Frota'}</h6>
          <small className="badge mt-1" style={{ backgroundColor: '#8a2be2', color: '#fff' }}>Parceiro Oficial</small>
        </div>

        <nav className="nav flex-column flex-grow-1 p-3 gap-2">
          {menuItems.map((item, idx) => (
            <NavLink 
              key={idx} 
              to={item.path} 
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => 
                `nav-link rounded-3 px-3 py-2 text-dark d-flex align-items-center ${isActive ? 'text-white fw-bold shadow-sm' : 'hover-bg-light'}`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#8a2be2' : 'transparent',
                color: isActive ? '#fff' : '#333'
              })}
            >
              <div style={{ width: '25px' }} className="text-center me-2">
                <FontAwesomeIcon icon={item.icon} />
              </div>
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-3 mt-auto border-top">
          {userInfo.isAdmin && (
            <NavLink to="/admin/dashboard" className="btn btn-light w-100 text-start mb-2 text-muted">
              <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Voltar ao Admin
            </NavLink>
          )}
          <button onClick={handleLogout} className="btn btn-outline-danger w-100 text-start">
            <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Terminar Sessão
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 ms-0 ms-md-250 w-100 d-flex flex-column" style={{ minWidth: 0 }}>
        {/* Header Mobile */}
        <div className="d-md-none bg-white p-3 shadow-sm d-flex justify-content-between align-items-center sticky-top">
          <div className="d-flex align-items-center">
            <button className="btn btn-light me-3" style={{ color: '#8a2be2' }} onClick={toggleSidebar}>
              <FontAwesomeIcon icon={faBars} />
            </button>
            <h6 className="m-0 fw-bold" style={{ color: '#8a2be2' }}>Painel do Parceiro</h6>
          </div>
        </div>

        <div className="p-3 p-md-4 p-lg-5">
          <Outlet />
        </div>
      </div>
      
      <style>{`
        .start-negative { left: -260px; }
        .transition-all { transition: all 0.3s ease-in-out; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
        @media (min-width: 768px) {
          .start-md-0 { left: 0 !important; }
          .ms-md-250 { margin-left: 260px !important; }
        }
      `}</style>
    </div>
  );
}
