import { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faMoon, faCommentAlt, faPaperPlane, faStore } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../../store/features/userSlice';
import { selectTotalItems } from '../../store/features/basketSlice';

export default function PublicLayout() {
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);
  const cartCount = useSelector(selectTotalItems);

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--color-bg-light)' }}>
      {/* Topbar Minimalista */}
      <header className="bg-white border-bottom p-3 sticky-top">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-4">
              <Link to="/shop" className="text-decoration-none">
                <h3 className="m-0 text-black fw-extrabold" style={{ letterSpacing: '-1px' }}>nhiquela<span className="text-primary-custom">.</span></h3>
              </Link>
              
              <nav className="d-none d-lg-flex gap-4">
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Categorias</Link>
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Produtos</Link>
                <Link to="/shop" className="text-muted text-decoration-none fw-bold small">Serviços</Link>
                <Link to="/signup?type=seller" className="text-primary-custom text-decoration-none fw-bold small">
                  <FontAwesomeIcon icon={faStore} className="me-1" /> Vender na Nhiquela
                </Link>
              </nav>
            </div>
            
            <div className="d-flex gap-3 align-items-center">
              <Link to="/login" className="text-dark fw-bold text-decoration-none small">
                Entrar
              </Link>

              <Link to="/signup?type=seller" className="btn bg-primary-custom text-white rounded-pill px-4 py-2 fw-bold small shadow-sm">
                Criar Loja Fornecedor
              </Link>
              
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
                <li><Link to="/shop" className="text-muted text-decoration-none">Supermercado</Link></li>
                <li><Link to="/shop" className="text-muted text-decoration-none">Restaurantes</Link></li>
                <li><Link to="/shop" className="text-muted text-decoration-none">Farmácia</Link></li>
                <li><Link to="/shop" className="text-muted text-decoration-none">Serviços</Link></li>
              </ul>
            </div>
            
            <div className="col-6 col-lg-2 mb-4 mb-lg-0">
              <h6 className="fw-bold mb-4">Para Fornecedores</h6>
              <ul className="list-unstyled small d-flex flex-column gap-3">
                <li><Link to="/signup?type=seller" className="text-primary-custom fw-bold text-decoration-none">Criar Loja Fornecedor</Link></li>
                <li><Link to="/signup?type=seller" className="text-muted text-decoration-none">Registar o Seu Negócio</Link></li>
                <li><Link to="/signup?type=seller" className="text-muted text-decoration-none">Vender na Nhiquela</Link></li>
                <li><Link to="/login" className="text-muted text-decoration-none">Portal do Vendedor</Link></li>
              </ul>
            </div>
            
            <div className="col-6 col-lg-2">
              <h6 className="fw-bold mb-4">Legal</h6>
              <ul className="list-unstyled small d-flex flex-column gap-3">
                <li><Link to="/privacy-policy" className="text-muted text-decoration-none">Privacidade</Link></li>
                <li><Link to="/terms" className="text-muted text-decoration-none">Termos de Uso</Link></li>
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
            <small className="text-muted mb-2 mb-md-0">&copy; {new Date().getFullYear()} Nhiquela. Todos os direitos reservados.</small>
            <small className="text-muted">Feito com cuidado em Maputo, Moçambique mz</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
