import React from 'react';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { Row, Col } from 'react-bootstrap';
import { BsShieldFillCheck } from "react-icons/bs";
import {GiBackwardTime} from "react-icons/gi";
import {FaUserShield} from "react-icons/fa";
import { useTranslation } from 'react-i18next';

export default function PaybackInfoAndSecurity() {
  const { t } = useTranslation();


  return (
    <>
    
    <Row className="bg-color-row-pay" >
    <Col md={4}>
<FaUserShield className="info-icon-home" />
           {t('privacydata')}
    </Col>
    <Col md={4}>
<GiBackwardTime className="info-icon-home" />
           {t('moneybackguarantee')}
    </Col>
    <Col md={4}>
        <BsShieldFillCheck className="info-icon-home"/>
       {t('securepayments')}
      </Col>
  </Row>
    </>

  );
}
