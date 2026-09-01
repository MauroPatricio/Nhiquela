import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUserLogin } from '../../store/features/userSlice';
import api from '../../api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStore,
  faUser,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faSave,
  faSpinner,
  faClock,
  faCamera,
  faLock,
  faToggleOn,
  faToggleOff,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';

export default function SupplierProfileScreen() {
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subcategories, setSubcategories] = useState([]);

  // Estados do Perfil da Loja
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [tipoEstabelecimento, setTipoEstabelecimento] = useState('');
  const [province, setProvince] = useState('Maputo Cidade');
  const [address, setAddress] = useState('');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [sellerLogo, setSellerLogo] = useState('');
  const [nuit, setNuit] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  // Senha
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (userInfo) {
      loadProfile();
      fetchSubcategories();
    }
  }, [userInfo]);

  const fetchSubcategories = async () => {
    try {
      const { data } = await api.get('/provider-subcategories');
      const businessSubcats = (data || []).filter(
        (sub) => sub.providerTypeId?.classificationId?.name === 'BUSINESS' || sub.providerTypeId?.name === 'Fornecedor'
      );
      setSubcategories(businessSubcats.length > 0 ? businessSubcats : data || []);
    } catch (err) {
      console.log('Erro ao buscar subcategorias:', err.message);
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userId = userInfo._id || userInfo.id;
      const { data } = await api.get(`/users/${userId}`);
      
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phoneNumber || data.phone || '');
      setNomeEstabelecimento(data.seller?.nomeEstabelecimento || data.seller?.name || data.name || '');
      setTipoEstabelecimento(data.seller?.tipoEstabelecimento?._id || data.seller?.tipoEstabelecimento || '');
      setProvince(data.seller?.province || data.province || 'Maputo Cidade');
      setAddress(data.seller?.address || data.address || '');
      setOpenTime(data.seller?.openTime || '08:00');
      setCloseTime(data.seller?.closeTime || '18:00');
      setIsStoreOpen(data.seller?.openstore !== false);
      setSellerLogo(data.seller?.logo || data.sellerLogo || data.profileImage || '');
      setNuit(data.seller?.nuit || '');
      setBankAccount(data.seller?.bankAccount || data.mpesaNumber || data.phoneNumber || '');
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      toast.error('Erro ao carregar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error('As palavras-passes não coincidem.');
      return;
    }

    setSaving(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      };

      const payload = {
        isSeller: true,
        name,
        email,
        phoneNumber: phone,
        nomeEstabelecimento,
        tipoEstabelecimento,
        province,
        address,
        openTime,
        closeTime,
        openstore: isStoreOpen,
        sellerLogo,
        nuit,
        bankAccount,
        ...(password ? { password } : {})
      };

      const { data } = await api.put('/users/profile', payload, config);

      toast.success('Perfil da loja atualizado com sucesso!');
      
      // Atualiza Redux e localStorage
      const updatedUser = {
        ...userInfo,
        ...data,
        name: data.name || name,
        email: data.email || email,
        sellerLogo: sellerLogo || data.sellerLogo,
        seller: {
          ...userInfo.seller,
          ...(data.seller || {}),
          nomeEstabelecimento: nomeEstabelecimento || data.seller?.name || userInfo.seller?.nomeEstabelecimento,
          openstore: isStoreOpen
        }
      };
      dispatch(setUserLogin(updatedUser));
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      toast.error(err.response?.data?.message || 'Erro ao guardar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStoreStatus = async () => {
    const newStatus = !isStoreOpen;
    setIsStoreOpen(newStatus);
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      await api.put('/users/profile', { isSeller: true, openstore: newStatus }, config);
      const updatedUser = {
        ...userInfo,
        seller: {
          ...userInfo.seller,
          openstore: newStatus
        }
      };
      dispatch(setUserLogin(updatedUser));
      toast.success(newStatus ? 'Loja ABERTA com sucesso!' : 'Loja FECHADA com sucesso!');
    } catch (err) {
      setIsStoreOpen(!newStatus); // rollback
      toast.error('Erro ao alterar o estado da loja.');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-success me-2" />
        <span className="fw-bold text-muted">A carregar perfil da loja...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark m-0">Perfil da Loja & Definições</h2>
          <span className="text-muted small">Gerencie as informações públicas, contacto e estado da sua loja</span>
        </div>
        <div className="d-flex align-items-center bg-white px-3 py-2 rounded-pill shadow-sm border">
          <span className="me-2 fw-bold small text-muted">Estado da Loja:</span>
          <button
            type="button"
            className="btn btn-sm p-0 border-0 d-flex align-items-center"
            onClick={handleToggleStoreStatus}
          >
            <FontAwesomeIcon
              icon={isStoreOpen ? faToggleOn : faToggleOff}
              size="2x"
              className={isStoreOpen ? 'text-success me-2' : 'text-muted me-2'}
            />
            <span className={isStoreOpen ? 'fw-bold text-success' : 'fw-bold text-danger'}>
              {isStoreOpen ? 'ABERTA' : 'FECHADA'}
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Cartão de Logotipo & Status */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white">
              <h5 className="fw-bold text-dark mb-3">Logotipo do Estabelecimento</h5>
              
              <div className="position-relative d-inline-block mx-auto mb-3">
                <div
                  className="rounded-circle border border-3 border-success overflow-hidden d-flex align-items-center justify-content-center bg-light"
                  style={{ width: '130px', height: '130px', margin: '0 auto' }}
                >
                  {sellerLogo ? (
                    <img src={sellerLogo} alt="Logo" className="w-100 h-100 object-fit-cover" />
                  ) : (
                    <FontAwesomeIcon icon={faStore} size="3x" className="text-success" />
                  )}
                </div>
                {sellerLogo && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger rounded-circle position-absolute top-0 end-0 shadow-sm"
                    style={{ width: '28px', height: '28px', padding: 0, lineHeight: 1 }}
                    onClick={() => setSellerLogo('')}
                    title="Remover logotipo"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Upload de Imagem */}
              <div className="mb-3">
                <label className="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold w-100">
                  <FontAwesomeIcon icon={faCamera} className="me-2" /> Carregar Foto do Computador
                  <input
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSellerLogo(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <hr className="my-3" />

              <div className="text-start">
                <span className="text-muted small fw-bold d-block mb-1">Dica de Visibilidade:</span>
                <p className="small text-secondary mb-0">
                  Um logotipo nítido e informações de horário atualizadas aumentam a confiança dos clientes no Marketplace.
                </p>
              </div>
            </div>
          </div>

          {/* Cartão de Informações do Negócio & Responsável */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h5 className="fw-bold text-dark mb-4 pb-2 border-bottom">
                <FontAwesomeIcon icon={faBuilding} className="text-success me-2" />
                Informações da Loja / Estabelecimento
              </h5>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Nome Comercial da Loja *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faStore} className="text-muted" /></span>
                    <input
                      type="text"
                      className="form-control bg-light border-0"
                      required
                      placeholder="Ex: Mercearia Central"
                      value={nomeEstabelecimento}
                      onChange={(e) => setNomeEstabelecimento(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Tipo / Subcategoria do Negócio *</label>
                  <select
                    className="form-select bg-light border-0"
                    required
                    value={tipoEstabelecimento}
                    onChange={(e) => setTipoEstabelecimento(e.target.value)}
                  >
                    <option value="">Selecione o Tipo de Estabelecimento...</option>
                    {subcategories.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Província / Região *</label>
                  <select
                    className="form-select bg-light border-0"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  >
                    <option value="Maputo Cidade">Maputo Cidade</option>
                    <option value="Maputo Província">Maputo Província</option>
                    <option value="Gaza">Gaza</option>
                    <option value="Inhambane">Inhambane</option>
                    <option value="Sofala">Sofala</option>
                    <option value="Manica">Manica</option>
                    <option value="Tete">Tete</option>
                    <option value="Zambézia">Zambézia</option>
                    <option value="Nampula">Nampula</option>
                    <option value="Cabo Delgado">Cabo Delgado</option>
                    <option value="Niassa">Niassa</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Endereço Físico / Bairro *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted" /></span>
                    <input
                      type="text"
                      className="form-control bg-light border-0"
                      required
                      placeholder="Ex: Av. Eduardo Mondlane, nº 1020"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">NUIT (Número de Identificação Tributária)</label>
                  <input
                    type="text"
                    className="form-control bg-light border-0"
                    placeholder="Ex: 400123456"
                    value={nuit}
                    onChange={(e) => setNuit(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Conta M-Pesa / Recebimentos</label>
                  <input
                    type="text"
                    className="form-control bg-light border-0"
                    placeholder="Ex: 841234567"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Cartão do Proprietário & Segurança */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h5 className="fw-bold text-dark mb-4 pb-2 border-bottom">
                <FontAwesomeIcon icon={faUser} className="text-success me-2" />
                Dados do Responsável & Segurança
              </h5>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Nome do Responsável *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faUser} className="text-muted" /></span>
                    <input
                      type="text"
                      className="form-control bg-light border-0"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Endereço de E-mail *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faEnvelope} className="text-muted" /></span>
                    <input
                      type="email"
                      className="form-control bg-light border-0"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Telefone Principal / WhatsApp *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faPhone} className="text-muted" /></span>
                    <input
                      type="tel"
                      className="form-control bg-light border-0"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <h6 className="fw-bold text-dark mb-3">
                <FontAwesomeIcon icon={faLock} className="text-muted me-2" />
                Alterar Palavra-Passe (Opcional)
              </h6>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Nova Palavra-Passe</label>
                  <input
                    type="password"
                    className="form-control bg-light border-0"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Confirmar Nova Palavra-Passe</label>
                  <input
                    type="password"
                    className="form-control bg-light border-0"
                    placeholder="Repita a palavra-passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn bg-success text-white rounded-pill px-5 py-2 fw-bold shadow-sm"
                >
                  {saving ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      A guardar alterações...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="me-2" />
                      Guardar Perfil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
