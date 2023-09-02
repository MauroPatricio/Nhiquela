import React from 'react';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { Row, Col } from 'react-bootstrap';
import { BsShieldFillCheck } from "react-icons/bs";
import {GiBackwardTime} from "react-icons/gi";
import {FaUserShield} from "react-icons/fa";

export default function PaybackInfoAndSecurity() {


  return (
    <>
    
    <Row className="bg-color-row-pay" >
    <Col md={4}>
<FaUserShield className="info-icon-home" />
           Privacidade de seus dados
    </Col>
    <Col md={4}>
<GiBackwardTime className="info-icon-home" />
            Garantia de devolução do valor
    </Col>
    <Col md={4}>
        <BsShieldFillCheck className="info-icon-home"/>
       Pagamentos Seguros
      </Col>
  </Row>
    </>

  );
}
