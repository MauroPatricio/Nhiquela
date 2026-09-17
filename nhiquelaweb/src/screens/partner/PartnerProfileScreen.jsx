import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUserLogin } from '../../store/features/userSlice';
import api from '../../api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faEnvelope, faPhone, faMapMarkerAlt, faCamera,
  faSave, faSpinner, faLock, faShieldAlt, faBuilding
} from '@fortawesome/free-solid-svg-icons';

export default function PartnerProfileScreen() {
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUser) || {};

  const [name, setName] = useState(userInfo.name || '');
  const [email, setEmail] = useState(userInfo.email || '');
  const [phone, setPhone] = useState(userInfo.phoneNumber || '');
  const [address, setAddress] = useState(userInfo.address || '');
  const [profileImage, setProfileImage] = useState(userInfo.profileImage || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userInfo && (userInfo._id || userInfo.id)) {
      loadProfile();
    }
  }, [userInfo]);

  const loadProfile = async () => {
    try {
      const userId = userInfo._id || userInfo.id;
      const { data } = await api.get(`/users/${userId}`);
      if (data) {
        setName(data.name || userInfo.name || '');
        setEmail(data.email || userInfo.email || '');
        setPhone(data.phoneNumber || userInfo.phoneNumber || '');
        setAddress(data.address || userInfo.address || '');
        setProfileImage(data.profileImage || data.sellerLogo || data.seller?.logo || userInfo.profileImage || '');
      }
    } catch (err) {
      console.error('Erro ao carregar perfil do parceiro:', err);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warn('A imagem deve ter no máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warn('O nome é obrigatório.');
      return;
    }
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
        name,
        email,
        phoneNumber: phone,
        address,
        profileImage,
        sellerLogo: profileImage,
        ...(password ? { password } : {})
      };

      const { data } = await api.put('/users/profile', payload, config);

      const updatedUser = {
        ...userInfo,
        ...data,
        name: data.name || name,
        email: data.email || email,
        phoneNumber: data.phoneNumber || phone,
        profileImage: profileImage || data.profileImage,
        sellerLogo: profileImage || data.sellerLogo,
        seller: {
          ...(userInfo.seller || {}),
          logo: profileImage || data.seller?.logo
        },
        token: data.token || userInfo.token
      };

      dispatch(setUserLogin(updatedUser));
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      toast.success('Perfil do Parceiro atualizado com sucesso!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Erro ao atualizar perfil do parceiro:', err);
      toast.error(err.response?.data?.message || 'Erro ao guardar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      {/* Cabeçalho */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 bg-white p-4 rounded-4 shadow-sm border border-light">
        <div>
          <span className="badge px-3 py-2 rounded-pill mb-2" style={{ backgroundColor: 'rgba(138,43,226,0.1)', color: '#8a2be2', fontWeight: 'bold' }}>
            <FontAwesomeIcon icon={faShieldAlt} className="me-2" /> Perfil do Parceiro
          </span>
          <h3 className="fw-bold m-0 text-dark">Definições da Conta & Gestão de Frota</h3>
          <p className="text-muted small m-0 mt-1">
            Atualize a sua foto de perfil, dados de contacto e segurança da conta de parceiro oficial.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">

          {/* COLUNA ESQUERDA: FOTO DE PERFIL E STATUS */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white h-100">
              <h5 className="fw-bold text-dark mb-3">Foto de Perfil / Logotipo</h5>

              <div className="position-relative d-inline-block mx-auto mb-3">
                <div
                  className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center bg-light border border-3 shadow-sm"
                  style={{ width: '140px', height: '140px', margin: '0 auto', borderColor: '#8a2be2' }}
                >
                  {profileImage ? (
                    <img src={profileImage} alt="Foto de Perfil" className="w-100 h-100 object-fit-cover" />
                  ) : (
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center w-100 h-100 fs-1" style={{ backgroundColor: '#8a2be2' }}>
                      <FontAwesomeIcon icon={faShieldAlt} />
                    </div>
                  )}
                </div>

                {profileImage && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger rounded-circle position-absolute top-0 end-0 shadow-sm"
                    style={{ width: '28px', height: '28px', padding: 0, lineHeight: 1 }}
                    onClick={() => setProfileImage('')}
                    title="Remover foto/logotipo"
                  >
                    ✕
                  </button>
                )}

                <label
                  htmlFor="profile-upload"
                  className="btn btn-sm text-white rounded-circle position-absolute bottom-0 end-0 shadow cursor-pointer d-flex align-items-center justify-content-center"
                  style={{ width: '36px', height: '36px', backgroundColor: '#8a2be2' }}
                  title="Alterar Foto"
                >
                  <FontAwesomeIcon icon={faCamera} size="sm" />
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              <h6 className="fw-bold text-dark m-0">{name || 'Gestor de Frota'}</h6>
              <span className="badge mt-2 px-3 py-1.5 rounded-pill" style={{ backgroundColor: '#8a2be2', color: '#FFF' }}>
                Parceiro Oficial 🛡️
              </span>

              <hr className="my-4" />

              <div className="text-start bg-light p-3 rounded-3">
                <span className="text-muted small fw-bold d-block mb-1">Identificação na Plataforma:</span>
                <p className="small text-secondary m-0">
                  A sua foto e o nome serão visíveis para os motoristas da frota e relatórios operacionais.
                </p>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: FORMULÁRIO DE DETALHES */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h5 className="fw-bold text-dark mb-4 pb-2 border-bottom">
                <FontAwesomeIcon icon={faUser} className="me-2" style={{ color: '#8a2be2' }} />
                Informações Pessoais & Empresa Parceira
              </h5>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Nome Completo / Gestor *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faUser} className="text-muted" /></span>
                    <input
                      type="text"
                      className="form-control bg-light border-0"
                      required
                      placeholder="Ex: Mauro Patrício"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Telemóvel / WhatsApp *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faPhone} className="text-muted" /></span>
                    <input
                      type="tel"
                      className="form-control bg-light border-0"
                      required
                      placeholder="Ex: 840575992"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Endereço de E-mail *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faEnvelope} className="text-muted" /></span>
                    <input
                      type="email"
                      className="form-control bg-light border-0"
                      required
                      placeholder="parceiro@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Endereço / Sede da Frota</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0"><FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted" /></span>
                    <input
                      type="text"
                      className="form-control bg-light border-0"
                      placeholder="Ex: Av. 25 de Setembro, Maputo"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <h6 className="fw-bold text-dark mb-3 pt-2">
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

              <div className="d-flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn text-white rounded-pill px-5 py-2.5 fw-bold shadow-sm"
                  style={{ backgroundColor: '#8a2be2' }}
                >
                  {saving ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      A guardar alterações...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="me-2" />
                      Guardar Alterações
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
