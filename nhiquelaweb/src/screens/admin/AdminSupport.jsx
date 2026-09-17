import React, { useState, useEffect } from 'react';
import api from '../../api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faUser, 
  faTicketAlt, 
  faSearch, 
  faComments, 
  faHeadset, 
  faShieldAlt, 
  faCheckCircle, 
  faClock, 
  faFilter, 
  faInbox, 
  faSync, 
  faExclamationTriangle,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { userInfo } = useSelector((state) => state.user);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/support');
      setTickets(res.data || []);
    } catch (error) {
      toast.error('Erro ao carregar tickets de suporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    try {
      const res = await api.post(`/support/${activeTicket._id}/reply`, { message: replyMessage });
      toast.success('Resposta enviada com sucesso!');
      setReplyMessage('');
      
      const updatedTicket = res.data.ticket || res.data;
      setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      setActiveTicket(updatedTicket);
    } catch (error) {
      toast.error('Erro ao enviar resposta.');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      (ticket.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'aberto').length;
  const closedCount = tickets.filter(t => t.status === 'closed' || t.status === 'fechado').length;

  return (
    <div className="container-fluid p-4" style={{ minHeight: '88vh', backgroundColor: '#f8fafc' }}>
      
      {/* Header Banner Premium */}
      <div 
        className="rounded-4 p-4 mb-4 text-white shadow-lg position-relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="position-absolute end-0 top-0 bottom-0 d-none d-md-flex align-items-center pe-5 opacity-10" style={{ pointerEvents: 'none' }}>
          <FontAwesomeIcon icon={faHeadset} style={{ fontSize: '160px', color: '#ffffff' }} />
        </div>

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 position-relative z-1">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-white bg-opacity-20 text-white rounded-pill px-3 py-1 fw-bold fs-7">
                <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-warning" /> Central de Conflitos & Apoio
              </span>
            </div>
            <h2 className="fw-extrabold m-0 text-white tracking-tight" style={{ fontSize: '1.85rem' }}>
              Suporte & Resolução de Conflitos
            </h2>
            <p className="text-white text-opacity-75 mb-0 mt-1 small">
              Gerencie chamados de clientes, prestadores e motoristas com acompanhamento em tempo real.
            </p>
          </div>

          <div className="d-flex gap-3">
            <div className="bg-white bg-opacity-10 backdrop-blur rounded-3 px-3 py-2 border border-white border-opacity-20 text-center">
              <div className="text-white text-opacity-75 fs-7 fw-semibold">Abertos</div>
              <div className="fs-5 fw-extrabold text-warning">{openCount}</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur rounded-3 px-3 py-2 border border-white border-opacity-20 text-center">
              <div className="text-white text-opacity-75 fs-7 fw-semibold">Concluídos</div>
              <div className="fs-5 fw-extrabold text-success">{closedCount}</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur rounded-3 px-3 py-2 border border-white border-opacity-20 text-center">
              <div className="text-white text-opacity-75 fs-7 fw-semibold">Total</div>
              <div className="fs-5 fw-extrabold text-white">{tickets.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="row g-4" style={{ height: 'calc(80vh - 120px)', minHeight: '600px' }}>
        
        {/* Painel Esquerdo: Lista de Tickets */}
        <div className="col-lg-4 col-md-5 h-100">
          <div className="card border-0 shadow-sm rounded-4 h-100 d-flex flex-column bg-white overflow-hidden">
            
            {/* Header com Filtros */}
            <div className="p-3 border-bottom bg-light bg-opacity-50">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold m-0 text-dark d-flex align-items-center">
                  <FontAwesomeIcon icon={faInbox} className="text-primary me-2" />
                  Chamados ({filteredTickets.length})
                </h6>
                <button 
                  onClick={fetchTickets} 
                  className="btn btn-sm btn-light border rounded-circle shadow-sm"
                  title="Atualizar lista"
                >
                  <FontAwesomeIcon icon={faSync} className={loading ? "spin text-primary" : "text-muted"} />
                </button>
              </div>

              {/* Barra de Pesquisa */}
              <div className="input-group input-group-sm mb-2 shadow-sm rounded-3 overflow-hidden border">
                <span className="input-group-text bg-white border-0 text-muted">
                  <FontAwesomeIcon icon={faSearch} />
                </span>
                <input 
                  type="text"
                  className="form-control border-0 bg-white shadow-none"
                  placeholder="Pesquisar por assunto ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filtros por Estado */}
              <div className="btn-group w-100 btn-group-sm rounded-3 p-1 bg-white border">
                <button 
                  className={`btn border-0 rounded-2 fw-semibold ${statusFilter === 'all' ? 'btn-primary shadow-sm' : 'text-muted btn-light'}`}
                  onClick={() => setStatusFilter('all')}
                >
                  Todos
                </button>
                <button 
                  className={`btn border-0 rounded-2 fw-semibold ${statusFilter === 'open' ? 'btn-primary shadow-sm' : 'text-muted btn-light'}`}
                  onClick={() => setStatusFilter('open')}
                >
                  Abertos
                </button>
                <button 
                  className={`btn border-0 rounded-2 fw-semibold ${statusFilter === 'closed' ? 'btn-primary shadow-sm' : 'text-muted btn-light'}`}
                  onClick={() => setStatusFilter('closed')}
                >
                  Fechados
                </button>
              </div>
            </div>

            {/* Lista Scrollável */}
            <div className="flex-grow-1 overflow-auto p-2" style={{ maxHeight: '100%' }}>
              {loading ? (
                <div className="text-center p-5 text-muted">
                  <div className="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
                  <div className="small fw-semibold">Carregando chamados...</div>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center p-5 text-muted">
                  <FontAwesomeIcon icon={faInbox} className="fs-1 text-muted opacity-25 mb-3 d-block mx-auto" />
                  <p className="fw-semibold mb-1">Nenhum ticket encontrado.</p>
                  <small className="text-muted">Altere os filtros de busca para encontrar mais chamados.</small>
                </div>
              ) : (
                filteredTickets.map(ticket => {
                  const isActive = activeTicket?._id === ticket._id;
                  const isOpen = ticket.status === 'open' || ticket.status === 'aberto';

                  return (
                    <div 
                      key={ticket._id} 
                      onClick={() => setActiveTicket(ticket)}
                      className={`p-3 mb-2 rounded-3 cursor-pointer transition-all border ${
                        isActive 
                          ? 'bg-primary bg-opacity-10 border-primary shadow-sm' 
                          : 'bg-white border-light hover-shadow'
                      }`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold text-dark text-truncate" style={{ maxWidth: '70%', fontSize: '0.9rem' }}>
                          {ticket.subject || 'Sem Assunto'}
                        </span>
                        <span className={`badge rounded-pill ${isOpen ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                          {isOpen ? 'ABERTO' : 'FECHADO'}
                        </span>
                      </div>

                      <p className="text-muted mb-2 text-truncate" style={{ fontSize: '0.8rem' }}>
                        {ticket.message || 'Sem mensagem...'}
                      </p>

                      <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.72rem' }}>
                        <span className="fw-medium text-primary">
                          <FontAwesomeIcon icon={faUser} className="me-1" />
                          {ticket.user?.name || 'Cliente'}
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faClock} className="me-1 opacity-50" />
                          {new Date(ticket.createdAt).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Painel Direito: Chat & Detalhes */}
        <div className="col-lg-8 col-md-7 h-100">
          <div className="card border-0 shadow-sm rounded-4 h-100 d-flex flex-column bg-white overflow-hidden">
            {activeTicket ? (
              <>
                {/* Header do Chat */}
                <div className="p-3 px-4 border-bottom bg-white d-flex justify-content-between align-items-center shadow-xs">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="fw-bold text-dark m-0">{activeTicket.subject}</h5>
                      <span className={`badge rounded-pill ${activeTicket.status === 'open' ? 'bg-success' : 'bg-secondary'}`}>
                        {activeTicket.status?.toUpperCase() || 'ABERTO'}
                      </span>
                    </div>
                    <div className="text-muted small mt-1">
                      <span className="me-3">👤 <strong>Cliente:</strong> {activeTicket.user?.name || 'Utilizador'}</span>
                      {activeTicket.category && <span>🏷️ <strong>Categoria:</strong> {activeTicket.category}</span>}
                    </div>
                  </div>
                </div>

                {/* Área do Histórico de Mensagens */}
                <div 
                  className="flex-grow-1 overflow-auto p-4" 
                  style={{ backgroundColor: '#f1f5f9' }}
                >
                  {/* Mensagem Inicial */}
                  <div className="d-flex gap-3 mb-4 max-w-80">
                    <div 
                      className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                      style={{ width: '40px', height: '40px' }}
                    >
                      <FontAwesomeIcon icon={faUser} />
                    </div>
                    <div className="bg-white p-3 rounded-4 shadow-sm border border-light" style={{ maxWidth: '80%' }}>
                      <div className="fw-bold text-dark small mb-1">{activeTicket.user?.name || 'Cliente'}</div>
                      <p className="m-0 text-dark" style={{ fontSize: '0.92rem', lineHeight: '1.5' }}>
                        {activeTicket.message}
                      </p>
                      <small className="text-muted d-block mt-2 text-end" style={{ fontSize: '0.7rem' }}>
                        {new Date(activeTicket.createdAt).toLocaleString('pt-PT')}
                      </small>
                    </div>
                  </div>

                  {/* Respostas */}
                  {Array.isArray(activeTicket.replies) && activeTicket.replies.map((reply, idx) => {
                    const isAdmin = reply.user === userInfo?._id || reply.user?._id === userInfo?._id || reply.isAdmin;

                    return (
                      <div 
                        key={idx} 
                        className={`d-flex gap-3 mb-4 ${isAdmin ? 'justify-content-end' : ''}`}
                      >
                        {!isAdmin && (
                          <div 
                            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                            style={{ width: '40px', height: '40px' }}
                          >
                            <FontAwesomeIcon icon={faUser} />
                          </div>
                        )}

                        <div 
                          className={`p-3 rounded-4 shadow-sm border ${
                            isAdmin 
                              ? 'bg-primary text-white border-primary' 
                              : 'bg-white text-dark border-light'
                          }`}
                          style={{ maxWidth: '80%' }}
                        >
                          <div className={`fw-bold small mb-1 ${isAdmin ? 'text-white-50' : 'text-muted'}`}>
                            {isAdmin ? '🛡️ Suporte Nhiquela (Você)' : (activeTicket.user?.name || 'Cliente')}
                          </div>
                          <p className="m-0" style={{ fontSize: '0.92rem', lineHeight: '1.5' }}>
                            {reply.message}
                          </p>
                          <small className={`d-block mt-2 text-end ${isAdmin ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                            {new Date(reply.createdAt || Date.now()).toLocaleString('pt-PT')}
                          </small>
                        </div>

                        {isAdmin && (
                          <div 
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                            style={{ width: '40px', height: '40px' }}
                          >
                            <FontAwesomeIcon icon={faHeadset} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Input Form de Envio */}
                <div className="p-3 bg-white border-top">
                  <form onSubmit={handleReply} className="d-flex gap-2">
                    <input 
                      type="text" 
                      className="form-control form-control-lg rounded-pill bg-light border-0 shadow-none px-4 text-dark fs-6"
                      placeholder="Escreva a resposta para o cliente..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />
                    <button 
                      type="submit" 
                      disabled={!replyMessage.trim()}
                      className="btn btn-primary rounded-circle shadow d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '48px', height: '48px' }}
                    >
                      <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 bg-light bg-opacity-30">
                <div 
                  className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center mb-4 shadow-sm"
                  style={{ width: '100px', height: '100px', fontSize: '42px' }}
                >
                  <FontAwesomeIcon icon={faComments} />
                </div>
                <h5 className="fw-bold text-dark mb-2">Nenhum Chamado Selecionado</h5>
                <p className="text-muted small" style={{ maxWidth: '360px' }}>
                  Selecione um ticket de suporte na lista à esquerda para consultar os detalhes, responder ou resolver conflitos.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
