import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faArrowRight, faEye, faEyeSlash, faMobileAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { setUserLogin, selectUser } from '../store/features/userSlice';
import api from '../api';

export default function LoginScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { search } = useLocation();

  const searchParams = new URLSearchParams(search);
  const urlToRedirect = searchParams.get('redirect');
  const redirect = urlToRedirect || '/shop';

  const userInfo = useSelector(selectUser);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userInfo) {
      if (userInfo.isAdmin) {
        navigate('/admin/dashboard');
      } else if (userInfo.isSeller) {
        navigate('/supplier/dashboard');
      } else {
        navigate(redirect);
      }
    }
  }, [navigate, redirect, userInfo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loginPayload = {
        email: emailOrPhone.includes('@') ? emailOrPhone.trim().toLowerCase() : undefined,
        phoneNumber: !emailOrPhone.includes('@') ? emailOrPhone.replace(/\s+/g, '') : undefined,
        password: password,
      };

      if (!loginPayload.email && !loginPayload.phoneNumber) {
        loginPayload.email = emailOrPhone.trim();
      }

      const { data } = await api.post('/users/signin', loginPayload);
      
      dispatch(setUserLogin(data));
      toast.success(`Bem-vindo de volta, ${data.name}!`);

      if (data.isAdmin) {
        navigate('/admin/dashboard');
      } else if (data.isSeller) {
        navigate('/supplier/dashboard');
      } else {
        navigate(redirect);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error(error.response?.data?.message || 'Erro ao efetuar login. Verifique as suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const signupClientUrl = redirect && redirect !== '/shop' && redirect !== '/' 
    ? `/signup?type=client&redirect=${encodeURIComponent(redirect)}` 
    : `/signup?type=client`;

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow-lg border-0 rounded-5 p-4 p-md-5 w-100" style={{ maxWidth: '480px' }}>
        <div className="card-body">
          <div className="text-center mb-4">
            <h2 className="text-primary-custom fw-bold mb-2">Iniciar Sessão</h2>
            <p className="text-muted">Aceda à sua conta de Cliente ou Fornecedor</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">E-mail ou Número de Telemóvel</label>
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <FontAwesomeIcon icon={emailOrPhone.includes('@') ? faEnvelope : faMobileAlt} className="text-muted" />
                </span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="exemplo@email.com ou 841234567" 
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">Palavra-passe</label>
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <FontAwesomeIcon icon={faLock} className="text-muted" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-control" 
                  placeholder="A sua palavra-passe" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input type="checkbox" className="form-check-input cursor-pointer" id="rememberMe" defaultChecked />
                <label className="form-check-label text-muted small cursor-pointer" htmlFor="rememberMe">Lembrar-me</label>
              </div>
              <a href="#" className="text-decoration-none small text-primary-custom fw-bold">Esqueci a senha</a>
            </div>

            <button 
              type="submit" 
              className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold mb-3 d-flex justify-content-center align-items-center shadow-sm" 
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <>Entrar na Conta <FontAwesomeIcon icon={faArrowRight} className="ms-2" /></>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-muted small m-0">
              Ainda não possui uma conta? <Link to={signupClientUrl} className="text-primary-custom fw-bold text-decoration-none">Registar-se aqui</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
