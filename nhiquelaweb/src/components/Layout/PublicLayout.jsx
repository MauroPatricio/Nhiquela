import { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faShoppingCart, faBars, faMoon, faCommentAlt, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import { selectTotalItems, addTotalToPay } from '../../store/features/basketSlice';
import api from '../../api';

export default function PublicLayout() {
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);
  const cartCount = useSelector(selectTotalItems);

  useEffect(() => {
    if (userInfo) {
      const fetchCartCount = async () => {
        try {
          // A lógica real dependerá se o carrinho vem da DB ou se gere localmente.
          // No mobile o carrinho começa vazio até puxar (ou é só local storage).
          // Vamos manter a chamada comentada se quisermos sync backend.
        } catch (error) {
          console.error('Erro ao buscar carrinho:', error);
        }
      };
      fetchCartCount();
    }
  }, [userInfo, dispatch]);

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--color-bg-light)' }}>
      {/* Topbar Minimalista */}
      <header className="bg-white border-bottom p-3 sticky-top">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-5">
              <Link to="/shop" className="text-decoration-none">
                <h3 className="m-0 text-black fw-extrabold" style={{ letterSpacing: '-1px' }}>nhiquela<span className="text-primary-custom">.</span></h3>
              </Link>
              
              <nav className="d-none d-lg-flex gap-4">
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small hover-shadow transition-all">Categorias</Link>
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Produtos</Link>
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Serviços</Link>
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Para Empresas</Link>
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Motoristas</Link>
              </nav>
            </div>
            
            <div className="d-flex gap-4 align-items-center">
              <button className="btn btn-link text-dark p-0"><FontAwesomeIcon icon={faMoon} /></button>
              <Link to="/login" className="text-dark fw-bold text-decoration-none small">
                Entrar
              </Link>
              <Link to="/signup" className="btn text-white rounded-pill px-4 py-2 fw-bold small" style={{ backgroundColor: '#1E0F0A' }}>
                Começar
              </Link>
              
              <Link to="/shop/cart" className="position-relative text-dark text-decoration-none">
                <FontAwesomeIcon icon={faShoppingCart} />
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
          <span className="position-absolute translate-middle badge rounded-circle border border-white" style={{ top: '10px', right: '-10px', backgroundColor: '#1E0F0A' }}>
            3
          </span>
        </button>
      </div>

      <footer className="bg-white border-top pt-5 pb-3">
        <div className="container pt-4">
          <div className="row mb-5">
            <div className="col-lg-3 mb-4 mb-lg-0">
              <h3 className="m-0 text-black fw-extrabold mb-3" style={{ letterSpacing: '-1px' }}>nhiquela<span className="text-primary-custom">.</span></h3>
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
              <ul className="list-unstyled small d-flex flex-column gap-3">
                <li><a href="#" className="text-muted text-decoration-none">Supermercado</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Restaurantes</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Farmácia</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Serviços</a></li>
              </ul>
            </div>
            
            <div className="col-6 col-lg-2 mb-4 mb-lg-0">
              <h6 className="fw-bold mb-4">Empresa</h6>
              <ul className="list-unstyled small d-flex flex-column gap-3">
                <li><a href="#" className="text-muted text-decoration-none">Sobre nós</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Carreiras</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Imprensa</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Contactos</a></li>
              </ul>
            </div>
            
            <div className="col-6 col-lg-2">
              <h6 className="fw-bold mb-4">Legal</h6>
              <ul className="list-unstyled small d-flex flex-column gap-3">
                <li><a href="#" className="text-muted text-decoration-none">Privacidade</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Termos de Uso</a></li>
                <li><a href="#" className="text-muted text-decoration-none">Cookies</a></li>
              </ul>
            </div>
            
            <div className="col-12 col-lg-3 mt-4 mt-lg-0">
              <h6 className="fw-bold mb-4">Newsletter</h6>
              <p className="text-muted small mb-3">Promoções exclusivas, semanalmente.</p>
              <div className="position-relative">
                <input type="email" className="form-control rounded-pill bg-light border-0 py-2 ps-3 pe-5" placeholder="O seu email" />
                <button className="btn text-white rounded-pill position-absolute p-0 d-flex justify-content-center align-items-center" style={{ top: '3px', right: '3px', width: '32px', height: '32px', backgroundColor: '#1E0F0A' }}>
                  <FontAwesomeIcon icon={faPaperPlane} className="small" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center border-top pt-4">
            <small className="text-muted mb-2 mb-md-0">&copy; {new Date().getFullYear()} Nhiquela Deliver. Todos os direitos reservados.</small>
            <small className="text-muted">Feito com cuidado em Maputo, Moçambique mz</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
