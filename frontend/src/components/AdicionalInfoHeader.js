import React, { useContext } from 'react';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { Row, Col } from 'react-bootstrap';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Store } from '../Store';



export default function AdicionalInfoHeader() {
  const { state, } = useContext(Store);

  const { userInfo } = state;
  return (
    <Row className="bg-color-row" style={{ textAlign: 'center', marginBottom: '10px'}}>
    <Col md={12} className='delivery-info' style={{textAlign: 'center', }}>
    <b>Entregas disponíveis para Maputo cidade e província a partir das <FontAwesomeIcon icon={faClock}/> 7:30 as 18:00</b>
    </Col>
    <Col md={12}style={{textAlign: 'center',  marginBottom: '10px'}}>
     {userInfo && userInfo.isSeller && !userInfo.isApproved && <b className='not-approved-seller' >A sua conta ainda não foi autorizada para poder expor os seus produtos. Para mais informações, por favor contacte a Nhiquela Shop pelos contactos abaixo.</b>}
    </Col>
  </Row>

  );
}
