import React, { useContext, useEffect, useReducer, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
// import Form from 'react-bootstrap/Form';
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
import { Modal} from 'react-bootstrap';
import Form from 'react-bootstrap/Form'
import { useTranslation } from 'react-i18next';



const reducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_REQUEST':
      return { ...state, loading: true };

    case 'CREATE_SUCCESS':
      return { ...state, loading: false };

    case 'CREATE_FAIL':
      return { ...state, loading: false };


      case 'CREATE_MPESA_REQUEST':
        return { ...state, loading: true };
  
      case 'CREATE_MPESA_SUCCESS':
        return { ...state, paymentMpesa: action.payload, loading: false };
  
      case 'CREATE_MPESA_FAIL':
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
  const { t } = useTranslation();

  const [{ loading }, dispatch] = useReducer(reducer, { loading: false });
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const { cart, userInfo } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalMpesa, setIsModalMpesa] = useState(false);
  let [customerNumber, setCustomerNumber] = useState(null);


  const [message] = useState(t('makelogin'));

  const [sellerDayInfo, setSellerDayInfo] = useState(<span style={{color: 'red'}}>[{t('closestore')}]</span>);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const closeModalMpesa = () => {
    setIsModalMpesa(false);
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


  // Estado para rastrear a escolha do usuário
  const [escolha, setEscolha] = useState(null);

  // Estado para rastrear o valor do campo de input condicional
  const [valorInput, setValorInput] = useState('');

  // Função para atualizar o estado de escolha
  const handleEscolhaChange = (event) => {
    const novaEscolha = event.target.value;
    setEscolha(novaEscolha);
    setCustomerNumber(userInfo && userInfo.phoneNumber)

    // Limpar o valor do input quando a escolha mudar
    setValorInput('');
  };

  // Função para lidar com a mudança no campo de input
  const handleInputChange = (event) => {
    const novoValor = event.target.value;
    setValorInput(novoValor);
  };
  
  const paymentMpesa = async () => {

    if(valorInput){
        customerNumber = valorInput
    }
    customerNumber = '258'+customerNumber;

    const amount = cart.totalPrice;
    try{
    dispatch({ type: 'CREATE_MPESA_REQUEST' });

    const { data } = await axios.post(`/api/payments/mpesa`, {customerNumber, amount},  {
      headers: {
        authorization: `Bearer ${userInfo.token}`,
      },
    });
    if(data.paid){

      try{
        dispatch({ type: 'CREATE_REQUEST' });
        const order = await axios.post(
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
            itemsPriceForSeller: cart.itemsPriceForSeller,
            isPaid: data.paid,
            paidAt: Date.now(),
            stepStatus: 1
          },
          {
            headers: {
              authorization: `Bearer ${userInfo.token}`,
            },
          }
        );
        ctxDispatch({ type: 'CART_CLEAR' });
        dispatch({ type: 'CREATE_SUCCESS' });
        navigate(`/order/${order.data.order._id}`);
        toast.success('Pedido efectuado com sucesso');
    
        dispatch({ type: 'CREATE_MPESA_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'CREATE_MPESA_FAIL', payload: getError(err) });
      }
    }else{
      if(data.code==='INS-1'){
        toast.error('Erro Interno');
      }
      if(data.code==='INS-4'){
        toast.error('Conta inactiva');
      }
      if(data.code==='INS-5'){
        toast.error('Transação cancelada pelo utilizador');
      }
      if(data.code==='INS-6'){
        toast.error('Transação falhada');
      }
      if(data.code==='INS-9'){
        toast.error('Tempo de espera excedido');
      }
      if(data.code==='INS-2006'){
        toast.error('Saldo insuficiente');
      }
      if(data.code==='INS-2051'){
        toast.error('Número de telefone inválido');
      }
      
      toast.error('Pagamento sem sucesso');
      setIsModalMpesa(false);
    }
    } catch (err) {
      toast.error(getError(err));
    }
  };
  
  useEffect(() => {
    const fetchSellerDetails = async () => {
      try {
        dispatch({ type: 'SELLER_DETAILS_REQUEST' });
        setSellerId(cart.cartItems && cart.cartItems[0].seller._id);
  
        const { data } = await axios.get(`/api/users/${sellerId}`, {});
        setSeller(data)
        dispatch({ type: 'SELLER_DETAILS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'SELLER_DETAILS_FAIL', payload: getError(err) });
      }
    };
    fetchSellerDetails();
  }, [dispatch, sellerId, cart.cartItems]);
  
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
                  setSellerDayInfo(<span style={{color: 'green'}}>[{t('openstore')}]</span>)
                  return
            }
          }
        })
      }
    }, [seller, t]);

    


  const round2 = (num) => Math.round(num * 100 + Number.EPSILON) / 100; // 1234.3213123 => 1234.32

  cart.itemsPrice = round2(
    cart.cartItems.reduce((a, c) => c.onSale?a + c.quantity * c.discount:a + c.quantity * c.price, 0)
  );

  cart.addressPrice = cart && cart.deliveryOptionValue === 'withoutDelivery'?0:cart.address.city === 'Maputo Cidade' ? 250 : 350;
  cart.siteTax = 40;
  cart.ivaTax = round2(0.16 * cart.itemsPrice);


  cart.totalPrice =
    (cart.itemsPrice + cart.addressPrice + cart.siteTax + cart.ivaTax ).toFixed(2);

    let itemsPriceForSeller=0;
    cart.cartItems && cart.cartItems.map((item) =>{
      if(item.onSale){
        itemsPriceForSeller = itemsPriceForSeller + (item.priceFromSeller-item.priceFromSeller*item.onSalePercentage)*item.quantity
      }else{
        itemsPriceForSeller = itemsPriceForSeller +  item.priceFromSeller*item.quantity
      }
    })

    cart.itemsPriceForSeller = itemsPriceForSeller



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


    // if(seller && seller.seller.workDayAndTime.length===0){
    //   try {
    //     dispatch({ type: 'CREATE_REQUEST' });
    //    // if()
  
       
    //     const { data } = await axios.post(
    //       '/api/orders',
    //       {
    //         orderItems: cart.cartItems,
    //         address: cart.address,
    //         paymentMethod: cart.paymentMethod,
    //         itemsPrice: cart.itemsPrice,
    //         ivaTax: cart.ivaTax,
    //         siteTax: cart.siteTax,
    //         taxPrice: cart.taxPrice,
    //         totalPrice: cart.totalPrice,
    //         addressPrice: cart.addressPrice,
    //         itemsPriceForSeller: cart.itemsPriceForSeller
    //       },
    //       {
    //         headers: {
    //           authorization: `Bearer ${userInfo.token}`,
    //         },
    //       }
    //     );
    //     ctxDispatch({ type: 'CART_CLEAR' });
    //     dispatch({ type: 'CREATE_SUCCESS' });
    //     navigate(`/order/${data.order._id}`);
    //     toast.success('Pedido efectuado com sucesso');
    //   } catch (err) {
    //     toast.error(getError(err));
    //   }
    // }

    
    seller && seller.seller && seller.seller.workDayAndTime.map(async workday=>{
      
      if(workday.dayNumber === currentDay){

      if(workday.opentime <=formattedDatetime  && formattedDatetime<=workday.closetime){
        // esta tudo bem passa.
        // Esta dentro do periodo informado

        try {
          dispatch({ type: 'CREATE_REQUEST' });
    

          // verifica se o pagamento selecionado e via mpesa ou nao
          // Caso o pagamento selecionado seja Mpesa 
          // entao ira apresentar um pop up para o cliente pagar via mpesa
          // Apos retornar a informacao do pagamento por parte do cliente 
          // Secto os dados na ordem para informar que este pagamento foi pago
          // Caso o pagamento nao tenha sido pago com sucesso 
          // este nao avanca para a tela seguinte e apresenta a mensagem com o motivo do pagamento nao ter sido efectuado com sucesso
          if(cart.paymentMethod==='Mpesa'){
            setIsModalMpesa(true)
            return
          }
         
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
              itemsPriceForSeller: cart.itemsPriceForSeller,
              isPaid: false

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
      // toast.error(`Nao e possivel registar o seu pedido a loja esta fechada. `)
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

    if (userInfo) {
      setCustomerNumber(userInfo.phoneNumber)
      return
    }
   
   
  };

  return (
    <div>
      <Helmet>
        <title>{t('confirmorder')}</title>
      </Helmet>

      <CheckoutSteps step1 step2 step3 step4 ></CheckoutSteps>
      <h1>{t('confirmorder')} - {sellerDayInfo}</h1>
      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>{t('deliverydetails')}</span>
              </Card.Title>
              <Card.Text>
                <strong>{t('nameoforderreceiver')}:</strong> {cart.address.fullName}
                <br/>
                <strong>{t('numbertocall')}:</strong>
                {cart.address.phoneNumber}, {cart.address.alternativePhoneNumber}
                <br />
                <strong>{t('deliveryaddress')}:</strong> {cart.address.city},{' '}
                {cart.address.address}, {cart.address.referenceAddress}.
              </Card.Text>
              <Link className="link" to="/address">
                {t('changedelivdetails')} <FaPencilAlt/>
              </Link>
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <strong>{t('paymentmethod')}</strong>
              </Card.Title>
              <Card.Text>{cart.paymentMethod}</Card.Text>
              <Link className="link" to="/payment">
                {t('changepayment')} <FaPencilAlt/>
              </Link>
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>{t('productsinthecart')}: {' '}
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
                        {t('product')}: <b>{item.name}</b><br/>{t('color')}:<b>{item.color}</b>{' '} {t('size')}:<b>{item.size}</b>
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
              <Card.Title>{t('ordersummary')}</Card.Title> 
              <ListGroup variant="flush">
              <ListGroup.Item>

               <Link className="link" to="/deliveryoption">
                {t('changedelivoptions')} <FaPencilAlt/>
              </Link>
              </ListGroup.Item>
              </ListGroup>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>{t('priceofproducts')}</Col>
                    <Col>{cart.itemsPrice} MT</Col>
                  </Row>
                </ListGroup.Item>
                {cart.addressPrice===0?'':
                <ListGroup.Item>
                  <Row>
                    <Col>{t('deliveryfee')}</Col>
                    <Col>{cart.addressPrice} MT</Col>
                  </Row>
                </ListGroup.Item>}
                <ListGroup.Item>
                  <Row>
                    <Col>{t('servicecharge')}</Col>
                    <Col>{cart.siteTax} MT</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>IVA (16%)</Col>
                    <Col>{cart.ivaTax} MT</Col>
                  </Row>
                </ListGroup.Item>
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
                      {t('placeorder')}
                    </Button>
                  </div>
                </ListGroup.Item>
                {loading && <LoadingBox></LoadingBox>}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={isModalOpen}  onClick={closeModal}  className='modal'>
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

      <Modal show={isModalMpesa}  className='modal' >
        <Modal.Header closeButton onClick={closeModalMpesa}>
          <Modal.Title>{t('mpesapayment')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        {t('whichnumbertopay')}<br/>
       
       
      {/* RadioButtons */}
      <label>
        <input
          type="radio"
          value="opcao1"
          checked={escolha === "opcao1"}
          onChange={handleEscolhaChange}
        />
        {userInfo.phoneNumber}
      </label>
<br/>
      <label>
        <input
          type="radio"
          value="opcao2"
          checked={escolha === "opcao2"}
          onChange={handleEscolhaChange}
        />
          {t('anothernumber')}
      </label>

      {/* Campo de input condicional */}
      {escolha === 'opcao2' && (
        <div>
          <Form.Control
            type="text"
            max={9}
            maxLength={9}
            pattern="[0-9]*"
            title="Insira apenas números"
            placeholder="8********"
            value={valorInput}
            onChange={handleInputChange}
          />
        </div>
      )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={paymentMpesa}>
            Pagar
          </Button>
          <Button variant="danger" onClick={closeModalMpesa}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
