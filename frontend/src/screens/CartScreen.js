import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { Store } from '../Store';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link } from 'react-router-dom';
import MessageBox from '../components/MessageBox';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import Card from 'react-bootstrap/Card';
import axios from 'axios';

import { useNavigate } from 'react-router-dom';

export default function CartScreen() {
  const navigate = useNavigate();

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
  } = state;

  const {error} = state;


  async function updateCartHandler(item, quantity) {
    const { data } = await axios.get(`/api/products/${item._id}`);


    if (data.countInStock < quantity) {
      window.alert(`Desculpe, o Produto não está disponível`);
      return;
    } 
    ctxDispatch({
      type: 'ADD_ITEM_ON_CART',
      payload: { ...item, quantity },
    });
  }

  async function removeItemCart(item) {
    ctxDispatch({
      type: 'REMOVE_ITEM_ON_CART',
      payload: { ...item, item },
    });
  }

  const checkOutHandler = () => {
    navigate('/address');
  };
  return (
    <div>
      <Helmet>
        <title>Carrinha de Compras</title>
      </Helmet>
      <h1>Carrinha de Compras:               <Link className="text_color link-none" to={`/seller/${cartItems[0] && cartItems[0].seller._id}`}>{cartItems[0] && cartItems[0].seller.seller.name}</Link></h1>
          {error && <MessageBox variant="danger">{error}</MessageBox>}
      <Row>
        <Col md={8}>
          {cartItems.length === 0 ? (
            <MessageBox>
              Carrinho vazio.{' '}
              <Link className="text_color" to="/">
                Fazer Compras
              </Link>
            </MessageBox>
          ) : (
            <ListGroup>
              {cartItems.map((item) => (
                <ListGroup.Item key={item._id}>
                  <Row className="align-items-center">
                    <Col md={5}>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="img-fluid rounded img-thumbnail"
                      ></img>
                      <p></p>
                      <Link className="link-none" to={`/product/${item.slug}`}>
                      Produto: <b>{item.name}</b>{' '} Cor:  <b>{item.color}</b>{' '} Tamanho:  <b>{item.size}</b>
                      </Link>
                 
                    </Col>
                    <Col md={3}>
                      <Button
                        variant="light"
                        disabled={item.quantity === 1}
                        onClick={() =>
                          updateCartHandler(item, item.quantity - 1)
                        }
                      >
                        <FontAwesomeIcon icon={faMinusCircle}></FontAwesomeIcon>
                      </Button>{' '}
                      <span>{item.quantity}</span>{' '}
                      <Button
                        variant="light"
                        disabled={item.quantity > item.countInStock}
                        onClick={() =>
                          updateCartHandler(item, item.quantity + 1)
                        }
                      >
                        <FontAwesomeIcon icon={faPlusCircle}></FontAwesomeIcon>
                      </Button>
                    </Col>

                    <Col md={3}>{item.quantity * item.price} MT</Col>

                    <Col md={1}>
                      <Button
                        variant="light"
                        onClick={() => removeItemCart(item)}
                      >
                        <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                      </Button>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <h4>
                    Subtotal (
                    {cartItems.reduce((pre, cur) => pre + cur.quantity, 0)}{' '}
                    items):{' '}
                    {cartItems.reduce(
                      (pre, cur) => pre + cur.price * cur.quantity,
                      0
                    )}
                    MT
                  </h4>
                </ListGroup.Item>
                <ListGroup.Item>
                  <div className="d-grid">
                    <Button
                      className="customButtom"
                      type="button"
                      variant="light"
                      disabled={cartItems.length === 0}
                      onClick={() => checkOutHandler()}
                    >
                      Requisitar
                    </Button>
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
