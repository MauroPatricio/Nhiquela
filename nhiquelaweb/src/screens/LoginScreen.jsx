import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faArrowRight, faArrowLeft, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { setUserLogin } from '../store/features/userSlice';
import api from '../api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Endpoint de login baseado na estrutura do backend do e-commerce
      const { data } = await api.post('/users/signin', { email, password });
      
      // Atualiza Redux e localStorage automaticamente pelo reducer
      dispatch(setUserLogin(data));
      toast.success('Login efetuado com sucesso!');

      // Redirecionamento condicional baseado na role
      if (data.isAdmin) {
        navigate('/admin/dashboard');
      } else if (data.isSeller) {
        navigate('/supplier/dashboard');
      } else {
        navigate('/'); // Redireciona o cliente normal para a Home
      }

    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao efetuar login. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="card shadow-sm-custom border-0 rounded-4 position-relative" style={{ width: '100%', maxWidth: '450px' }}>
        <button 
          onClick={() => navigate('/shop')}
          className="btn text-muted position-absolute border-0 rounded-circle d-flex justify-content-center align-items-center shadow-sm hover-bg-light"
          style={{ top: '20px', left: '20px', width: '40px', height: '40px', backgroundColor: '#f8f9fa', zIndex: 10, transition: 'all 0.2s' }}
          title="Voltar para a Loja"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h2 className="text-primary-custom fw-bold mb-1">Bem-vindo de volta</h2>
            <p className="text-muted">Faça login para continuar na Nhiquela</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-3 position-relative">
              <FontAwesomeIcon icon={faEnvelope} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                className="form-control bg-light border-0 py-3 rounded-3" 
                style={{ paddingLeft: '45px' }} 
                placeholder="Seu e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4 position-relative">
              <FontAwesomeIcon icon={faLock} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="form-control bg-light border-0 py-3 rounded-3" 
                style={{ paddingLeft: '45px', paddingRight: '45px' }} 
                placeholder="Sua senha" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span 
                className="position-absolute text-muted cursor-pointer" 
                style={{ right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </span>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="rememberMe" />
                <label className="form-check-label text-muted small" htmlFor="rememberMe">Lembrar-me</label>
              </div>
              <a href="#" className="text-decoration-none small text-primary-custom fw-bold">Esqueci a senha</a>
            </div>

            <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-3 fw-bold mb-3 d-flex justify-content-center align-items-center" disabled={loading}>
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <>Entrar <FontAwesomeIcon icon={faArrowRight} className="ms-2" /></>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-muted small m-0">
              Não tem uma conta? <Link to="/signup" className="text-primary-custom fw-bold text-decoration-none">Cadastre-se</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
