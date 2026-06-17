import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn, faEdit, faTrash, faPlus, faSave, faTimes, faImage } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function MarketingScreen() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/marketing');
      setBanners(data || []);
    } catch (error) {
      toast.error('Erro ao carregar banners');
    } finally {
      setLoading(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ title: '', location: '', status: 'Ativo' });
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setIsEditing(true);
      setCurrentId(banner._id || banner.id);
      setFormData({ ...banner });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ title: '', location: 'Home Principal', status: 'Ativo' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error('O título é obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/marketing/${currentId}`, formData);
        toast.success('Banner atualizado!');
      } else {
        await api.post('/marketing', formData);
        toast.success('Banner criado!');
      }
      fetchBanners();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar banner');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminar este banner promocional?')) {
      try {
        await api.delete(`/marketing/${id}`);
        toast.success('Eliminado com sucesso!');
        fetchBanners();
      } catch (error) {
        toast.error('Erro ao eliminar banner');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Banners & Marketing</h2>
          <span className="text-muted small">Gestão de publicidade e destaques na plataforma</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Banner
        </button>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Título do Banner</th>
                  <th className="border-0 text-muted py-3">Localização (Posição)</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">A carregar...</td></tr>
                ) : banners.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">Nenhum banner ativo.</td></tr>
                ) : banners.map(banner => (
                  <tr key={banner._id || banner.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-1">
                        <div className="bg-light rounded-2 d-flex justify-content-center align-items-center me-3 text-primary-custom shadow-sm" style={{ width: '60px', height: '40px' }}>
                          <FontAwesomeIcon icon={faImage} />
                        </div>
                        <span className="fw-bold text-dark">{banner.title}</span>
                      </div>
                    </td>
                    <td><span className="text-muted">{banner.location}</span></td>
                    <td>
                      <span className={`badge rounded-pill ${banner.status === 'Ativo' ? 'bg-success' : 'bg-secondary'}`}>
                        {banner.status}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(banner)}><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(banner._id || banner.id)}><FontAwesomeIcon icon={faTrash} /></button>
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
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Banner' : 'Novo Banner'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Título da Campanha</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Imagem do Banner</label>
                  <div className="border border-dashed rounded-3 p-4 text-center bg-light cursor-pointer">
                    <FontAwesomeIcon icon={faImage} size="2x" className="text-muted mb-2" />
                    <p className="small text-muted m-0">Clique para fazer upload da imagem</p>
                  </div>
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Localização</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}>
                      <option value="Home Principal">Home Principal</option>
                      <option value="Home Secundário">Home Secundário</option>
                      <option value="App Mobile Top">App Mobile Top</option>
                      <option value="App Mobile Bottom">App Mobile Bottom</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted mb-1">Status</label>
                    <select className="form-select bg-light border-0 py-3 rounded-3" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Banner'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .border-dashed { border-style: dashed !important; border-color: #ccc !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
