import React, { useContext, useEffect } from 'react';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { Row, Col } from 'react-bootstrap';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Store } from '../Store';
import { useTranslation } from 'react-i18next';



export default function AdicionalInfoHeader() {
  const { t } = useTranslation();

  const { state, } = useContext(Store);

  const { userInfo } = state;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Row className="bg-color-row" style={{ textAlign: 'center', marginBottom: '10px'}}>
    <Col md={12} className='delivery-info' style={{textAlign: 'center', }}>
    <b>{t('delivertime')} <FontAwesomeIcon icon={faClock}/> 7:30 {t('as')} 18:30</b>
    </Col>
    <Col md={12}style={{textAlign: 'center',  marginBottom: '10px'}}>
     {userInfo && userInfo.isSeller && !userInfo.isApproved && <b className='not-approved-seller' >{t('sellernotauthorizedyet')}</b>}
    </Col>
  </Row>

  );
}
