import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus, faEye, faSave, faTimes, faBoxOpen, faBarcode, faImage, faTags, faPalette, faRuler, faPercent, faTruck, faShieldAlt, faUpload, faSpinner, faSearch, faStore } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoriesList, setCategoriesList] = useState([]);
  const [provincesList] = useState(['Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa']);
  
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, catRes, colRes, sizeRes, supRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/colors').catch(() => ({ data: [] })),
        api.get('/sizes').catch(() => ({ data: [] })),
        api.get('/users/sellers').catch(() => ({ data: { sellers: [] } }))
      ]);
      setProducts(prodRes.data.products || []);
      setCategoriesList(catRes.data.categories ? catRes.data.categories.map(c => c.name) : ['Mercearia Básica', 'Bebidas']);
      setAvailableColors(colRes.data.colors ? colRes.data.colors.map(c => c.name) : ['Preto', 'Branco']);
      setAvailableSizes(sizeRes.data.sizes ? sizeRes.data.sizes.map(s => s.name) : ['P', 'M', 'G', 'Único']);
      setSuppliersList(supRes.data.sellers || []);
    } catch (error) {
      toast.error('Erro ao carregar dados dos produtos');
    } finally {
      setLoading(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ 
    nome: '', name: '', brand: '', category: '', province: '', price: '', countInStock: '', description: '', image: '', seller: '',
    color: [], size: [], onSale: false, onSalePercentage: '', isOrdered: false, orderPeriod: '', isGuaranteed: false, guaranteedPeriod: ''
  });
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentProducts,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(products, 10, ['nome', 'name', 'brand', 'category', 'province']);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingImage(true);
    try {
      // Usar a rota real do backend para upload
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image: data.secure_url || data.url }));
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Falha no upload. Verifique se o backend suporta a rota /upload.');
      // Fallback para mock visual caso o backend falhe
      const fakeUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image: fakeUrl }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenDetails = (product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setIsEditing(true);
      setCurrentId(product._id || product.id);
      setFormData({ 
        ...product,
        category: typeof product.category === 'object' ? (product.category?.name || product.category?.nome || product.category?._id || '') : product.category,
        brand: typeof product.brand === 'object' ? (product.brand?.name || product.brand?.nome || product.brand?._id || '') : product.brand,
        province: typeof product.province === 'object' ? (product.province?.name || product.province?.nome || product.province?._id || '') : product.province,
        seller: typeof product.seller === 'object' ? (product.seller?._id || '') : (product.seller || ''),
        color: Array.isArray(product.color) ? product.color.map(c => typeof c === 'object' ? (c.name || c.nome || c._id) : c) : [],
        size: Array.isArray(product.size) ? product.size.map(s => typeof s === 'object' ? (s.name || s.nome || s._id) : s) : [],
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ 
        nome: '', name: '', brand: '', category: '', province: '', price: '', countInStock: '', description: '', image: '', seller: '',
        color: [], size: [], onSale: false, onSalePercentage: '', isOrdered: false, orderPeriod: '', isGuaranteed: false, guaranteedPeriod: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const toggleArrayItem = (arrayField, value) => {
    setFormData(prev => {
      const arr = prev[arrayField];
      if (arr.includes(value)) {
        return { ...prev, [arrayField]: arr.filter(item => item !== value) };
      } else {
        return { ...prev, [arrayField]: [...arr, value] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.price || !formData.category || !formData.province) {
      return toast.error('Nome (PT), Preço, Categoria e Província são obrigatórios.');
    }
    if (formData.color.length === 0 || formData.size.length === 0) {
      return toast.error('Deve selecionar pelo menos uma cor e um tamanho.');
    }
    
    try {
      if (isEditing) {
        await api.put(`/products/${currentId}`, formData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await api.post('/products', formData);
        toast.success('Produto criado com sucesso!');
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao guardar o produto');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja eliminar este produto permanentemente?')) {
      try {
        await api.delete(`/products/${id}`);
        toast.success('Produto eliminado com sucesso!');
        fetchData();
      } catch (error) {
        toast.error('Erro ao eliminar produto');
      }
    }
  };

  return (
    <div className="animation-fade-in pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Catálogo de Produtos</h2>
          <span className="text-muted small">Gestão de estoque, promoções, garantias e atributos</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '250px' }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input 
              type="text" 
              className="form-control rounded-pill ps-5 bg-light border-0 py-2" 
              placeholder="Pesquisar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn bg-primary-custom text-white rounded-pill px-4 shadow-sm fw-bold py-2" onClick={() => handleOpenModal()}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Novo Produto
          </button>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4 rounded-start-4">Produto</th>
                  <th className="border-0 text-muted py-3">Categoria & Província</th>
                  <th className="border-0 text-muted py-3">Preço</th>
                  <th className="border-0 text-muted py-3">Estoque</th>
                  <th className="border-0 text-muted py-3 text-end px-4 rounded-end-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted"><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> A carregar catálogo...</td></tr>
                ) : currentProducts.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">Nenhum produto encontrado.</td></tr>
                ) : currentProducts.map(product => (
                  <tr key={product._id || product.id}>
                    <td className="px-4">
                      <div className="d-flex align-items-center py-2">
                        {product.image ? (
                          <img src={product.image} alt={product.nome} className="rounded-3 shadow-sm me-3 border" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                        ) : (
                          <div className="bg-light rounded-3 d-flex justify-content-center align-items-center me-3 text-muted border border-dashed" style={{ width: '50px', height: '50px' }}>
                            <FontAwesomeIcon icon={faImage} />
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '250px' }}>{product.nome}</div>
                          <div className="text-muted small d-flex align-items-center gap-2 mt-1">
                            <span>{typeof product.brand === 'object' ? (product.brand?.name || product.brand?.nome) : (product.brand || 'Sem marca')}</span>
                            {product.onSale && <span className="badge bg-danger">-{product.onSalePercentage}% OFF</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border d-block mb-1 text-start" style={{width: 'max-content'}}>
                        {typeof product.category === 'object' ? (product.category?.name || product.category?.nome || 'N/A') : (product.category || 'N/A')}
                      </span>
                      <div className="d-flex flex-column gap-1">
                        <span className="small text-muted">{typeof product.province === 'object' ? (product.province?.name || product.province?.nome) : product.province}</span>
                        {product.seller && <span className="badge bg-primary-subtle text-primary-custom border border-primary border-opacity-25" style={{width: 'max-content'}}>Vendedor: {typeof product.seller === 'object' ? (product.seller?.name || product.seller?.nome) : product.seller}</span>}
                      </div>
                    </td>
                    <td>
                      {product.onSale ? (
                        <div>
                          <span className="fw-bold text-danger">{parseFloat(product.price - (product.price * (product.onSalePercentage/100))).toFixed(2)} MT</span><br/>
                          <span className="text-muted small text-decoration-line-through">{parseFloat(product.price).toFixed(2)} MT</span>
                        </div>
                      ) : (
                        <span className="fw-bold text-primary-custom">{parseFloat(product.price).toFixed(2)} MT</span>
                      )}
                    </td>
                    <td>
                      {product.countInStock > 10 ? (
                        <span className="badge rounded-pill bg-success-subtle text-success border border-success border-opacity-25 px-3 py-2">{product.countInStock} un</span>
                      ) : product.countInStock > 0 ? (
                        <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning border-opacity-25 px-3 py-2 text-dark">{product.countInStock} un</span>
                      ) : (
                        <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger border-opacity-25 px-3 py-2">Esgotado</span>
                      )}
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-light text-secondary me-2 rounded-3 shadow-sm" onClick={() => handleOpenDetails(product)} title="Ver Detalhes"><FontAwesomeIcon icon={faEye} /></button>
                      <button className="btn btn-sm btn-light text-primary-custom me-2 rounded-3 shadow-sm" onClick={() => handleOpenModal(product)} title="Editar"><FontAwesomeIcon icon={faEdit} /></button>
                      <button className="btn btn-sm btn-light text-danger rounded-3 shadow-sm" onClick={() => handleDelete(product._id || product.id)} title="Eliminar"><FontAwesomeIcon icon={faTrash} /></button>
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

      {/* Modal Criar/Editar Produto */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">{isEditing ? 'Editar Produto (Avançado)' : 'Novo Produto (Completo)'}</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={handleCloseModal} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4" style={{ overflowY: 'auto' }}>
              <form onSubmit={handleSave}>
                <h6 className="fw-bold text-primary-custom mb-3 border-bottom pb-2">Identificação e Base</h6>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Nome do Produto (PT)</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-1">Nome do Produto (EN) - Opcional</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Marca / Sabor</label>
                    <input type="text" className="form-control bg-light border-0 py-2 rounded-3" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Categoria</label>
                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Localização (Província)</label>
                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {provincesList.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Fornecedor / Loja</label>
                    <select className="form-select bg-light border-0 py-2 rounded-3" value={formData.seller} onChange={(e) => setFormData({...formData, seller: e.target.value})} required>
                      <option value="">Selecione o fornecedor...</option>
                      {suppliersList.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name || s.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Preço (MT)</label>
                    <input type="number" step="0.01" className="form-control bg-light border-0 py-2 rounded-3 fw-bold" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Quantidade em Estoque</label>
                    <input type="number" className="form-control bg-light border-0 py-2 rounded-3" value={formData.countInStock} onChange={(e) => setFormData({...formData, countInStock: e.target.value})} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-muted mb-1">Imagem do Produto</label>
                    <div className="position-relative">
                      <input type="file" accept="image/*" className="form-control bg-light border-0 py-2 rounded-3" onChange={handleImageUpload} disabled={uploadingImage} />
                      {uploadingImage && (
                        <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                          <FontAwesomeIcon icon={faSpinner} spin className="text-primary-custom" />
                        </div>
                      )}
                    </div>
                    {formData.image && !uploadingImage && (
                      <div className="mt-2 text-success small fw-bold">
                        <FontAwesomeIcon icon={faImage} className="me-1" /> Imagem selecionada pronta.
                      </div>
                    )}
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-bold small text-muted mb-1">Descrição</label>
                    <textarea className="form-control bg-light border-0 py-2 rounded-3" rows="2" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>
                </div>

                <h6 className="fw-bold text-primary-custom mb-3 border-bottom pb-2">Variantes do Produto</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-2"><FontAwesomeIcon icon={faPalette} className="me-1"/> Cores Disponíveis</label>
                    <div className="d-flex flex-wrap gap-2">
                      {availableColors.map(c => (
                        <div key={c} className={`badge border cursor-pointer p-2 ${formData.color.includes(c) ? 'bg-primary-custom text-white' : 'bg-white text-dark'}`} onClick={() => toggleArrayItem('color', c)}>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted mb-2"><FontAwesomeIcon icon={faRuler} className="me-1"/> Tamanhos Disponíveis</label>
                    <div className="d-flex flex-wrap gap-2">
                      {availableSizes.map(s => (
                        <div key={s} className={`badge border cursor-pointer p-2 ${formData.size.includes(s) ? 'bg-primary-custom text-white' : 'bg-white text-dark'}`} onClick={() => toggleArrayItem('size', s)}>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold text-primary-custom mb-3 border-bottom pb-2">Políticas Comerciais</h6>
                <div className="row g-3 mb-4 bg-light p-3 rounded-4 mx-0">
                  <div className="col-md-4">
                    <div className="form-check form-switch mb-2">
                      <input className="form-check-input" type="checkbox" role="switch" checked={formData.onSale} onChange={(e) => setFormData({...formData, onSale: e.target.checked})} />
                      <label className="form-check-label fw-bold small text-dark"><FontAwesomeIcon icon={faPercent} className="me-1 text-danger"/> Em Promoção?</label>
                    </div>
                    {formData.onSale && (
                      <select className="form-select form-select-sm" value={formData.onSalePercentage} onChange={(e) => setFormData({...formData, onSalePercentage: e.target.value})}>
                        <option value="">Desconto...</option>
                        {[10,15,20,25,30,40,50,60,70,80].map(v => <option key={v} value={v}>{v}% OFF</option>)}
                      </select>
                    )}
                  </div>

                  <div className="col-md-4">
                    <div className="form-check form-switch mb-2">
                      <input className="form-check-input" type="checkbox" role="switch" checked={formData.isOrdered} onChange={(e) => setFormData({...formData, isOrdered: e.target.checked})} />
                      <label className="form-check-label fw-bold small text-dark"><FontAwesomeIcon icon={faTruck} className="me-1 text-primary-custom"/> Por Encomenda?</label>
                    </div>
                    {formData.isOrdered && (
                      <select className="form-select form-select-sm" value={formData.orderPeriod} onChange={(e) => setFormData({...formData, orderPeriod: e.target.value})}>
                        <option value="">Dias para entrega...</option>
                        {['1 dia', '2 dias', '5 dias', '7 dias', '15 dias'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="col-md-4">
                    <div className="form-check form-switch mb-2">
                      <input className="form-check-input" type="checkbox" role="switch" checked={formData.isGuaranteed} onChange={(e) => setFormData({...formData, isGuaranteed: e.target.checked})} />
                      <label className="form-check-label fw-bold small text-dark"><FontAwesomeIcon icon={faShieldAlt} className="me-1 text-success"/> Tem Garantia?</label>
                    </div>
                    {formData.isGuaranteed && (
                      <select className="form-select form-select-sm" value={formData.guaranteedPeriod} onChange={(e) => setFormData({...formData, guaranteedPeriod: e.target.value})}>
                        <option value="">Período...</option>
                        {['1 mês', '3 meses', '6 meses', '12 meses'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn bg-primary-custom text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm">
                  <FontAwesomeIcon icon={faSave} className="me-2" /> {isEditing ? 'Guardar Alterações' : 'Criar Produto'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica do Produto */}
      {showDetailsModal && selectedProduct && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">Ficha de Produto Completa</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowDetailsModal(false)} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            
            <div className="card-body p-4">
              <div className="row">
                <div className="col-md-5 text-center mb-3 mb-md-0">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.nome} className="img-fluid rounded-4 shadow-sm border w-100" style={{ objectFit: 'cover', height: '200px' }} />
                  ) : (
                    <div className="bg-light rounded-4 d-flex justify-content-center align-items-center text-muted border border-dashed w-100" style={{ height: '200px' }}>
                      <FontAwesomeIcon icon={faImage} size="4x" />
                    </div>
                  )}
                  <div className="mt-3">
                    <span className="badge bg-light text-dark border py-2 px-3"><FontAwesomeIcon icon={faBarcode} className="me-2" />{selectedProduct.id}</span>
                  </div>
                </div>
                <div className="col-md-7">
                  <h4 className="fw-bold text-dark mb-1">{selectedProduct.nome}</h4>
                  <div className="text-muted mb-3 d-flex gap-2 flex-wrap">
                    <span className="badge bg-secondary">{typeof selectedProduct.brand === 'object' ? (selectedProduct.brand?.name || selectedProduct.brand?.nome) : (selectedProduct.brand || 'Sem marca')}</span>
                    <span className="badge bg-light text-dark border">{typeof selectedProduct.category === 'object' ? (selectedProduct.category?.name || selectedProduct.category?.nome) : selectedProduct.category}</span>
                    <span className="badge bg-light text-dark border">{typeof selectedProduct.province === 'object' ? (selectedProduct.province?.name || selectedProduct.province?.nome) : selectedProduct.province}</span>
                    {selectedProduct.seller && (
                      <span className="badge bg-primary-subtle text-primary-custom border border-primary border-opacity-25">
                        <FontAwesomeIcon icon={faStore} className="me-1" /> Fornecedor: {typeof selectedProduct.seller === 'object' ? (selectedProduct.seller?.name || selectedProduct.seller?.nome) : selectedProduct.seller}
                      </span>
                    )}
                  </div>
                  
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <h2 className="fw-bold text-primary-custom m-0">
                      {selectedProduct.onSale ? parseFloat(selectedProduct.price - (selectedProduct.price * (selectedProduct.onSalePercentage/100))).toFixed(2) : parseFloat(selectedProduct.price).toFixed(2)} MT
                    </h2>
                    {selectedProduct.onSale && (
                      <div className="text-danger">
                        <span className="badge bg-danger ms-2">-{selectedProduct.onSalePercentage}% OFF</span>
                        <br/><small className="text-decoration-line-through">{parseFloat(selectedProduct.price).toFixed(2)} MT</small>
                      </div>
                    )}
                  </div>
                  
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {selectedProduct.countInStock > 10 ? (
                      <span className="badge bg-success-subtle text-success border border-success border-opacity-25"><FontAwesomeIcon icon={faBoxOpen} className="me-1" /> {selectedProduct.countInStock} em estoque</span>
                    ) : selectedProduct.countInStock > 0 ? (
                      <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-25 text-dark"><FontAwesomeIcon icon={faBoxOpen} className="me-1" /> Apenas {selectedProduct.countInStock} uni.</span>
                    ) : (
                      <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25"><FontAwesomeIcon icon={faTimes} className="me-1" /> Esgotado</span>
                    )}

                    {selectedProduct.isOrdered && <span className="badge bg-info-subtle text-info border border-info border-opacity-25"><FontAwesomeIcon icon={faTruck} className="me-1" /> Encomenda ({selectedProduct.orderPeriod})</span>}
                    {selectedProduct.isGuaranteed && <span className="badge bg-primary-subtle text-primary-custom border border-primary border-opacity-25"><FontAwesomeIcon icon={faShieldAlt} className="me-1" /> Garantia de {selectedProduct.guaranteedPeriod}</span>}
                  </div>

                  <div className="mb-3 border-top pt-3">
                    <div className="row g-2">
                      <div className="col-6">
                        <span className="text-muted small fw-bold d-block mb-1"><FontAwesomeIcon icon={faPalette}/> Cores</span>
                        <div className="d-flex flex-wrap gap-1">
                          {selectedProduct.color?.map(c => <span key={typeof c === 'object' ? (c._id || c.name) : c} className="badge bg-light text-dark border">{typeof c === 'object' ? (c.name || c.nome) : c}</span>)}
                        </div>
                      </div>
                      <div className="col-6">
                        <span className="text-muted small fw-bold d-block mb-1"><FontAwesomeIcon icon={faRuler}/> Tamanhos</span>
                        <div className="d-flex flex-wrap gap-1">
                          {selectedProduct.size?.map(s => <span key={typeof s === 'object' ? (s._id || s.name) : s} className="badge bg-light text-dark border">{typeof s === 'object' ? (s.name || s.nome) : s}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted small fw-bold d-block mb-1">Descrição (PT)</span>
                    <p className="small text-dark mb-0">{selectedProduct.description || 'Nenhuma descrição fornecida.'}</p>
                    {selectedProduct.name && (
                      <p className="small text-muted mt-1 fst-italic">EN: {selectedProduct.name}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cursor-pointer { cursor: pointer; }
        .text-primary-custom { color: #8a2be2 !important; }
        .bg-primary-custom { background-color: #8a2be2 !important; }
        .bg-primary-subtle { background-color: #f3e8ff !important; }
        .bg-success-subtle { background-color: #d1e7dd !important; }
        .bg-warning-subtle { background-color: #fff3cd !important; }
        .bg-danger-subtle { background-color: #f8d7da !important; }
        .bg-info-subtle { background-color: #cff4fc !important; }
        .border-dashed { border-style: dashed !important; border-color: #ccc !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
