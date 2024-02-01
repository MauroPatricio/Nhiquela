import React, { useEffect } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxesPacking } from '@fortawesome/free-solid-svg-icons';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { faHistory } from '@fortawesome/free-solid-svg-icons';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { FaShippingFast } from "react-icons/fa";
import { BsFillBagCheckFill } from "react-icons/bs";
import { BsPersonFillCheck } from "react-icons/bs";
import { useTranslation } from 'react-i18next';





export default function RequestDeliverSteps(props) {
  const { t } = useTranslation();

  // Adicionar condicao para verificar se existe um local storage criado
  // Caso exista ele podera navegar nas telas alternativas
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container-steps">
      <Row className="steps">
        <Col className={props.status==='Pendente'? 'active' : ''}>
       <FontAwesomeIcon icon={faHistory} className={props.status==='Pendente' ? 'active icon-active' : ''}></FontAwesomeIcon><br/>
       {t('pending')}<br/>
       <br/>
        </Col>
 
        <Col className={props.status==='Aceite pelo entregador' ? 'active' : ''}>
        <BsPersonFillCheck  className={props.status==='Aceite pelo entregador' ? 'active icon-active' : ''}></BsPersonFillCheck><br/>
        {t('acceptedbydeliveryman')}<br/>
       <br/>
        </Col>

        <Col className={props.status==='Em trânsito' ? 'active' : ''}>
        <FaShippingFast  className={props.status==='Em trânsito' ? 'active icon-active' : ''}></FaShippingFast><br/>
        {t('intransit')}<br/>
       <br/>
        </Col>
        <Col className={props.status==='No destino indicado' ? 'active' : ''}>
        <FontAwesomeIcon icon={faLocationDot} className={props.status==='No destino indicado' ? 'active icon-active' : ''}></FontAwesomeIcon><br/>
        {t('atdestination')}<br/>
       <br/>
        </Col>
        <Col className={props.status==='Finalizado' ? 'active' : ''}>
        <FontAwesomeIcon icon={faCheckCircle} className={props.status==='Finalizado' ? 'active icon-active' : ''} ></FontAwesomeIcon><br/>
       {t('delivered')}<br/>
       <br/>        
       </Col>
      </Row>
    </div>
  );
}
