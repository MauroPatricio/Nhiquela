import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus, faFolderOpen, faSpinner, faSave, faTimes, faImage, faTags, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State (Main Categories)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', image: '' });
  
  // Modal State (Subcategories)
  const [showSubModal, setShowSubModal] = useState(false);
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [currentSubId, setCurrentSubId] = useState(null);
  const [subFormData, setSubFormData] = useState({ name: '', image: '' });

  // Selection
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, subRes] = await Promise.all([
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/subcategories').catch(() => ({ data: [] }))
      ]);
      const catData = Array.isArray(catRes.data) ? catRes.data : (catRes.data.categories || []);
      const subData = Array.isArray(subRes.data) ? subRes.data : (subRes.data.subcategories || []);
      setCategories(catData);
      setSubcategories(subData);
    } catch (error) {
      toast.error('Erro ao carregar os dados de categorias.');
    } finally {
      setLoading(false);
    }
  };

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentCategories,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(categories, 10, ['name']);

  // --- CRUD CATEGORIAS PRINCIPAIS ---
  const handleOpenModal = (category = null) => {
    if (category) {
      setIsEditing(true);
      setCurrentId(category._id);
      setFormData({ name: category.name, image: category.image || '' });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', image: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Nome da categoria é obrigatório.');

    try {
      if (isEditing) {
        await api.put(`/categories/${currentId}`, formData);
        setCategories(categories.map(c => c._id === currentId ? { ...c, ...formData } : c));
        if (selectedCategory?._id === currentId) setSelectedCategory({ ...selectedCategory, ...formData });
        toast.success('Categoria principal atualizada!');
      } else {
        const { data } = await api.post('/categories', formData);
        setCategories([...categories, data.category]);
        toast.success('Categoria principal criada!');
      }
      setShowModal(false);
    } catch (error) {
      toast.error('Erro ao guardar categoria.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar esta categoria e todas as suas subcategorias?')) {
      try {
        await api.delete(`/categories/${id}`);
        setCategories(categories.filter(c => c._id !== id));
        // Remove associadas no frontend (no backend real deveríamos tratar on cascade ou na rota)
        setSubcategories(subcategories.filter(s => s.categoryId !== id));
        if (selectedCategory?._id === id) setSelectedCategory(null);
        toast.success('Categoria eliminada!');
      } catch (error) {
        toast.error('Erro ao eliminar categoria.');
      }
    }
  };

  // --- CRUD SUBCATEGORIAS ---
  const handleOpenSubModal = (sub = null) => {
    if (sub) {
      setIsEditingSub(true);
      setCurrentSubId(sub._id);
      setSubFormData({ name: sub.name, image: sub.image || '' });
    } else {
      setIsEditingSub(false);
      setCurrentSubId(null);
      setSubFormData({ name: '', image: '' });
    }
    setShowSubModal(true);
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!subFormData.name) return toast.error('Nome da subcategoria é obrigatório.');
    if (!selectedCategory) return toast.error('Nenhuma categoria principal selecionada.');

    try {
      const payload = { ...subFormData, categoryId: selectedCategory._id };
      if (isEditingSub) {
        await api.put(`/subcategories/${currentSubId}`, payload);
        setSubcategories(subcategories.map(s => s._id === currentSubId ? { ...s, ...payload } : s));
        toast.success('Subcategoria atualizada!');
      } else {
        const { data } = await api.post('/subcategories', payload);
        setSubcategories([...subcategories, data.subcategory]);
        toast.success('Subcategoria criada!');
      }
      setShowSubModal(false);
    } catch (error) {
      toast.error('Erro ao guardar subcategoria.');
    }
  };

  const handleDeleteSub = async (id) => {
    if (window.confirm('Eliminar subcategoria?')) {
      try {
        await api.delete(`/subcategories/${id}`);
        setSubcategories(subcategories.filter(s => s._id !== id));
        toast.success('Subcategoria eliminada!');
      } catch (error) {
        toast.error('Erro ao eliminar subcategoria.');
      }
    }
  };

  const currentSubcategories = selectedCategory 
    ? subcategories.filter(s => s.categoryId === selectedCategory._id) 
    : [];

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Categorias e Subcategorias</h2>
          <span className="text-muted small">Estruturação do catálogo de produtos e serviços do servidor</span>
        </div>
        <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Nova Categoria Principal
        </button>
      </div>

      <div className="row g-4">
        {/* Painel Esquerdo: Categorias Principais */}
        <div className="col-md-7">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100">
            <div className="card-header bg-white border-0 pt-4 pb-3 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">Categorias Principais</h5>
              <div className="position-relative" style={{ width: '200px' }}>
                <FontAwesomeIcon icon={faSearch} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <input 
                  type="text" 
                  className="form-control form-control-sm bg-light border-0 rounded-pill ps-5" 
                  placeholder="Pesquisar categoria..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle m-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 text-muted py-3 px-4">Ícone</th>
                      <th className="border-0 text-muted py-3">Nome da Categoria</th>
                      <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-5">
                          <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary-custom mb-3" />
                        </td>
                      </tr>
                    ) : currentCategories.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-5 text-muted">Nenhuma categoria principal encontrada.</td>
                      </tr>
                    ) : currentCategories.map(cat => (
                      <tr 
                        key={cat._id} 
                        className={selectedCategory?._id === cat._id ? 'bg-primary-subtle' : ''}
                        onClick={() => setSelectedCategory(cat)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="px-4">
                          {cat.image ? (
                            <div className="bg-white rounded border shadow-sm overflow-hidden" style={{ width: '45px', height: '45px' }}>
                              <img src={cat.image} alt={cat.name} className="w-100 h-100 object-fit-cover" />
                            </div>
                          ) : (
                            <div className="bg-light rounded-circle d-flex justify-content-center align-items-center text-primary-custom shadow-sm" style={{ width: '45px', height: '45px' }}>
                              <FontAwesomeIcon icon={faFolderOpen} />
                            </div>
                          )}
                        </td>
                        <td className="fw-bold text-dark">{cat.name}</td>
                        <td className="text-end px-4">
                          <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={(e) => { e.stopPropagation(); handleOpenModal(cat); }} title="Editar">
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={(e) => { e.stopPropagation(); handleDelete(cat._id); }} title="Eliminar">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls 
              currentPage={currentPage} totalPages={totalPages} 
              onNext={nextPage} onPrev={prevPage} 
              totalItems={totalItems} indexOfFirstItem={indexOfFirstItem} indexOfLastItem={indexOfLastItem}
            />
          </div>
        </div>

        {/* Painel Direito: Subcategorias */}
        <div className="col-md-5">
          <div className="card shadow-sm-custom border-0 rounded-4 h-100 bg-light">
            {selectedCategory ? (
              <div className="card-body p-4 d-flex flex-column">
                <div className="d-flex align-items-center mb-4 pb-3 border-bottom border-secondary-subtle">
                  <div className="bg-white rounded-circle d-flex justify-content-center align-items-center text-primary-custom shadow-sm me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faFolderOpen} size="lg" />
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark m-0">{selectedCategory.name}</h5>
                    <small className="text-muted">Subcategorias Atribuídas</small>
                  </div>
                </div>
                
                <div className="flex-grow-1">
                  {currentSubcategories.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="bg-white p-4 rounded-circle shadow-sm mb-3 d-inline-block">
                        <FontAwesomeIcon icon={faTags} size="2x" className="text-muted opacity-50" />
                      </div>
                      <p className="text-muted mb-4 px-3">Não existem subcategorias para <strong>{selectedCategory.name}</strong>.</p>
                    </div>
                  ) : (
                    <div className="list-group mb-4 shadow-sm rounded-4">
                      {currentSubcategories.map(sub => (
                        <div key={sub._id} className="list-group-item list-group-item-action border-0 mb-1 rounded-3 d-flex justify-content-between align-items-center p-3">
                          <div className="d-flex align-items-center">
                            {sub.image ? (
                              <img src={sub.image} alt={sub.name} className="rounded border me-3" style={{ width: '35px', height: '35px', objectFit: 'cover' }} />
                            ) : (
                              <div className="bg-light rounded d-flex justify-content-center align-items-center text-primary-custom me-3" style={{ width: '35px', height: '35px' }}>
                                <FontAwesomeIcon icon={faTags} size="sm" />
                              </div>
                            )}
                            <span className="fw-bold text-dark">{sub.name}</span>
                          </div>
                          <div>
                            <button className="btn btn-sm btn-light text-primary-custom me-1 rounded-circle" onClick={() => handleOpenSubModal(sub)}><FontAwesomeIcon icon={faEdit} /></button>
                            <button className="btn btn-sm btn-light text-danger rounded-circle" onClick={() => handleDeleteSub(sub._id)}><FontAwesomeIcon icon={faTrash} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button className="btn btn-outline-primary rounded-pill px-4 py-3 fw-bold shadow-sm w-100" onClick={() => handleOpenSubModal()}>
                  <FontAwesomeIcon icon={faPlus} className="me-2" /> Adicionar Subcategoria
                </button>
              </div>
            ) : (
              <div className="card-body d-flex flex-column justify-content-center align-items-center text-center p-5">
                <div className="bg-white p-4 rounded-circle shadow-sm mb-3">
                  <FontAwesomeIcon icon={faTags} size="3x" className="text-muted opacity-50" />
                </div>
                <h5 className="fw-bold text-dark mb-2">Gestão de Subcategorias</h5>
                <p className="text-muted small px-3">Selecione uma categoria na tabela à esquerda para visualizar e gerir as suas subcategorias.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Categoria Principal */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Categoria Principal' : 'Nova Categoria Principal'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowModal(false)} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome da Categoria *</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Mercearia, Bebidas..." required />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Imagem da Categoria (Opcional)</label>
                  <div className="d-flex align-items-center mt-2 p-3 bg-light rounded-3 border border-dashed">
                     <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-primary-custom d-flex justify-content-center align-items-center" style={{ width: '50px', height: '50px' }}>
                       <FontAwesomeIcon icon={faImage} size="lg" />
                     </div>
                     <div className="flex-grow-1">
                        <span className="d-block fw-bold text-dark small mb-1">Adicionar Imagem</span>
                        <input type="file" className="form-control form-control-sm" accept="image/*" onChange={(e) => {
                          if(e.target.files && e.target.files[0]) {
                            setFormData({...formData, image: URL.createObjectURL(e.target.files[0])});
                          }
                        }}/>
                     </div>
                  </div>
                  {formData.image && (
                    <div className="mt-3 position-relative d-inline-block">
                      <img src={formData.image} alt="Preview" className="rounded-3 border shadow-sm" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                      <button type="button" className="btn btn-sm btn-danger rounded-circle position-absolute top-0 start-100 translate-middle" onClick={() => setFormData({...formData, image: ''})} style={{ width: '25px', height: '25px', padding: 0 }}><FontAwesomeIcon icon={faTimes} size="sm" /></button>
                    </div>
                  )}
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Categoria'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subcategoria */}
      {showSubModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditingSub ? 'Editar Subcategoria' : `Nova Subcategoria em ${selectedCategory?.name}`}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowSubModal(false)} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSaveSub}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Nome da Subcategoria *</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={subFormData.name} onChange={(e) => setSubFormData({...subFormData, name: e.target.value})} placeholder="Ex: Refrigerantes..." required />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Imagem da Subcategoria (Opcional)</label>
                  <div className="d-flex align-items-center mt-2 p-3 bg-light rounded-3 border border-dashed">
                     <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-primary-custom d-flex justify-content-center align-items-center" style={{ width: '50px', height: '50px' }}>
                       <FontAwesomeIcon icon={faImage} size="lg" />
                     </div>
                     <div className="flex-grow-1">
                        <span className="d-block fw-bold text-dark small mb-1">Adicionar Imagem</span>
                        <input type="file" className="form-control form-control-sm" accept="image/*" onChange={(e) => {
                          if(e.target.files && e.target.files[0]) {
                            setSubFormData({...subFormData, image: URL.createObjectURL(e.target.files[0])});
                          }
                        }}/>
                     </div>
                  </div>
                  {subFormData.image && (
                    <div className="mt-3 position-relative d-inline-block">
                      <img src={subFormData.image} alt="Preview" className="rounded-3 border shadow-sm" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                      <button type="button" className="btn btn-sm btn-danger rounded-circle position-absolute top-0 start-100 translate-middle" onClick={() => setSubFormData({...subFormData, image: ''})} style={{ width: '25px', height: '25px', padding: 0 }}><FontAwesomeIcon icon={faTimes} size="sm" /></button>
                    </div>
                  )}
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditingSub ? 'Guardar Alterações' : 'Criar Subcategoria'}
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
        .border-dashed { border-style: dashed !important; border-color: #ccc !important; }
        .shadow-sm-custom { box-shadow: 0 4px 20px rgba(0,0,0,0.03) !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
