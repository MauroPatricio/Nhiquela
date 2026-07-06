import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faRuler, faPlus, faEdit, faTrash, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function ProductAttributesScreen() {
  const [activeTab, setActiveTab] = useState('colors'); // 'colors' | 'sizes'
  
  // States for Colors
  const [colors, setColors] = useState([]);
  const [loadingColors, setLoadingColors] = useState(false);
  
  // States for Sizes
  const [sizes, setSizes] = useState([]);
  const [loadingSizes, setLoadingSizes] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ nome: '' });

  const currentList = activeTab === 'colors' ? colors : sizes;
  const {
    currentPage, searchQuery, setSearchQuery, currentData,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(currentList, 10, ['nome']);

  useEffect(() => {
    fetchColors();
    fetchSizes();
  }, []);

  const fetchColors = async () => {
    setLoadingColors(true);
    try {
      const { data } = await api.get('/colors');
      setColors(data.colors || data);
    } catch (error) {
      // Mock data if backend fails
      setColors([
        { _id: '1', nome: 'Preto' }, { _id: '2', nome: 'Branco' },
        { _id: '3', nome: 'Vermelho' }, { _id: '4', nome: 'Azul' },
        { _id: '5', nome: 'Verde' }, { _id: '6', nome: 'Amarelo' },
        { _id: '7', nome: 'Multicolorido' }, { _id: '8', nome: 'N/A' }
      ]);
    } finally {
      setLoadingColors(false);
    }
  };

  const fetchSizes = async () => {
    setLoadingSizes(true);
    try {
      const { data } = await api.get('/sizes');
      setSizes(data.sizes || data);
    } catch (error) {
      // Mock data if backend fails
      setSizes([
        { _id: '1', nome: 'P' }, { _id: '2', nome: 'M' },
        { _id: '3', nome: 'G' }, { _id: '4', nome: 'GG' },
        { _id: '5', nome: '1L' }, { _id: '6', nome: '2L' },
        { _id: '7', nome: '5kg' }, { _id: '8', nome: '10kg' },
        { _id: '9', nome: 'Único' }, { _id: '10', nome: 'N/A' }
      ]);
    } finally {
      setLoadingSizes(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditing(true);
      setCurrentId(item._id);
      setFormData({ nome: item.nome });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ nome: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nome) return toast.error('O nome é obrigatório.');

    try {
      const endpoint = activeTab === 'colors' ? '/colors' : '/sizes';
      const listSetter = activeTab === 'colors' ? setColors : setSizes;
      const list = activeTab === 'colors' ? colors : sizes;
      const itemName = activeTab === 'colors' ? 'Cor' : 'Tamanho';

      if (isEditing) {
        // await api.put(`${endpoint}/${currentId}`, formData);
        listSetter(list.map(i => i._id === currentId ? { ...i, ...formData } : i));
        toast.success(`${itemName} atualizado com sucesso!`);
      } else {
        // const { data } = await api.post(endpoint, formData);
        // listSetter([...list, data]);
        listSetter([...list, { _id: Date.now().toString(), ...formData }]);
        toast.success(`${itemName} criado com sucesso!`);
      }
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar alterações.');
    }
  };

  const handleDelete = async (id) => {
    const itemName = activeTab === 'colors' ? 'Cor' : 'Tamanho';
    if (window.confirm(`Tem a certeza que deseja eliminar este ${itemName.toLowerCase()}?`)) {
      try {
        const endpoint = activeTab === 'colors' ? '/colors' : '/sizes';
        const listSetter = activeTab === 'colors' ? setColors : setSizes;
        const list = activeTab === 'colors' ? colors : sizes;
        
        // await api.delete(`${endpoint}/${id}`);
        listSetter(list.filter(i => i._id !== id));
        toast.success(`${itemName} eliminado!`);
      } catch (error) {
        toast.error('Erro ao eliminar.');
      }
    }
  };

  const renderTable = (list, icon, type) => (
    <div className="table-responsive">
      <table className="table table-hover align-middle m-0">
        <thead className="bg-light">
          <tr>
            <th className="border-0 text-muted py-3 px-4 rounded-start-4">{type}</th>
            <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="2" className="text-center py-5 text-muted">Nenhum registo encontrado.</td></tr>
          ) : list.map(item => (
            <tr key={item._id}>
              <td className="px-4">
                <div className="d-flex align-items-center py-2">
                  <div className="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 shadow-sm border text-primary-custom" style={{ width: '40px', height: '40px' }}>
                    <FontAwesomeIcon icon={icon} />
                  </div>
                  <span className="fw-bold text-dark">{item.nome}</span>
                </div>
              </td>
              <td className="text-end px-4">
                <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(item)}>
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(item._id)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls 
        currentPage={currentPage} totalPages={totalPages} 
        onNext={nextPage} onPrev={prevPage} 
        totalItems={totalItems} indexOfFirstItem={indexOfFirstItem} indexOfLastItem={indexOfLastItem}
      />
    </div>
  );

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Atributos de Produto</h2>
          <span className="text-muted small">Gestão de variantes globais: Cores e Tamanhos</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar atributo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo {activeTab === 'colors' ? 'Cor' : 'Tamanho'}
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4 overflow-hidden mb-4">
        <div className="d-flex border-bottom bg-light">
          <button 
            className={`btn border-0 py-3 px-5 rounded-0 fw-bold ${activeTab === 'colors' ? 'bg-white text-primary-custom border-bottom border-primary-custom border-3' : 'text-muted'}`}
            onClick={() => setActiveTab('colors')}
          >
            <FontAwesomeIcon icon={faPalette} className="me-2" /> Cores Disponíveis
          </button>
          <button 
            className={`btn border-0 py-3 px-5 rounded-0 fw-bold ${activeTab === 'sizes' ? 'bg-white text-primary-custom border-bottom border-primary-custom border-3' : 'text-muted'}`}
            onClick={() => setActiveTab('sizes')}
          >
            <FontAwesomeIcon icon={faRuler} className="me-2" /> Tamanhos Disponíveis
          </button>
        </div>

        <div className="card-body p-0">
          {activeTab === 'colors' && renderTable(currentData, faPalette, 'Nome da Cor')}
          {activeTab === 'sizes' && renderTable(currentData, faRuler, 'Descrição do Tamanho / Medida')}
        </div>
      </div>

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar' : 'Criar Novo'} {activeTab === 'colors' ? 'Cor' : 'Tamanho'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSave}>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">
                    {activeTab === 'colors' ? 'Nome da Cor (Ex: Azul Marinho)' : 'Nome do Tamanho (Ex: XL, 2Kg)'}
                  </label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Adicionar'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .border-primary-custom { border-color: #8a2be2 !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
