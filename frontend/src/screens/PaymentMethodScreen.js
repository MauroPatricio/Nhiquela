import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Store } from '../Store.js';
import { useNavigate } from 'react-router-dom';
import CheckoutSteps from '../components/CheckoutSteps';
import Container from 'react-bootstrap/esm/Container';
import { useTranslation } from 'react-i18next';

export default function PaymentMethodScreen() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  
  const {
    cart: { address, paymentMethod },
  } = state;

  const [paymentMethodName, setPaymentMethod] = useState(
    paymentMethod || 'Mpesa'
  );

  useEffect(() => {
    if (!address.address) {
      navigate('/address');
    }
  }, [address, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    ctxDispatch({ type: 'SAVE_PAYMENT_METHOD', payload: paymentMethodName });
    navigate('/deliveryoption');
  };

  return (
    <div>
      <Container className="small-conteiner">
        <CheckoutSteps step1 step2></CheckoutSteps>
        <Helmet>
          <title>{t('paymentmethod')}</title>
        </Helmet>
        <div className="container small-container">
          <h1>{t('paymentmethod')}</h1>
          <Form onSubmit={submitHandler}>
            <div className="mb-3">
              {/* <Form.Check
                type="radio"
                label="Em dinheiro"
                id="Dinheiro"
                value="Dinheiro"
                checked={paymentMethodName === 'Dinheiro'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              ></Form.Check> */}
              
               <Form.Check
                type="radio"
                label="Mpesa"
                id="Mpesa"
                value="Mpesa"
                checked={paymentMethodName === 'Mpesa'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              ></Form.Check>

              <Form.Check
                type="radio"
                label="Emola"
                id="Emola"
                value="Emola"
                checked={paymentMethodName === 'Emola'}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
