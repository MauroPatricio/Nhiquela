import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStoreAlt, faEdit, faTrash, faPlus, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function EstablishmentTypesScreen() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '🏢' });
  
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentTypes,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(types, 10, ['nome', 'name', 'description']);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const { data } = await api.get('/tipo_estabelecimento');
      setTypes(data.tipoestabelecimentos || []);
    } catch (error) {
      toast.error('Erro ao carregar tipos de estabelecimento');
    } finally {
      setLoading(false);
    }
  };
  const handleOpenModal = (type = null) => {
    if (type) {
      setIsEditing(true);
      setCurrentId(type._id || type.id);
      setFormData({ name: type.nome || type.name || '', description: type.description || '', icon: type.icon || type.img || '🏢' });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', description: '', icon: '🏢' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('O nome é obrigatório');
    
    try {
      if (isEditing) {
        await api.put(`/tipo_estabelecimento/${currentId}`, formData);
        toast.success('Tipo atualizado com sucesso!');
      } else {
        await api.post('/tipo_estabelecimento', formData);
        toast.success('Tipo criado com sucesso!');
      }
      fetchTypes();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar tipo de estabelecimento');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar este tipo de estabelecimento?')) {
      try {
        await api.delete(`/tipo_estabelecimento/${id}`);
        toast.success('Tipo eliminado com sucesso!');
        fetchTypes();
      } catch (error) {
        toast.error('Erro ao eliminar tipo');
      }
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Tipos de Estabelecimento</h2>
          <span className="text-muted small">Gestão das categorias macro de lojas parceiras</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Novo Tipo
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Nome do Tipo</th>
                  <th className="border-0 text-muted py-3">Descrição</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="text-center py-5 text-muted">A carregar...</td>
                  </tr>
                ) : currentTypes.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-5 text-muted">Nenhum tipo encontrado.</td>
                  </tr>
                ) : currentTypes.map(type => (
                  <tr key={type._id || type.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        <div className="p-2 bg-primary-subtle rounded-circle text-primary-custom me-3 d-flex align-items-center justify-content-center shadow-sm fs-4 overflow-hidden" style={{ width: '50px', height: '50px' }}>
                          {(type.img || (type.icon && type.icon.startsWith('http'))) ? (
                            <img src={type.img || type.icon} alt={type.nome || type.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : type.icon ? (
                            <span>{type.icon}</span>
                          ) : (
                            <FontAwesomeIcon icon={faStoreAlt} size="sm" />
                          )}
                        </div>
                        <span className="fw-bold text-dark fs-6">{type.nome || type.name}</span>
                      </div>
                    </td>
                    <td className="text-muted">{type.description || 'Sem descrição'}</td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleOpenModal(type)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm transition-all hover-transform" onClick={() => handleDelete(type._id || type.id)} title="Eliminar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls 
            currentPage={currentPage} totalPages={totalPages} 
            onNext={nextPage} onPrev={prevPage} 
            totalItems={totalItems} indexOfFirstItem={indexOfFirstItem} indexOfLastItem={indexOfLastItem}
          />
        </div>
      </div>

      {/* Modal / Overlay Simples */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Tipo' : 'Novo Tipo de Estabelecimento'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome</label>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0 py-3 rounded-3" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Restaurante"
                    required
                  />
                </div>
                <div className="row mb-4">
                  <div className="col-10">
                    <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                    <textarea 
                      className="form-control bg-light border-0 py-3 rounded-3" 
                      rows="2"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descrição do tipo de estabelecimento"
                    ></textarea>
                  </div>
                  <div className="col-2">
                    <label className="form-label fw-bold small text-muted mb-1">Ícone</label>
                    <input 
                      type="text" 
                      className="form-control bg-light border-0 py-3 rounded-3 text-center fs-4" 
                      value={formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      placeholder="🥦"
                    />
                  </div>
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {isEditing ? 'Guardar Alterações' : 'Criar Tipo'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .text-primary-custom { color: #8a2be2 !important; }
        .hover-transform:hover { transform: translateY(-3px); }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
