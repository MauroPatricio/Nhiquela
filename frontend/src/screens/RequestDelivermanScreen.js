import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faCreditCard,  faLocation, faLocationArrow, faMobile } from '@fortawesome/free-solid-svg-icons';
import { faTextSlash } from '@fortawesome/free-solid-svg-icons';


import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import {useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useContext, useEffect, useReducer, useState } from 'react';
import { Store } from '../Store.js';
import { toast } from 'react-toastify';
import { getError } from '../utils.js';
import LoadingBox from '../components/LoadingBox.js';
import CountryFlag from 'react-country-flag';

import { useTranslation } from 'react-i18next';
import { faCar } from '@fortawesome/free-solid-svg-icons';

const reducer = (state, action) => {
  switch (action.type) {

    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, documentTypes: action.payload.documentTypes,  pages: action.payload.pages};

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };

      case 'FETCH_REQUEST_PROVINCE':
        return { ...state, loading: true };
  
      case 'FETCH_SUCCESS_PROVINCE':
        return { ...state, loading: false, provinces: action.payload.provinces,  pages: action.payload.pages};
  
      case 'FETCH_FAIL_PROVINCE':
        return { ...state, loading: false, error: action.payload };

    case 'USER_REQUEST':
      return { ...state, loadingUser: true };

    case 'USER_SIGNIN':
      return { ...state, registerUser: action.payload, loadingUser: false };

    case 'USER_FAIL':
      return { ...state, registerUserFail: action.payload, loadingUser: false };

      case 'UPLOAD_REQUEST':
        return { ...state, loadingUpload: true };
  
      case 'UPLOAD_SUCCESS':
        return { ...state, loadingUpload: false, errorUpload: '' };
  
      case 'UPLOAD_FAIL':
        return { ...state, errorUpload: action.payload, loadingUpload: false };

    default:
      return state;
  }
};
export default function RequestDelivermanScreen() {
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const { t } = useTranslation();
  const navigate = useNavigate();

  const { requestDeliverman } = state;

  const [name, setName] = useState(requestDeliverman && requestDeliverman.name?requestDeliverman.name:'');
  const [phoneNumber, setPhoneNumber] = useState(requestDeliverman && requestDeliverman.phoneNumber?requestDeliverman.phoneNumber:'');
  const [goodType, setGoodType] = useState(requestDeliverman && requestDeliverman.goodType?requestDeliverman.goodType:'');
  const [transportType, setTransportType] = useState(requestDeliverman && requestDeliverman.transportType?requestDeliverman.transportType:'');
  const [deliverCity, setDeliverCity] =  useState(requestDeliverman && requestDeliverman.deliverCity?requestDeliverman.deliverCity:'');
  const [origin, setOrigin] =  useState(requestDeliverman && requestDeliverman.origin?requestDeliverman.origin:'');
  const [destination, setDestination] =  useState(requestDeliverman && requestDeliverman.destination?requestDeliverman.destination:'');
  const [paymentOption, setPaymentOption] =  useState(requestDeliverman && requestDeliverman.paymentOption?requestDeliverman.paymentOption:'');
  const [description, setDescription] =  useState(requestDeliverman && requestDeliverman.description?requestDeliverman.description:'');


  const transportTypes = [
    { _id: 1, name: 'Motorizada' }
  ];


  const goodTypes = [
    { _id: 1, name: 'Alimentos e bebidas' },    
    { _id: 2, name: 'Documentos' },
    { _id: 3, name: 'Medicamentos' },
    { _id: 4, name: 'Flores e presentes' },
    { _id: 5, name: 'Outros' }

  ];

  const paymentOptions = [
    { _id: 1, name: 'Mpesa' },    
    { _id: 2, name: 'Emola' },
    // { _id: 3, name: 'BCI' }

  ];



  const [
    {
      loadingUser,
      provinces
    },
    dispatch
  ] = useReducer(reducer, { loadingUser: false, registerUserFail:[], registerUser: {} });


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  
  const submitHandler = async (e) => {
    e.preventDefault();
    if(phoneNumber.length!==9){
      toast.error('O número de telefone deve possuir 9 digitos');
      return
    }
    if((!phoneNumber.startsWith('82')&&!phoneNumber.startsWith('83') && !phoneNumber.startsWith('84')&&!phoneNumber.startsWith('85')&&!phoneNumber.startsWith('86')&&!phoneNumber.startsWith('87')) ){
      toast.error('Número de operadora incorrecto');
      return
    }

    ctxDispatch({
      type: 'ADD_REQUEST_DELIVERMAN',
      payload: { name ,phoneNumber,  goodType, transportType, deliverCity, origin, destination, paymentOption,description},
    });
     
    navigate('/requestdelivermanconfirm');
  
  };

  // useEffect(() => {
  //   if (userInfo) {
  //     navigate(redirect);
  //   }
  // }, [navigate, redirect, userInfo]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });

        const { data } = await axios.get('/api/documents');
        
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
   
      fetchData();
    
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST_PROVINCE' });

        const { data } = await axios.get('/api/provinces');
        
        dispatch({ type: 'FETCH_SUCCESS_PROVINCE', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL_PROVINCE', payload: getError(err) });
      }
    };
      fetchData();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  return (
    <Container className="small-conteiner">
      <Helmet>
        <title>{t('requestdeliveryman')}</title>
      </Helmet>
      <h1 className="my-3">{t('requestdeliveryman')}</h1>
      <Form onSubmit={submitHandler}>


      <Form.Group className="mb-3" controlId="ordername">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('ordername')}</Form.Label>
          <Form.Control
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </Form.Group>

        
        <Form.Group className="mb-3" controlId="phoneNumber">
          <FontAwesomeIcon icon={faMobile} /> <Form.Label>{t('orderphone')}:  <CountryFlag countryCode="MZ" svg className="mz-flag" /> [+258]</Form.Label>
          <Form.Control
            type="text"
            max={9}
            maxLength={9}
            pattern="[0-9]*"
            title="Insira apenas números"
            placeholder="8********"
            required
            value={phoneNumber}

            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="paymentOptions">
          <FontAwesomeIcon icon={faCreditCard} /> <Form.Label>{t('paymentmethod')}</Form.Label>
            <Form.Select aria-label={t('paymentmethod')}
          value={paymentOption}
          onChange={(e)=>setPaymentOption(e.target.value)} required>
            <option value="">{t('select')}</option>
            {paymentOptions && paymentOptions.map(payment => (
            <option key={payment._id} value={payment.name}>
              {payment.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="transportType">
          <FontAwesomeIcon icon={faCar} /> <Form.Label>{t('transporttypetoroder')}</Form.Label>
            <Form.Select aria-label={t('transporttypetoroder')}
          value={transportType}
          onChange={(e)=>setTransportType(e.target.value)} required>
            <option value="">{t('select')}</option>
            {transportTypes && transportTypes.map(transport => (
            <option key={transport._id} value={transport.name}>
              {transport.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="goodType">
          <FontAwesomeIcon icon={faBox} /> <Form.Label>{t('typeofgoodtodeliver')}</Form.Label>
            <Form.Select aria-label={t('typeofgoodtodeliver')}
          value={goodType}
          onChange={(e)=>setGoodType(e.target.value)} required>
            <option value="">{t('select')}</option>
            {goodTypes && goodTypes.map(good => (
            <option key={good._id} value={good.name}>
              {good.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>



        <Form.Group className="mb-3" controlId="sellerLocation">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('province')}</Form.Label>
            <Form.Select aria-label={t('province')}
          value={deliverCity}
          onChange={(e)=>setDeliverCity(e.target.value)} required>
            <option value="">{t('select')}</option>
            {provinces && provinces.map(province => (
            <option key={province._id} value={province.name}>
              {province.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="origin">
          <FontAwesomeIcon icon={faLocation} /> <Form.Label>{t('origin')}</Form.Label>
          <Form.Control
            type="text"
            value={origin}
            as="textarea"
            required
            onChange={(e) => {
              setOrigin(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="destination">
          <FontAwesomeIcon icon={faLocationArrow} /> <Form.Label>{t('destination')}</Form.Label>
          <Form.Control
            type="text"
            value={destination}
            as="textarea"
            required
            onChange={(e) => {
              setDestination(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="description">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('detailsofdeliver')}</Form.Label>
          <Form.Control
            type="text"
            value={description}
            as="textarea"
            required
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </Form.Group>
       
        <div className="mb-3">
          <Button className='customButtom' variant='light' disabled={loadingUser} type="submit">{t('next')}</Button>
          {loadingUser&&<LoadingBox></LoadingBox>}
        </div>
      </Form>
    </Container>
  );
}
