import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faEdit, faTrash, faPlus, faSave, faTimes, faArrowUp, faArrowDown, faSpinner, faMobileAlt, faFilter, faChevronLeft, faChevronRight, faUserCircle, faSearch, faDownload } from '@fortawesome/free-solid-svg-icons';
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
  
  // Modal de Simulação de Levantamento (M-Pesa / e-Mola)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ amount: '', phone: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

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
    if (!withdrawData.amount || !withdrawData.phone) return toast.error('Preencha valor e telefone.');
    
    setWithdrawing(true);
    try {
      const { data } = await api.post('/wallet/withdraw', {
        amount: withdrawData.amount,
        phone: withdrawData.phone
      });
      toast.success(data.message);
      setShowWithdrawModal(false);
      setWithdrawData({ amount: '', phone: '' });
      fetchWalletData(); // Atualiza o saldo e extrato
    } catch (error) {
      toast.error('Erro ao processar o levantamento. Verifique se o telemóvel é válido (ex: 84..., 85...).');
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
          <button className="btn btn-outline-primary rounded-pill px-4 fw-bold me-3 shadow-sm bg-white" onClick={fetchWalletData} disabled={loading}>
            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Atualizar'}
          </button>
          <button className="btn bg-success text-white rounded-pill px-4 shadow-sm fw-bold" onClick={() => setShowWithdrawModal(true)}>
            <FontAwesomeIcon icon={faMobileAlt} className="me-2" /> Simular Levantamento
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
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : `${(balances.available || 0).toFixed(2)} ${balances.currency || 'MZN'}`}
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
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : `${(balances.pending || 0).toFixed(2)} ${balances.currency || 'MZN'}`}
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
                  <th className="border-0 text-muted py-3 px-4">ID Transação</th>
                  <th className="border-0 text-muted py-3">Data</th>
                  <th className="border-0 text-muted py-3">Agente / Utilizador</th>
                  <th className="border-0 text-muted py-3">Descrição do Lançamento</th>
                  <th className="border-0 text-muted py-3 text-end px-4">Valor (MT)</th>
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
                  const phoneUser = extractPhone(t.description);
                  
                  return (
                    <tr key={t._id || t.id || Math.random().toString()}>
                      <td className="px-4 text-muted small fw-bold">{t._id || t.id}</td>
                      <td className="text-muted small">
                        <div>{isNaN(dateObj) ? 'Data Inválida' : dateObj.toLocaleDateString()}</div>
                        <div style={{fontSize: '10px'}}>{isNaN(dateObj) ? '' : dateObj.toLocaleTimeString()}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon icon={faUserCircle} className="text-muted me-2 fs-5" />
                          <span className="fw-bold text-dark">{phoneUser}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center py-1">
                          <div className={`rounded-circle d-flex justify-content-center align-items-center me-3 shadow-sm ${isCredit ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`} style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                            <FontAwesomeIcon icon={isCredit ? faArrowUp : faArrowDown} />
                          </div>
                          <span className="fw-bold text-dark" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</span>
                        </div>
                      </td>
                      <td className={`text-end px-4 fw-bold ${isCredit ? 'text-success' : 'text-danger'}`}>
                        {isCredit ? '+' : '-'}{parseFloat(t.amount || 0).toFixed(2)}
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
              <h5 className="fw-bold m-0 text-dark">Simulador: M-Pesa / e-Mola</h5>
              <button className="btn btn-sm btn-light rounded-circle text-muted" onClick={() => setShowWithdrawModal(false)} style={{ width: '35px', height: '35px' }} disabled={withdrawing}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="card-body p-4">
              <div className="alert alert-info border-0 rounded-3 small">
                <FontAwesomeIcon icon={faMobileAlt} className="me-2" />
                Vai testar o endpoint B2C <code>/api/wallet/withdraw</code>.
              </div>
              <form onSubmit={handleWithdraw}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">Telemóvel (ex: 84 ou 86...)</label>
                  <input type="text" className="form-control bg-light border-0 py-3 rounded-3" value={withdrawData.phone} onChange={(e) => setWithdrawData({...withdrawData, phone: e.target.value})} placeholder="Ex: 841234567" required disabled={withdrawing} />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted mb-1">Valor do Levantamento (MT)</label>
                  <input type="number" className="form-control bg-light border-0 py-3 rounded-3 fw-bold" value={withdrawData.amount} onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})} placeholder="0.00" required disabled={withdrawing} />
                  <div className="text-end mt-1">
                    <small className="text-muted">A plataforma reterá 1% de taxa.</small>
                  </div>
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
