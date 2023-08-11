import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobile } from '@fortawesome/free-solid-svg-icons';
import { faLock } from '@fortawesome/free-solid-svg-icons';


import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import { Store } from '../Store.js';
import { toast } from 'react-toastify';
import CheckoutSteps from '../components/CheckoutSteps';
import ReactModal from 'react-modal';
import CountryFlag from 'react-country-flag';


ReactModal.setAppElement('#root'); // Set the root element as the app element

export default function SignInScreen() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const urlToRedirect = new URLSearchParams(search).get('redirect');
  const redirect = urlToRedirect ? urlToRedirect : '/';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [message, setMessage] = useState('');


  const closeModal = () => {
    setIsModalOpen(false);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/users/signin', {
        phoneNumber,
        password,
      });

      ctxDispatch({ type: 'USER_SIGNIN', payload: data });

      navigate(redirect || '/');
    } catch (err) {
      setIsModalOpen(true);
      setMessage(err.response.data.message)
      toast.error(err.response.data.message);
    }
  };

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  return (
    <Container className="small-conteiner">
      <Helmet>
        <title>Tela Inicial</title>
      </Helmet>
      <CheckoutSteps step1 step2 step3 step4 step5></CheckoutSteps>
      <h1 className="my-3">Login</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="phoneNumber">
          <FontAwesomeIcon icon={faMobile} /> <Form.Label>Telefone:</Form.Label> <CountryFlag countryCode="MZ" svg className="mz-flag" /> [+258]        


          <Form.Control
            type="number"
            required
            placeholder="8********"
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="password">
          <FontAwesomeIcon icon={faLock} /> <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            required
            placeholder="******"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </Form.Group>
        <div className="mb-3">
          <Button className='customButtom' variant='light' type="submit">Login</Button>
        </div>
        <div className="mb-3">
          Nova Conta?{' '}
          <Link className="link" to={`/signup?redirect=${redirect}`}>Criar conta</Link>
        </div>
        <div className="mb-3">
          Esqueceu a senha?{' '}
          <Link className="link" to={`/forget-password`}>Actualizar senha</Link>
        </div>

        <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Modal"
        className="modal-content"
      >
        <h5>Erro de Acesso</h5>
        <p>{message}</p>
        <Button  onClick={closeModal}>Ok</Button>
      </ReactModal>
      </Form>
    </Container>
  );
}
