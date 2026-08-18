import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faCommentDots, faImage, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api, { SOCKET_URL } from '../../api';
import { io } from 'socket.io-client';

export default function OrderChatPanel({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchChat();

    // Setup socket
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.emit('joinOrderRoom', orderId);

    socket.on('newOrderMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChat = async () => {
    try {
      const { data } = await api.get(`/order-chats/${orderId}`);
      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e, fileUrl = null, fileType = null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !fileUrl) return;

    try {
      await api.post(`/order-chats/${orderId}/messages`, { 
        message: newMessage,
        fileUrl,
        fileType
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data) {
        await handleSendMessage(null, data, 'image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="card shadow-sm border mt-4">
      <div className="card-header bg-white border-bottom p-3">
        <h6 className="fw-bold m-0 text-primary-custom">
          <FontAwesomeIcon icon={faCommentDots} className="me-2" /> Chat do Pedido
        </h6>
      </div>
      <div className="card-body p-3" style={{ height: '300px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
        {loading ? (
          <div className="text-center text-muted mt-5">A carregar chat...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted mt-5">Sem mensagens neste pedido.</div>
        ) : (
          messages.map((msg, idx) => {
            const isAdmin = msg.sender?.isAdmin;
            const isSeller = msg.sender?.isSeller;
            
            return (
              <div key={idx} className={`d-flex flex-column mb-3 ${isAdmin ? 'align-items-end' : 'align-items-start'}`}>
                <div 
                  className={`p-2 px-3 rounded-3 shadow-sm ${isAdmin ? 'bg-primary-custom text-white' : isSeller ? 'bg-success text-white' : 'bg-white border'}`}
                  style={{ maxWidth: '80%' }}
                >
                  <div className="small fw-bold mb-1" style={{ opacity: 0.8, fontSize: '0.7rem' }}>
                    {msg.sender?.name || 'Sistema'} ({isAdmin ? 'Equipa de Suporte' : (isSeller ? 'Vendedor' : 'Cliente')})
                  </div>
                  {msg.message && <div>{msg.message}</div>}
                  {msg.fileUrl && msg.fileType === 'image' && (
                    <div className="mt-2">
                      <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                        <img src={msg.fileUrl} alt="Comprovativo" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'cover' }} />
                      </a>
                    </div>
                  )}
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
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
          <button 
            type="button" 
            className="btn btn-light rounded-circle shadow-sm" 
            style={{ width: '40px', height: '40px' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
          >
            {uploadingImage ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faImage} className="text-secondary" />}
          </button>
          
          <input
            type="text"
            className="form-control rounded-pill bg-light border-0"
            placeholder="Escreva uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          
          <button type="submit" className="btn bg-primary-custom text-white rounded-circle shadow-sm" style={{ width: '40px', height: '40px' }} disabled={uploadingImage}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </form>
      </div>
    </div>
  );
}
