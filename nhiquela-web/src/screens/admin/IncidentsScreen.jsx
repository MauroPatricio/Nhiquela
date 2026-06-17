import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faEdit, faTrash, faPlus, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function IncidentsScreen() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const { data } = await api.get('/incidents');
      setIncidents(data || []);
    } catch (error) {
      toast.error('Erro ao carregar incidentes');
    } finally {
      setLoading(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ ticket: '', title: '', relatedTo: '', status: 'Aberto', priority: 'Média' });
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = (incident = null) => {
    if (incident) {
      setIsEditing(true);
      setCurrentId(incident._id || incident.id);
      setFormData({ ...incident });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ ticket: `#INC-${Math.floor(1000 + Math.random() * 9000)}`, title: '', relatedTo: '', status: 'Aberto', priority: 'Média' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Título é obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/incidents/${currentId}`, formData);
        toast.success('Incidente atualizado!');
      } else {
        await api.post('/incidents', formData);
        toast.success('Incidente registado!');
      }
      fetchIncidents();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar incidente');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apagar registo deste incidente permanentemente?')) {
      try {
        await api.delete(`/incidents/${id}`);
        toast.success('Eliminado com sucesso!');
        fetchIncidents();
      } catch (error) {
        toast.error('Erro ao eliminar incidente');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Incidentes e Suporte</h2>
          <span className="text-muted small">Gestão de reclamações, problemas e tickets</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Registar Incidente
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Ticket / Título</th>
                  <th className="border-0 text-muted py-3">Relacionado A</th>
                  <th className="border-0 text-muted py-3">Prioridade</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">A carregar incidentes...</td></tr>
                ) : incidents.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">Nenhum incidente registado.</td></tr>
                ) : incidents.map(incident => (
                  <tr key={incident._id || incident.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-1">
                        <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 text-danger shadow-sm" style={{ width: '40px', height: '40px' }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{incident.title}</div>
                          <span className="small text-muted fw-bold">{incident.ticket}</span>
                        </div>
                      </div>
                    </td>
                    <td>{incident.relatedTo}</td>
                    <td>
                      <span className={`badge rounded-pill ${incident.priority === 'Crítica' ? 'bg-danger' : incident.priority === 'Alta' ? 'bg-warning text-dark' : 'bg-info'}`}>
                        {incident.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge rounded-pill ${incident.status === 'Resolvido' ? 'bg-success' : 'bg-secondary'}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(incident)}><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(incident._id || incident.id)}><FontAwesomeIcon icon={faTrash} /></button>
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Atualizar Incidente' : 'Novo Incidente'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Título / Descrição Curta</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Entidade/Encomenda Relacionada</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.relatedTo} onChange={(e) => setFormData({...formData, relatedTo: e.target.value})} placeholder="Ex: Encomenda #1234" required />
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Prioridade</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Status</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Aberto">Aberto</option>
                      <option value="Em Análise">Em Análise</option>
                      <option value="Resolvido">Resolvido</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Registar Incidente'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
