import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faEdit, faTrash, faPlus, faSave, faTimes, faCheckCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function SettingsScreen() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data || []);
    } catch (error) {
      toast.error('Erro ao carregar configurações globais');
    } finally {
      setLoading(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ key: '', value: '', description: '' });
  const [showModal, setShowModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(new Set());
  const [formList, setFormList] = useState([]);

  const toggleVisibility = (id) => {
    const newSet = new Set(visibleKeys);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setVisibleKeys(newSet);
  };

  const handleOpenModal = (setting = null) => {
    if (setting) {
      setIsEditing(true);
      setCurrentId(setting._id || setting.id);
      setFormData({ ...setting });
      const isList = setting.key.toLowerCase().includes('email') || setting.key.toLowerCase().includes('list');
      setFormList(isList && setting.value ? setting.value.split(',').map(v => v.trim()).filter(Boolean) : []);
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ key: '', value: '', description: '' });
      setFormList([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    
    let finalData = { ...formData };
    const isListType = formData.key.toLowerCase().includes('email') || formData.key.toLowerCase().includes('list');
    
    if (isListType) {
      finalData.value = formList.filter(v => v.trim() !== '').join(',');
      if (!finalData.key || !finalData.value) return toast.error('A chave e pelo menos uma opção são obrigatórias.');
    } else {
      if (!formData.key || !formData.value) return toast.error('Chave e Valor são obrigatórios');
    }
    
    try {
      if (isEditing) {
        await api.put(`/settings/${currentId}`, finalData);
        toast.success('Configuração atualizada!');
      } else {
        await api.post('/settings', finalData);
        toast.success('Configuração criada!');
      }
      fetchSettings();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar configuração');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminar esta configuração do sistema permanentemente?')) {
      try {
        await api.delete(`/settings/${id}`);
        toast.success('Eliminado com sucesso!');
        fetchSettings();
      } catch (error) {
        toast.error('Erro ao eliminar configuração');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Configurações Globais</h2>
          <span className="text-muted small">Variáveis do sistema, taxas e comissões</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Nova Variável
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome da Variável</th>
                  <th className="border-0 text-muted py-3">Valor</th>
                  <th className="border-0 text-muted py-3">Descrição / Efeito</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">A carregar configurações...</td></tr>
                ) : settings.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">Nenhuma configuração definida na base de dados.</td></tr>
                ) : settings.map(setting => (
                  <tr key={setting._id || setting.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="p-2 bg-light rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px' }}>
                          <FontAwesomeIcon icon={faCog} />
                        </div>
                        <span className="fw-bold text-dark">{setting.key}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div className="d-flex align-items-center gap-2">
                        <span 
                          className="badge bg-primary-subtle text-primary-custom fs-6 px-3 py-2 rounded-pill text-break text-wrap text-start"
                          style={{ display: 'inline-block', maxWidth: '100%' }}
                        >
                          {(setting.key.toLowerCase().includes('key') || setting.key.toLowerCase().includes('secret') || setting.key.toLowerCase().includes('password') || setting.key.toLowerCase().includes('token')) && !visibleKeys.has(setting._id || setting.id) 
                            ? '••••••••••••••••••••' 
                            : setting.value}
                        </span>
                        {(setting.key.toLowerCase().includes('key') || setting.key.toLowerCase().includes('secret') || setting.key.toLowerCase().includes('password') || setting.key.toLowerCase().includes('token')) && (
                          <button className="btn btn-sm btn-light text-muted rounded-circle" onClick={() => toggleVisibility(setting._id || setting.id)}>
                            <FontAwesomeIcon icon={visibleKeys.has(setting._id || setting.id) ? faEyeSlash : faEye} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="text-muted">{setting.description}</td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(setting)}><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(setting._id || setting.id)}><FontAwesomeIcon icon={faTrash} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Configuração' : 'Nova Configuração'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome da Variável (Chave)</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.key} onChange={(e) => setFormData({...formData, key: e.target.value})} placeholder="Ex: Taxa de Serviço" required />
                </div>
                
                {formData.key.toLowerCase().includes('email') || formData.key.toLowerCase().includes('list') ? (
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted mb-2">
                      {formData.key.toLowerCase().includes('email') ? 'Lista de E-mails' : 'Opções / Valores'}
                    </label>
                    {formList.map((item, idx) => (
                      <div key={idx} className="d-flex align-items-center mb-2 gap-2">
                        <input 
                          type="text" 
                          className="form-control bg-light border-0 py-2 rounded-3" 
                          value={item} 
                          onChange={(e) => {
                            const newList = [...formList];
                            newList[idx] = e.target.value;
                            setFormList(newList);
                          }} 
                          placeholder={formData.key.toLowerCase().includes('email') ? 'Digite o e-mail' : 'Descreva a opção'}
                        />
                        <button type="button" className="btn btn-light text-danger rounded-3 px-3 py-2" onClick={() => {
                          const newList = formList.filter((_, i) => i !== idx);
                          setFormList(newList);
                        }}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline-primary rounded-pill px-4 py-2 mt-2 fw-bold" onClick={() => setFormList([...formList, ''])}>
                      <FontAwesomeIcon icon={faPlus} className="me-2" /> 
                      {formData.key.toLowerCase().includes('email') ? 'Adicionar E-mail' : 'Adicionar Opção'}
                    </button>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted mb-1">Valor</label>
                    <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder="Ex: 50 MT ou 5%" required />
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                  <textarea className="form-control bg-light border-0 py-3 rounded-3" rows="2" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Para que serve esta variável?"></textarea>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Variável'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
