import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobile } from '@fortawesome/free-solid-svg-icons';
import { faTextSlash } from '@fortawesome/free-solid-svg-icons';
import { faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';


import { faLock } from '@fortawesome/free-solid-svg-icons';
import { faLockOpen } from '@fortawesome/free-solid-svg-icons';

import { faClock } from '@fortawesome/free-solid-svg-icons';
import { faClockFour } from '@fortawesome/free-solid-svg-icons';

import { CiCreditCard1 } from "react-icons/ci";

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useContext, useEffect, useReducer, useState } from 'react';
import { Store } from '../Store.js';
import { toast } from 'react-toastify';
import { getError } from '../utils.js';
import LoadingBox from '../components/LoadingBox.js';
import CountryFlag from 'react-country-flag';

import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FaCalendarAlt } from "react-icons/fa";

import { GoNumber } from "react-icons/go";


const reducer = (state, action) => {
  switch (action.type) {

    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, documentTypes: action.payload.documentTypes,  pages: action.payload.pages};

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };

      case 'FETCH_REQUEST_PROVINCE':
        return { ...state, loading: true };
  
      case 'FETCH_SUCCESS_PROVINCE':
        return { ...state, loading: false, provinces: action.payload.provinces,  pages: action.payload.pages};
  
      case 'FETCH_FAIL_PROVINCE':
        return { ...state, loading: false, error: action.payload };

    case 'USER_REQUEST':
      return { ...state, loadingUser: true };

    case 'USER_SIGNIN':
      return { ...state, registerUser: action.payload, loadingUser: false };

    case 'USER_FAIL':
      return { ...state, registerUserFail: action.payload, loadingUser: false };

      case 'UPLOAD_REQUEST':
        return { ...state, loadingUpload: true };
  
      case 'UPLOAD_SUCCESS':
        return { ...state, loadingUpload: false, errorUpload: '' };
  
      case 'UPLOAD_FAIL':
        return { ...state, errorUpload: action.payload, loadingUpload: false };

    default:
      return state;
  }
};
export default function SignupScreen() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const urlToRedirect = new URLSearchParams(search).get('redirect');
  const redirect = urlToRedirect ? urlToRedirect : '/';

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSeller, setIsSeller] = useState(false);

  const [sellerName, setSellerName] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');

  const [sellerLogo, setSellerLogo] = useState('');
  const [opentime, setOpentime] = useState('');
  const [closetime, setClosetime] = useState('');

  const [phoneNumberAccount, setPhoneNumberAccount] = useState('');
  const [alternativePhoneNumberAccount, setAlternativePhoneNumberAccount] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [alternativeAccountType, setAlternativeAccountType] = useState('');
  const [alternativeAccountNumber, setAlternativeAccountNumber] = useState('');

  const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira','Sexta-feira','Sábado', 'Feriados'];
  const [workDaysWithTime, setWorkDaysWithTime] = useState([]);
  const [dayOfWeek, setDayOfWeek] = useState('');

  const accountTypes = [
    { _id: 1, name: 'BCI' },
    { _id: 2, name: 'BIM' },
    { _id: 3, name: 'MOZA' },
    { _id: 4, name: 'ABSA' },
    { _id: 5, name: 'FNB' },

  ];



  const { state, dispatch: ctxDispatch } = useContext(Store);


  const [
    {
      loadingUser,
      loadingUpload,
      provinces
    },
    dispatch
  ] = useReducer(reducer, { loadingUser: false, registerUserFail:[], registerUser: {} });

  const removeDayWeek = (index) => {
    const workDays = [...workDaysWithTime];
    workDays.splice(index, 1); // Remove the item at the specified index
    setWorkDaysWithTime(workDays); // Update the items list
  };
  const handleAddItem = () => {
    // Validar entrada do usuário, se necessário
    if (dayOfWeek && opentime && closetime) {
      let dayNumber = 0;
        if(dayOfWeek){
          const selectedWorkDay = workDaysWithTime.find((workDay) => workDay.dayOfWeek === dayOfWeek);    

          if(!selectedWorkDay){

          if(dayOfWeek.includes("Dom")|| dayOfWeek.includes("Sun"))
             dayNumber=0;
          if(dayOfWeek.includes("Seg")|| dayOfWeek.includes("Mon"))
             dayNumber=1;
          if(dayOfWeek.includes("Ter")|| dayOfWeek.includes("Tue"))
             dayNumber=2;
          if(dayOfWeek.includes("Qua")|| dayOfWeek.includes("Wed"))
             dayNumber=3;
          if(dayOfWeek.includes("Qui")|| dayOfWeek.includes("Thu"))
             dayNumber=4;
          if(dayOfWeek.includes("Sex")|| dayOfWeek.includes("Fri"))
             dayNumber=5;
          if(dayOfWeek.includes("Sab")|| dayOfWeek.includes("Sat"))
             dayNumber=6;
          if(dayOfWeek.includes("Fer")|| dayOfWeek.includes("Hol")){
             dayNumber=7;
          }
           
            const newItem = {
               dayOfWeek,
              opentime,
              closetime
            };
            setWorkDaysWithTime([...workDaysWithTime, newItem]);
            setDayOfWeek({});
            setOpentime('');
            setClosetime('');
          }
        
        }
      
    } else {
      // Lidar com erro de entrada inválida, se necessário
      toast.error('Por favor, preencha todos os campos.');
    }
  };


  const { userInfo } = state;
  const submitHandler = async (e) => {
    e.preventDefault();
    if(phoneNumber.length!==9){
      toast.error('O número de telefone deve possuir 9 digitos');
      return
    }
    if((!phoneNumber.startsWith('82')&&!phoneNumber.startsWith('83')&&!phoneNumber.startsWith('84')&&!phoneNumber.startsWith('85')&&!phoneNumber.startsWith('86')&&!phoneNumber.startsWith('87')) ){
      toast.error('Número de operadora incorrecto');
      return
    }
    
    if(password.length<=5){
      toast.error('A password deve possuir no minimo 6 digitos');
      return
    }

    if(password!==confirmPassword ){
      toast.error('As passwords não conferem');
      return
    }

    if(workDaysWithTime.length===0 && isSeller ){
      toast.error('Por favor, adicione os dias úteis de trabalho e horário');
      return
    }
    if(sellerLogo === ''  && isSeller){
      toast.error('Por favor, adicione a logo da loja');
      return
    
    }

    try {
      ctxDispatch({ type: 'USER_REQUEST' });

      const { data } = await axios.post('/api/users/signup', {
        name,
        phoneNumber,
        email,
        password,
        isSeller,
        sellerName,
        sellerDescription,
        sellerLogo,
        sellerLocation,
        sellerAddress,
        phoneNumberAccount,
        alternativePhoneNumberAccount,
        accountType,
        accountNumber,
        alternativeAccountType,
        alternativeAccountNumber,
        workDaysWithTime
      });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      navigate(redirect || '/');
    } catch (err) {
      ctxDispatch({ type: 'USER_FAIL', payload: getError(err) });
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });

        const { data } = await axios.get('/api/documents');
        
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
   
      fetchData();
    
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST_PROVINCE' });

        const { data } = await axios.get('/api/provinces');
        
        dispatch({ type: 'FETCH_SUCCESS_PROVINCE', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL_PROVINCE', payload: getError(err) });
      }
    };
      fetchData();
  }, []);

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      ctxDispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      ctxDispatch({ type: 'UPLOAD_SUCCESS', payload: data });

      setSellerLogo(data.secure_url);

      toast.success('Upload de Imagem com Sucesso. Clique em Registar');
    } catch (err) {
      toast.error(getError(err));
      ctxDispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
    }
  };



  return (
    <Container className="small-conteiner">
      <Helmet>
        <title>Nova conta</title>
      </Helmet>
      <h1 className="my-3">Nova conta</h1>
      <Form onSubmit={submitHandler}>
      <Form.Group className="mb-3" controlId="name">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Seu nome</Form.Label>
          <Form.Control
            type="text"
            required
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </Form.Group>

        
        <Form.Group className="mb-3" controlId="phoneNumber">
          <FontAwesomeIcon icon={faMobile} /> <Form.Label>Telefone:  <CountryFlag countryCode="MZ" svg className="mz-flag" /> [+258]</Form.Label>
          <Form.Control
            type="text"
            max={9}
            maxLength={9}
            pattern="[0-9]*"
            title="Insira apenas números"
            placeholder="8********"
            required
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="email">
          <FontAwesomeIcon icon={faEnvelopeOpenText} /> <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            required
            placeholder=".com"
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </Form.Group>


        <Form.Group className="mb-3" controlId="password">
          <FontAwesomeIcon icon={faLock} /> <Form.Label>Password: <small className='color-transparent'>*Deve possuir no minimo 6 digitos</small></Form.Label>
          <Form.Control
            type="password"
            placeholder="******"
            required
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="confirmPassword">
          <FontAwesomeIcon icon={faLockOpen} /> <Form.Label>Confirme o password</Form.Label>
          <Form.Control
            type="password"
            placeholder="******"
            required
            onChange={(e) => {
              setConfirmPassword(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Check className='mb-3' type="checkbox" id="isSeller"
            label="Deseja ser nosso fornecedor?" checked={isSeller}
            onChange={(e)=>setIsSeller(e.target.checked)}></Form.Check>        

{isSeller && (
          <>
          <br/>
          <div ><h4>Dados bancários</h4>

          <Form.Group className="mb-3" controlId="sellerPhoneNumberAccount">
          <GoNumber /> <Form.Label>Número de telefone para transferências</Form.Label>
          <Form.Control
             type="text"
             max={9}
             maxLength={9}
             pattern="[0-9]*"
             title="Insira apenas números"
             placeholder="8********"
            value={phoneNumberAccount}
            required
            onChange={(e) => {
              setPhoneNumberAccount(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerPhoneNumberAccountAlternative">
        <GoNumber /> <Form.Label>Número de telefone para transferências [opcional]</Form.Label>
          <Form.Control
            type="text"
            max={9}
            maxLength={9}
            pattern="[0-9]*"
            title="Insira apenas números"
            placeholder="8********"
            value={alternativePhoneNumberAccount}
            onChange={(e) => {
              setAlternativePhoneNumberAccount(e.target.value);
            }}
          />
        </Form.Group>

          <Form.Group className="mb-3" controlId="sellerAccountType">
          <CiCreditCard1 /> <Form.Label>Tipo de conta</Form.Label>
            <Form.Select aria-label="Tipo de conta"
          value={accountType}
          onChange={(e)=>setAccountType(e.target.value)} required>
            <option value="">Seleccione</option>
            {accountTypes && accountTypes.map(accountType => (
            <option key={accountType._id} value={accountType.name}>
              {accountType.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="accountNumber">
        <GoNumber /> <Form.Label>Número de conta</Form.Label>
          <Form.Control
            type="Number"
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value);
            }}
          />
        </Form.Group>


        <Form.Group className="mb-3" controlId="accountTypeAlternative">
        <CiCreditCard1 /> <Form.Label>Tipo de conta alternativo [opcional]</Form.Label>
            <Form.Select aria-label="Tipo de conta para transferências"
          value={alternativeAccountType}
          onChange={(e)=>setAlternativeAccountType(e.target.value)}>
            <option value="">Seleccione</option>
            {accountTypes && accountTypes.map(accountType => (
            <option key={accountType.id} value={accountType.name}>
              {accountType.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="numeroAccountAlternative">
        <GoNumber /><Form.Label>Número de conta alternativo [opcional]</Form.Label>
          <Form.Control
             type="Number"
            value={alternativeAccountNumber}
            onChange={(e) => {
              setAlternativeAccountNumber(e.target.value);
            }}
          />
        </Form.Group>
          </div>

         
          <br/>
          <div><h4>Detalhes da sua loja </h4>
          <Form.Group className="mb-3" controlId="sellerName">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Nome da loja/empresa</Form.Label>
          <Form.Control
            type="text"
            value={sellerName}
            required
            onChange={(e) => {
              setSellerName(e.target.value);
            }}
          />
        </Form.Group>


        <Form.Group className="mb-3" controlId="sellerLogo">
              <Form.Label>Logo da loja</Form.Label>
              {sellerLogo && (
                <img
                  style={{
                    width: '6rem',
                    height: '6rem',
                    alignItems: 'center',
                    alignContent: 'center',
                  }}
                  src={sellerLogo}
                  alt={name}
                  className="card-img-top"
                ></img>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="imageFile">
              <Form.Label>Upload logo</Form.Label>
              <Form.Control type="file" onChange={uploadFileHandler} />
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>

          <Form.Group className="mb-3" controlId="sellerDescription">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Descrição da loja [Especialidade]</Form.Label>
          <Form.Control
            type="text"
            value={sellerDescription}
            as="textarea"
            required
            onChange={(e) => {
              setSellerDescription(e.target.value);
            }}
          />
        </Form.Group>


       

        <Form.Group className="mb-3" controlId="sellerLocation">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Província</Form.Label>
            <Form.Select aria-label="Provincia"
          value={sellerLocation}
          onChange={(e)=>setSellerLocation(e.target.value)} required>
            <option value="">Seleccione</option>
            {provinces && provinces.map(province => (
            <option key={province._id} value={province._id}>
              {province.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="address">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Endereço da loja [Rua/Av.]</Form.Label>
          <Form.Control
            type="text"
            value={sellerAddress}
            as="textarea"
            required
            onChange={(e) => {
              setSellerAddress(e.target.value);
            }}
          />
        </Form.Group>


        <div>
                  
        <Form.Group className="mb-3" controlId="dayWeek">
        <FaCalendarAlt /> <Form.Label>Dia de semana</Form.Label>
            <Form.Select aria-label="Week"
          value={dayOfWeek}
          onChange={(e)=>setDayOfWeek(e.target.value)}>
            <option value="">Seleccione</option>
            {daysOfWeek && daysOfWeek.map(day => (
            <option key={day} value={day}>
              {day}
            </option>
        ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3" controlId="sellerOpentime">
          <FontAwesomeIcon icon={faClock} /> <Form.Label>Hora de abertura</Form.Label>
          <Form.Control
            type="time"
            value={opentime}
            onChange={(e) => {
              setOpentime(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerClosetime">
          <FontAwesomeIcon icon={faClockFour} /> <Form.Label>Hora de fecho</Form.Label>
          <Form.Control
            type="time"
            value={closetime}
            onChange={(e) => {
              setClosetime(e.target.value);
            }}
          />
        </Form.Group>
            <Button onClick={handleAddItem}>Adicionar</Button>
       </div>

       {workDaysWithTime && <h6>Dias úteis e horário</h6>}
      <ul>
        {workDaysWithTime.map((item, index) => (
          <li key={index}>
            {item.dayOfWeek}: {item.opentime} - {item.closetime}
            <Button
                        variant="light"
                        onClick={() => removeDayWeek(index)}
                      >
                        {' '}
                        <FontAwesomeIcon icon={faTimesCircle}></FontAwesomeIcon>
                      </Button>
          </li>
        ))}
      </ul>

       

        </div>

   

          </>
        )}

        
        <div className="mb-3">
          <Button className='customButtom' variant='light' disabled={loadingUser} type="submit">Criar</Button>
          {loadingUser&&<LoadingBox></LoadingBox>}
        </div>
        <div className="mb-3">
        Ja possui conta?{' '}
          <Link className="link " to={`/signin?redirect=${redirect}`}>Início</Link>
        </div>
      </Form>
    </Container>
  );
}
