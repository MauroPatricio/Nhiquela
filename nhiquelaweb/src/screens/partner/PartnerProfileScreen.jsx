import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUserLogin } from '../../store/features/userSlice';
import api from '../../api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCamera,
  faSave,
  faSpinner,
  faLock,
  faShieldAlt,
  faBuilding,
  faCheckCircle,
  faEye,
  faEyeSlash,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import './FleetOperations.css';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        setProfileImage(
          data.profileImage || data.sellerLogo || data.seller?.logo || userInfo.profileImage || ''
        );
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
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };

      const payload = {
        name,
        email,
        phoneNumber: phone,
        address,
        profileImage,
        sellerLogo: profileImage,
        ...(password ? { password } : {}),
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
          logo: profileImage || data.seller?.logo,
        },
        token: data.token || userInfo.token,
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
    <div className="fleet-ops-wrapper">
      {/* 1. Hero Header */}
      <div className="fleet-hero-header hero-profile">
        <div>
          <div className="fleet-hero-badge">
            <FontAwesomeIcon icon={faUserShield} /> Identidade & Definições do Parceiro
          </div>
          <h1 className="fleet-hero-title">
            <FontAwesomeIcon icon={faShieldAlt} className="text-purple-400" />
            Meu Perfil de Parceiro
          </h1>
          <p className="fleet-hero-subtitle">
            Atualize a sua foto institucional, dados de contacto, credenciais de segurança e identificação na rede Nhiquela.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
          
          {/* COLUNA ESQUERDA: FOTO E IDENTIDADE */}
          <div className="fleet-table-card" style={{ padding: '2.25rem 1.75rem', textAlign: 'center' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1.5rem 0' }}>
              Foto de Perfil / Logótipo Oficial
            </h4>

            <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 1.5rem auto' }}>
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8fafc',
                  border: '4px solid #7f00ff',
                  boxShadow: '0 10px 25px -5px rgba(127, 0, 255, 0.35)',
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Foto de Perfil"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #7f00ff 0%, #6d28d9 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                    }}
                  >
                    <FontAwesomeIcon icon={faShieldAlt} />
                  </div>
                )}
              </div>

              {profileImage && (
                <button
                  type="button"
                  onClick={() => setProfileImage('')}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#e11d48',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                  }}
                  title="Remover Foto"
                >
                  ✕
                </button>
              )}

              <label
                htmlFor="profile-upload"
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#7f00ff',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(127, 0, 255, 0.4)',
                  transition: 'all 0.2s',
                }}
                title="Carregar Nova Imagem"
              >
                <FontAwesomeIcon icon={faCamera} />
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              {name || 'Gestor de Frota'}
            </h3>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
              <span className="ops-badge badge-purple" style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}>
                <FontAwesomeIcon icon={faCheckCircle} /> Parceiro Oficial 🛡️
              </span>
            </div>

            <div
              style={{
                marginTop: '1.75rem',
                padding: '1.25rem',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                Visibilidade da Identidade:
              </span>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                O seu nome e logótipo são apresentados nos relatórios operacionais, ordens de serviço e painéis de motoristas associados.
              </p>
            </div>
          </div>

          {/* COLUNA DIREITA: FORMULÁRIO */}
          <div className="fleet-table-card" style={{ padding: '2.25rem 2rem', flex: '2 1 450px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FontAwesomeIcon icon={faBuilding} style={{ color: '#7f00ff' }} /> Informações Pessoais & Empresariais
            </h4>

            <div className="fleet-form-grid fleet-form-grid-2" style={{ marginBottom: '1.25rem' }}>
              <div>
                <label className="fleet-form-label">Nome Completo / Gestor *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mauro Patrício"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="fleet-input-control"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <FontAwesomeIcon icon={faUser} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              <div>
                <label className="fleet-form-label">Telemóvel / WhatsApp *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 840575992"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="fleet-input-control"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <FontAwesomeIcon icon={faPhone} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
            </div>

            <div className="fleet-form-grid fleet-form-grid-2" style={{ marginBottom: '2rem' }}>
              <div>
                <label className="fleet-form-label">Endereço de E-mail *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    placeholder="parceiro@nhiquela.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="fleet-input-control"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <FontAwesomeIcon icon={faEnvelope} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              <div>
                <label className="fleet-form-label">Endereço / Sede da Empresa</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Ex: Av. 25 de Setembro, Maputo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="fleet-input-control"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <FontAwesomeIcon icon={faMapMarkerAlt} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faLock} style={{ color: '#64748b' }} /> Alterar Palavra-Passe (Opcional)
              </h4>

              <div className="fleet-form-grid fleet-form-grid-2">
                <div>
                  <label className="fleet-form-label">Nova Palavra-Passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="fleet-input-control"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '0.75rem',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="fleet-form-label">Confirmar Nova Palavra-Passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita a palavra-passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="fleet-input-control"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '0.75rem',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn-ops-primary"
                style={{ padding: '0.85rem 2rem', fontSize: '0.92rem' }}
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    A guardar alterações...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} />
                    Guardar Alterações do Perfil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

