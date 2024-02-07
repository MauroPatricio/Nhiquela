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
import { toast } from 'react-toastify';
import LoadingBox from '../components/LoadingBox.js';
import  Button  from 'react-bootstrap/Button';



const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, requestDeliv: action.payload, error: '' };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };


      case 'PAYMENT_REQUEST':
        return { ...state, loadingPayment: true };
      case 'PAYMENT_SUCCESS':
        return {
          ...state,
          loadingPayment: false,
          successPayment: action.payload,
        };
      case 'PAYMENT_FAIL':
        return {
          ...state,
          loadingPayment: false,
          errorPayment: action.payload,
        };


        case 'ACCEPTED_BY_DELIVERMAN_REQUEST':
          return { ...state, loadingAcceptedByDeliverman: true };
        case 'ACCEPTED_BY_DELIVERMAN_SUCCESS':
          return { ...state, loadingAcceptedByDeliverman: false, successAcceptedByDeliverman: true };
        case 'ACCEPTED_BY_DELIVERMAN_FAIL':
          return {
            ...state,
            loadingAcceptedByDeliverman: false,
            successAcceptedByDeliverman: false,
            errorAcceptedByDeliverman: action.payload,
          };


          case 'CONFIRM_IN_TRANSIT_REQUEST':
            return { ...state, loadingInTransit: true };
            
            case 'CONFIRM_IN_TRANSIT_SUCCESS':
            return {
              ...state,
              loadingInTransit: false,
              successInTransit: action.payload,
            };
      
            case 'CONFIRM_IN_TRANSIT_FAIL':
              return {
                ...state,
                loadingInTransit: false,
                errorInTransit: action.payload,
              };



              case 'CONFIRM_DESTINATION_REQUEST':
                return { ...state, loadingDestination: true };
              case 'CONFIRM_DESTINATION_SUCCESS':
                return {
                  ...state,
                  loadingDestination: false,
                  successDestination: action.payload,
                };
              case 'CONFIRM_DESTINATION_FAIL':
                return {
                  ...state,
                  loadingDestination: false,
                  errorDestination: action.payload,
                };


                case 'DELIVER_REQUEST':
      return { ...state, loadingDeliver: true };
    case 'DELIVER_SUCCESS':
      return { ...state, loadingDeliver: false, successDeliver: true };
    case 'DELIVER_FAIL':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: false,
        errorDeliver: action.payload,
      };

    default:
      return state;
  }
};

