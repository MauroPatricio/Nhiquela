import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxesPacking } from '@fortawesome/free-solid-svg-icons';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { faWalking } from '@fortawesome/free-solid-svg-icons';
import { faHistory } from '@fortawesome/free-solid-svg-icons';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';

export default function OrderSteps(props) {
  // Adicionar condicao para verificar se existe um local storage criado
  // Caso exista ele podera navegar nas telas alternativas
  return (
    <div className="container-steps">
      <Row className="steps">
        <Col className={props.status==='Pendente'? 'active' : ''}>
       <FontAwesomeIcon icon={faHistory} className={props.status==='Pendente' ? 'active icon-active' : ''}></FontAwesomeIcon><br/>
       Pendente<br/>
       <br/>
        </Col>
        <Col className={props.status==='Aceite' ? 'active' : ''}>
        <FontAwesomeIcon icon={faBoxesPacking} className={props.status==='Aceite' ? 'active icon-active' : ''}></FontAwesomeIcon><br/>
       Aceite/a caminho do fornecedor<br/>
       <br/>
        </Col>
        <Col className={props.status==='Em trânsito' ? 'active' : ''}>
        <FontAwesomeIcon icon={faWalking} className={props.status==='Em trânsito' ? 'active icon-active' : ''}></FontAwesomeIcon><br/>
        Em trânsito<br/>
       <br/>
        </Col>
        <Col className={props.status==='Cheguei ao destino' ? 'active' : ''}>
        <FontAwesomeIcon icon={faLocationDot} className={props.status==='Cheguei ao destino' ? 'active icon-active' : ''}></FontAwesomeIcon><br/>
        Cheguei ao destino<br/>
       <br/>
        </Col>
        <Col className={props.status==='Finalizado' ? 'active' : ''}>
        <FontAwesomeIcon icon={faCheckCircle} className={props.status==='Finalizado' ? 'active icon-active' : ''} ></FontAwesomeIcon><br/>
       Entregue<br/>
       <br/>        
       </Col>
      </Row>
    </div>
  );
}
