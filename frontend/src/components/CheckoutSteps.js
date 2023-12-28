import React, { useContext, useEffect } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link } from 'react-router-dom';
import { Store } from '../Store';
import { useTranslation } from 'react-i18next';


export default function CheckoutSteps(props) {
  // Adicionar condicao para verificar se existe um local storage criado
  // Caso exista ele podera navegar nas telas alternativas

  const { state } = useContext(Store);
  const { userInfo } = state;
  const { t } = useTranslation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <Row className="steps">

      <Col className={props.step1 ? 'active' : ''}>
      {userInfo ? <Link to="/address" className="link">{t('address')}</Link>: <Link className="link">{t('address')}</Link>}

      </Col>
      <Col className={props.step2 ? 'active' : ''}>
        {userInfo ? <Link to="/payment" className="link">{t('paymentmethods')}</Link>: <Link className="link">{t('paymentmethods')}</Link>}

      </Col>
      <Col className={props.step3 ? 'active' : ''}>
        <Link className="link"></Link>
        {userInfo ? <Link to="/deliveryoption" className="link">{t('deliveryoptions')}</Link>: <Link className="link">{t('deliveryoptions')}</Link>}

      </Col>
      <Col className={props.step4 ? 'active' : ''}>
        <Link className="link"></Link>
        {userInfo ? <Link to="/placeorder" className="link">{t('confirmorder')}</Link>: <Link className="link">{t('confirmorder')}</Link>}
      </Col>

      <Col className={props.step5 ? 'active' : ''}>
        <Link className="link">{t('login')}</Link>
      </Col>
    </Row>
  );
}
