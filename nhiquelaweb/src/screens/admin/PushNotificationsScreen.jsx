import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faPaperPlane, faMobileAlt, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function PushNotificationsScreen() {
  const [formData, setFormData] = useState({ userId: '', title: '', body: '' });
  const [loading, setLoading] = useState(false);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!formData.userId || !formData.title || !formData.body) {
      return toast.error('Preencha todos os campos.');
    }

    setLoading(true);
    try {
      // Chama o endpoint de notificações do backend
      await api.post('/notifications/send', {
        userId: formData.userId,
        title: formData.title,
        body: formData.body,
        data: { type: 'admin_broadcast' }
      });
      toast.success('Notificação enviada com sucesso!');
      setFormData({ userId: '', title: '', body: '' });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar notificação. Verifique se o utilizador tem token registado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Notificações Push</h2>
          <span className="text-muted small">Envio de alertas diretamente para os telemóveis dos utilizadores</span>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card shadow-sm-custom border-0 rounded-4">
            <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center">
              <FontAwesomeIcon icon={faPaperPlane} className="text-primary-custom me-2" />
              <h5 className="fw-bold m-0 text-dark">Nova Mensagem</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSendNotification}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">ID do Utilizador / Motorista</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.userId} onChange={(e) => setFormData({...formData, userId: e.target.value})} placeholder="Ex: user_123" required />
                  <small className="text-muted">Para o teste funcionar, o utilizador deve ter feito login na App Mobile para registar o seu Device Token.</small>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Título da Notificação</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ex: Nova Encomenda Atribuída!" required />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Corpo da Mensagem</label>
                  <textarea className="form-control bg-light border-0 py-3 rounded-3" rows="4" value={formData.body} onChange={(e) => setFormData({...formData, body: e.target.value})} placeholder="Escreva a mensagem aqui..." required></textarea>
                </div>
                
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm" disabled={loading}>
                  {loading ? (
                    <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> A Enviar...</>
                  ) : (
                    <><FontAwesomeIcon icon={faBell} className="me-2" /> Disparar Notificação</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm-custom border-0 rounded-4 bg-light h-100">
            <div className="card-body p-5 d-flex flex-column align-items-center justify-content-center text-center">
              <div className="bg-white rounded-circle d-flex justify-content-center align-items-center mb-4 shadow-sm" style={{ width: '80px', height: '80px' }}>
                <FontAwesomeIcon icon={faMobileAlt} size="2x" className="text-primary-custom" />
              </div>
              <h4 className="fw-bold text-dark mb-2">Simulador de Ecrã</h4>
              <p className="text-muted mb-4">A mensagem irá aparecer no ecrã bloqueado do utilizador como um alerta nativo do sistema Android/iOS.</p>
              
              {/* Mock do telemovel */}
              <div className="bg-dark rounded-4 p-3 shadow-lg" style={{ width: '100%', maxWidth: '300px', height: '150px', position: 'relative' }}>
                <div className="bg-white rounded-3 p-3 text-start position-absolute shadow" style={{ top: '30px', left: '15px', right: '15px' }}>
                  <div className="d-flex align-items-center mb-1">
                    <FontAwesomeIcon icon={faBell} className="text-primary-custom me-2 small" />
                    <span className="small fw-bold text-dark">Nhiquela App</span>
                    <span className="small text-muted ms-auto">Agora</span>
                  </div>
                  <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>{formData.title || 'Título da Mensagem'}</div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>{formData.body || 'O corpo da mensagem vai aparecer aqui...'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
