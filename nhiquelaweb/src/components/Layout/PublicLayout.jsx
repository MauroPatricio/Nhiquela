import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShoppingCart, faMoon, faCommentAlt, faPaperPlane, faStore,
  faUserCircle, faUser, faShieldAlt, faHandshake, faSignOutAlt 
} from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUserLogout } from '../../store/features/userSlice';
import { selectTotalItems } from '../../store/features/basketSlice';
import { toast } from 'react-toastify';

export default function PublicLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userInfo = useSelector(selectUser);
  const cartCount = useSelector(selectTotalItems);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowDropdown(false);
    dispatch(setUserLogout());
    toast.info('Sessão encerrada com sucesso.');
    navigate('/');
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--color-bg-light)' }}>
      {/* Topbar Minimalista */}
      <header className="bg-white border-bottom p-3 sticky-top" style={{ zIndex: 1040 }}>
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-4">
              <Link to="/shop" className="text-decoration-none">
                <h3 className="m-0 text-black fw-extrabold" style={{ letterSpacing: '-1px' }}>nhiquela<span className="text-primary-custom">.</span></h3>
              </Link>
              
              <nav className="d-none d-lg-flex gap-4">
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Categorias</Link>
                <Link to="/products" className="text-muted text-decoration-none fw-bold small">Produtos</Link>
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Serviços</Link>
                <Link to="/signup?type=seller" className="text-primary-custom text-decoration-none fw-bold small">
                  <FontAwesomeIcon icon={faStore} className="me-1" /> Vender na Nhiquela
                </Link>
              </nav>
            </div>
            
            <div className="d-flex gap-3 align-items-center">
              {userInfo ? (
                <div className="dropdown position-relative" ref={dropdownRef}>
                  <button 
                    className="btn btn-outline-dark rounded-pill dropdown-toggle fw-bold small px-3 d-flex align-items-center gap-2 shadow-sm"
                    type="button" 
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-expanded={showDropdown}
                  >
                    <FontAwesomeIcon icon={faUserCircle} className="text-primary-custom fs-5" />
                    <span>{userInfo.name || userInfo.email?.split('@')[0] || 'Minha Conta'}</span>
                  </button>

                  <ul 
                    className={`dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 mt-2 py-2 ${showDropdown ? 'show' : ''}`} 
                    style={{ 
                      minWidth: '230px', 
                      position: 'absolute', 
                      right: 0, 
                      top: '100%', 
                      zIndex: 1050,
                      display: showDropdown ? 'block' : 'none'
                    }}
                  >
                    <li className="px-3 py-2 border-bottom bg-light rounded-top">
                      <div className="fw-bold text-dark small text-truncate">{userInfo.name || 'Utilizador'}</div>
                      <small className="text-muted text-truncate d-block" style={{ fontSize: '11px' }}>{userInfo.email}</small>
                    </li>
                    <li>
                      <Link className="dropdown-item py-2 small fw-bold text-dark" to="/shop/account" onClick={() => setShowDropdown(false)}>
                        <FontAwesomeIcon icon={faUser} className="me-2 text-primary-custom" /> Minha Conta / Pedidos
                      </Link>
                    </li>
                    {(userInfo.isAdmin || userInfo.role === 'ADMIN') && (
                      <li>
                        <Link className="dropdown-item py-2 small fw-bold text-dark" to="/admin/dashboard" onClick={() => setShowDropdown(false)}>
                          <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-primary-custom" /> Painel Admin
                        </Link>
                      </li>
                    )}
                    {(userInfo.isSeller || userInfo.role === 'SELLER') && (
                      <li>
                        <Link className="dropdown-item py-2 small fw-bold text-dark" to="/supplier/dashboard" onClick={() => setShowDropdown(false)}>
                          <FontAwesomeIcon icon={faStore} className="me-2 text-success" /> Painel da Loja
                        </Link>
                      </li>
                    )}
                    {userInfo.partnerId && (
                      <li>
                        <Link className="dropdown-item py-2 small fw-bold text-dark" to="/partner/dashboard" onClick={() => setShowDropdown(false)}>
                          <FontAwesomeIcon icon={faHandshake} className="me-2 text-info" /> Painel Parceiro
                        </Link>
                      </li>
                    )}
                    <li><hr className="dropdown-divider my-1" /></li>
                    <li>
                      <button className="dropdown-item py-2 small text-danger fw-bold d-flex align-items-center" onClick={handleLogout}>
                        <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Terminar Sessão (Sair)
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-dark fw-bold text-decoration-none small">
                    Entrar
                  </Link>

                  <Link to="/signup?type=seller" className="btn bg-primary-custom text-white rounded-pill px-4 py-2 fw-bold small shadow-sm">
                    Criar Loja Fornecedor
                  </Link>
                </>
              )}
              
              <Link to="/shop/cart" className="position-relative text-dark text-decoration-none ms-2">
                <FontAwesomeIcon icon={faShoppingCart} size="lg" />
                {cartCount > 0 && (
                  <span className="position-absolute translate-middle badge rounded-pill bg-primary-custom" style={{ top: '-5px', right: '-15px', fontSize: '10px' }}>
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow-1">
        <Outlet />
      </main>
      
      {/* Botão Flutuante */}
      <div className="position-fixed" style={{ bottom: '30px', right: '30px', zIndex: 1000 }}>
        <button className="btn bg-primary-custom text-white rounded-circle shadow-lg d-flex justify-content-center align-items-center position-relative" style={{ width: '60px', height: '60px' }}>
          <FontAwesomeIcon icon={faCommentAlt} size="lg" />
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style={{ fontSize: '10px' }}>
            1
          </span>
        </button>
      </div>

      {/* Footer Global Institucional */}
      <footer className="bg-white border-top mt-auto py-5">
        <div className="container pt-4">
          <div className="row mb-5">
            <div className="col-lg-3 mb-4 mb-lg-0">
              <Link to="/shop" className="text-decoration-none">
                <h3 className="m-0 text-black fw-extrabold mb-3" style={{ letterSpacing: '-1px' }}>nhiquela<span className="text-primary-custom">.</span></h3>
              </Link>
              <p className="text-muted small pe-4 mb-4">
                A plataforma líder de produtos, serviços e entregas em Moçambique.
              </p>
              <div className="d-flex gap-3">
                <a href="#" className="bg-light text-dark rounded-circle d-flex justify-content-center align-items-center" style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faFacebookF} /></a>
                <a href="#" className="bg-light text-dark rounded-circle d-flex justify-content-center align-items-center" style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faInstagram} /></a>
                <a href="#" className="bg-light text-dark rounded-circle d-flex justify-content-center align-items-center" style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTwitter} /></a>
              </div>
            </div>
            
            <div className="col-6 col-lg-2 mb-4 mb-lg-0">
              <h6 className="fw-bold mb-4">Categorias</h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li><a href="#" className="text-muted text-decoration-none">Supermercado</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Restaurantes</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Tecnologia</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Farmácias</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Moda & Beleza</a></li>
              </ul>
            </div>
            
            <div className="col-6 col-lg-2 mb-4 mb-lg-0">
              <h6 className="fw-bold mb-4">Empresa</h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li><a href="#" className="text-muted text-decoration-none">Sobre Nós</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Carreiras</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Imprensa</a></li>
                <li><Link to="/signup?type=seller" className="text-muted text-decoration-none">Vender na Nhiquela</Link></li>
                <li><a href="#" className="text-muted text-decoration-none">Termos de Uso</a></li>
              </ul>
            </div>
            
            <div className="col-lg-5">
              <h6 className="fw-bold mb-4">Fique por dentro das novidades</h6>
              <p className="text-muted small mb-3">Receba as melhores ofertas e novidades diretamente no seu e-mail.</p>
              <div className="input-group mb-3 shadow-sm rounded-pill overflow-hidden bg-light p-1 border">
                <input type="email" className="form-control border-0 bg-transparent px-3 small" placeholder="Seu e-mail principal" />
                <button className="btn bg-primary-custom text-white rounded-pill px-4 fw-bold small" type="button">
                  Subscrever <FontAwesomeIcon icon={faPaperPlane} className="ms-1" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-top pt-4 d-flex flex-column flex-md-row justify-content-between align-items-center">
            <small className="text-muted mb-2 mb-md-0">Todos os direitos são reservados a Nhiquela Serviços e Consultoria 2026</small>
            <div className="d-flex gap-4">
              <a href="#" className="text-muted text-decoration-none small">Privacidade</a>
              <a href="#" className="text-muted text-decoration-none small">Termos</a>
              <a href="#" className="text-muted text-decoration-none small">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
