import React, { useContext } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link } from 'react-router-dom';
import { Store } from '../Store';

export default function CheckoutSteps(props) {
  // Adicionar condicao para verificar se existe um local storage criado
  // Caso exista ele podera navegar nas telas alternativas

  const { state } = useContext(Store);
  const { userInfo } = state;

  return (
    <Row className="steps">

      <Col className={props.step1 ? 'active' : ''}>
      {userInfo ? <Link to="/address" className="link">Endereço</Link>: <Link className="link">Endereço</Link>}

      </Col>
      <Col className={props.step2 ? 'active' : ''}>
        {userInfo ? <Link to="/payment" className="link">Formas de pagamento</Link>: <Link className="link">Formas de pagamento</Link>}

      </Col>
      <Col className={props.step3 ? 'active' : ''}>
        <Link className="link"></Link>
        {userInfo ? <Link to="/deliveryoption" className="link">Opções de entrega</Link>: <Link className="link">Opções de entrega</Link>}

      </Col>
      <Col className={props.step4 ? 'active' : ''}>
        <Link className="link"></Link>
        {userInfo ? <Link to="/placeorder" className="link">Confirmar pedido</Link>: <Link className="link">Confirmar pedido</Link>}
      </Col>

      <Col className={props.step5 ? 'active' : ''}>
        <Link className="link">Login</Link>
      </Col>
    </Row>
  );
}
