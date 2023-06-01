import React, { useContext, useEffect, useReducer, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { Helmet } from 'react-helmet-async';
import CheckoutSteps from '../components/CheckoutSteps';
import Card from 'react-bootstrap/Card';
import { Store } from '../Store.js';
import { Link, useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import { getError } from '../utils.js';
import { toast } from 'react-toastify';
import axios from 'axios';
import LoadingBox from '../components/LoadingBox';

const reducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_REQUEST':
      return { ...state, loading: true };

    case 'CREATE_SUCCESS':
      return { ...state, loading: false };

    case 'CREATE_FAIL':
      return { ...state, loading: false };

    default:
      return state;
  }
};

export default function PlaceOrderScreen() {
  const [{ loading }, dispatch] = useReducer(reducer, { loading: false });
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo } = state;

  const navigate = useNavigate();


  
  const {
    cart: { address },
  } = state;

  useEffect(() => {
    if (!address.address) {
      navigate('/address');
    }
  }, [address, navigate]);



  const round2 = (num) => Math.round(num * 100 + Number.EPSILON) / 100; // 1234.3213123 => 1234.32

  cart.itemsPrice = round2(
    cart.cartItems.reduce((a, c) => a + c.quantity * c.price, 0)
  );
  cart.addressPrice = cart.address.city === 'Maputo Cidade' ? 200 : 350;
  cart.siteTax = round2(0.2 * cart.itemsPrice);
  // cart.ivaTax = round2(0.16 * cart.itemsPrice);
  cart.ivaTax = 0;


  cart.totalPrice =
    (cart.itemsPrice + cart.addressPrice + cart.siteTax ).toFixed(2);

  const placeOrderHandler = async () => {
    try {
      dispatch({ type: 'CREATE_REQUEST' });
      const { data } = await axios.post(
        '/api/orders',
        {
          orderItems: cart.cartItems,
          address: cart.address,
          paymentMethod: cart.paymentMethod,
          itemsPrice: cart.itemsPrice,
          ivaTax: cart.ivaTax,
          siteTax: cart.siteTax,
          taxPrice: cart.taxPrice,
          totalPrice: cart.totalPrice,
          addressPrice: cart.addressPrice,
        },
        {
          headers: {
            authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      ctxDispatch({ type: 'CART_CLEAR' });
      dispatch({ type: 'CREATE_SUCCESS' });
      navigate(`/order/${data.order._id}`);
      toast.success('Pedido Efectuado com sucesso');
    } catch (err) {
      toast.error(getError(err));
    }
  };

  return (
    <div>
      <Helmet>
        <title>Confirmar Pedido</title>
      </Helmet>

      <CheckoutSteps step1 step2 step3 step4></CheckoutSteps>
      <h1>Confirmar Pedido</h1>
      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>Endereço de Entrega</span>
              </Card.Title>
              <Card.Text>
                <strong>Nome Completo:</strong> {cart.address.fullName}
                <br></br>
                <strong>Endereço de entrega:</strong> {cart.address.city},{' '}
                {cart.address.address}, {cart.address.referenceAddress}
              </Card.Text>
              <Link className="link" to="/address">
                Alterar dados de entrega
              </Link>
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <strong>Forma de Pagamento</strong>
              </Card.Title>
              <Card.Text>{cart.paymentMethod}</Card.Text>
              <Link className="link" to="/payment">
                Alterar forma de pagamento
              </Link>
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>Produtos</span>
              </Card.Title>
              <ListGroup variant="flush">
                {cart.cartItems.map((item) => (
                  <ListGroup.Item key={item._id}>
                    <Row className="align-items-center">
                      <Col mb={7}>
                        <img
                          src={item.image}
                          alt={item.image}
                          className="img-fluid rounded img-thumbnail"
                        />
                        <p></p>
                        <Link className="link" to={`/product/${item.slug}`}>
                          {item.name}
                        </Link>
                      </Col>
                      <Col mb={2}>
                        {' '}
                        <span>{item.quantity}x qtd</span>
                      </Col>
                      <Col mb={3}>
                        {' '}
                        <span>{item.quantity * item.price} MT</span>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
             
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Resumido</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>Produtos</Col>
                    <Col>{cart.itemsPrice} MT</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Entrega</Col>
                    <Col>{cart.addressPrice} MT</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Comissão</Col>
                    <Col>{cart.siteTax} MT</Col>
                  </Row>
                </ListGroup.Item>
                {/* <ListGroup.Item>
                  <Row>
                    <Col>IVA (16%)</Col>
                    <Col>{cart.ivaTax} MT</Col>
                  </Row>
                </ListGroup.Item> */}
                <ListGroup.Item>
                  <Row>
                    <Col>
                      <b>Total</b>
                    </Col>
                    <Col>
                      <b>{cart.totalPrice} MT</b>
                    </Col>
                  </Row>
                </ListGroup.Item>

                <ListGroup.Item>
                  <div className="d-grid">
                    <Button
                    className='customButtom' variant='light'
                      type="button"
                      onClick={placeOrderHandler}
                      disabled={cart.cartItems.length === 0}
                    >
                      {' '}
                      Fazer Pedido
                    </Button>
                  </div>
                </ListGroup.Item>
                {loading && <LoadingBox></LoadingBox>}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
