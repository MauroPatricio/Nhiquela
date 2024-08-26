import { useContext, useEffect, useReducer, useState } from 'react';
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
import { getError } from '../utils';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const reducer = (state, action) => {
  switch (action.type) {
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

export default function CartScreen() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const [sellerDayInfo, setSellerDayInfo] = useState(<span style={{color: 'red'}}>[{t('closestore')}]</span>);

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
  } = state;

  const {error} = state;

  const [sellerId, setSellerId] = useState('');
const [seller, setSeller] = useState({});

const [storeOpen, isStoreOpen] = useState(false);


const [
  {
    loadingSeller,
    loadingProducts,
    errorSeller,
    sellerDetails,
    productsError,
    productsBySeller,
  },
  dispatch,
] = useReducer(reducer, { sellerDetails: '', loading: true, error: '' });

useEffect(() => {
  window.scrollTo(0, 0);
}, []);

useEffect(() => {
  const fetchSellerDetails = async () => {
    try {
      if(cartItems.length!==0){
      dispatch({ type: 'SELLER_DETAILS_REQUEST' });
      const sellerId = cartItems && cartItems[0].seller._id;

        const { data } = await axios.get(`/api/users/${sellerId}`, {});
        setSeller(data)
        dispatch({ type: 'SELLER_DETAILS_SUCCESS', payload: data });

      }

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

    // if(seller &&  seller.seller!==undefined){

    //   seller.seller.workDayAndTime.map(async workday=>{

    //     if(workday.dayNumber === currentDay){

    //             if(workday.opentime <=formattedDatetime  && formattedDatetime<=workday.closetime){
    //                   setSellerDayInfo(<span style={{color: 'green'}}>[{t('openstore')}]</span>)
    //                   return
    //             }
    //           }
    //   })
    // }
  }, [seller]);

  async function updateCartHandler(item, quantity) {
    const { data } = await axios.get(`/api/products/${item._id}`);


    if (data.countInStock < quantity) {
      toast.info(`Desculpe, o produto já não se encontra disponível`)
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

  const checkOutHandler = async () => {

   
     // Get the current time
     const currentTime = new Date();
     const currentDay = currentTime.getDay();
 
        const hours = currentTime.getHours().toString().padStart(2, '0'); // Get the hours and pad with leading 0 if needed
        const minutes = currentTime.getMinutes().toString().padStart(2, '0'); // Get the minutes and pad with leading 0 if needed
        
        const formattedDatetime = `${hours}:${minutes}`;

        navigate('/address');


  }
  return (
    <div>
      <Helmet>
        <title>{t('shoppingcart')}</title>
      </Helmet>
      <h1>{t('shoppingcart')}:               <Link className="text_color link-none" to={`/seller/${cartItems[0] && cartItems[0].seller._id}`}>{cartItems[0] && cartItems[0].seller.seller.name}</Link> - {sellerDayInfo}</h1>
          {error && <MessageBox variant="danger">{error}</MessageBox>}
        <b className='text_color'>{t('supplierclosetimenotice')}</b>          
        <Row>
        <Col md={8}>
          {cartItems.length === 0 ? (
            <MessageBox>
              {t('emptycart')}.{' '}
              <Link className="text_color" to="/">
                {t('shopping')}
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
                      {t('product')}: <b>{item.name}</b>{' '} {t('color')}:  <b>{item.color}</b>{' '} {t('size')}:  <b>{item.size}</b>
                      {' '} {item.onSale && t('deliveryestimate')}{item.onSale && ':'}{item.onSale && item.orderPeriod}
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

                    <Col md={3}>{(item.onSale? item.quantity * item.discount: item.quantity * item.price).toFixed(2)} MT</Col>

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
                      (pre, cur) => cur.onSale?pre + cur.discount * cur.quantity:pre + cur.price * cur.quantity,
                      0
                    ).toFixed(2)}
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
                      {t('request')}
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
