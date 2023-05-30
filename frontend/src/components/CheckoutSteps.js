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
        <Link className="link">Login</Link>
      </Col>
      <Col className={props.step2 ? 'active' : ''}>
      {userInfo ? <Link to="/address" className="link">Endereço</Link>: <Link className="link">Endereço</Link>}

      </Col>
      <Col className={props.step3 ? 'active' : ''}>
        {userInfo ? <Link to="/payment" className="link">Formas de Pagamento</Link>: <Link className="link">Formas de Pagamento</Link>}

      </Col>
      <Col className={props.step4 ? 'active' : ''}>
        <Link className="link"></Link>
        {userInfo ? <Link to="/placeorder" className="link">Confirmar Pedido</Link>: <Link className="link">Confirmar Pedido</Link>}

      </Col>
    </Row>
  );
}
