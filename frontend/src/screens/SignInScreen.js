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
import {Modal} from 'react-bootstrap';
import CountryFlag from 'react-country-flag';
import { useTranslation } from 'react-i18next';


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
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        <title>{t('homescreen')}</title>
      </Helmet>
      <CheckoutSteps step1 step2 step3 step4 step5></CheckoutSteps>
      <h1 className="my-3">Login</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="phoneNumber">
          <FontAwesomeIcon icon={faMobile} /> <Form.Label>{t('phone')}:</Form.Label> <CountryFlag countryCode="MZ" svg className="mz-flag" /> [+258]        


          <Form.Control
            type="text"
            required
            placeholder="Número de telefone ou email"
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="password">
          <FontAwesomeIcon icon={faLock} /> <Form.Label>{t('password')}</Form.Label>
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
          <Button className='customButtom' variant='light' type="submit">{t('login')}</Button>
        </div>
        <div className="mb-3">
          {t('newaccount')}?{' '}
          <Link className="link" to={`/signup?redirect=${redirect}`}>{t('createaccount')}</Link>
        </div>
        <div className="mb-3">
          {t('forgotpassword')}?{' '}
          <Link className="link" to={`/forget-password`}>{t('updatepassword')}</Link>
        </div>

 
 
      <Modal show={isModalOpen}  onClick={closeModal}  className='modal'
       
        >
        <Modal.Header closeButton onClick={closeModal}>
          <Modal.Title>Erro de acesso</Modal.Title>
        </Modal.Header>
        <Modal.Body>
         {message}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={closeModal}>
            Ok
          </Button>
        </Modal.Footer>
      </Modal>
      </Form>
    </Container>
  );
}
