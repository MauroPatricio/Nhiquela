import React, { useContext, useEffect, useReducer } from 'react';
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

  const [
    {
      loading,
      order,
      error,
      loadingDeliver,
      successDeliver,
      loadingPayment,
      loadingDestination,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    order: {},
    error: '',
  });

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
  }, [
    userInfo,
    order,
    orderId,
    navigate,
    successDeliver,
    loadingPayment,
    loadingDestination,
  ]);

  const cancelOrderHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'CANCEL_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/cancel`,
        {},
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
        <title>Pedido {order.code}</title>
      </Helmet>

      <h1>Acompanhar Pedido</h1>
      <br />
      {order.status && <OrderSteps {...order}></OrderSteps>}

      <h4>Pedido №: {order.code}</h4>
      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Dados</Card.Title>
              <Card.Text>
                <strong>Name:</strong> {order.deliveryAddress.fullName}
                <br />
                <strong>Endereço:</strong>
                {order.deliveryAddress.address}, {order.deliveryAddress.city},{' '}
                {order.deliveryAddress.referenceAddress}
              </Card.Text>
              {order.isDelivered ? (
                <MessageBox variant="success">
                  Entregue as {formatedDate(order.deliveredAt)}
                </MessageBox>
              ) : (
                <MessageBox variant="danger">Não Entregue</MessageBox>
              )}
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Pagamento</Card.Title>
              <Card.Text>
                <strong>Método:</strong> {order.paymentMethod}
              </Card.Text>
              {order.isPaid ? (
                <MessageBox variant="success">
                  Pago as {formatedDate(order.paidAt)}
                </MessageBox>
              ) : (
                <>
                  {order.status !== 'Cancelado' &&
                    order.paymentMethod === 'Mpesa' &&
                    !order.isPaid && (
                      <MessageBox variant="">
                        Para confirmar o seu pedido efectue o pagamento do valor
                        "Total" no número 840000000
                      </MessageBox>
                    )}
                  {order.status !== 'Cancelado' &&
                    order.paymentMethod !== 'Mpesa' &&
                    !order.isPaid && (
                      <MessageBox variant="">
                        Para confirmar o seu pedido efectue o pagamento do valor
                        "Total" no número 870000000
                      </MessageBox>
                    )}

                  <MessageBox variant="danger">Não Pago</MessageBox>
                </>
              )}
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Items</Card.Title>
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
                        <Link className="link" to={`/product/${item.slug}`}>
                          {item.name}
                        </Link>
                      </Col>
                      <Col md={2}>
                        <span>{item.quantity}x</span> qtd
                      </Col>
                      <Col md={3}>
                        <span>{item.price} MT</span>
                      </Col>
                      <Col md={3}>
                        <span>Total {item.quantity * item.price} MT</span>
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
            <Card.Body>
              <Card.Title>Resumo do Pedido</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>Estado do Pedido</Col>
                    <Col>
                      <Badge bg="success" variant="success">
                        {order.status}
                      </Badge>
                    </Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Items</Col>
                    <Col>{order.itemsPrice} MT</Col>
                  </Row>
                </ListGroup.Item>
                {userInfo.isAdmin && (
                  <>
                    <ListGroup.Item>
                      <Row>
                        <Col>Taxa de Entrega</Col>
                        <Col>{order.addressPrice} MT</Col>
                      </Row>
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <Row>
                        <Col>Taxa online (20%)</Col>
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
            </Card.Body>
          </Card>
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
                    onClick={cancelOrderHandler}
                  >
                    Cancelar Pedido
                  </Button>
                </div>
              </ListGroup.Item>
            )}
          &nbsp;
          {(userInfo.isAdmin ||
            !userInfo.isDeliveryMan ||
            !userInfo.isSeller) &&
            !order.isDelivered &&
            order.status === 'Cheguei ao destino' &&
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
                    Confirmar Entrega
                  </Button>
                </div>
              </ListGroup.Item>
            )}
          &nbsp;
          {(userInfo.isAdmin || userInfo.isDeliveryMan) &&
            !order.isDelivered &&
            order.status === 'Aceite' &&
            order.status !== 'Cheguei ao destino' &&
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
                    Cheguei ao destino
                  </Button>
                </div>
              </ListGroup.Item>
            )}
          &nbsp;
          {(userInfo.isAdmin || userInfo.isDeliveryMan) &&
            !order.isDelivered &&
            order.status !== 'Aceite' &&
            order.status !== 'Cheguei ao destino' &&
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
                    Aceitar Entrega
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
                  Confirmar Pagamento
                </Button>
              </div>
            </ListGroup.Item>
          )}
        </Col>
      </Row>
    </div>
  );
}
