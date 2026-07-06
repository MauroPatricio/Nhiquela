import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faTimes, faCheck, faBan, faPalette } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';

export default function VehicleColorsScreen() {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', hexCode: '', rgbCode: '', isActive: true, sortOrder: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vehicle-colors');
      setColors(data || []);
    } catch (error) {
      toast.error('Erro ao carregar cores.');
    } finally {
      setLoading(false);
    }
  };

  const seedColors = async () => {
    try {
      const { data } = await api.post('/vehicle-colors/seed');
      toast.success(data.message);
      fetchColors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao inicializar cores.');
    }
  };

  const handleOpenModal = (color = null) => {
    if (color) {
      setIsEditing(true);
      setCurrentId(color._id);
      setFormData({ 
        name: color.name, 
        hexCode: color.hexCode, 
        rgbCode: color.rgbCode, 
        isActive: color.isActive, 
        sortOrder: color.sortOrder 
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', hexCode: '', rgbCode: '', isActive: true, sortOrder: colors.length + 1 });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ name: '', hexCode: '', rgbCode: '', isActive: true, sortOrder: 0 });
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'O nome da cor é obrigatório.';
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.hexCode)) return 'O código HEX é inválido (Ex: #FF0000).';
    if (!/^RGB\(\d{1,3},\d{1,3},\d{1,3}\)$/i.test(formData.rgbCode)) return 'O código RGB é inválido (Ex: RGB(255,0,0)).';
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) return toast.error(errorMsg);

    try {
      if (isEditing) {
        await api.put(`/vehicle-colors/${currentId}`, formData);
        toast.success('Cor atualizada com sucesso!');
      } else {
        await api.post('/vehicle-colors', formData);
        toast.success('Nova cor adicionada!');
      }
      handleCloseModal();
      fetchColors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar cor.');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.patch(`/vehicle-colors/${id}/toggle`);
      toast.success('Estado alterado com sucesso!');
      fetchColors();
    } catch (error) {
      toast.error('Erro ao alterar estado.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar esta cor? Esta ação é irreversível.')) {
      try {
        await api.delete(`/vehicle-colors/${id}`);
        toast.success('Cor eliminada com sucesso!');
        fetchColors();
      } catch (error) {
        toast.error('Erro ao eliminar cor.');
      }
    }
  };

  const filteredColors = colors.filter(color => {
    const matchesSearch = color.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          color.hexCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : 
                          statusFilter === 'active' ? color.isActive : !color.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container-fluid py-4 animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Cores de Veículos</h2>
          <p className="text-muted mb-0">Faça a gestão da paleta de cores global da plataforma Nhiquela.</p>
        </div>
        <div className="d-flex gap-2">
          {colors.length === 0 && !loading && (
            <button className="btn btn-outline-primary fw-bold" onClick={seedColors}>
              Importar Cores Padrão
            </button>
          )}
          <button className="btn btn-primary shadow-sm fw-bold px-4 rounded-3" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Adicionar Cor
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-8">
              <input 
                type="text" 
                className="form-control bg-light border-0 py-2 rounded-3" 
                placeholder="Pesquisar por nome ou código HEX..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select 
                className="form-select bg-light border-0 py-2 rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todas as Cores</option>
                <option value="active">Apenas Ativas</option>
                <option value="inactive">Apenas Inativas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Visualização</th>
                  <th className="border-0 text-muted py-3">Cor</th>
                  <th className="border-0 text-muted py-3">Código HEX</th>
                  <th className="border-0 text-muted py-3">Código RGB</th>
                  <th className="border-0 text-muted py-3">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">A carregar cores...</td>
                  </tr>
                ) : filteredColors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">Nenhuma cor encontrada.</td>
                  </tr>
                ) : filteredColors.map(color => (
                  <tr key={color._id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle shadow-sm border border-2 border-white me-3" 
                          style={{ width: '40px', height: '40px', backgroundColor: color.hexCode }}
                        ></div>
                      </div>
                    </td>
                    <td className="fw-bold">{color.name}</td>
                    <td className="font-monospace text-muted">{color.hexCode}</td>
                    <td className="font-monospace text-muted">{color.rgbCode}</td>
                    <td>
                      <span className={`badge rounded-pill px-3 py-2 ${color.isActive ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                        <FontAwesomeIcon icon={color.isActive ? faCheck : faBan} className="me-1" />
                        {color.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(color)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className={`btn btn-sm btn-light me-2 rounded-3 shadow-sm ${color.isActive ? 'text-warning' : 'text-success'}`} onClick={() => handleToggleActive(color._id)} title={color.isActive ? "Desativar" : "Ativar"}>
                        <FontAwesomeIcon icon={color.isActive ? faBan : faCheck} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(color._id)} title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} onClick={handleCloseModal}>
          <div className="modal-dialog modal-dialog-centered m-0" style={{ width: '100%', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="card border-0 shadow-lg rounded-4 w-100">
              <div className="card-header bg-white border-bottom-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Cor' : 'Nova Cor'}</h5>
                <button type="button" className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSave}>
                  <div className="d-flex align-items-center mb-4">
                    <div className="me-3 p-2 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                      <div 
                        className="rounded-circle shadow-sm" 
                        style={{ width: '100%', height: '100%', backgroundColor: formData.hexCode || '#E5E7EB' }}
                      ></div>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0">Pré-visualização</h6>
                      <small className="text-muted">Como a cor irá aparecer na plataforma</small>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted mb-1">Nome da Cor</label>
                    <input 
                      type="text" 
                      className="form-control bg-light border-0 py-2 rounded-3" 
                      placeholder="Ex: Vermelho Escuro"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted mb-1">Código HEX</label>
                      <input 
                        type="text" 
                        className="form-control bg-light border-0 py-2 rounded-3 font-monospace" 
                        placeholder="#FF0000"
                        value={formData.hexCode}
                        onChange={(e) => setFormData({...formData, hexCode: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted mb-1">Código RGB</label>
                      <input 
                        type="text" 
                        className="form-control bg-light border-0 py-2 rounded-3 font-monospace" 
                        placeholder="RGB(255,0,0)"
                        value={formData.rgbCode}
                        onChange={(e) => setFormData({...formData, rgbCode: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-bold small text-muted mb-1">Ordem de Exibição (Opcional)</label>
                    <input 
                      type="number" 
                      className="form-control bg-light border-0 py-2 rounded-3" 
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div className="form-check form-switch mb-4">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="isActive" 
                      checked={formData.isActive} 
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})} 
                    />
                    <label className="form-check-label fw-bold text-success" htmlFor="isActive">Cor Ativa e Visível</label>
                  </div>

                  <button type="submit" className="btn btn-primary w-100 fw-bold rounded-3 py-3">
                    {isEditing ? 'Guardar Alterações' : 'Adicionar Cor'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .text-primary-custom { color: #8a2be2 !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
