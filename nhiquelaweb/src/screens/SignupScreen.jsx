import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMobileAlt, faUser, faEnvelope, faLock, faStore, faMapMarkerAlt, 
  faCamera, faArrowRight, faEye, faEyeSlash, faArrowLeft, 
  faCrosshairs, faBriefcase, faUserCheck
} from '@fortawesome/free-solid-svg-icons';
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
  const searchParams = new URLSearchParams(search);
  const urlToRedirect = searchParams.get('redirect');
  const redirect = urlToRedirect || '/';
  
  // Suporte a parâmetro de URL ?type=seller ou ?role=seller
  const initialRoleIsSeller = searchParams.get('type') === 'seller' || searchParams.get('role') === 'seller' || searchParams.get('seller') === 'true';

  const reduxDispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  const [step, setStep] = useState(1);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);

  // Fonte de dados para selects do Fornecedor
  const [provinces, setProvinces] = useState([]);
  const [tiposEstabelecimentos, setTiposEstabelecimentos] = useState([]);

  // Campos Comuns de Utilizador
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSeller, setIsSeller] = useState(initialRoleIsSeller);
  const [checkedTerms, setCheckedTerms] = useState(false);
  const [profileImage, setProfileImage] = useState('');

  // Campos Exclusivos de Fornecedor (seller object)
  const [sellerName, setSellerName] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerLogo, setSellerLogo] = useState('');
  const [sellerProvince, setSellerProvince] = useState('');
  const [sellerTipoEstabelecimento, setSellerTipoEstabelecimento] = useState('');
  const [sellerMpesa, setSellerMpesa] = useState('');
  const [sellerEmola, setSellerEmola] = useState('');
  const [sellerBank, setSellerBank] = useState('');
  const [sellerLatitude, setSellerLatitude] = useState(null);
  const [sellerLongitude, setSellerLongitude] = useState(null);

  // Carregar Províncias e Tipos de Estabelecimento do Backend
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const { data } = await api.get('/provinces');
        setProvinces(data?.provinces || []);
      } catch (err) {
        console.warn('Erro ao carregar províncias:', err);
        setProvinces([
          'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala',
          'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa'
        ]);
      }
    };

    const fetchTipos = async () => {
      try {
        const { data } = await api.get('/provider-subcategories');
        const businessTypes = (data || []).filter(
          (tipo) => tipo.isActive === true && (tipo.providerTypeId?.classificationId?.name === 'BUSINESS' || !tipo.providerTypeId)
        );
        setTiposEstabelecimentos(businessTypes.length > 0 ? businessTypes : data || []);
      } catch (err) {
        console.warn('Erro ao carregar tipos de estabelecimento:', err);
      }
    };

    fetchProvinces();
    fetchTipos();
  }, []);

  // Obter Localização GPS no Navegador
  const getGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSellerLatitude(pos.coords.latitude);
        setSellerLongitude(pos.coords.longitude);
        toast.success('Localização GPS capturada com sucesso!');
        setLoadingGps(false);
      },
      (err) => {
        console.error('Erro no GPS:', err);
        toast.error('Não foi possível obter a localização. Permita o acesso ao GPS.');
        setLoadingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Upload de Imagem (Logo ou Foto de Perfil)
  const uploadFileHandler = async (e, targetField) => {
    const file = e.target.files[0];
    if (!file) return;

    const bodyFormData = new FormData();
    bodyFormData.append('file', file);

    try {
      setLoadingUpload(true);
      const { data } = await api.post('/upload', bodyFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = typeof data === 'string' ? data : (data.secure_url || data.url || data.path);
      if (targetField === 'sellerLogo') {
        setSellerLogo(url);
        toast.success('Logótipo carregado com sucesso!');
      } else {
        setProfileImage(url);
        toast.success('Foto de perfil carregada com sucesso!');
      }
    } catch (err) {
      console.warn('Upload de imagem via API falhou, a utilizar leitor local de ficheiros:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const localUrl = reader.result;
        if (targetField === 'sellerLogo') {
          setSellerLogo(localUrl);
          toast.success('Logótipo carregado com sucesso!');
        } else {
          setProfileImage(localUrl);
          toast.success('Foto de perfil carregada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setLoadingUpload(false);
    }
  };

  // Validação do Passo 1 (Dados Pessoais)
  const validateStep1 = () => {
    if (!name.trim()) {
      toast.error('Por favor, preencha o seu nome.');
      return false;
    }
    if (name.includes('@') || /\d/.test(name)) {
      toast.error('O nome não pode conter números nem arroba (@).');
      return false;
    }
    if (!phoneNumber.trim() || !/^8[2-7][0-9]{7}$/.test(phoneNumber.replace(/\s+/g, ''))) {
      toast.error('Número de telefone inválido. Deve começar por 8x (Ex: 841234567).');
      return false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Por favor, indique um e-mail válido.');
      return false;
    }
    if (!password || password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return false;
    }
    return true;
  };

  // Submissão Final do Cadastro
  const submitHandler = async (e) => {
    e.preventDefault();

    if (!validateStep1()) return;

    if (!checkedTerms) {
      toast.warning('É necessário aceitar os Termos e Condições para prosseguir.');
      return;
    }

    if (isSeller) {
      if (!sellerName.trim()) {
        toast.error('O nome do estabelecimento é obrigatório.');
        return;
      }
      if (!sellerDescription.trim()) {
        toast.error('A descrição do estabelecimento é obrigatória.');
        return;
      }
      if (!sellerProvince) {
        toast.error('Por favor, selecione a província do estabelecimento.');
        return;
      }
      if (!sellerAddress.trim()) {
        toast.error('O endereço do estabelecimento é obrigatório.');
        return;
      }
      if (!sellerTipoEstabelecimento) {
        toast.error('Por favor, selecione o tipo de estabelecimento.');
        return;
      }
      if (!sellerMpesa && !sellerEmola && !sellerBank) {
        toast.error('Preencha pelo menos uma conta de recebimento (M-Pesa, e-Mola ou Banco).');
        return;
      }
    }

    try {
      setLoadingUser(true);
      const cleanPhone = phoneNumber.replace(/\s+/g, '');

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: cleanPhone,
        password: password,
        isSeller: isSeller,
        registeredFrom: 'nhiquelaweb',
        profileImage: profileImage || undefined,
      };

      if (isSeller) {
        payload.seller = {
          name: sellerName.trim(),
          logo: sellerLogo || '',
          description: sellerDescription.trim(),
          address: sellerAddress.trim(),
          province: sellerProvince,
          tipoEstabelecimento: sellerTipoEstabelecimento,
          phoneNumberAccount: sellerMpesa.replace(/\s+/g, ''),
          alternativePhoneNumberAccount: sellerEmola.replace(/\s+/g, ''),
          bankAccount: sellerBank.trim(),
          latitude: sellerLatitude || -25.9692,
          longitude: sellerLongitude || 32.5732,
        };
      }

      const { data } = await api.post('/users/signup', payload);

      reduxDispatch(setUserLogin(data));
      toast.success(isSeller ? 'Registo de Fornecedor criado com sucesso!' : 'Registo de Cliente efetuado com sucesso!');
      
      if (data.isSeller) {
        navigate('/supplier/dashboard');
      } else {
        navigate(redirect);
      }
    } catch (err) {
      console.error('Erro no cadastro:', err);
      toast.error(getError(err));
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    if (userInfo) navigate(redirect);
  }, [navigate, redirect, userInfo]);

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center min-vh-100">
      <Helmet><title>Registo Web — Nhiquela</title></Helmet>
      
      <div className="card shadow-lg border-0 rounded-5 position-relative w-100" style={{ maxWidth: isSeller ? '820px' : '580px' }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn text-muted position-absolute border-0 rounded-circle d-flex justify-content-center align-items-center shadow-sm hover-bg-light"
          style={{ top: '20px', left: '20px', width: '40px', height: '40px', backgroundColor: '#f8f9fa', zIndex: 10 }}
          title="Voltar"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        <div className="card-body p-4 p-md-5 pt-5">
          <div className="text-center mb-4">
            <h2 className="text-primary-custom fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>
              {isSeller ? 'Registar o Seu Negócio / Fornecedor' : 'Criar Conta de Cliente'}
            </h2>
            <p className="text-muted">
              {isSeller ? 'Cadastre o seu estabelecimento para vender no Marketplace Nhiquela' : 'Crie a sua conta para comprar online e acompanhar pedidos em tempo real'}
            </p>
          </div>

          {/* Toggle de Tipo de Conta (Cliente vs Fornecedor) */}
          <div className="row g-2 mb-4">
            <div className="col-6">
              <button 
                type="button" 
                className={`btn w-100 py-3 rounded-4 fw-bold border transition-all ${!isSeller ? 'bg-primary-custom text-white shadow' : 'btn-light text-muted'}`}
                onClick={() => { setIsSeller(false); setStep(1); }}
              >
                <FontAwesomeIcon icon={faUser} className="me-2" /> Sou Cliente
              </button>
            </div>
            <div className="col-6">
              <button 
                type="button" 
                className={`btn w-100 py-3 rounded-4 fw-bold border transition-all ${isSeller ? 'bg-primary-custom text-white shadow' : 'btn-light text-muted'}`}
                onClick={() => { setIsSeller(true); setStep(1); }}
              >
                <FontAwesomeIcon icon={faBriefcase} className="me-2" /> Sou Fornecedor
              </button>
            </div>
          </div>

          <form onSubmit={submitHandler}>
            {/* Passo 1: Informação Pessoal e de Acesso */}
            {step === 1 && (
              <div className="animation-fade-in">
                <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Informação Pessoal & Acesso</h6>
                
                <div className="row g-3 mb-3">
                  <div className="col-md-6 position-relative">
                    <label className="form-label small fw-bold text-muted">Nome do Responsável *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><FontAwesomeIcon icon={faUser} className="text-muted" /></span>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Nome completo" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6 position-relative">
                    <label className="form-label small fw-bold text-muted">Telemóvel (ex: 841234567) *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><FontAwesomeIcon icon={faMobileAlt} className="text-muted" /></span>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="8x xxx xxxx" 
                        maxLength={12}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Endereço de E-mail *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><FontAwesomeIcon icon={faEnvelope} className="text-muted" /></span>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="seu.email@exemplo.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Upload Foto de Perfil */}
                <div className="mb-4 bg-light p-3 rounded-4 border">
                  <label className="form-label small fw-bold text-muted d-block">Foto de Perfil (Opcional)</label>
                  <div className="d-flex align-items-center gap-3">
                    <div 
                      className="rounded-circle border d-flex align-items-center justify-content-center bg-white overflow-hidden shadow-sm flex-shrink-0"
                      style={{ width: '64px', height: '64px' }}
                    >
                      {profileImage ? (
                        <img src={profileImage} alt="Foto de Perfil" className="w-100 h-100 object-fit-cover" />
                      ) : (
                        <FontAwesomeIcon icon={faCamera} className="text-muted fs-4" />
                      )}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        id="userProfilePhotoInput"
                        className="d-none" 
                        accept="image/*"
                        onChange={(e) => uploadFileHandler(e, 'profileImage')}
                      />
                      <label 
                        htmlFor="userProfilePhotoInput" 
                        className="btn btn-outline-primary rounded-pill btn-sm px-3 fw-bold mb-1"
                        style={{ cursor: 'pointer' }}
                      >
                        {loadingUpload ? 'A carregar...' : (profileImage ? 'Alterar Foto' : 'Carregar Foto de Perfil')}
                      </label>
                      <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>PNG, JPG até 5MB</small>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Senha de Acesso *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><FontAwesomeIcon icon={faLock} className="text-muted" /></span>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className="form-control" 
                        placeholder="Mínimo 6 caracteres" 
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

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Confirmar Senha *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><FontAwesomeIcon icon={faLock} className="text-muted" /></span>
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        className="form-control" 
                        placeholder="Repita a senha" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botão de Avançar se for Vendedor */}
                {isSeller ? (
                  <button 
                    type="button" 
                    className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold mb-3 d-flex justify-content-center align-items-center shadow-sm"
                    onClick={() => { if (validateStep1()) setStep(2); }}
                  >
                    Continuar para Dados do Estabelecimento <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                  </button>
                ) : null}
              </div>
            )}

            {/* Passo 2: Dados do Estabelecimento (Apenas se isSeller: true) */}
            {isSeller && step === 2 && (
              <div className="animation-fade-in bg-light p-4 rounded-4 mb-4 border">
                <h6 className="fw-bold text-success mb-3 border-bottom pb-2">Informação do Estabelecimento & Recebimento</h6>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Nome do Estabelecimento *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FontAwesomeIcon icon={faStore} className="text-muted" /></span>
                      <input 
                        type="text" 
                        className="form-control bg-white" 
                        placeholder="Ex: Mercearia Central" 
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Tipo de Estabelecimento *</label>
                    <select 
                      className="form-select bg-white" 
                      value={sellerTipoEstabelecimento} 
                      onChange={(e) => setSellerTipoEstabelecimento(e.target.value)}
                      required
                    >
                      <option value="">Selecione o tipo...</option>
                      {tiposEstabelecimentos.map((tipo) => (
                        <option key={tipo._id} value={tipo._id}>{tipo.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Província *</label>
                    <select 
                      className="form-select bg-white" 
                      value={sellerProvince} 
                      onChange={(e) => setSellerProvince(e.target.value)}
                      required
                    >
                      <option value="">Selecione a província...</option>
                      {provinces.map((prov, idx) => (
                        <option key={idx} value={typeof prov === 'string' ? prov : prov.name}>
                          {typeof prov === 'string' ? prov : prov.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Endereço Completo / Morada *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FontAwesomeIcon icon={faMapMarkerAlt} className="text-primary-custom" /></span>
                      <input 
                        type="text" 
                        className="form-control bg-white" 
                        placeholder="Av., Rua, Bairro..." 
                        value={sellerAddress}
                        onChange={(e) => setSellerAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Descrição do Estabelecimento *</label>
                  <textarea 
                    className="form-control bg-white" 
                    rows="2" 
                    placeholder="Descreva os produtos e serviços oferecidos pela sua loja..."
                    value={sellerDescription}
                    onChange={(e) => setSellerDescription(e.target.value)}
                    required
                  ></textarea>
                </div>

                {/* Contas de Recebimento (M-Pesa, e-Mola, Banco) */}
                <h6 className="fw-bold text-dark mt-4 mb-2 small text-uppercase">Contas de Recebimento (Preencha pelo menos uma)</h6>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Conta M-Pesa</label>
                    <input 
                      type="text" 
                      className="form-control bg-white" 
                      placeholder="Ex: 841234567" 
                      value={sellerMpesa}
                      onChange={(e) => setSellerMpesa(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Conta e-Mola</label>
                    <input 
                      type="text" 
                      className="form-control bg-white" 
                      placeholder="Ex: 861234567" 
                      value={sellerEmola}
                      onChange={(e) => setSellerEmola(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">NIB / Conta Bancária</label>
                    <input 
                      type="text" 
                      className="form-control bg-white" 
                      placeholder="NIB ou IBAN" 
                      value={sellerBank}
                      onChange={(e) => setSellerBank(e.target.value)}
                    />
                  </div>
                </div>

                {/* Logótipo e GPS */}
                <div className="row g-3 align-items-center mb-2">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Logótipo da Loja</label>
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="border rounded-4 d-flex justify-content-center align-items-center overflow-hidden bg-white cursor-pointer"
                        style={{ width: '80px', height: '80px' }}
                        onClick={() => document.getElementById('logoUpload').click()}
                      >
                        {sellerLogo ? (
                          <img src={sellerLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <FontAwesomeIcon icon={faCamera} className="text-muted fs-4" />
                        )}
                      </div>
                      <div>
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm rounded-pill fw-bold"
                          onClick={() => document.getElementById('logoUpload').click()}
                        >
                          Carregar Logótipo
                        </button>
                        <input 
                          id="logoUpload"
                          type="file" 
                          className="d-none" 
                          accept="image/*" 
                          onChange={(e) => uploadFileHandler(e, 'sellerLogo')} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6 text-md-end">
                    <label className="form-label small fw-bold text-muted d-block">Localização GPS</label>
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm rounded-pill fw-bold"
                      onClick={getGpsLocation}
                      disabled={loadingGps}
                    >
                      <FontAwesomeIcon icon={faCrosshairs} className="me-1" />
                      {loadingGps ? 'A capturar...' : sellerLatitude ? 'GPS Atualizado ✓' : 'Capturar GPS Atual'}
                    </button>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-link text-muted p-0 small text-decoration-none mt-3"
                  onClick={() => setStep(1)}
                >
                  &larr; Voltar para Dados Pessoais
                </button>
              </div>
            )}

            {/* Checkbox Termos */}
            {(!isSeller || step === 2) && (
              <div className="form-check mb-4">
                <input 
                  type="checkbox" 
                  className="form-check-input cursor-pointer" 
                  id="terms" 
                  checked={checkedTerms} 
                  onChange={(e) => setCheckedTerms(e.target.checked)} 
                />
                <label className="form-check-label text-muted small cursor-pointer" htmlFor="terms">
                  Declaro que li e concordo com os <a href="/terms" target="_blank" className="text-primary-custom fw-bold">Termos e Condições</a> e com a <a href="/privacy-policy" target="_blank" className="text-primary-custom fw-bold">Política de Privacidade</a> da plataforma.
                </label>
              </div>
            )}

            {/* Botão de Submeter */}
            {(!isSeller || step === 2) && (
              <button 
                type="submit" 
                className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold mb-3 d-flex justify-content-center align-items-center shadow-sm" 
                disabled={loadingUser || loadingUpload}
              >
                {loadingUser ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : (
                  <>{isSeller ? 'Concluir Registo do Negócio' : 'Criar Conta de Cliente'} <FontAwesomeIcon icon={faArrowRight} className="ms-2" /></>
                )}
              </button>
            )}
          </form>

          <div className="text-center mt-4">
            <p className="text-muted small m-0">
              Já possui uma conta? <Link to="/login" className="text-primary-custom fw-bold text-decoration-none">Inicie sessão aqui</Link>
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        .animation-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