export default function RequestDelivermanProgressScreen() {
  const { t } = useTranslation();

  const params = useParams();

  const { id: requestDelivId } = params;

  const [{ loading, requestDeliv, loadingPayment, loadingDeliver, loadingInTransit, loadingDestination}, dispatch] = useReducer(reducer, { loading: false, requestDeliv: {}});
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


  const acceptedByDelivermanHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'ACCEPTED_BY_DELIVERMAN_REQUEST' });
      const { data } = await axios.put(
        `/api/requestdeliver/${requestDelivId}/acceptedByDeliveryman`,
        {},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'ACCEPTED_BY_DELIVERMAN_SUCCESS', payload: data });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'ACCEPTED_BY_DELIVERMAN_FAIL' });
    }
  };


  const inTransitOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'CONFIRM_IN_TRANSIT_REQUEST' });
      const { data } = await axios.put(
        `/api/requestdeliver/${requestDelivId}/intransit`,
        {userInfo},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'CONFIRM_IN_TRANSIT_SUCCESS', payload: data });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'CONFIRM_IN_TRANSIT_FAIL' });
    }
  };

  
  const confirmArriveDestinationOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'CONFIRM_DESTINATION_REQUEST' });
      const { data } = await axios.put(
        `/api/requestdeliver/${requestDelivId}/confirmDestination`,
        {},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'CONFIRM_DESTINATION_SUCCESS', payload: data });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'CONFIRM_DESTINATION_FAIL' });
    }
  };


  const deliverOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'DELIVER_REQUEST' });
      const { data } = await axios.put(
        `/api/requestdeliver/${requestDelivId}/deliver`,
        {},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'DELIVER_SUCCESS', payload: data });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'DELIVER_FAIL' });
    }
  };

  
  const payOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'PAYMENT_REQUEST' });
      const { data } = await axios.put(
        `/api/requestdeliver/${requestDelivId}/pay`,
        {},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'PAYMENT_SUCCESS', payload: data });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'PAYMENT_FAIL' });
    }
  };


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


          {requestDeliv.deliveryman && (
            <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('deliverdetails')}</Card.Title>
              <Card.Text>
              <strong>{t('name')}:</strong>{' '}{ requestDeliv.deliveryman.name}<br/>
              <strong>{t('phone')}:</strong> {' '}{ requestDeliv.deliveryman.phoneNumber}<br/>
              <strong>{t('transport')}:</strong>{' '}{ requestDeliv.deliveryman.transport_type}<br/>
              <strong>{t('registration')}:</strong>{' '}{ requestDeliv.deliveryman.transport_registration}<br/>
              <strong>{t('color')}:</strong>{' '}{ requestDeliv.deliveryman.transport_color}<br/>
              </Card.Text>
             
            </Card.Body>
          </Card>
          )}

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


    
          {userInfo.isAdmin && !requestDeliv.isPaid && requestDeliv.status !== 'Cancelado' && (
            <ListGroup.Item>
              {loadingPayment && <LoadingBox></LoadingBox>}
              <div className="d-grid">
                <Button
                  className="customButtom"
                  variant="light"
                  type="button"
                  onClick={payOrderHandler}
                >
                  Confirmar pagamento
                </Button>
              </div>
            </ListGroup.Item>
          )}


          &nbsp;
          {(userInfo.isAdmin) &&
            !requestDeliv.isDelivered &&
            requestDeliv.status === 'Pendente' &&
            requestDeliv.status !=='Em trânsito' &&
            requestDeliv.status !== 'No destino indicado' &&
            requestDeliv.isPaid && (
              <ListGroup.Item>
                {loadingDeliver && <LoadingBox></LoadingBox>}
                <div className="d-grid">
                  <Button
                    className="customButtom"
                    variant="light"
                    type="button"
                    onClick={acceptedByDelivermanHandler}
                  >
                   Aceite pelo entregador
                  </Button>
                </div>
              </ListGroup.Item>
            )}

          &nbsp;
          {(userInfo.isAdmin || userInfo.isDeliveryMan) &&
            !requestDeliv.isDelivered &&
            requestDeliv.status === 'Aceite pelo entregador' &&
            requestDeliv.status !=='Em trânsito' &&
            requestDeliv.status !== 'No destino indicado' &&
            requestDeliv.isPaid && (
              <ListGroup.Item>
                {loadingInTransit && <LoadingBox></LoadingBox>}
                <div className="d-grid">
                  <Button
                    className="customButtom"
                    variant="light"
                    type="button"
                    onClick={inTransitOrderHandler}
                  >
                    Em trânsito
                  </Button>
                </div>
              </ListGroup.Item>
            )}

          &nbsp;
        {(userInfo.isAdmin || userInfo.isDeliveryMan) &&
        
        requestDeliv.status==='Em trânsito' &&
        requestDeliv.status !== 'Aceite' &&
        requestDeliv.status !== 'Pronto' &&
        requestDeliv.status !== 'No destino indicado' &&   !requestDeliv.isDelivered &&
        requestDeliv.isPaid && (
            <ListGroup.Item>
              {loadingDestination && <LoadingBox></LoadingBox>}
              <div className="d-grid">
                <Button
                  className="customButtom"
                  variant="light"
                  type="button"
                  onClick={confirmArriveDestinationOrderHandler}
                >
                  No destino indicado
                </Button>
              </div>
            </ListGroup.Item>
          )}


        &nbsp;
          {(userInfo.isAdmin ||
            userInfo.isDeliveryMan
           ) &&
            !requestDeliv.isDelivered &&
            requestDeliv.isInTransit &&
            requestDeliv.status === 'No destino indicado' &&
            requestDeliv.isPaid && (
              <ListGroup.Item>
                {loadingDeliver && <LoadingBox></LoadingBox>}
                <div className="d-grid">
                  <Button
                    className="customButtom"
                    variant="light"
                    type="button"
                    onClick={deliverOrderHandler}
                  >
                    Confirmar entrega
                  </Button>
                </div>
              </ListGroup.Item>
            )}

        </Col>
      </Row>

    </div>
  );
}
