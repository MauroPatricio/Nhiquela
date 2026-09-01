import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faEdit, faTrash, faPlus, faSave, faTimes, faCheckCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function SettingsScreen() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [minBalance, setMinBalance] = useState(50);
  const [commRate, setCommRate] = useState(15);
  const [firstSaleFree, setFirstSaleFree] = useState(true);
  const [freeSalesCount, setFreeSalesCount] = useState(1);
  const [blockLowBalance, setBlockLowBalance] = useState(true);
  const [allowNegative, setAllowNegative] = useState(false);
  const [savingWalletConfig, setSavingWalletConfig] = useState(false);

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

  useEffect(() => {
    if (settings.length > 0) {
      const findVal = (key, fallback) => {
        const item = settings.find(s => s.key === key);
        if (!item) return fallback;
        if (item.type === 'number') return Number(item.value);
        if (item.type === 'boolean') return item.value === 'true' || item.value === true;
        return item.value;
      };
      setMinBalance(findVal('minimum_recommended_balance', 50));
      setCommRate(findVal('platform_commission_rate', 15));
      setFirstSaleFree(findVal('enable_first_sale_free', true));
      setFreeSalesCount(findVal('free_sales_count', 1));
      setBlockLowBalance(findVal('block_store_below_minimum', true));
      setAllowNegative(findVal('allow_negative_balance', false));
    }
  }, [settings]);

  const handleSaveWalletConfig = async (e) => {
    e.preventDefault();
    setSavingWalletConfig(true);
    try {
      const updates = [
        { key: 'minimum_recommended_balance', value: minBalance.toString(), type: 'number', description: 'Saldo mínimo recomendado para o fornecedor continuar ativo (MT)' },
        { key: 'platform_commission_rate', value: commRate.toString(), type: 'number', description: 'Percentagem de comissão padrão da plataforma sobre as vendas (%)' },
        { key: 'enable_first_sale_free', value: firstSaleFree.toString(), type: 'boolean', description: 'Ativar primeira venda gratuita para novos fornecedores' },
        { key: 'free_sales_count', value: freeSalesCount.toString(), type: 'number', description: 'Número de primeiras vendas gratuitas concedidas' },
        { key: 'block_store_below_minimum', value: blockLowBalance.toString(), type: 'boolean', description: 'Bloquear automaticamente a loja se o saldo for menor que o recomendado' },
        { key: 'allow_negative_balance', value: allowNegative.toString(), type: 'boolean', description: 'Permitir que a carteira do fornecedor fique com saldo negativo' }
      ];

      await Promise.all(updates.map(async (up) => {
        const exist = settings.find(s => s.key === up.key);
        if (exist) {
          await api.put(`/settings/${exist._id || exist.id}`, { value: up.value, description: up.description });
        } else {
          await api.post('/settings', up);
        }
      }));

      toast.success('Configurações da carteira salvas com sucesso!');
      fetchSettings();
    } catch (error) {
      toast.error('Erro ao salvar configurações da carteira');
    } finally {
      setSavingWalletConfig(false);
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

  const filteredSettings = settings.filter(s => ![
    'minimum_recommended_balance',
    'platform_commission_rate',
    'enable_first_sale_free',
    'free_sales_count',
    'block_store_below_minimum',
    'allow_negative_balance'
  ].includes(s.key));

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

      {/* Seção Carteira do Fornecedor */}
      <div className="card shadow-sm-custom border-0 rounded-4 mb-4">
        <div className="card-header bg-white border-0 py-3 px-4">
          <h5 className="fw-bold m-0 text-dark">Configurações → Carteira do Fornecedor</h5>
          <span className="text-muted small">Gerencie as regras operacionais e limites financeiros de todos os fornecedores</span>
        </div>
        <div className="card-body px-4 pb-4">
          <form onSubmit={handleSaveWalletConfig}>
            <div className="row g-3">
              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-bold small text-muted mb-1">Saldo mínimo recomendado</label>
                <div className="input-group">
                  <input 
                    type="number" 
                    className="form-control bg-light border-0 py-2.5 rounded-start-3" 
                    value={minBalance} 
                    onChange={(e) => setMinBalance(Number(e.target.value))} 
                    required 
                    min="0"
                  />
                  <span className="input-group-text bg-light border-0 text-muted rounded-end-3">MT</span>
                </div>
              </div>

              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-bold small text-muted mb-1">Modelo de comissão</label>
                <select className="form-select bg-light border-0 py-2.5 rounded-3" disabled value="venda">
                  <option value="venda">Desconto direto na venda (Recomendado)</option>
                </select>
              </div>


              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-bold small text-muted mb-1">Número de vendas gratuitas</label>
                <input 
                  type="number" 
                  className="form-control bg-light border-0 py-2.5 rounded-3" 
                  value={freeSalesCount} 
                  onChange={(e) => setFreeSalesCount(Number(e.target.value))} 
                  required 
                  min="1"
                />
              </div>

              <div className="col-12 col-md-6 col-lg-4 d-flex align-items-center mt-lg-4 pt-lg-2">
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="firstSaleFreeSwitch"
                    checked={firstSaleFree} 
                    onChange={(e) => setFirstSaleFree(e.target.checked)} 
                  />
                  <label className="form-check-label fw-bold small text-muted ms-2" htmlFor="firstSaleFreeSwitch">
                    Primeira venda gratuita
                  </label>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-4 d-flex align-items-center mt-lg-4 pt-lg-2">
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="blockStoreSwitch"
                    checked={blockLowBalance} 
                    onChange={(e) => setBlockLowBalance(e.target.checked)} 
                  />
                  <label className="form-check-label fw-bold small text-muted ms-2" htmlFor="blockStoreSwitch">
                    Bloquear loja abaixo do mínimo
                  </label>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-4 d-flex align-items-center mt-lg-3">
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="allowNegativeSwitch"
                    checked={allowNegative} 
                    onChange={(e) => setAllowNegative(e.target.checked)} 
                  />
                  <label className="form-check-label fw-bold small text-muted ms-2" htmlFor="allowNegativeSwitch">
                    Permitir saldo negativo
                  </label>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-4">
              <button 
                type="submit" 
                className="btn bg-primary-custom text-white rounded-pill px-5 py-2.5 shadow-sm fw-bold"
                disabled={savingWalletConfig}
              >
                {savingWalletConfig ? 'A guardar...' : 'Guardar Configurações da Carteira'}
              </button>
            </div>
          </form>
        </div>
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
                ) : filteredSettings.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">Nenhuma configuração definida na base de dados.</td></tr>
                ) : filteredSettings.map(setting => (
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
