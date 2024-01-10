import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Store } from '../Store.js';
import { useNavigate } from 'react-router-dom';
import CheckoutSteps from '../components/CheckoutSteps.js';
import Container from 'react-bootstrap/esm/Container';
import { useTranslation } from 'react-i18next';

export default function DeliveryOptionScreen() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  
  const {
    cart: { address, deliveryOptionValue },
  } = state;

  const [deliveryOption, setDeliveryOption] = useState(
    deliveryOptionValue || 'includeDelivery'
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useEffect(() => {
    if (!address.address) {
      navigate('/address');
    }
  }, [address, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    ctxDispatch({ type: 'SAVE_DELIVERY_OPTION', payload: deliveryOption });
    navigate('/placeorder');
  };

  return (
    <div>
      <Container className="small-conteiner">
        <CheckoutSteps step1 step2 step3></CheckoutSteps>
        <Helmet>
          <title>{t('deliveryoptions')}</title>
        </Helmet>
        <div className="container small-container">
          <h1>{t('deliveryoptions')}</h1>
          <Form onSubmit={submitHandler}>
            <div className="mb-3">
              
               <Form.Check
                type="radio"
                label={t('includedelivery')}
                id="include"
                value="includeDelivery"
                checked={deliveryOption === 'includeDelivery'}
                onChange={(e) => setDeliveryOption(e.target.value)}
              ></Form.Check>

              <Form.Check
                type="radio"
                label={t('takestoreinperson')}
                id="without"
                value="withoutDelivery"
                checked={deliveryOption === 'withoutDelivery'}
                onChange={(e) => setDeliveryOption(e.target.value)}
              ></Form.Check>

             
            </div>
            <div className="mb-3">
              <Button className='customButtom' variant='light' type="submit">{t('next')}</Button>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  );
}
