import React, { useContext, useEffect } from 'react';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { Row, Col } from 'react-bootstrap';
import { BsShieldFillCheck } from "react-icons/bs";
import {GiBackwardTime} from "react-icons/gi";
import {FaUserShield} from "react-icons/fa";
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Store } from '../Store';

export default function PaybackInfoAndSecurity() {
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const { cart, userInfo } = state;

  return (
    <>
    
    <Row className="bg-color-row" style={{padding: '10px' , marginLeft: '10px', marginRight: '10px', marginBottom:'5px', textAlign: 'center'}}>
    <Col md={4}>
        <BsShieldFillCheck className="info-icon-home"/>
       Pagamentos Seguros
      </Col>
    <Col md={4}>
<GiBackwardTime className="info-icon-home" />
            Garantia de devolução do valor
    </Col>
    <Col md={4}>
<FaUserShield className="info-icon-home" />
           Privacidade de seus dados
    </Col>
  </Row>
    </>

  );
}
