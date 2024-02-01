import React, { useContext, useEffect, useReducer, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
// import Form from 'react-bootstrap/Form';
import { Helmet } from 'react-helmet-async';
import Card from 'react-bootstrap/Card';
import { Store } from '../Store.js';
import {  useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {  formatedDate, getError } from '../utils';
import MessageBox from '../components/MessageBox';

import axios from 'axios';
import RequestDeliverSteps from '../components/RequestDeliverSteps.js';
import Badge from 'react-bootstrap/Badge';
import ListGroup from 'react-bootstrap/ListGroup';



const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, requestDeliv: action.payload, error: '' };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default function RequestDelivermanProgressScreen() {
  const { t } = useTranslation();

  const params = useParams();

  const { id: requestDelivId } = params;

  const [{ loading, requestDeliv }, dispatch] = useReducer(reducer, { loading: false, requestDeliv: {}});
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const { userInfo} = state;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  useEffect(() => {
    const fetchRequestDeliver = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/requestdeliver/${requestDelivId}`, {
          headers: { authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };

    if (!userInfo) {
      return navigate('/login');
    }
    fetchRequestDeliver();
    // if (!requestDeliv._id || successDeliver || (requestDeliv._id && requestDeliv._id !== requestDelivId)) {
    //   fetchRequestDeliver();
    //   if (successDeliver) {
    //     dispatch({ type: 'DELIVER_RESET' });
    //   }
    // }
    // if (loadingPayment) {
    //   fetchRequestDeliver();
    // }
    // if (loadingDestination) {
    //   fetchRequestDeliver();
    // }

    // if (loadingInTransit) {
    //   fetchRequestDeliver();
    // }

    // if (loadingAvaliableToDeliver) {
    //   fetchRequestDeliver();
    // }

    // if(loadingAcceptedByDeliverman){
    //   fetchRequestDeliver();
    // }
  }, [
    userInfo,
    requestDeliv,
    requestDelivId,
    navigate,
    // successDeliver,
    // loadingPayment,
    // loadingDestination,
    // loadingInTransit,
    // loadingAvaliableToDeliver,
    // loadingAcceptedByDeliverman
  ]);


  return (

    <div>
      <Helmet>
        <title>{t('requestdeliverman')}</title>
      </Helmet>

      {/* <CheckoutSteps step1 step2 step3 step4 ></CheckoutSteps> */}
      <h1>{t('order')}  № {requestDeliv && requestDeliv.code}</h1>
      {requestDeliv && requestDeliv.status && <RequestDeliverSteps { ...requestDeliv}></RequestDeliverSteps>}

      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>{t('deliverydetails')}</span>
              </Card.Title>
              <Card.Text>
                <strong>{t('nameoforderreceiver')}:</strong> {requestDeliv && requestDeliv.name}
                <br/>
                <strong>{t('numbertocall')}:</strong>  {requestDeliv && requestDeliv.phoneNumber}
                <br />              
                <strong>{t('transporttypetoroder')}:</strong> {requestDeliv && requestDeliv.transportType}
                <br/>
                <strong>{t('typeofgoodtodeliver')}:</strong> {requestDeliv && requestDeliv.goodType}
                <br/>
                <strong>{t('detailsofdeliver')}:</strong> {requestDeliv && requestDeliv.description}
                <br/>
              </Card.Text>
            </Card.Body>
          </Card>


          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <strong>{t('deliveryaddressdetails')}</strong>
              </Card.Title>


              <Card.Text>
              <strong>{t('deliveryplace')}:</strong> {requestDeliv && requestDeliv.deliverCity}
                <br/>
              <strong>{t('origin')}:</strong> {requestDeliv && requestDeliv.origin}
                <br/>
                <strong>{t('destination')}:</strong> {requestDeliv && requestDeliv.destination}
                <br/>
                {requestDeliv && requestDeliv.isDelivered ? (
                <MessageBox variant="success">
                  {t('deliveredon')} {formatedDate(requestDeliv.deliveredAt)}
                </MessageBox>
              ) : (
                <MessageBox variant="danger">{t('notdelivered')}</MessageBox>
              )}
                </Card.Text>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('paymentmethod')}</Card.Title>
              <Card.Text>
                <strong>{t('method')}:</strong> {requestDeliv && requestDeliv.paymentOption}
              </Card.Text>
              {requestDeliv && requestDeliv.isPaid ? (
                <MessageBox variant="success">
                  {t('paidon')} {formatedDate(requestDeliv && requestDeliv.paidAt)}
                </MessageBox>
              ) : (
                <>
                  <MessageBox variant="danger">{t('notpaid')}</MessageBox>
                </>
              )}
            </Card.Body>
          </Card>

          <Card className="mb-3">
            {!userInfo.isDeliveryMan || userInfo.isAdmin &&<Card.Body>
              <Card.Title>{t('ordersummary')}</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>{t('orderstatus')}</Col>
                    <Col>
                      <Badge bg="success" variant="success">
                        {requestDeliv && requestDeliv.status}
                      </Badge>
                    </Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>{t('price')}</Col>
                    <Col>
                        {requestDeliv && requestDeliv.deliveryPrice} MT
                  
                    </Col>
                  </Row>
                </ListGroup.Item>
                
               
              </ListGroup>
            </Card.Body>}
          </Card>

        </Col>
      
      </Row>

    </div>
  );
}
