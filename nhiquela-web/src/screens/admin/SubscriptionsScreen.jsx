import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faEdit, faTrash, faPlus, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function SubscriptionsScreen() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', limits: '', status: 'Ativo' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/plans');
      setPlans(data || []);
    } catch (error) {
      toast.error('Erro ao carregar planos de subscrição');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setIsEditing(true);
      setCurrentId(plan._id || plan.id);
      setFormData({ name: plan.name || '', price: plan.price || '', limits: plan.limits || '', status: plan.status || 'Ativo' });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', price: '', limits: '', status: 'Ativo' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Nome do plano é obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/plans/${currentId}`, formData);
        toast.success('Plano atualizado com sucesso!');
      } else {
        await api.post('/plans', formData);
        toast.success('Plano criado com sucesso!');
      }
      fetchPlans();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar plano');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminar este plano de subscrição?')) {
      try {
        await api.delete(`/plans/${id}`);
        toast.success('Eliminado com sucesso!');
        fetchPlans();
      } catch (error) {
        toast.error('Erro ao eliminar plano');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Planos de Subscrição</h2>
          <span className="text-muted small">Pacotes e mensalidades (Modelo de Negócio)</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Plano
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome do Plano</th>
                  <th className="border-0 text-muted py-3">Preço</th>
                  <th className="border-0 text-muted py-3">Limites / Vantagens</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">A carregar planos...</td></tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      Nenhum plano configurado. Adicione os planos: <b>Gratuito</b>, <b>Profissional</b> e <b>Publicidade</b>.
                    </td>
                  </tr>
                ) : plans.map(plan => (
                  <tr key={plan._id || plan.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-1">
                        <div className="bg-warning-subtle rounded-circle d-flex justify-content-center align-items-center me-3 text-warning shadow-sm" style={{ width: '40px', height: '40px' }}>
                          <FontAwesomeIcon icon={faCrown} />
                        </div>
                        <span className="fw-bold text-dark">{plan.name}</span>
                      </div>
                    </td>
                    <td className="fw-bold text-success">{plan.price}</td>
                    <td><span className="text-muted">{plan.limits}</span></td>
                    <td>
                      <span className={`badge rounded-pill ${plan.status === 'Ativo' ? 'bg-success' : plan.status === 'Em Breve' ? 'bg-info' : 'bg-secondary'}`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(plan)}><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(plan._id || plan.id)}><FontAwesomeIcon icon={faTrash} /></button>
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Plano' : 'Novo Plano'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome do Pacote</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Plano Profissional" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Preço (MT)</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required placeholder="Ex: 2000 MT/mês" />
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Limites / Vantagens</label>
                    <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.limits} onChange={(e) => setFormData({...formData, limits: e.target.value})} required placeholder="Ex: Estatísticas, Destaque" />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Status</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Ativo">Ativo</option>
                      <option value="Em Breve">Em Breve</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Plano'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .bg-warning-subtle { background-color: #fff3cd !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
