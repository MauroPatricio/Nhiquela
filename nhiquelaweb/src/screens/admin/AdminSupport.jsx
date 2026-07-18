import React, { useState, useEffect } from 'react';
import api from '../../api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faUser, faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const { userInfo } = useSelector((state) => state.user);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/support');
      setTickets(res.data);
    } catch (error) {
      toast.error('Erro ao buscar tickets de suporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    try {
      const res = await api.post(`/support/${activeTicket._id}/reply`, { message: replyMessage });
      toast.success('Resposta enviada.');
      setReplyMessage('');
      
      // Update local state to reflect new reply
      const updatedTicket = res.data.ticket;
      setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      setActiveTicket(updatedTicket);
    } catch (error) {
      toast.error('Erro ao enviar resposta.');
    }
  };

  return (
    <div className="p-6 h-[80vh] flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Suporte & Resolução de Conflitos</h1>
      
      <div className="flex bg-white rounded-xl shadow-lg border border-gray-100 flex-1 overflow-hidden">
        {/* Lista de Tickets (Esquerda) */}
        <div className="w-1/3 border-r border-gray-100 flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
            Tickets Abertos ({tickets.length})
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <p className="p-4 text-gray-500">A carregar...</p>
            ) : tickets.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">Nenhum ticket encontrado.</p>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket._id} 
                  onClick={() => setActiveTicket(ticket)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${activeTicket?._id === ticket._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-800 text-sm truncate">{ticket.subject}</h4>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {ticket.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">{ticket.message}</p>
                  <p className="text-[10px] text-gray-400">De: {ticket.user?.name || 'Utilizador'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat (Direita) */}
        <div className="w-2/3 flex flex-col bg-gray-50">
          {activeTicket ? (
            <>
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                <div>
                  <h3 className="font-bold text-gray-800">{activeTicket.subject}</h3>
                  <p className="text-xs text-gray-500">Cliente: {activeTicket.user?.name} | Categoria: {activeTicket.category}</p>
                </div>
              </div>
              
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Mensagem Inicial do Cliente */}
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faUser} className="text-white text-xs" />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-800">{activeTicket.message}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(activeTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Respostas */}
                {activeTicket.replies?.map((reply, index) => {
                  const isAdmin = reply.user === userInfo._id || reply.user?._id === userInfo._id;
                  
                  return (
                    <div key={index} className={`flex gap-3 max-w-[80%] ${isAdmin ? 'self-end flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <FontAwesomeIcon icon={isAdmin ? faTicketAlt : faUser} className="text-white text-xs" />
                      </div>
                      <div className={`p-3 rounded-2xl shadow-sm border ${isAdmin ? 'bg-blue-600 text-white rounded-tr-none border-blue-700' : 'bg-white text-gray-800 rounded-tl-none border-gray-100'}`}>
                        <p className="text-sm">{reply.message}</p>
                        <span className={`text-[10px] mt-1 block ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Caixa de Texto */}
              <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleReply} className="flex gap-2 relative">
                  <input 
                    type="text" 
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Escreva a sua resposta..." 
                    className="flex-1 bg-gray-100 border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button type="submit" disabled={!replyMessage.trim()} className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50">
                    <FontAwesomeIcon icon={faPaperPlane} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <FontAwesomeIcon icon={faTicketAlt} className="text-6xl mb-4 text-gray-300" />
              <p>Selecione um ticket para ver os detalhes e responder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
