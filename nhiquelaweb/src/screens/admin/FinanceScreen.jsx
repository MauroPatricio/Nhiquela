import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faEdit, faTrash, faPlus, faSave, faTimes, faArrowUp, faArrowDown, faSpinner, faMobileAlt, faFilter, faChevronLeft, faChevronRight, faUserCircle, faSearch, faDownload, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../../components/Admin/PaginationControls';

export default function FinanceScreen() {
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({ available: 0, pending: 0, currency: 'MZN' });
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterType, setFilterType] = useState('all'); // 'all', 'credit', 'debit'
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ amount: '', reason: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [financeEmails, setFinanceEmails] = useState('');
  const [financeEmailSettingId, setFinanceEmailSettingId] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState('');

  const openReceiptModal = (url) => {
    setCurrentReceiptUrl(url);
    setShowReceiptModal(true);
  };

  useEffect(() => {
    fetchWalletData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      const emailSetting = data.find(s => s.key === 'finance_emails');
      if (emailSetting) {
        setFinanceEmailSettingId(emailSetting._id);
        setFinanceEmails(emailSetting.value);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de email:', error);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      if (financeEmailSettingId) {
        await api.put(`/settings/${financeEmailSettingId}`, { value: financeEmails });
      } else {
        const { data } = await api.post('/settings', { 
          key: 'finance_emails', 
          value: financeEmails, 
          description: 'Emails para notificação de recargas pendentes (separados por vírgula)' 
        });
        setFinanceEmailSettingId(data.setting._id);
      }
      toast.success('Notificações de email configuradas com sucesso!');
      setShowSettingsModal(false);
    } catch (error) {
      toast.error('Erro ao guardar configurações de email.');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [balanceRes, transRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions')
      ]);
      setBalances({
        available: balanceRes.data.available_balance,
        pending: balanceRes.data.pending_balance,
        currency: balanceRes.data.currency
      });
      // Sort newest first just in case
      const sortedTransactions = (transRes.data || []).sort((a, b) => new Date(b.createdAt || b.created_at || b.date) - new Date(a.createdAt || a.created_at || a.date));
      setTransactions(sortedTransactions);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar os dados financeiros da API. Certifique-se que o backend está a correr.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawData.amount) return toast.error('Preencha o valor.');
    if (!withdrawData.reason) return toast.error('Preencha o motivo.');
    
    setWithdrawing(true);
    try {
      const { data } = await api.post('/wallet/withdraw', {
        amount: withdrawData.amount,
        reason: withdrawData.reason
      });
      toast.success(data.message);
      setShowWithdrawModal(false);
      setWithdrawData({ amount: '', reason: '' });
      fetchWalletData(); // Atualiza o saldo e extrato
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao processar o levantamento. Verifique o saldo.');
    } finally {
      setWithdrawing(false);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return toast.info('Não há transações para exportar.');
    
    const headers = ['Data', 'Tipo', 'Descrição', 'Referência', 'Montante', 'Status'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => {
        const date = new Date(t.createdAt || t.created_at || t.date).toLocaleString('pt-MZ');
        const type = t.type === 'credit' ? 'Crédito' : 'Débito';
        const description = `"${(t.description || '').replace(/"/g, '""')}"`;
        const ref = t.reference || '';
        const amount = t.amount;
        const status = t.status || 'completed';
        return `${date},${type},${description},${ref},${amount},${status}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `extrato_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Ficheiro CSV gerado com sucesso!');
  };

  // Aplica filtro (todos, credit, debit) phone numbers from description
  const extractPhone = (desc) => {
    if (!desc) return "Sistema";
    const phoneMatch = desc.match(/(?:para|por|de)\s+(8[45627]\d{7})/i) || desc.match(/\b(8[45627]\d{7})\b/);
    if (phoneMatch) return phoneMatch[1];
    if (desc.toLowerCase().includes('taxa')) return "Nhiquela (Taxa)";
    return "Sistema";
  };

  // Filter Logic based on type
  const typeFilteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  // Apply usePagination hook for search and pagination on top of type filter
  const {
    currentPage, searchQuery, setSearchQuery, currentData: currentTransactions,
    totalPages, nextPage, prevPage, totalItems, indexOfFirstItem, indexOfLastItem
  } = usePagination(typeFilteredTransactions, 10, ['description', 'id', '_id']);

  return (
    <div className="animation-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Carteira & Financeiro</h2>
          <span className="text-muted small">Conectado ao Backend API - Levantamentos e Extratos Reais</span>
        </div>
        <div>
          <button className="btn btn-outline-secondary rounded-pill px-3 fw-bold me-2 shadow-sm bg-white" onClick={() => setShowSettingsModal(true)}>
            <FontAwesomeIcon icon={faEnvelope} className="me-2" /> Notificações
          </button>
          <button className="btn btn-outline-primary rounded-pill px-4 fw-bold me-2 shadow-sm bg-white" onClick={fetchWalletData} disabled={loading}>
            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Atualizar'}
          </button>
          <button className="btn btn-success rounded-pill px-4 shadow-sm fw-bold d-flex align-items-center" onClick={() => setShowWithdrawModal(true)}>
          <FontAwesomeIcon icon={faMobileAlt} className="me-2" />
          Levantar
        </button>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm-custom border-0 rounded-4 bg-primary-subtle border border-primary border-opacity-25 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon icon={faMoneyBillWave} className="text-primary-custom me-2" />
                <span className="text-muted fw-bold text-uppercase">Saldo Disponível</span>
              </div>
              <h3 className="fw-bold text-dark m-0">
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : `${(balances.available || 0).toFixed(2)} ${balances.currency || 'MT'}`}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm-custom border-0 rounded-4 bg-warning bg-opacity-10 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon icon={faArrowUp} className="text-warning me-2" />
                <span className="text-muted fw-bold text-uppercase">Saldo Pendente (Aguardando Libertação)</span>
              </div>
              <h3 className="fw-bold text-dark m-0">
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : `${(balances.pending || 0).toFixed(2)} ${balances.currency || 'MT'}`}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm-custom border-0 rounded-4">
        <div className="card-header bg-white border-0 pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold m-0 text-dark">Extrato Contabilístico (Ledger API)</h5>
          
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-outline-secondary rounded-pill px-4 shadow-sm fw-bold d-flex align-items-center" onClick={exportToCSV}>
              <FontAwesomeIcon icon={faDownload} className="me-2" />
              Exportar CSV
            </button>
            <div className="position-relative" style={{ width: '200px' }}>
              <FontAwesomeIcon icon={faSearch} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
              <input 
                type="text" 
                className="form-control form-control-sm bg-light border-0 rounded-pill ps-5" 
                placeholder="Pesquisar..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center bg-light rounded-pill px-3 py-1">
              <FontAwesomeIcon icon={faFilter} className="text-muted me-2" />
              <select 
                className="form-select form-select-sm border-0 bg-transparent fw-bold text-muted"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
              >
                <option value="all">Todas Transações</option>
                <option value="credit">Entradas (+)</option>
                <option value="debit">Saídas (-)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 text-muted py-3 px-4">Data</th>
                  <th className="border-0 text-muted py-3">Agente / Utilizador</th>
                  <th className="border-0 text-muted py-3">Descrição do Lançamento</th>
                  <th className="border-0 text-muted py-3 text-end">Valor (MT)</th>
                  <th className="border-0 text-muted py-3 text-center px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5"><FontAwesomeIcon icon={faSpinner} spin className="text-primary-custom mb-2" /><p className="text-muted">A carregar ledger da API...</p></td></tr>
                ) : currentTransactions.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">Nenhum registo financeiro encontrado.</td></tr>
                ) : currentTransactions.map(t => {
                  const rawDate = t.createdAt || t.created_at || t.date;
                  const dateObj = new Date(rawDate);
                  const isCredit = t.type === 'credit';
                  
                  let phoneUser = extractPhone(t.description) || 'Sistema';
                  let nameUser = '';
                  
                  if (t.walletId && t.walletId.ownerId) {
                    phoneUser = t.walletId.ownerId.phoneNumber || t.walletId.ownerId.phone || phoneUser;
                    nameUser = t.walletId.ownerId.name || 'Utilizador';
                  }

                  const extractedUrl = t.receiptImage || (t.description?.includes('http') ? t.description.match(/https?:\/\/[^\s]+/)?.[0] : null);
                  
                  let displayDescription = t.description || '';
                  if (displayDescription.includes('Recarga Manual. Comprovativo:')) {
                    displayDescription = 'Recarga Manual (Saldo). Comprovativo';
                  } else if (displayDescription.includes('http')) {
                    displayDescription = displayDescription.replace(/https?:\/\/[^\s]+/, '').trim();
                  }

                  return (
                    <tr key={t._id || t.id || Math.random().toString()}>
                      <td className="px-4 text-muted small">
                        <div>{isNaN(dateObj) ? 'Data Inválida' : dateObj.toLocaleDateString()}</div>
                        <div style={{fontSize: '10px'}}>{isNaN(dateObj) ? '' : dateObj.toLocaleTimeString()}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon icon={faUserCircle} className="text-muted me-2 fs-5" />
                          <div className="d-flex flex-column">
                            {nameUser ? <span className="fw-bold text-dark">{nameUser}</span> : null}
                            <span className={t.status === 'falhado' ? "text-danger small fw-bold" : (nameUser ? "text-muted small" : "fw-bold text-dark")}>{phoneUser}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center py-1">
                          <div className={`rounded-circle d-flex justify-content-center align-items-center me-3 shadow-sm ${isCredit ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`} style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                            <FontAwesomeIcon icon={isCredit ? faArrowUp : faArrowDown} />
                          </div>
                          <span className="fw-bold text-dark" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayDescription}</span>
                        </div>
                      </td>
                      <td className={`text-end fw-bold ${t.status === 'falhado' ? 'text-danger text-decoration-line-through' : (isCredit ? 'text-success' : 'text-danger')}`}>
                        {isCredit ? '+' : '-'}{parseFloat(t.amount || 0).toFixed(2)}
                      </td>
                      <td className="text-center px-4">
                        <div className="d-flex justify-content-center gap-2">
                          {extractedUrl && (
                            <button 
                              className="btn btn-sm btn-outline-primary rounded-pill px-3"
                              onClick={() => openReceiptModal(extractedUrl)}
                              title="Ver Comprovativo"
                            >
                              Ver Recibo
                            </button>
                          )}
                          {t.status === 'pendente' && isCredit && (
                            <>
                              <button 
                                className="btn btn-sm btn-success rounded-pill px-3"
                                onClick={async () => {
                                  try {
                                    await api.put(`/wallet/${t._id || t.id}/authorize-topup`);
                                    toast.success('Recarga aprovada com sucesso!');
                                    fetchWalletData();
                                  } catch (err) {
                                    toast.error('Erro ao aprovar recarga');
                                  }
                                }}
                                title="Aprovar Recarga"
                              >
                                Aprovar
                              </button>
                              <button 
                                className="btn btn-sm btn-danger rounded-pill px-3"
                                onClick={async () => {
                                  if(window.confirm('Tem a certeza que deseja rejeitar esta recarga?')) {
                                    try {
                                      await api.put(`/wallet/${t._id || t.id}/reject-topup`);
                                      toast.success('Recarga rejeitada!');
                                      fetchWalletData();
                                    } catch (err) {
                                      toast.error('Erro ao rejeitar recarga');
                                    }
                                  }
                                }}
                                title="Rejeitar Recarga"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          {t.status === 'pendente' && !isCredit && (
                            <span className="badge bg-warning text-dark align-self-center">Pendente</span>
                          )}
                          {t.status === 'falhado' && (
                            <span className="badge bg-danger align-self-center px-3 py-2 rounded-pill">Rejeitado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
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

      {showWithdrawModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">Levantar</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowWithdrawModal(false)} style={{ width: '35px', height: '35px' }} disabled={withdrawing}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <div className="alert alert-info border-0 rounded-3 small">
                <FontAwesomeIcon icon={faMobileAlt} className="me-2" />
                Levantamento para M-Pesa / e-Mola via endpoint <code>/api/wallet/withdraw</code>.
              </div>
              <form onSubmit={handleWithdraw}>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Valor a Levantar (MT)</label>
                  <input type="number" className="form-control bg-light border-0 py-3 rounded-3 fw-bold mb-3" value={withdrawData.amount} onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})} placeholder="0.00" required disabled={withdrawing} />

                  <label className="form-label fw-bold small text-muted mb-1">Motivo do Levantamento</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={withdrawData.reason} onChange={(e) => setWithdrawData({...withdrawData, reason: e.target.value})} placeholder="Ex: Pagamento a parceiro" required disabled={withdrawing} />
                </div>
                
                <button type="submit" className="btn bg-success text-white w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm" disabled={withdrawing || balances.available <= 0}>
                  {withdrawing ? (
                    <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Processando Gateway...</>
                  ) : (
                    <><FontAwesomeIcon icon={faMoneyBillWave} className="me-2" /> Processar Levantamento</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '90%', maxWidth: '600px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">Comprovativo</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowReceiptModal(false)} style={{ width: '35px', height: '35px' }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4 text-center">
              <img src={currentReceiptUrl} alt="Comprovativo da Transação" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-lg border-0 rounded-4 animation-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0 text-dark">Notificações Financeiras</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowSettingsModal(false)} style={{ width: '35px', height: '35px' }} disabled={savingSettings}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <div className="alert alert-primary border-0 rounded-3 small">
                <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                Adicione os emails que deverão ser notificados quando houver novos pedidos de recarga de carteira.
              </div>
              <form onSubmit={handleSaveSettings}>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Emails (separados por vírgula)</label>
                  <textarea 
                    className="form-control bg-light border-0 py-3 rounded-3" 
                    rows="3"
                    value={financeEmails} 
                    onChange={(e) => setFinanceEmails(e.target.value)} 
                    placeholder="exemplo@nhiquela.com, admin@nhiquela.com" 
                    required 
                    disabled={savingSettings} 
                  />
                </div>
                
                <button type="submit" className="btn btn-primary w-100 py-3 rounded-pill fw-bold d-flex justify-content-center align-items-center shadow-sm" disabled={savingSettings}>
                  {savingSettings ? (
                    <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> A guardar...</>
                  ) : (
                    <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Configurações</>
                  )}
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
        .bg-success-subtle { background-color: #d1e7dd !important; }
        .bg-danger-subtle { background-color: #f8d7da !important; }
        .animation-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

