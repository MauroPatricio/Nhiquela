import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope, faLock, faArrowRight, faEye, faEyeSlash, faMobileAlt,
  faShieldAlt, faTruck, faStore, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
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
      if (userInfo.isAdmin || userInfo.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (userInfo.role === 'PARTNER' || userInfo.isPartner) {
        navigate('/partner/dashboard');
      } else if (userInfo.isSeller || userInfo.role === 'SELLER') {
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

      if (data.isAdmin || data.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (data.role === 'PARTNER' || data.isPartner) {
        navigate('/partner/dashboard');
      } else if (data.isSeller || data.role === 'SELLER') {
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0F172A',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(138, 43, 226, 0.18) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.14) 0px, transparent 50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* CARD PRINCIPAL COM SPLIT LAYOUT PROFISSIONAL */}
      <div
        style={{
          width: '100%',
          maxWidth: '1000px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 40px rgba(138, 43, 226, 0.15)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
        }}
      >
        {/* LADO ESQUERDO: PAINEL DE HERO / MARCA */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #311042 50%, #0F172A 100%)',
            padding: '48px 40px',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Círculo decorativo de fundo */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(138, 43, 226, 0.35) 0%, rgba(0, 0, 0, 0) 70%)',
              pointerEvents: 'none'
            }}
          />

          <div>
            {/* Logo e Nome da Marca */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
              <img
                src="/nhiquela-icon.png"
                alt="Nhiquela"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  objectFit: 'contain',
                  backgroundColor: '#FFFFFF',
                  padding: '6px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', color: '#FFFFFF' }}>
                  nhiquela
                </h3>
                <span style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: '700', letterSpacing: '0.8px' }}>
                  LOGÍSTICA & PLATAFORMA ONLINE
                </span>
              </div>
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.3', marginBottom: '16px', color: '#F8FAFC' }}>
              A sua plataforma integrada em Moçambique.
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.6', marginBottom: '32px' }}>
              Gerencie os seus pedidos, acompanhe a frota em tempo real e expanda os seus negócios num único lugar.
            </p>

            {/* Destaques de Funcionalidades */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#E2E8F0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(138, 43, 226, 0.25)', color: '#C084FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  <FontAwesomeIcon icon={faTruck} />
                </div>
                <span style={{ fontWeight: '500' }}>Gestão de Frota e Entregas</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#E2E8F0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.25)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  <FontAwesomeIcon icon={faStore} />
                </div>
                <span style={{ fontWeight: '500' }}>Portal de Fornecedores</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#E2E8F0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.25)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  <FontAwesomeIcon icon={faShieldAlt} />
                </div>
                <span style={{ fontWeight: '500' }}>Segurança Garantida</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94A3B8' }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#34D399' }} />
            <span>© 2026 Nhiquela. Todos os direitos reservados.</span>
          </div>
        </div>

        {/* LADO DIREITO: FORMULÁRIO DE LOGIN */}
        <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Iniciar Sessão
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
              Aceda à sua conta de Cliente, Parceiro ou Fornecedor
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Campo E-mail / Telemóvel */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                E-mail ou Número de Telemóvel
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '0 14px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <FontAwesomeIcon
                  icon={emailOrPhone.includes('@') ? faEnvelope : faMobileAlt}
                  style={{ color: '#94A3B8', fontSize: '15px', marginRight: '12px' }}
                />
                <input
                  type="text"
                  placeholder="exemplo@email.com ou 841234567"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    fontWeight: '500'
                  }}
                />
              </div>
            </div>

            {/* Campo Palavra-passe */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', margin: 0 }}>
                  Palavra-passe
                </label>
                <a href="#" style={{ fontSize: '12px', fontWeight: '700', color: '#8A2BE2', textDecoration: 'none' }}>
                  Esqueci a senha
                </a>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '0 14px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <FontAwesomeIcon icon={faLock} style={{ color: '#94A3B8', fontSize: '15px', marginRight: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="A sua palavra-passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    fontWeight: '500'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* Checkbox Lembrar-me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                defaultChecked
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  accentColor: '#8A2BE2',
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '13px', color: '#64748B', cursor: 'pointer', fontWeight: '500' }}>
                Lembrar-me neste dispositivo
              </label>
            </div>

            {/* Botão de Entrar na Conta */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #8A2BE2 0%, #6D28D9 100%)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '800',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(138, 43, 226, 0.4)',
                transition: 'all 0.2s ease',
                marginTop: '8px'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  A autenticar...
                </>
              ) : (
                <>
                  Entrar na Conta <FontAwesomeIcon icon={faArrowRight} />
                </>
              )}
            </button>
          </form>

          {/* Link para Registro */}
          <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
              Ainda não possui uma conta?{' '}
              <Link to={signupClientUrl} style={{ color: '#8A2BE2', fontWeight: '800', textDecoration: 'none' }}>
                Registar-se aqui
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
