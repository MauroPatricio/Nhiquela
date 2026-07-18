import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import api, { SOCKET_URL } from '../../api';
import { io } from 'socket.io-client';

export default function TripChatPanel({ tripId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchChat();

    // Setup socket
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.emit('join_trip_chat', { tripId });

    socket.on('receive_trip_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [tripId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChat = async () => {
    try {
      const { data } = await api.get(`/trip-chat/${tripId}`);
      if (data && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.post(`/trip-chat/${tripId}/message`, { message: newMessage });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="card shadow-sm border mt-4">
      <div className="card-header bg-white border-bottom p-3">
        <h6 className="fw-bold m-0 text-primary-custom">
          <FontAwesomeIcon icon={faCommentDots} className="me-2" /> Chat da Viagem
        </h6>
      </div>
      <div className="card-body p-3" style={{ height: '300px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
        {loading ? (
          <div className="text-center text-muted mt-5">A carregar chat...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted mt-5">Sem mensagens nesta viagem.</div>
        ) : (
          messages.map((msg, idx) => {
            const isAdmin = msg.senderType === 'admin';
            const isClient = msg.senderType === 'client';
            
            return (
              <div key={idx} className={`d-flex flex-column mb-3 ${isAdmin ? 'align-items-end' : 'align-items-start'}`}>
                <div 
                  className={`p-2 px-3 rounded-3 shadow-sm ${isAdmin ? 'bg-primary-custom text-white' : isClient ? 'bg-white border' : 'bg-success text-white'}`}
                  style={{ maxWidth: '80%' }}
                >
                  <div className="small fw-bold mb-1" style={{ opacity: 0.8, fontSize: '0.7rem' }}>
                    {isAdmin ? 'Equipa de Suporte' : (isClient ? 'Cliente' : 'Motorista')}
                  </div>
                  <div>{msg.message}</div>
                </div>
                <div className="text-muted mt-1 mx-1" style={{ fontSize: '0.65rem' }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="card-footer bg-white border-top p-2">
        <form onSubmit={handleSendMessage} className="d-flex gap-2">
          <input
            type="text"
            className="form-control rounded-pill bg-light border-0"
            placeholder="Escreva uma mensagem de suporte..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit" className="btn bg-primary-custom text-white rounded-circle shadow-sm" style={{ width: '40px', height: '40px' }}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </form>
      </div>
    </div>
  );
}
