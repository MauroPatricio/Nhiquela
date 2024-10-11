import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import axios from 'axios';
import { formatedDate, getError } from '../utils';
import { Helmet } from 'react-helmet-async';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import Badge from 'react-bootstrap/Badge';
import OrderSteps from '../components/OrdersSteps';
import { FaMoneyBillAlt } from "react-icons/fa";


import {Modal, Form} from 'react-bootstrap';
import { t } from 'i18next';
import InvoiceGenerator from '../components/InvoiceGenerator';

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, order: action.payload, error: '' };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };

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

      case 'AVAILABLE_TO_DELIVER_REQUEST':
        return { ...state, loadingAvaliableToDeliver: true };
      case 'AVAILABLE_TO_DELIVER_SUCCESS':
        return { ...state, loadingAvaliableToDeliver: false, successAvaliableToDeliver: true };
      case 'AVAILABLE_TO_DELIVER_FAIL':
        return {
          ...state,
          loadingAvaliableToDeliver: false,
          successAvaliableToDeliver: false,
          errorAvaliableToDeliver: action.payload,
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


          case 'SELLER_DETAILS_REQUEST':
            return { ...state, loadingSeller: true };
      
          case 'SELLER_DETAILS_SUCCESS':
            return { ...state, sellerDetails: action.payload, loadingSeller: false };
      
          case 'SELLER_DETAILS_FAIL':
            return { ...state, errorSeller: action.payload, loadingSeller: false };
      
      

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

    case 'DELIVER_RESET':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: false,
      };

    case 'CANCEL_REQUEST':
      return { ...state, loadingDeliver: true };
    case 'CANCEL_SUCCESS':
      return { ...state, loadingDeliver: false, successDeliver: true };
    case 'CANCEL_FAIL':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: false,
        errorDeliver: action.payload,
      };

    case 'CANCEL_RESET':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: false,
      };
    default:
      return state;
  }
}

export default function OrderScreen() {
  const { state } = useContext(Store);
  const { userInfo } = state;
  const params = useParams();

  const { id: orderId } = params;
  const navigate = useNavigate();



  const [sellerId, setSellerId] = useState('');
  const [seller, setSeller] = useState({});

  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');

  const handleClose = () => {
    setShow(false);
    setMessage('');
  };
  const handleShow = () => setShow(true);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e) => {
    // Handle the submission of the message here
    cancelOrderHandler(e);
    handleClose();
  };


  const calculateReducedPrice =(originalPrice) =>{
    return originalPrice - (originalPrice * 0.10);
}

