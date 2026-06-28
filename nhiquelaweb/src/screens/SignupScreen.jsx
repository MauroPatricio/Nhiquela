import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileAlt, faUser, faEnvelope, faLock, faStore, faMapMarkerAlt, faCamera, faArrowRight, faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUserLogin, selectUser } from '../store/features/userSlice';
import { toast } from 'react-toastify';
import { getError } from '../utils.js';

export default function SignupScreen() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const urlToRedirect = new URLSearchParams(search).get('redirect');
  const redirect = urlToRedirect || '/';

  const reduxDispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);

  // Common Fields
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [checkedTerms, setCheckedTerms] = useState(false);

  // Seller Fields
  const [sellerName, setSellerName] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerLogo, setSellerLogo] = useState('');

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const bodyFormData = new FormData();
    bodyFormData.append('file', file);

    try {
      setLoadingUpload(true);
      const { data } = await api.post('/upload', bodyFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSellerLogo(data.secure_url);
      toast.success('Logótipo carregado com sucesso!');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoadingUpload(false);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (!checkedTerms) {
      toast.warning('É necessário aceitar os termos e condições');
      return;
    }
    try {
      setLoadingUser(true);
      const { data } = await api.post('/users/signup', {
        name, phoneNumber, email, password, isSeller, sellerName,
        sellerDescription, sellerLogo, sellerAddress
      });
      reduxDispatch(setUserLogin(data));
      navigate(redirect);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    if (userInfo) navigate(redirect);
  }, [navigate, redirect, userInfo]);

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Helmet><title>Criar Conta - Nhiquela</title></Helmet>
      
      <div className="card shadow-sm-custom border-0 rounded-4 position-relative" style={{ width: '100%', maxWidth: '600px' }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn text-muted position-absolute border-0 rounded-circle d-flex justify-content-center align-items-center shadow-sm hover-bg-light"
          style={{ top: '20px', left: '20px', width: '40px', height: '40px', backgroundColor: '#f8f9fa', zIndex: 10, transition: 'all 0.2s' }}
          title="Voltar"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="card-body p-4 p-md-5 pt-5">
          <div className="text-center mb-4">
            <h2 className="text-primary-custom fw-bold mb-1">Junte-se a nós</h2>
            <p className="text-muted">Crie a sua conta e aceda ao universo Nhiquela</p>
          </div>

          <form onSubmit={submitHandler}>
            {/* Informação Pessoal */}
            <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Informação Pessoal</h6>
            
            <div className="row g-3 mb-3">
              <div className="col-md-6 position-relative">
                <FontAwesomeIcon icon={faUser} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  className="form-control bg-light border-0 py-3 rounded-3" 
                  style={{ paddingLeft: '45px' }} 
                  placeholder="Seu nome completo" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6 position-relative">
                <FontAwesomeIcon icon={faMobileAlt} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  className="form-control bg-light border-0 py-3 rounded-3" 
                  style={{ paddingLeft: '45px' }} 
                  placeholder="Telefone (ex: 84...)" 
                  maxLength={9}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-3 position-relative">
              <FontAwesomeIcon icon={faEnvelope} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                className="form-control bg-light border-0 py-3 rounded-3" 
                style={{ paddingLeft: '45px' }} 
                placeholder="Seu endereço de e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6 position-relative">
                <FontAwesomeIcon icon={faLock} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-control bg-light border-0 py-3 rounded-3" 
                  style={{ paddingLeft: '45px', paddingRight: '45px' }} 
                  placeholder="Sua senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="btn border-0 position-absolute" 
                  style={{ right: '5px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>

              <div className="col-md-6 position-relative">
                <FontAwesomeIcon icon={faLock} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="form-control bg-light border-0 py-3 rounded-3" 
                  style={{ paddingLeft: '45px', paddingRight: '45px' }} 
                  placeholder="Confirme a senha" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="btn border-0 position-absolute" 
                  style={{ right: '5px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* Toggle para Vendedor */}
            <div className="bg-cream rounded-3 p-3 mb-4 border">
              <div className="form-check form-switch d-flex align-items-center gap-2 m-0 p-0">
                <div className="flex-grow-1">
                  <h6 className="fw-bold m-0 text-dark">Quero ser um Parceiro / Fornecedor</h6>
                  <small className="text-muted">Ative esta opção se pretende vender produtos ou serviços.</small>
                </div>
                <input 
                  className="form-check-input fs-4 m-0 cursor-pointer" 
                  type="checkbox" 
                  role="switch"
                  checked={isSeller} 
                  onChange={(e) => setIsSeller(e.target.checked)} 
                />
              </div>
            </div>

            {/* Seção Vendedor Expansível */}
            {isSeller && (
              <div className="bg-light rounded-4 p-4 mb-4 border animation-fade-in">
                <h6 className="fw-bold text-success mb-3 border-bottom pb-2">Informação da Loja</h6>
                
                <div className="mb-3 position-relative">
                  <FontAwesomeIcon icon={faStore} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="form-control bg-white border py-3 rounded-3 shadow-sm" 
                    style={{ paddingLeft: '45px' }} 
                    placeholder="Nome do Estabelecimento" 
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    required={isSeller}
                  />
                </div>

                <div className="mb-3 position-relative">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="form-control bg-white border py-3 rounded-3 shadow-sm" 
                    style={{ paddingLeft: '45px' }} 
                    placeholder="Morada da Loja" 
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    required={isSeller}
                  />
                </div>

                <div className="mb-3">
                  <textarea 
                    className="form-control bg-white border rounded-3 shadow-sm p-3" 
                    rows="2" 
                    placeholder="Breve descrição dos seus produtos ou serviços"
                    value={sellerDescription}
                    onChange={(e) => setSellerDescription(e.target.value)}
                  ></textarea>
                </div>

                <div className="position-relative">
                  <label className="form-label small fw-bold text-muted mb-3"><FontAwesomeIcon icon={faCamera} className="me-1" /> Logótipo da Loja</label>
                  <div 
                    className="border rounded-4 d-flex flex-column justify-content-center align-items-center position-relative overflow-hidden bg-light mx-auto transition-all"
                    style={{ 
                      width: '140px', 
                      height: '140px', 
                      borderWidth: '2px !important', 
                      borderStyle: 'dashed', 
                      borderColor: '#ced4da',
                      cursor: 'pointer' 
                    }}
                    onClick={() => document.getElementById('logoUpload').click()}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ea4e1b'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                  >
                    {sellerLogo ? (
                      <img src={sellerLogo} alt="Logo da loja" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCamera} size="2x" className="text-muted mb-2" />
                        <span className="small text-muted fw-bold text-center" style={{ fontSize: '12px' }}>Carregar<br/>Logótipo</span>
                      </>
                    )}
                    <input 
                      id="logoUpload"
                      type="file" 
                      className="d-none" 
                      accept="image/*" 
                      onChange={uploadFileHandler} 
                    />
                  </div>
                  {loadingUpload && <div className="text-success small mt-2 text-center fw-bold"><span className="spinner-border spinner-border-sm me-1"></span>A carregar imagem...</div>}
                </div>
              </div>
            )}

            <div className="form-check mb-4">
              <input 
                type="checkbox" 
                className="form-check-input cursor-pointer" 
                id="terms" 
                checked={checkedTerms} 
                onChange={(e) => setCheckedTerms(e.target.checked)} 
              />
              <label className="form-check-label text-muted small cursor-pointer" htmlFor="terms">
                Declaro que li e concordo com os <a href="#" className="text-primary-custom fw-bold">Termos e Condições</a> da plataforma.
              </label>
            </div>

            <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold mb-3 d-flex justify-content-center align-items-center shadow-sm" disabled={loadingUser || loadingUpload}>
              {loadingUser ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <>Criar Conta <FontAwesomeIcon icon={faArrowRight} className="ms-2" /></>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-muted small m-0">
              Já possui uma conta? <Link to="/login" className="text-primary-custom fw-bold text-decoration-none">Inicie sessão</Link>
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        .animation-fade-in {
          animation: fadeIn 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
