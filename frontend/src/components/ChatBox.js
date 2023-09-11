import React, { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';

import socketIOClient from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage } from '@fortawesome/free-solid-svg-icons';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import {FaWhatsapp } from "react-icons/fa";

const ENDPOINT =
  window.location.host.indexOf('localhost') >= 0
    ? 'http://127.0.0.1:5000'
    : window.location.host;

export default function ChatBox(props) {
  const { userInfo } = props;
  const [socket, setSocket] = useState(null);
  const uiMessagesRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { name: 'Admin', body: 'Ola, como podemos ajudar?.' },
  ]);

  useEffect(() => {
    if (uiMessagesRef.current) {
      uiMessagesRef.current.scrollBy({
        top: uiMessagesRef.current.clientHeight,
        left: 0,
        behavior: 'smooth',
      });
    }
    if (socket) {
      socket.emit('onLogin', {
        _id: userInfo._id,
        name: userInfo.name,
        isAdmin: userInfo.isAdmin,
      });
      socket.on('message', (data) => {
        setMessages([...messages, { body: data.body, name: data.name }]);
      });
    }
  }, [messages, isOpen, socket, userInfo]);

  const supportHandler = () => {
    setIsOpen(true);
    const sk = socketIOClient(ENDPOINT);
    setSocket(sk);
  };
  const submitHandler = (e) => {
    e.preventDefault();

    const whatsappURL = 'https://wa.me/message/2HLEYV6VTD7BF1';


    // Open the URL in a new browser tab
    window.open(whatsappURL, '_blank')    
    // if (!messageBody.trim()) {
    //   alert('Error. Please type message.');
    // } else {
    //   setMessages([...messages, { body: messageBody, name: userInfo.name }]);
    //   setMessageBody('');
    //   setTimeout(() => {
    //     socket.emit('onMessage', {
    //       body: messageBody,
    //       name: userInfo.name,
    //       isAdmin: userInfo.isAdmin,
    //       _id: userInfo._id,
    //     });
    //   }, 1000);
    // }
  };
  const closeHandler = () => {
    setIsOpen(false);
  };

  return (
    <div className="chatbox">
      {!isOpen ? (
        <>
          <Button
            type="button"
            className="floating-button"
            onClick={supportHandler}
          >
            <FontAwesomeIcon icon={faMessage} />
          </Button>
        </>
      ) : (
        <>
          {/* <Card>
                <Card.Body>
                <strong>Suporte</strong>
                <Button type='button' onClick={closeHandler}>
                                <FontAwesomeIcon icon={faClose}/>
                                </Button>
                                <ul ref={uiMessagesRef}>
                                        {messages.map((msg, index)=>(
                                            <li key={index}>
                                                <strong>{`${msg.name}: `}</strong>{msg.body}
                                            </li>
                             ))}
                            </ul>
                </Card.Body>
            </Card> */}

          <div className="card card-body">
            <div className="chat-size message">
              <strong>Suporte</strong>
              <Button
                type="button"
                variant="light"
                className="customButtom close space-end"
                onClick={closeHandler}
              >
                <FontAwesomeIcon icon={faClose} />
              </Button>
              <ul className="margin-top" ref={uiMessagesRef}>
                {messages.map((msg, index) => (
                  <li key={index}>
                    <strong>{`${msg.name}: `}</strong>
                    {msg.body}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <form onSubmit={submitHandler} className="row">
                {/* <input
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  type="text"
                  placeholder="Adicione uma mensagem"
                /> */}
                <Button className="customButtom" variant="light" type="submit">
                  Suporte pelo nosso whatsapp    
                    <FaWhatsapp></FaWhatsapp>
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
