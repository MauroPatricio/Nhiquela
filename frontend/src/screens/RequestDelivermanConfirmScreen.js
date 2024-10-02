import React, { useContext, useEffect, useReducer, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
// import Form from 'react-bootstrap/Form';
import { Helmet } from 'react-helmet-async';
import CheckoutSteps from '../components/CheckoutSteps.js';
import Card from 'react-bootstrap/Card';
import { Store } from '../Store.js';
import { Link, useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import { getError } from '../utils.js';
import { toast } from 'react-toastify';
import axios from 'axios';
import LoadingBox from '../components/LoadingBox.js';
import { FaPencilAlt } from "react-icons/fa";
import { Modal} from 'react-bootstrap';
import Form from 'react-bootstrap/Form'
import { useTranslation } from 'react-i18next';
import MessageBox from '../components/MessageBox.js';



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

export default function RequestDelivermanConfirmScreen() {
  const { t } = useTranslation();

  const [{ loading }, dispatch] = useReducer(reducer, { loading: false });
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const { cart, userInfo  } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalMpesa, setIsModalMpesa] = useState(false);
  const [isModalStock, setIsModalStock] = useState(false);
  const [isModalDelayOrder, setIsModalDelayOrder] = useState(false);
  const [itemOutOfStock, setItemOutOfStock] = useState([]);


  let [customerNumber, setCustomerNumber] = useState(null);


  const [message] = useState(t('makelogin'));


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  const closeModal = () => {
    setIsModalOpen(false);
  };

  const redirectDelivermanScreen = () =>{
        navigate('/requestdelivermanscreen');
  }

  const closeModalMpesa = () => {
    setIsModalMpesa(false);
    dispatch({ type: 'CREATE_MPESA_FAIL' });

  };

  const closeModalStock = () =>{
    setIsModalStock(false)
    setIsModalMpesa(false);
    setIsModalOpen(false);
    setIsModalDelayOrder(false)
    return
  }

  const closeModalDelay = () =>{

    setIsModalDelayOrder(false)
    return
  }


  
  const loginRedirect = () => {
    navigate('/signin?redirect=/requestdelivermanconfirm');
  };
  
  const {requestDeliverman} = state;


  // Estado para rastrear a escolha do usuário
  const [escolha, setEscolha] = useState(null);

  // Estado para rastrear o valor do campo de input condicional
  const [valorInput, setValorInput] = useState('');

  // Função para atualizar o estado de escolha
  const handleEscolhaChange = (event) => {
    if(userInfo){
      const novaEscolha = event.target.value;
      setEscolha(novaEscolha);
      setCustomerNumber(userInfo && userInfo.phoneNumber)
  
      // Limpar o valor do input quando a escolha mudar
      setValorInput('');
    }
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

    const amount = priceToPay;

    // validar a quantidade disponviel em stock
    // Caso o valor em stock disponivel seja maior que a quantidade selecionado ele deve avancar;
    // Caso nao deve emitir uma mensagem informando que a quantidade disponivel em stock e tanto e pede que se reduza
    // A quantidade para o disponivel em stock

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
          '/api/requestdeliver',
          {
            name: requestDeliverman.name,
            phoneNumber: requestDeliverman.phoneNumber,
            goodType: requestDeliverman.goodType,
            transportType:  requestDeliverman.transportType,
            deliverCity:  requestDeliverman.deliverCity,
            origin:  requestDeliverman.origin,
            destination:  requestDeliverman.destination,
            paymentOption:  requestDeliverman.paymentOption,
            description:  requestDeliverman.description,
            paymentMethod:  requestDeliverman.paymentMethod,
            deliveryPrice:  priceToPay,
            user: userInfo._id,
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
        // ctxDispatch({ type: 'CART_CLEAR' });
        dispatch({ type: 'CREATE_SUCCESS' });
        navigate(`/requestdelivermanprogress/${order.data.requestDeliv._id}`);
        toast.success('Pedido efectuado com sucesso');
    
        dispatch({ type: 'CREATE_MPESA_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'CREATE_FAIL', payload: getError(err) });
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


  const priceToPay= requestDeliverman.deliverCity === 'Maputo Cidade' ? 150 : 300;


  const placeOrderHandler = async () => {
    

    // Compare the current time with the threshold
    // const isPastThreshold =
    //   currentHour > thresholdHour ||
    //   (currentHour === thresholdHour && currentMinute >= thresholdMinute);

    if (!userInfo) {
      setIsModalOpen(true)
      return
    }
    
    // if (userInfo) {
    //   setCustomerNumber(userInfo.phoneNumber)
    //   return
    // }


    if(requestDeliverman.paymentOption ==='Mpesa'){
      setIsModalMpesa(true)
      return
    }


    if(requestDeliverman.paymentOption !=='Mpesa'){
      try{
        dispatch({ type: 'CREATE_REQUEST' });
        const order = await axios.post(
          '/api/requestdeliver',
          {
            name: requestDeliverman.name,
            phoneNumber: requestDeliverman.phoneNumber,
            goodType: requestDeliverman.goodType,
            transportType:  requestDeliverman.transportType,
            deliverCity:  requestDeliverman.deliverCity,
            origin:  requestDeliverman.origin,
            destination:  requestDeliverman.destination,
            paymentOption:  requestDeliverman.paymentOption,
            description:  requestDeliverman.description,
            paymentMethod:  requestDeliverman.paymentMethod,
            deliveryPrice:  priceToPay,
            user: userInfo._id,
            stepStatus: 1
          },
          {
            headers: {
              authorization: `Bearer ${userInfo.token}`,
            },
          }
        );
        // ctxDispatch({ type: 'CART_CLEAR' });
        // dispatch({ type: 'CREATE_SUCCESS' });
        navigate(`/requestdelivermanprogress/${order.data.requestDeliv._id}`);
        toast.success('Pedido efectuado com sucesso');
    
      } catch (err) {
        dispatch({ type: 'CREATE_MPESA_FAIL', payload: getError(err) });
      }
    }
   
   
  };

  return (

    <div>
      <Helmet>
        <title>{t('requestdeliverman')}</title>
      </Helmet>

      {/* <CheckoutSteps step1 step2 step3 step4 ></CheckoutSteps> */}
      <h1>{t('requestdeliverman')}</h1>
      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <span>{t('deliverydetails')}</span>
              </Card.Title>
              <Card.Text>
                <strong>{t('nameoforderreceiver')}:</strong> {requestDeliverman.name}
                <br/>
                <strong>{t('numbertocall')}:</strong>  {requestDeliverman.phoneNumber}
                <br />              
                <strong>{t('transporttypetoroder')}:</strong> {requestDeliverman.transportType}
                <br/>
                <strong>{t('typeofgoodtodeliver')}:</strong> {requestDeliverman.goodType}
                <br/>
                <strong>{t('detailsofdeliver')}:</strong> {requestDeliverman.description}
                <br/>
              </Card.Text>
              <Link className="link" to="/requestdeliverman">
                {t('changedelivdetails')} <FaPencilAlt/>
              </Link>
            </Card.Body>
          </Card>


          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <strong>{t('deliveryaddressdetails')}</strong>
              </Card.Title>
              <Card.Text>
              <strong>{t('deliveryplace')}:</strong> {requestDeliverman.deliverCity}
                <br/>
              <strong>{t('origin')}:</strong> {requestDeliverman.origin}
                <br/>
                <strong>{t('destination')}:</strong> {requestDeliverman.destination}
                <br/>
                </Card.Text>
            </Card.Body>
          </Card>



          <Card className="mb-3">
            <Card.Body>
              <Card.Title>
                <strong>{t('paymentmethod')}</strong>
              </Card.Title>
              <Card.Text>{requestDeliverman.paymentOption}</Card.Text>
              <Link className="link" to="/requestdeliverman">
                {t('changepayment')} <FaPencilAlt/>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>{t('ordersummary')}</Card.Title> 
              <ListGroup variant="flush">

              <ListGroup.Item>
                  
                       <Row>
                    
                       {requestDeliverman.paymentOption === 'Emola' &&
                     (
                      <MessageBox variant="">
                                {t('forconfirmyourorder')} {' '} 
                                <b>{priceToPay} MT</b> {t('onaccountnumber')} <b>879300036</b>
                      </MessageBox>
                    )}
                    
                       {requestDeliverman.paymentOption === 'BCI' &&
                     (
                      <MessageBox variant="">
                                {t('forconfirmyourorder')} {' '} 
                                <b>{priceToPay} MT</b> {t('onaccountnumber')} <b>123456789</b>
                      </MessageBox>
                    )}
                     {requestDeliverman.paymentOption === 'BIM' &&
                     (
                      <MessageBox variant="">
                                {t('forconfirmyourorder')} {' '} 
                                <b>{priceToPay} MT</b> {t('onaccountnumber')} <b>155555555</b>
                      </MessageBox>
                    )}
                  </Row>
                </ListGroup.Item>
              <ListGroup.Item>
                  <Row>
                    <Col>
                      <b>Total</b>
                    </Col>
                    <Col>
                      <b>{priceToPay} MT</b>
                    </Col>
                  </Row>
                </ListGroup.Item>
           
           
              

                <ListGroup.Item>
                  <div className="d-grid">
                    <Button
                    className='customButtom' variant='light'
                      type="button"
                      onClick={placeOrderHandler}
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
        {userInfo && userInfo.phoneNumber}
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
