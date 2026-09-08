import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentAlt, faTimes, faPaperPlane, faRobot, faUser,
  faEnvelope, faPhone, faExternalLinkAlt, faHeadset, faBox, faStore, faTruck
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Olá! Bem-vindo ao Suporte da nhiquela. Como podemos ajudar você hoje?',
      timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen, messages]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setHasUnread(false);
  };

  const handleOptionClick = (optionKey) => {
    let userText = '';
    let botReply = '';
    let showContactOptions = false;

    switch (optionKey) {
      case 'track':
        userText = '📦 Como posso rastrear o meu pedido?';
        botReply = 'Você pode acompanhar todos os seus pedidos em tempo real na seção "Meus Pedidos" da sua conta ou diretamente pelo aplicativo móvel nhiquela.';
        break;
      case 'seller':
        userText = '🏪 Como cadastrar minha loja e vender na nhiquela?';
        botReply = 'Para vender na nhiquela, basta clicar em "Vender na nhiquela" no menu principal ou efetuar o registo como Fornecedor. É simples e rápido!';
        break;
      case 'delivery':
        userText = '🚚 Dúvidas sobre entregas e taxas';
        botReply = 'As entregas são efetuadas por motoristas parceiros. A tarifa é calculada de acordo com a distância e o número de paragens da rota.';
        break;
      case 'human':
        userText = '💬 Preciso falar com a equipe de suporte humana';
        botReply = 'Para questões importantes ou atendimento direto com a nossa equipe:';
        showContactOptions = true;
        break;
      default:
        break;
    }

    const newMessages = [
      ...messages,
      {
        id: Date.now(),
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: botReply,
        showContacts: showContactOptions,
        timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const text = inputMessage.trim();
    const textLower = text.toLowerCase();

    let botReply = 'Obrigado pela sua mensagem! Para atendimento direto ou questões importantes, pode contatar o nosso suporte via WhatsApp ou E-mail abaixo:';
    let showContacts = true;

    if (textLower.includes('pedido') || textLower.includes('rastre') || textLower.includes('onde esta')) {
      botReply = 'Para consultar o estado atual do seu pedido, aceda a "Meus Pedidos" no seu perfil ou acompanhe em tempo real pelo app móvel.';
    } else if (textLower.includes('loja') || textLower.includes('vender') || textLower.includes('fornecedor')) {
      botReply = 'Para criar uma conta de Fornecedor e vender produtos na Nhiquela, aceda à página de Registo de Fornecedor no menu principal.';
    }

    const newMessages = [
      ...messages,
      {
        id: Date.now(),
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: botReply,
        showContacts,
        timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
    setInputMessage('');
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE DO CHATBOT */}
      <div className="position-fixed" style={{ bottom: '28px', right: '28px', zIndex: 1050 }}>
        <button
          onClick={handleToggle}
          className="btn rounded-circle shadow-lg d-flex justify-content-center align-items-center position-relative text-white border-0"
          style={{
            width: '62px',
            height: '62px',
            background: 'linear-gradient(135deg, #7F00FF 0%, #5B00B7 100%)',
            boxShadow: '0 8px 28px rgba(127, 0, 255, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isOpen ? 'rotate(90deg)' : 'scale(1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = isOpen ? 'rotate(90deg) scale(1.08)' : 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = isOpen ? 'rotate(90deg)' : 'scale(1)'}
          aria-label="Abrir Chatbot de Suporte"
        >
          <FontAwesomeIcon icon={isOpen ? faTimes : faCommentAlt} size="lg" />
          {hasUnread && !isOpen && (
            <span
              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-2 border-white shadow-sm"
              style={{ fontSize: '10px', padding: '4px 7px', background: 'linear-gradient(135deg, #FF3B30 0%, #E02020 100%)' }}
            >
              1
            </span>
          )}
        </button>
      </div>

      {/* JANELA DO CHATBOT */}
      {isOpen && (
        <div
          className="position-fixed shadow-2xl rounded-4 border-0 overflow-hidden d-flex flex-column"
          style={{
            bottom: '102px',
            right: '28px',
            width: '385px',
            maxWidth: 'calc(100vw - 36px)',
            height: '540px',
            maxHeight: 'calc(100vh - 125px)',
            zIndex: 1050,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(127, 0, 255, 0.08)',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* CABEÇALHO DO CHATBOT */}
          <div
            className="p-3.5 px-4 text-white d-flex align-items-center justify-content-between position-relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7F00FF 0%, #5B00B7 50%, #45008B 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex justify-content-center align-items-center shadow-sm"
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: '#FFFFFF',
                  color: '#7F00FF',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                <FontAwesomeIcon icon={faRobot} size="lg" />
              </div>
              <div>
                <h6 className="m-0 fw-bold text-white fs-6 tracking-wide">Assistente Nhiquela</h6>
                <div className="d-flex align-items-center gap-1.5 mt-0.5" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>
                  <span
                    className="rounded-circle d-inline-block shadow-sm"
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#10B981',
                      boxShadow: '0 0 8px #10B981'
                    }}
                  ></span>
                  <span className="fw-semibold">Suporte Online 24/7</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-sm text-white-50 p-1.5 rounded-circle d-flex align-items-center justify-content-center border-0"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#FFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <FontAwesomeIcon icon={faTimes} size="sm" />
            </button>
          </div>

          {/* CORPO DO CHAT - MENSAGENS */}
          <div
            className="p-3.5 flex-grow-1 overflow-auto"
            style={{
              backgroundColor: '#F8FAFC',
              fontSize: '13.5px',
              backgroundImage: 'radial-gradient(rgba(127, 0, 255, 0.03) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`d-flex flex-column mb-3.5 ${msg.sender === 'user' ? 'align-items-end' : 'align-items-start'}`}
              >
                <div className="d-flex align-items-start gap-2" style={{ maxWidth: '88%' }}>
                  {msg.sender === 'bot' && (
                    <div
                      className="rounded-circle text-white d-flex justify-content-center align-items-center flex-shrink-0 mt-1 shadow-sm"
                      style={{
                        width: '30px',
                        height: '30px',
                        background: 'linear-gradient(135deg, #7F00FF 0%, #6800D3 100%)',
                        fontSize: '12px'
                      }}
                    >
                      <FontAwesomeIcon icon={faRobot} />
                    </div>
                  )}

                  <div
                    className="p-3 shadow-sm position-relative"
                    style={{
                      backgroundColor: msg.sender === 'user' ? '#7F00FF' : '#FFFFFF',
                      backgroundImage: msg.sender === 'user' ? 'linear-gradient(135deg, #7F00FF 0%, #6800D3 100%)' : 'none',
                      color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                      border: msg.sender === 'user' ? 'none' : '1px solid rgba(226, 232, 240, 0.85)',
                      borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: msg.sender === 'user'
                        ? '0 4px 14px rgba(127, 0, 255, 0.25)'
                        : '0 4px 16px rgba(15, 23, 42, 0.04)',
                      lineHeight: '1.5'
                    }}
                  >
                    <div className="fw-medium">{msg.text}</div>

                    {/* BOTÕES DE CONTATO DIRETO (WHATSAPP E E-MAIL) */}
                    {(msg.showContacts || msg.id === 1) && (
                      <div className="mt-3 pt-3 border-top" style={{ borderColor: 'rgba(226, 232, 240, 0.8)' }}>
                        <div className="d-flex align-items-center gap-1.5 mb-2.5">
                          <span
                            className="rounded-pill d-inline-block"
                            style={{ width: '4px', height: '14px', backgroundColor: '#7F00FF' }}
                          ></span>
                          <span className="fw-bold text-dark text-xs" style={{ letterSpacing: '0.2px', fontSize: '11.5px' }}>
                            Canais para Questões Importantes:
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-2">
                          {/* WhatsApp Button */}
                          <a
                            href="https://wa.me/258853600036?text=Ola%20Nhiquela,%20preciso%20de%20suporte%20sobre%20o%20meu%20pedido."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm w-100 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2 py-2 text-decoration-none shadow-sm text-white"
                            style={{
                              background: 'linear-gradient(135deg, #25D366 0%, #12B852 100%)',
                              border: 'none',
                              fontSize: '12.5px',
                              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                              transition: 'transform 0.2s ease, boxShadow 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            <FontAwesomeIcon icon={faWhatsapp} size="lg" />
                            <span>WhatsApp (853600036)</span>
                            <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '10px', opacity: 0.8 }} />
                          </a>

                          {/* Email Button */}
                          <a
                            href="mailto:nhiquelaservicos@gmail.com?subject=Suporte%20Nhiquela%20-%20Questao%20Importante"
                            className="btn btn-sm w-100 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 text-decoration-none"
                            style={{
                              backgroundColor: 'rgba(127, 0, 255, 0.06)',
                              border: '1px solid rgba(127, 0, 255, 0.18)',
                              color: '#6B00D7',
                              fontSize: '12px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(127, 0, 255, 0.12)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(127, 0, 255, 0.06)'; }}
                          >
                            <FontAwesomeIcon icon={faEnvelope} style={{ color: '#7F00FF' }} />
                            <span>nhiquelaservicos@gmail.com</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-muted mt-1 px-1 fw-semibold" style={{ fontSize: '10px', opacity: 0.75 }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* OPÇÕES RÁPIDAS NO INÍCIO */}
            {messages.length <= 2 && (
              <div
                className="bg-white p-3 rounded-4 shadow-sm my-2 position-relative overflow-hidden"
                style={{
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  borderTop: '3px solid #7F00FF'
                }}
              >
                <div className="d-flex align-items-center gap-1.5 mb-2.5">
                  <span className="fw-bold text-dark text-xs" style={{ fontSize: '12px', color: '#0F172A' }}>
                    Perguntas Frequentes:
                  </span>
                </div>

                <div className="d-flex flex-column gap-2">
                  <button
                    onClick={() => handleOptionClick('track')}
                    className="btn btn-sm text-start rounded-3 text-dark d-flex align-items-center gap-2.5 py-2 px-3 border-0"
                    style={{
                      backgroundColor: '#F1F5F9',
                      fontSize: '12.5px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(127, 0, 255, 0.08)'; e.currentTarget.style.color = '#7F00FF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                  >
                    <div className="rounded-circle d-flex justify-content-center align-items-center" style={{ width: '24px', height: '24px', backgroundColor: 'rgba(127, 0, 255, 0.12)', color: '#7F00FF', fontSize: '11px' }}>
                      <FontAwesomeIcon icon={faBox} />
                    </div>
                    <span className="fw-medium">Como rastrear pedido?</span>
                  </button>

                  <button
                    onClick={() => handleOptionClick('seller')}
                    className="btn btn-sm text-start rounded-3 text-dark d-flex align-items-center gap-2.5 py-2 px-3 border-0"
                    style={{
                      backgroundColor: '#F1F5F9',
                      fontSize: '12.5px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.08)'; e.currentTarget.style.color = '#10B981'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                  >
                    <div className="rounded-circle d-flex justify-content-center align-items-center" style={{ width: '24px', height: '24px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontSize: '11px' }}>
                      <FontAwesomeIcon icon={faStore} />
                    </div>
                    <span className="fw-medium">Vender / Criar Loja</span>
                  </button>

                  <button
                    onClick={() => handleOptionClick('delivery')}
                    className="btn btn-sm text-start rounded-3 text-dark d-flex align-items-center gap-2.5 py-2 px-3 border-0"
                    style={{
                      backgroundColor: '#F1F5F9',
                      fontSize: '12.5px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.08)'; e.currentTarget.style.color = '#F59E0B'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                  >
                    <div className="rounded-circle d-flex justify-content-center align-items-center" style={{ width: '24px', height: '24px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', fontSize: '11px' }}>
                      <FontAwesomeIcon icon={faTruck} />
                    </div>
                    <span className="fw-medium">Entregas & Frete</span>
                  </button>

                  <button
                    onClick={() => handleOptionClick('human')}
                    className="btn btn-sm text-start rounded-pill fw-bold text-white d-flex align-items-center justify-content-center gap-2 py-2 px-3 border-0 shadow-sm mt-1"
                    style={{
                      background: 'linear-gradient(135deg, #7F00FF 0%, #5B00B7 100%)',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(127, 0, 255, 0.25)',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <FontAwesomeIcon icon={faHeadset} />
                    <span>Falar com Suporte Humano</span>
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* RODAPÉ DO CHAT - INPUT E BOTÃO DE ENVIAR */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white d-flex gap-2 align-items-center"
            style={{
              borderTop: '1px solid rgba(226, 232, 240, 0.85)'
            }}
          >
            <input
              type="text"
              placeholder="Escreva a sua dúvida..."
              className="form-control rounded-pill px-3.5 text-sm"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              style={{
                fontSize: '13px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                outline: 'none',
                boxShadow: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#7F00FF'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
            <button
              type="submit"
              className="btn rounded-circle text-white d-flex justify-content-center align-items-center flex-shrink-0 border-0 shadow-sm"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #7F00FF 0%, #6800D3 100%)',
                boxShadow: '0 4px 12px rgba(127, 0, 255, 0.3)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              aria-label="Enviar Mensagem"
            >
              <FontAwesomeIcon icon={faPaperPlane} size="sm" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
