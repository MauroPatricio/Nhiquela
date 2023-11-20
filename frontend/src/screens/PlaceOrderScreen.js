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
import { FaPencilAlt } from "react-icons/fa";
import {Modal} from 'react-bootstrap';



const reducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_REQUEST':
      return { ...state, loading: true };

    case 'CREATE_SUCCESS':
      return { ...state, loading: false };

    case 'CREATE_FAIL':
      return { ...state, loading: false };
   case 'SELLER_DETAILS_REQUEST':
        return { ...state, loadingSeller: true };
  
      case 'SELLER_DETAILS_SUCCESS':
        return { ...state, sellerDetails: action.payload, loadingSeller: false };
  
      case 'SELLER_DETAILS_FAIL':
        return { ...state, errorSeller: action.payload, loadingSeller: false };
  


    default:
      return state;
  }
};

export default function PlaceOrderScreen() {
  const [{ loading }, dispatch] = useReducer(reducer, { loading: false });
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const { cart, userInfo } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [message] = useState('Faça login ou cadastro da sua conta para poder acompanhar o progresso do seu pedido pela plataforma ou por SMS no seu telefone');

  const [sellerDayInfo, setSellerDayInfo] = useState('');

  const closeModal = () => {
    setIsModalOpen(false);
  };

  
  const loginRedirect = () => {
    navigate('/signin?redirect=/placeorder');
  };
  
  const {
    cart: { address },
  } = state;

  useEffect(() => {
    if (!address.address) {
      navigate('/address');
    }
  }, [address, navigate]);

  const [sellerId, setSellerId] = useState('');
  const [seller, setSeller] = useState({});
  

  
  useEffect(() => {
    const fetchSellerDetails = async () => {
      try {
        dispatch({ type: 'SELLER_DETAILS_REQUEST' });
        const sellerId = cart.cartItems && cart.cartItems[0].seller._id;
  
        const { data } = await axios.get(`/api/users/${sellerId}`, {});
        setSeller(data)
        dispatch({ type: 'SELLER_DETAILS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'SELLER_DETAILS_FAIL', payload: getError(err) });
      }
    };
    fetchSellerDetails();
  }, [dispatch, sellerId]);
  
    useEffect( () => {
      // Get the current time
      const currentTime = new Date();
      const currentDay = currentTime.getDay();
  
      
  const hours = currentTime.getHours().toString().padStart(2, '0'); // Get the hours and pad with leading 0 if needed
  const minutes = currentTime.getMinutes().toString().padStart(2, '0'); // Get the minutes and pad with leading 0 if needed
  
  const formattedDatetime = `${hours}:${minutes}`;
  
      if(seller &&  seller.seller!==undefined){
  
        seller.seller.workDayAndTime.map(async workday=>{
          
          if(workday.dayNumber === currentDay){
    
          if(workday.opentime <=formattedDatetime  && formattedDatetime<=workday.closetime){
              setSellerDayInfo(<span style={{color: 'green'}}>[Loja aberta]</span>)
          }else{
            setSellerDayInfo(<span style={{color: 'red'}}>[Loja fechada]</span>)
          }
        }else{
          setSellerDayInfo(<span style={{color: 'red'}}>[Loja fechada]</span>)
        }
        })
      }
    }, [seller]);

    


  const round2 = (num) => Math.round(num * 100 + Number.EPSILON) / 100; // 1234.3213123 => 1234.32

  cart.itemsPrice = round2(
    cart.cartItems.reduce((a, c) => c.onSale?a + c.quantity * c.discount:a + c.quantity * c.price, 0)
  );

  cart.addressPrice = cart && cart.deliveryOptionValue === 'withoutDelivery'?0:cart.address.city === 'Maputo Cidade' ? 250 : 350;
  cart.siteTax = round2(0.15 * cart.itemsPrice);
  cart.ivaTax = round2(0.15 * cart.itemsPrice);


  cart.totalPrice =
    (cart.itemsPrice + cart.addressPrice + cart.siteTax ).toFixed(2);


  const placeOrderHandler = async () => {


    // Get the current time
    const currentTime = new Date();
    const currentDay = currentTime.getDay();

    
const hours = currentTime.getHours().toString().padStart(2, '0'); // Get the hours and pad with leading 0 if needed
const minutes = currentTime.getMinutes().toString().padStart(2, '0'); // Get the minutes and pad with leading 0 if needed

const formattedDatetime = `${hours}:${minutes}`;



    // pego a variavel do dia de semana actual 

    // Crio um ciclo e verificar se o dia de semana actual com os dias de semana preenchidos pelo fornecedor sao iguais
    // caso o dia de semana seja igual com o dia de semana adicionado pelo fornecedor
    // O sistema verifica se a hora actual do sistema e a hora definida pelo fornecedor esta  entre a hora de abertura e fecho
    // caso esteja a hora esteja entre o sistema regista o pedido
    // caso nao o sistema emite uma mensagem informando que "Nao podemos efectuar o seu registo pois a loja neste momento encontra-se fechada" e nao regista o pedido
    // Caso o dia de semana actual e o dia de semana disponivel na listagem forem diferentes


    if(seller && seller.seller.workDayAndTime.length===0){
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
        toast.success('Pedido efectuado com sucesso');
      } catch (err) {
        toast.error(getError(err));
      }
    }

    
    seller.seller.workDayAndTime.map(async workday=>{
      
      if(workday.dayNumber === currentDay){

      if(workday.opentime <=formattedDatetime  && formattedDatetime<=workday.closetime){
        // esta tudo bem passa.
        // Esta dentro do periodo informado

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
          toast.success('Pedido efectuado com sucesso');
        } catch (err) {
          toast.error(getError(err));
        }
      }
    }else{
      toast.error(`Nao e possivel registar o seu pedido a loja esta fechada. `)
      return;
    }
    })
    // Compare the current time with the threshold
    // const isPastThreshold =
    //   currentHour > thresholdHour ||
    //   (currentHour === thresholdHour && currentMinute >= thresholdMinute);

    if (!userInfo) {
      setIsModalOpen(true)
      return
    }
   
  };

  return (
    <div>
      <Helmet>
        <title>Confirmar Pedido</title>
      </Helmet>

      <CheckoutSteps step1 step2 step3 step4 ></CheckoutSteps>
      <h1>Confirmar pedido - {sellerDayInfo}</h1>
      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>Detalhes de entrega</span>
              </Card.Title>
              <Card.Text>
                <strong>Receptor do pedido:</strong> {cart.address.fullName}
                <br/>
                <strong>Número(s):</strong>
                {cart.address.phoneNumber}, {cart.address.alternativePhoneNumber}
                <br />
                <strong>Endereço de entrega:</strong> {cart.address.city},{' '}
                {cart.address.address}, {cart.address.referenceAddress}.
              </Card.Text>
              <Link className="link" to="/address">
                Alterar detalhes de entrega <FaPencilAlt/>
              </Link>
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <strong>Forma de pagamento</strong>
              </Card.Title>
              <Card.Text>{cart.paymentMethod}</Card.Text>
              <Link className="link" to="/payment">
                Alterar forma de pagamento <FaPencilAlt/>
              </Link>
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>Produtos na carrinha: {' '}
                <Link className="link" to={`/seller/${cart.cartItems[0] && cart.cartItems[0].seller && cart.cartItems[0].seller.seller && cart.cartItems[0].seller._id}`}>
                <b className='link'>{cart.cartItems[0] && cart.cartItems[0].seller && cart.cartItems[0].seller.seller && cart.cartItems[0].seller.seller.name}</b>
              </Link>

              </span>
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
                        <Link className="link link-none" to={`/product/${item.slug}`}>
                        Produto: <b>{item.name}</b><br/>Cor:<b>{item.color}</b>{' '} Tamanho:<b>{item.size}</b>
                        </Link>
                      </Col>
                      <Col mb={2}>
                        {' '}
                        <span>{item.quantity}x qtd</span>
                      </Col>
                      <Col mb={3}>
                        {' '}
                        <span>{(item.onSale?item.quantity * item.discount:item.quantity * item.price).toFixed(2)} MT</span>
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

               <Link className="link" to="/deliveryoption">
                Alterar opções de entrega <FaPencilAlt/>
              </Link>
              </ListGroup.Item>
              </ListGroup>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>Valor dos produtos</Col>
                    <Col>{cart.itemsPrice} MT</Col>
                  </Row>
                </ListGroup.Item>
                {cart.addressPrice===0?'':
                <ListGroup.Item>
                  <Row>
                    <Col>Taxa de entrega</Col>
                    <Col>{cart.addressPrice} MT</Col>
                  </Row>
                </ListGroup.Item>}
                <ListGroup.Item>
                  <Row>
                    <Col>Outros serviços</Col>
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
                      Fazer pedido
                    </Button>
                  </div>
                </ListGroup.Item>
                {loading && <LoadingBox></LoadingBox>}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={isModalOpen}  onClick={closeModal}
       
        >
        <Modal.Header closeButton onClick={closeModal}>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
         {message}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={loginRedirect}>
            Ok
          </Button>
          <Button variant="danger" onClick={closeModal}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