// Example usage

  


  const [
    {
      loading,
      order,
      error,
      loadingDeliver,
      successDeliver,
      loadingPayment,
      loadingDestination,
      loadingInTransit,
      loadingAvaliableToDeliver,
      loadingAcceptedByDeliverman
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    order: {},
    error: '',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/orders/${orderId}`, {
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
    if (!order._id || successDeliver || (order._id && order._id !== orderId)) {
      fetchOrder();
      if (successDeliver) {
        dispatch({ type: 'DELIVER_RESET' });
      }
    }
    if (loadingPayment) {
      fetchOrder();
    }
    if (loadingDestination) {
      fetchOrder();
    }

    if (loadingInTransit) {
      fetchOrder();
    }

    if (loadingAvaliableToDeliver) {
      fetchOrder();
    }

    if(loadingAcceptedByDeliverman){
      fetchOrder();
    }
  }, [
    userInfo,
    order,
    orderId,
    navigate,
    successDeliver,
    loadingPayment,
    loadingDestination,
    loadingInTransit,
    loadingAvaliableToDeliver,
    loadingAcceptedByDeliverman
  ]);
  
useEffect(() => {
  const fetchSellerDetails = async () => {
    try {
      dispatch({ type: 'SELLER_DETAILS_REQUEST' });
      if(order.orderItems){
        setSellerId(order.orderItems[0].seller);
  
        const { data } = await axios.get(`/api/users/${sellerId}`, {  headers: { authorization: `Bearer ${userInfo.token}` },});
        setSeller(data)
        dispatch({ type: 'SELLER_DETAILS_SUCCESS', payload: data });

      }
    } catch (err) {
      dispatch({ type: 'SELLER_DETAILS_FAIL', payload: getError(err) });
    }
  };
  fetchSellerDetails();
}, [dispatch, sellerId,order]);

  const cancelOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'CANCEL_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/cancel`,
        {message},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'CANCEL_SUCCESS', payload: data });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'CANCEL_FAIL' });
    }
  };

  const deliverOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'DELIVER_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/deliver`,
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

  const acceptOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'DELIVER_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/accept`,
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

  const acceptedByDelivermanHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'ACCEPTED_BY_DELIVERMAN_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/acceptedByDeliveryman`,
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
  
  const availableToDeliverHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'AVAILABLE_TO_DELIVER_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/availableToDeliver`,
        {},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'AVAILABLE_TO_DELIVER_SUCCESS', payload: data });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'AVAILABLE_TO_DELIVER_FAIL' });
    }
  };

  const inTransitOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'CONFIRM_IN_TRANSIT_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/intransit`,
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
        `/api/orders/${order._id}/confirmDestination`,
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

  const payOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'PAYMENT_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/pay`,
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

  return loading ? (
    <LoadingBox></LoadingBox>
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div>
      <Helmet>
        <title>{t('order')} № {order.code}</title>
      </Helmet>

      <h1>{t('trackorder')}</h1>
      <br />
      {order.status && <OrderSteps {...order}></OrderSteps>}
      {/* <InvoiceGenerator/> */}

      <h4>{t('order')} №: {order.code}</h4>
      <Row>
        <Col md={8}>
        {order.deliveryAddress &&
         ( 
          <>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('deliverydetails')}</Card.Title>
              <Card.Text>
                <strong>{t('nameoforderreceiver')}:</strong> {order.deliveryAddress.fullName}
                <br />
                <strong>{t('numbertocall')}:{' '}</strong>
                {order.deliveryAddress.phoneNumber}, {order.deliveryAddress.alternativePhoneNumber}

                <br />

                <strong>{t('address')}:</strong>
                {order.deliveryAddress.city}, {order.deliveryAddress.address},{' '}
                {order.deliveryAddress.referenceAddress}.
              </Card.Text>
              {order.isDelivered ? (
                <MessageBox variant="success">
                  {t('deliveredon')} {formatedDate(order.deliveredAt)}
                </MessageBox>
              ) : (
                <MessageBox variant="danger">{t('notdelivered')}</MessageBox>
              )}
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('paymentmethod')}</Card.Title>
              <Card.Text>
                <strong>{t('method')}:</strong> {order.paymentMethod}
              </Card.Text>
              {order.isPaid ? (
                <MessageBox variant="success">
                  {t('paidon')} {formatedDate(order.paidAt)}
                </MessageBox>
              ) : (
                <>
                  <MessageBox variant="danger">{t('notpaid')}</MessageBox>
                </>
              )}
            </Card.Body>
          </Card>
          </>
          )
          }

          {order.addressPrice!==0 && order.deliveryman && (
            <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('deliverdetails')}</Card.Title>
              <Card.Text>
              <strong>{t('name')}:</strong>{' '}{ order.deliveryman.name}<br/>
              <strong>{t('phone')}:</strong> {' '}{ order.deliveryman.phoneNumber}<br/>
              <strong>{t('transport')}:</strong>{' '}{ order.deliveryman.transport_type}<br/>
              <strong>{t('registration')}:</strong>{' '}{ order.deliveryman.transport_registration}<br/>
              <strong>{t('color')}:</strong>{' '}{ order.deliveryman.transport_color}<br/>
              </Card.Text>
             
            </Card.Body>
          </Card>
          )}

          <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('productsinthecart')}:
              {' '}
              <Link className="link" to={`/seller/${seller && seller._id}`}>

                <b className='link'>{seller && seller.seller && seller.seller.name}</b>
              </Link>
              </Card.Title>
              <ListGroup variant="flush">
                {order.orderItems.map((item) => (
                  <ListGroup.Item key={item._id}>
                    <Row>
                      <Col md={4}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="img-fluid rounded  img-thumbnail"
                        ></img>{' '}
                        <Link className="link link-none" to={`/product/${item.slug}`}>
                        <br/>{t('product')}: <b>{item.name}</b><br/>{t('color')}:  <b>{item.color}</b>{' '} {t('size')}:  <b>{item.size}</b><br/>
                        {' '} {item.onSale && t('deliveryestimate')}{item.onSale && ':'}{item.onSale && item.orderPeriod}

                        </Link>
                      </Col>
                      <Col md={2}>
                        <span>{item.quantity}x</span>Qtd
                      </Col>
                      <Col md={3}>
                        <span>{item.onSale?item.discount:item.price} MT</span>
                      </Col>
                      <Col md={3}>
                        <span>Total {(item.onSale?item.quantity * item.discount:item.quantity * item.price).toFixed(2)} MT</span>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-3">
            {!userInfo.isDeliveryMan || userInfo.isAdmin &&<Card.Body>
              <Card.Title>{t('ordersummary')}</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>{t('orderstatus')}</Col>
                    <Col>
                      <Badge bg="success" variant="success">
                        {order.status}
                      </Badge>
                    </Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>{t('priceofproducts')}</Col>
                    <Col>{order.itemsPrice} MT</Col>
                  </Row>
                </ListGroup.Item>
                { (
                  <>
             {order.addressPrice===0?'':
                <ListGroup.Item>
                  <Row>
                    <Col>{t('deliveryfee')}</Col>
                    <Col>{order.addressPrice} MT</Col>
                  </Row>
                </ListGroup.Item>}
                    <ListGroup.Item>
                      <Row>
                      <Col>{t('servicecharge')}</Col>
                        <Col>{order.siteTax} MT</Col>
                      </Row>
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <Row>
                        <Col>IVA (16%)</Col>
                        <Col>{order.ivaTax} MT</Col>
                      </Row>
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <Row>
                        <Col>
                          <b>Total</b>
                        </Col>
                        <Col>
                          <b>{order.totalPrice} MT</b>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  </>
                )}
              </ListGroup>
            </Card.Body>}
          </Card>
{userInfo.isAdmin &&
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Pagamento ao fornecedor</Card.Title>
              <ListGroup variant="flush">
              <ListGroup.Item>
                  <Row>
                    <Col><b className='link'>{seller && seller.seller && seller.seller.name}</b></Col>
                  </Row>
                </ListGroup.Item>
              <ListGroup.Item>
                  <Row>
                    <Col>Número principal</Col>
                    <Col>{seller && seller.seller && seller.seller.phoneNumberAccount}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Número alternativo</Col>
                    <Col>{seller && seller.seller && seller.seller.alternativePhoneNumberAccount}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Número de conta</Col>
                    <Col>{seller && seller.seller && seller.seller.accountType}</Col>
                    <Col>{seller && seller.seller && seller.seller.accountNumber}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>conta alternativa</Col>
                    <Col>{seller && seller.seller && seller.seller.alternativeAccountType}</Col>
                    <Col>{seller && seller.seller && seller.seller.alternativeAccountNumber}</Col>
                  </Row>
                </ListGroup.Item>
                
                <ListGroup.Item>
                  <Row>
                    <Col>Valor a enviar</Col>
                    <Col><b>{order.itemsPriceForSeller} MT</b></Col>
                  </Row>
                </ListGroup.Item>
              
             
              </ListGroup>
            </Card.Body>
          </Card>
          }

          {order.status !== 'Cancelado' && !order.isPaid &&
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('orderpayment')}<FaMoneyBillAlt/></Card.Title>
              <ListGroup variant="flush">

              {/* <ListGroup.Item>
                  <Row>
                    <Col>Tempo de confirmação de pagamento: Max 1 hora</Col>
                  </Row>
                </ListGroup.Item>
              */}
                <ListGroup.Item>
                  <Row>
                    <Col>
                    {order.paymentMethod === 'Mpesa' &&
                     (
                      <MessageBox variant="">
                     {t('forconfirmyourorder')} {' '} 
                                <b>{order.totalPrice} MT</b> {t('onaccountnumber')} <b>853600036</b>
                      </MessageBox>
                    )}                
                       </Col>
                       </Row>
                       <Row>
                       {order.paymentMethod === 'Mpesa' &&
                     (
                      <MessageBox variant="">
                                {t('forconfirmyourorder')} {' '} 
                                <b>{order.totalPrice} MT</b> {t('onaccountnumber')} <b>853600036</b>
                      </MessageBox>
                    )}
                       {order.paymentMethod === 'Emola' &&
                     (
                      <MessageBox variant="">
                                {t('forconfirmyourorder')} {' '} 
                                <b>{order.totalPrice} MT</b> {t('onaccountnumber')} <b>879300036</b>
                      </MessageBox>
                    )}
                    
                       {order.paymentMethod === 'BCI' &&
                     (
                      <MessageBox variant="">
                                {t('forconfirmyourorder')} {' '} 
                                <b>{order.totalPrice} MT</b> {t('onaccountnumber')} <b>123456789</b>
                      </MessageBox>
                    )}
                     {order.paymentMethod === 'BIM' &&
                     (
                      <MessageBox variant="">
                                {t('forconfirmyourorder')} {' '} 
                                <b>{order.totalPrice} MT</b> {t('onaccountnumber')} <b>155555555</b>
                      </MessageBox>
                    )}
                  </Row>
                </ListGroup.Item>

              
              
              </ListGroup>
            </Card.Body>
          </Card>
}
        {order.status === 'Cancelado' &&
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>{t('reasonforcancel')}</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>
                    <MessageBox variant="danger">

                    {order.canceledReason}    
                    </MessageBox>
          
                       </Col>
                       </Row>
                </ListGroup.Item>
              
              </ListGroup>
            </Card.Body>
          </Card>}
          &nbsp;
          {(userInfo.isAdmin ||
            !userInfo.isDeliveryMan ||
            !userInfo.isSeller) &&
            !order.isDelivered &&
            order.status === 'Pendente' && (
              <ListGroup.Item>
                {loadingDeliver && <LoadingBox></LoadingBox>}
                <div className="d-grid">
                  <Button
                    className="customButtom"
                    variant="light"
                    type="button"
                    onClick={handleShow}
                  >
                    {t('cancelorder')}
                  </Button>
                </div>
              </ListGroup.Item>
            )}




        <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{t('reasonforcancel')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            as="textarea"
            rows={5}
            type="text"
            placeholder="Motivo..."
            value={message}
            onChange={handleInputChange}
            style={{width: '19rem'}}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Fechar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Enviar
          </Button>
          </Modal.Footer>
          </Modal>

          &nbsp;
          {(userInfo.isAdmin ||
            !userInfo.isDeliveryMan
           ) &&
            !order.isDelivered &&
            order.isInTransit &&
            order.status === 'No destino indicado' &&
            order.isPaid && (
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
          &nbsp;

          {(userInfo.isAdmin || userInfo.isDeliveryMan) &&
           
              order.status==='Em trânsito' &&
              order.status !== 'Aceite' &&
              order.status !== 'Pronto' &&
            order.status !== 'No destino indicado' &&   !order.isDelivered &&
            order.isPaid && (
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
          {(userInfo.isAdmin || userInfo.isDeliveryMan) &&
            !order.isDelivered &&
            order.status === 'Aceite pelo entregador' &&
            order.status !=='Em trânsito' &&
            order.status !== 'No destino indicado' &&
            order.isPaid && (
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
          {(userInfo.isAdmin || !userInfo.isSeller) &&
            !order.isDelivered &&
            order.status === 'Pronto' &&
            order.status !=='Em trânsito' &&
            order.status !== 'No destino indicado' &&
            order.isPaid && (
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
          {(userInfo.isAdmin || userInfo.isSeller) &&
            !order.isDelivered &&
            order.status === 'Aceite' &&
            order.status !== 'Pronto' &&
            order.status !=='Em trânsito' &&
            order.status !== 'No destino indicado' &&
            order.isPaid && (
              <ListGroup.Item>
                {loadingDeliver && <LoadingBox></LoadingBox>}
                <div className="d-grid">
                  <Button
                    className="customButtom"
                    variant="light"
                    type="button"
                    onClick={availableToDeliverHandler}
                  >
                   Pedido disponível para entrega
                  </Button>
                </div>
              </ListGroup.Item>
            )}



          &nbsp;
          {(userInfo.isAdmin || userInfo.isSeller) &&
            !order.isDelivered &&
            order.status !== 'Aceite' &&
            order.status !== 'Cancelado' &&
            order.status !=='Pronto' &&
            order.status !=='Aceite pelo entregador' &&
            order.status !=='Em trânsito' &&
            order.status !== 'No destino indicado' &&
            order.isPaid && (
              <ListGroup.Item>
                {loadingDeliver && <LoadingBox></LoadingBox>}
                <div className="d-grid">
                  <Button
                    className="customButtom"
                    variant="light"
                    type="button"
                    onClick={acceptOrderHandler}
                  >
                    Aceitar pedido
                  </Button>
                </div>
              </ListGroup.Item>
            )}
          &nbsp;
          {userInfo.isAdmin && !order.isPaid && order.status !== 'Cancelado' && (
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
        </Col>
      </Row>
    </div>
  );
}
