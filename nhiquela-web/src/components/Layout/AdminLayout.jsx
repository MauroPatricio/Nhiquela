import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faUsers, faBoxOpen, faTags, faTools, faCar, faExclamationTriangle, faMoneyBillWave, faArrowLeft, faCrown, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: faChartLine },
    { name: 'Fornecedores', path: '/admin/suppliers', icon: faUsers },
    { name: 'Produtos', path: '/admin/products', icon: faBoxOpen },
    { name: 'Categorias', path: '/admin/categories', icon: faTags },
    { name: 'Serviços', path: '/admin/services', icon: faTools },
    { name: 'Motoristas', path: '/admin/drivers', icon: faCar },
    { name: 'Incidentes', path: '/admin/incidents', icon: faExclamationTriangle },
    { name: 'Subscrições', path: '/admin/subscriptions', icon: faCrown },
    { name: 'Financeiro', path: '/admin/finance', icon: faMoneyBillWave },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      
      {/* Overlay escuro no mobile quando sidebar está aberta */}
      {sidebarOpen && (
        <div 
          className="position-fixed w-100 h-100 bg-dark opacity-50 d-md-none" 
          style={{ zIndex: 1040 }} 
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar Responsiva */}
      <div 
        className={`bg-white shadow-sm d-flex flex-column position-fixed h-100 transition-all ${sidebarOpen ? 'start-0' : 'start-negative'} start-md-0`} 
        style={{ width: '250px', zIndex: 1050 }}
      >
        <div className="p-4 d-flex justify-content-between align-items-center">
          <h4 className="fw-bold m-0 text-primary-custom">Nhiquela</h4>
          {/* Botão fechar no mobile */}
          <button className="btn btn-sm btn-light d-md-none" onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="px-4 mb-3">
          <span className="text-muted small fw-bold text-uppercase">Painel Admin</span>
        </div>
        <nav className="nav flex-column flex-grow-1 px-2 gap-1" style={{ overflowY: 'auto' }}>
          {menuItems.map((item, idx) => (
            <NavLink 
              key={idx} 
              to={item.path} 
              onClick={() => setSidebarOpen(false)} // Fecha no click em telas pequenas
              className={({ isActive }) => 
                `nav-link rounded-3 px-3 py-2 text-dark d-flex align-items-center ${isActive ? 'bg-primary-custom text-white fw-bold shadow-sm' : 'hover-bg-light'}`
              }
            >
              <div style={{ width: '25px' }} className="text-center me-2">
                <FontAwesomeIcon icon={item.icon} />
              </div>
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 mt-auto">
          <NavLink to="/" className="btn btn-light w-100 text-start text-dark shadow-sm border-0">
            <FontAwesomeIcon icon={faArrowLeft} className="me-2 text-muted" /> Voltar ao Site
          </NavLink>
        </div>
      </div>

      {/* Main Content Area ajustada */}
      <div className="flex-grow-1 ms-0 ms-md-250 w-100 d-flex flex-column">
        {/* Header Mobile para abrir sidebar */}
        <div className="d-md-none bg-white p-3 shadow-sm d-flex justify-content-between align-items-center sticky-top">
          <div className="d-flex align-items-center">
            <button className="btn btn-light me-3" onClick={toggleSidebar}>
              <FontAwesomeIcon icon={faBars} />
            </button>
            <h5 className="m-0 fw-bold text-primary-custom">Nhiquela Admin</h5>
          </div>
        </div>

        <div className="p-3 p-md-4 p-lg-5">
          <Outlet />
        </div>
      </div>
      
      {/* Classe CSS extra injetada via estilo inline para garantir transições */}
      <style>{`
        .start-negative { left: -250px; }
        .transition-all { transition: all 0.3s ease-in-out; }
        @media (min-width: 768px) {
          .start-md-0 { left: 0 !important; }
          .ms-md-250 { margin-left: 250px !important; }
        }
      `}</style>
    </div>
  );
}
