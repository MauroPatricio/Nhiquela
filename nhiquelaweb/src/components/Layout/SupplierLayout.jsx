import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faBoxOpen, faClipboardList, faChartLine, faSignOutAlt, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, setUserLogout } from '../../store/features/userSlice';

export default function SupplierLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userInfo = useSelector(selectUser) || {};

  const menuItems = [
    { name: 'Dashboard', path: '/supplier/dashboard', icon: faChartLine },
    { name: 'Meus Produtos', path: '/supplier/products', icon: faBoxOpen },
    { name: 'Meus Pedidos', path: '/supplier/orders', icon: faClipboardList },
    { name: 'Perfil da Loja', path: '/supplier/profile', icon: faStore },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = () => {
    dispatch(setUserLogout());
    navigate('/login');
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#F4F6F8' }}>
      
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="position-fixed w-100 h-100 bg-dark opacity-50 d-md-none" 
          style={{ zIndex: 1040 }} 
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar do Fornecedor */}
      <div 
        className={`bg-white shadow-sm d-flex flex-column position-fixed h-100 transition-all ${sidebarOpen ? 'start-0' : 'start-negative'} start-md-0`} 
        style={{ width: '250px', zIndex: 1050 }}
      >
        <div className="p-4 d-flex justify-content-between align-items-center border-bottom">
          <div>
            <h5 className="fw-bold m-0 text-success">Portal do Vendedor</h5>
            <small className="text-muted fw-bold">Nhiquela</small>
          </div>
          <button className="btn btn-sm btn-light d-md-none" onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        {/* Foto e Nome da Loja */}
        <div className="p-4 text-center border-bottom">
          <div className="bg-success text-white rounded-circle d-flex justify-content-center align-items-center mx-auto mb-2" style={{ width: '60px', height: '60px', fontSize: '24px' }}>
            <FontAwesomeIcon icon={faStore} />
          </div>
          <h6 className="fw-bold m-0">{userInfo.seller?.name || userInfo.name || 'Minha Loja'}</h6>
          <small className="text-success fw-bold">Loja Ativa</small>
        </div>

        <nav className="nav flex-column flex-grow-1 p-3 gap-2">
          {menuItems.map((item, idx) => (
            <NavLink 
              key={idx} 
              to={item.path} 
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => 
                `nav-link rounded-3 px-3 py-2 text-dark d-flex align-items-center ${isActive ? 'bg-success text-white fw-bold shadow-sm' : 'hover-bg-light'}`
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
          <button onClick={handleLogout} className="btn btn-outline-danger w-100 text-start">
            <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Sair
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 ms-0 ms-md-250 w-100 d-flex flex-column">
        {/* Header Mobile */}
        <div className="d-md-none bg-white p-3 shadow-sm d-flex justify-content-between align-items-center sticky-top">
          <div className="d-flex align-items-center">
            <button className="btn btn-light me-3 text-success" onClick={toggleSidebar}>
              <FontAwesomeIcon icon={faBars} />
            </button>
            <h6 className="m-0 fw-bold text-success">Portal do Vendedor</h6>
          </div>
        </div>

        <div className="p-3 p-md-4 p-lg-5">
          <Outlet />
        </div>
      </div>
      
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
