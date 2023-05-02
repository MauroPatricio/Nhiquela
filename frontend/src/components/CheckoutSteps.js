import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link } from 'react-router-dom';

export default function CheckoutSteps(props) {
  // Adicionar condicao para verificar se existe um local storage criado
  // Caso exista ele podera navegar nas telas alternativas
  return (
    <Row className="steps">
      <Col className={props.step1 ? 'active' : ''}>
        <Link className="link">Login</Link>
      </Col>
      <Col className={props.step2 ? 'active' : ''}>
        <Link className="link">Endereço</Link>
      </Col>
      <Col className={props.step3 ? 'active' : ''}>
        <Link className="link">Método de Pagamento</Link>
      </Col>
      <Col className={props.step4 ? 'active' : ''}>
        <Link className="link">Confirmar Pedido</Link>
      </Col>
    </Row>
  );
}
