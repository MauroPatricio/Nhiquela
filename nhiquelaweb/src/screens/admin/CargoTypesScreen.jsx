import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxes, faPlus, faEdit, faTrash, faSearch, faSave, faTimes, faCheckCircle, faTimesCircle, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api, { SOCKET_URL } from '../../api';
import { io } from 'socket.io-client';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

const EMOJI_OPTIONS = ['📦', '🏗️', '🌾', '🚜', '🛋️', '🚚', '🧱', '⛽', '🧊', '🥩', '💊', '🔧', '🚗', '⚡'];

export default function CargoTypesScreen() {
  const [cargoTypes, setCargoTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    icon: '📦',
    description: '',
    status: 'Ativo',
    order: 0
  });

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentCargoTypes,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(cargoTypes, 10, ['name', 'description', 'status']);

  useEffect(() => {
    fetchCargoTypes();

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.on('catalogUpdated', () => {
      fetchCargoTypes();
    });

    return () => socket.disconnect();
  }, []);

  const fetchCargoTypes = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/cargo-types');
      setCargoTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erro ao carregar tipos de carga.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditing(true);
      setCurrentId(item._id || item.id);
      setFormData({
        name: item.name || '',
        icon: item.icon || '📦',
        description: item.description || '',
        status: item.status || 'Ativo',
        order: item.order || 0
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        name: '',
        icon: '📦',
        description: '',
        status: 'Ativo',
        order: cargoTypes.length + 1
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Nome do tipo de carga é obrigatório');

    try {
      if (isEditing) {
        await api.put(`/cargo-types/${currentId}`, formData);
        toast.success('Tipo de carga atualizado!');
      } else {
        await api.post('/cargo-types', formData);
        toast.success('Tipo de carga criado com sucesso!');
      }
      fetchCargoTypes();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao guardar tipo de carga');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja eliminar este tipo de carga permanentemente?')) {
      try {
        await api.delete(`/cargo-types/${id}`);
        toast.success('Tipo de carga eliminado!');
        fetchCargoTypes();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Erro ao eliminar tipo de carga');
      }
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      await api.put(`/cargo-types/${item._id}`, { status: newStatus });
      toast.info(`Estado alterado para ${newStatus}`);
      fetchCargoTypes();
    } catch (error) {
      toast.error('Erro ao alterar estado');
    }
  };

  return (
    <div className="animation-fade-in p-3 p-md-4">
      {/* HEADER DA TELA */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark d-flex align-items-center gap-2">
            <FontAwesomeIcon icon={faBoxes} style={{ color: '#7F00FF' }} />
            Tipos de Carga & Equipamentos
          </h2>
          <span className="text-muted small">Gestão dos tipos de frete, encomendas e mercadorias dos serviços</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '260px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-white border-0 shadow-sm py-2" 
              placeholder="Pesquisar carga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className="btn text-white rounded-pill px-4 shadow-sm fw-bold py-2 border-0 d-flex align-items-center gap-2"
            style={{ backgroundColor: '#7F00FF' }}
            onClick={() => handleOpenModal()}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Novo Tipo de Carga</span>
          </button>
        </div>
      </div>

      {/* TABELA DE TIPOS DE CARGA */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4" style={{ width: '60px' }}>Ícone</th>
                  <th className="border-0 text-muted py-3">Nome do Tipo de Carga</th>
                  <th className="border-0 text-muted py-3">Descrição / Detalhes</th>
                  <th className="border-0 text-muted py-3 text-center">Ordem</th>
                  <th className="border-0 text-muted py-3 text-center">Estado</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      Carregando tipos de carga...
                    </td>
                  </tr>
                ) : currentCargoTypes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      Nenhum tipo de carga encontrado.
                    </td>
                  </tr>
                ) : (
                  currentCargoTypes.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 fs-4">{item.icon || '📦'}</td>
                      <td>
                        <strong className="text-dark d-block">{item.name}</strong>
                      </td>
                      <td className="text-secondary small">
                        {item.description || 'Sem descrição'}
                      </td>
                      <td className="text-center fw-bold text-muted">
                        {item.order || 0}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className={`btn btn-sm rounded-pill px-3 fw-bold border-0 ${item.status === 'Ativo' ? 'bg-success text-white' : 'bg-secondary text-white'}`}
                          onClick={() => handleToggleStatus(item)}
                          style={{ fontSize: '11px' }}
                        >
                          <FontAwesomeIcon icon={item.status === 'Ativo' ? faCheckCircle : faTimesCircle} className="me-1" />
                          {item.status || 'Ativo'}
                        </button>
                      </td>
                      <td className="text-end px-4">
                        <div className="btn-group gap-1">
                          <button
                            className="btn btn-sm btn-light rounded-2 text-primary"
                            onClick={() => handleOpenModal(item)}
                            title="Editar"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            className="btn btn-sm btn-light rounded-2 text-danger"
                            onClick={() => handleDelete(item._id)}
                            title="Eliminar"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-0 py-3 px-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              nextPage={nextPage}
              prevPage={prevPage}
              totalItems={totalItems}
              indexOfFirstItem={indexOfFirstItem}
              indexOfLastItem={indexOfLastItem}
            />
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom-0 p-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <FontAwesomeIcon icon={faBoxes} style={{ color: '#7F00FF' }} />
                  {isEditing ? 'Editar Tipo de Carga' : 'Novo Tipo de Carga'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body p-4 pt-0">
                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark small text-uppercase">Nome da Carga / Equipamento</label>
                    <input
                      type="text"
                      className="form-control py-2.5 rounded-3 fw-medium"
                      placeholder="ex: Carga Geral & Encomendas"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark small text-uppercase">Ícone / Emoji</label>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <input
                        type="text"
                        className="form-control py-2 rounded-3 text-center fw-bold fs-5"
                        style={{ width: '70px' }}
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      />
                      <span className="text-muted small">Ou escolha rápido:</span>
                    </div>
                    <div className="d-flex flex-wrap gap-1.5 p-2 bg-light rounded-3">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="btn btn-sm btn-white border rounded-2 fs-5 p-1 px-2"
                          onClick={() => setFormData({ ...formData, icon: emoji })}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark small text-uppercase">Descrição</label>
                    <textarea
                      className="form-control py-2 rounded-3"
                      rows="3"
                      placeholder="Detalhes ou exemplos do tipo de mercadoria..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label fw-bold text-dark small text-uppercase">Estado</label>
                      <select
                        className="form-select py-2 rounded-3 fw-bold"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-dark small text-uppercase">Ordem de Exibição</label>
                      <input
                        type="number"
                        className="form-control py-2 rounded-3"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top-0 p-4 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4 fw-bold" onClick={handleCloseModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn text-white rounded-pill px-4 fw-bold border-0" style={{ backgroundColor: '#7F00FF' }}>
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    {isEditing ? 'Atualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
