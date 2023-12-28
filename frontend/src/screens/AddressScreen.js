import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Store } from '../Store.js';
import { useNavigate } from 'react-router-dom';
import CheckoutSteps from '../components/CheckoutSteps.js';
import Container from 'react-bootstrap/esm/Container';
import { useTranslation } from 'react-i18next';

export default function AddressScreen() {
  const { t } = useTranslation();

  const { state, dispatch: ctxDispatch } = useContext(Store);

  const { cart } = state;
  const [fullName, setFullName] = useState(cart.address.fullName || '');
  const [city, setCity] = useState(cart.address.city ||'');
  const [address, setAddress] = useState(cart.address.address ||'');
  const [referenceAddress, setReferenceAddress] = useState(cart.address.referenceAddress ||'');
  const [phoneNumber, setPhoneNumber] = useState(cart.address.phoneNumber ||'');
  const [alternativePhoneNumber, setAlternativePhoneNumber] = useState(cart.address.alternativePhoneNumber ||'');

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
        

  const submitHandler = (e) => {
    e.preventDefault();
    ctxDispatch({
      type: 'SAVE_ADDRESS',
      payload: {
        fullName,
        city,
        address,
        referenceAddress,
        phoneNumber,
        alternativePhoneNumber
      },
    });
    localStorage.setItem(
      'address',
      JSON.stringify({
        fullName,
        city,
        address,
        referenceAddress,
        phoneNumber,
        alternativePhoneNumber
      })
    );
    navigate('/payment');
  };

  return (
    <div>
      <Container className="small-container">
      <Helmet>
        <title>{t('deliveryaddress')}</title>
      </Helmet>
      <CheckoutSteps step1 ></CheckoutSteps>
      <div className="container small-container">
        <h1 className="my-3">{t('deliveryaddressdetails')}</h1>
        <br></br>
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-3" controlId="fullName">
            <Form.Label>{t('nameoforderreceiver')}</Form.Label>
            <Form.Control
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            ></Form.Control>
          </Form.Group>

          <Form.Group className="mb-3" controlId="phoneNumber">
            <Form.Label>{t('numbertocall')}</Form.Label>
            <Form.Control
              value={phoneNumber}
              placeholder="8********"
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            ></Form.Control>
          </Form.Group>


          <Form.Group className="mb-3" controlId="alternativePhoneNumber">
            <Form.Label>{t('alternativenumberoptional')}</Form.Label>
            <Form.Control
              placeholder="8********"
              value={alternativePhoneNumber}
              onChange={(e) => setAlternativePhoneNumber(e.target.value)}
            ></Form.Control>
          </Form.Group>
 
          <Form.Group className="mb-3" controlId="fullcityname">
          <Form.Label>{t('deliveryplace')}</Form.Label>
          <Form.Select aria-label="Cidade"
          value={city}
          onChange={(e)=>setCity(e.target.value)} required>
            <option value="">{t('select')}</option>
            <option value="Maputo Cidade">Maputo cidade</option>
            <option value="Maputo Provincia">Maputo província</option>
          </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="address">
            <Form.Label>{t('address')}</Form.Label>
            <Form.Control
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            ></Form.Control>
          </Form.Group>
          <Form.Group className="mb-3" controlId="reference">
            <Form.Label>
              {t('additionalinformation')}
            </Form.Label>
          <Form.Control
                as="textarea"
                placeholder={t('providemoredetails')}
                value={referenceAddress}
                onChange={(e) => setReferenceAddress(e.target.value)}
                required
              ></Form.Control>
          </Form.Group>
          <div>
            <Button className='customButtom' variant="light" type="submit">
            {t('next')}
            </Button>
          </div>
        </Form>
      </div>
    </Container>
    </div>
  );
}
