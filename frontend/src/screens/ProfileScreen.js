import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import { Store } from '../Store';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faClock } from '@fortawesome/free-solid-svg-icons';
import { faTextSlash } from '@fortawesome/free-solid-svg-icons';
import { faCar } from '@fortawesome/free-solid-svg-icons';

import { faClockFour } from '@fortawesome/free-solid-svg-icons';
import { faListNumeric } from '@fortawesome/free-solid-svg-icons';
import { faDriversLicense } from '@fortawesome/free-solid-svg-icons';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FaCalendarAlt } from "react-icons/fa";

import { useTranslation } from 'react-i18next';


const reducer = (state, action) => {
  switch (action.type) {

    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, documentTypes: action.payload.documentTypes,  pages: action.payload.pages};

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };


      case 'FETCH_USER_REQUEST':
        return { ...state, loadingUser: true };
  
      case 'FETCH_USER_SUCCESS':
        return { ...state, loadingUser: false, user: action.payload};
  
      case 'FETCH_USER_FAIL':
        return { ...state, loadingUser: false, error: action.payload };


      case 'FETCH_REQUEST_PROVINCE':
        return { ...state, loading: true };
  
      case 'FETCH_SUCCESS_PROVINCE':
        return { ...state, loading: false, provinces: action.payload.provinces,  pages: action.payload.pages};
  
      case 'FETCH_FAIL_PROVINCE':
        return { ...state, loading: false, error: action.payload };

    case 'UPDATE_REQUEST':
      return { ...state, loadingUpdate: true };

    case 'UPDATE_SUCCESS':
      return { ...state, loadingUpdate: false };

    case 'UPDATE_FAIL':
      return { ...state, loadingUpdate: false };

    case 'UPLOAD_REQUEST':
      return { ...state, loadingUpload: true };

    case 'UPLOAD_SUCCESS':
      return { ...state, loadingUpload: false, errorUpload: '' };

    case 'UPLOAD_FAIL':
      return { ...state, errorUpload: action.payload, loadingUpload: false };


      case 'COLORS_REQUEST':
        return { ...state, loadColor: true };
  
      case 'COLORS_SUCCESS':
        return { ...state, loadColor: false, colors: action.payload.colors };
  
      case 'COLORS_FAIL':
        return { ...state, error: action.payload, loadColor: false };


    default:
      return state;
  }
};

export default function ProfileScreen() {
  const { t } = useTranslation();

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const navigate = useNavigate();
  const [name, setName] = useState(userInfo.name);
  const [email, setEmail] = useState(userInfo.email);
  const [phoneNumber, setPhoneNumber] = useState(userInfo.phoneNumber);
  const [ isApproved,setIsApproved] = useState(userInfo.isApproved);

  const [password, setPassword] = useState('');
  const [confirm, setConfirmPassword] = useState('');

  const [isSeller, setIsSeller] = useState(false);
  const [isUpdatePassword, setIsUpdatePassword] = useState(false);

  const [sellerName, setSellerName] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');

  const [phoneNumberAccount, setPhoneNumberAccount] = useState('');
  const [alternativePhoneNumberAccount, setAlternativePhoneNumberAccount] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [alternativeAccountType, setAlternativeAccountType] = useState('');
  const [alternativeAccountNumber, setAlternativeAccountNumber] = useState('');

  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerLogo, setSellerLogo] = useState('');
  const [opentime, setOpentime] = useState('');
  const [closetime, setClosetime] = useState('');

  // detalhes do entregador
  const [isDeliveryMan, setIsDeliveryMan] = useState(false);
  const [deliveryManPhoto, setDeliveryManPhoto] = useState('');
  const [deliveryManName, setDeliveryManName] = useState('');
  const [deliveryManPhoneNumber, setDeliveryManPhoneNumber] = useState('');
  const [deliveryMantransportType, setDeliveryMantransportType] = useState('');
  const [deliveryMantransportRegistration, setDeliveryMantransportRegistration] = useState('');
  const [deliveryMantransportColor, setDeliveryMantransportColor] = useState('');

  
  const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const [workDaysWithTime, setWorkDaysWithTime] = useState([]);
  const [dayOfWeek, setDayOfWeek] = useState('');


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
         if(dayOfWeek.includes("Sab")|| dayOfWeek.includes("Sat")|| dayOfWeek.includes("Sáb"))
            dayNumber=6;
         if(dayOfWeek.includes("Fer")|| dayOfWeek.includes("Hol"))
             dayNumber=7;

            const newItem = {
              dayNumber,
              dayOfWeek,
              opentime,
              closetime
            };
            setWorkDaysWithTime([...workDaysWithTime, newItem]);
            setDayOfWeek('');
            setOpentime('');
            setClosetime('');
          
          }
        
        }
      
    } else {
      // Lidar com erro de entrada inválida, se necessário
      toast.error('Por favor, preencha todos os campos.');
    }
  };


  const accountTypes = [
    { _id: 1, name: 'BCI' },
    { _id: 2, name: 'BIM' },
    { _id: 3, name: 'MOZA' },
    { _id: 4, name: 'ABSA' },
  ];

  const transportTypes = [
    { _id: 1, name: 'Txopela' },
    { _id: 2, name: 'Carro' },
    { _id: 3, name: 'Motorizada' },
    { _id: 4, name: 'Camião' },
  ];



  const [{ loadingUpdate, loadingUpload, provinces, loadColor, colors }, dispatch] = useReducer(reducer, {
    loadingUpdate: false, 
    loadColor: false,
  });

  useEffect(() => {
    dispatch({ type: 'COLORS_REQUEST' });

    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/colors');
        dispatch({ type: 'COLORS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'COLORS_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [colors]);

  const submitHandler = async (e) => {
    e.preventDefault();
    dispatch({ Type: 'UPDATE_REQUEST' });
    try {

      const { data } = await axios.put(
        'api/users/profile',
        {
          name,
          email,
          password,
          phoneNumber,
          isApproved,
          isSeller,
          sellerName,
          sellerDescription,
          sellerLogo,

          phoneNumberAccount,
          alternativePhoneNumberAccount,
          accountType,
          accountNumber,
          alternativeAccountType,
          alternativeAccountNumber,

          sellerLocation,
          sellerAddress,
          workDaysWithTime,

          //deliveryMan details
          isDeliveryMan,
          deliveryManPhoto,
          deliveryManName,
          deliveryManPhoneNumber,
          deliveryMantransportType,
          deliveryMantransportRegistration,
          deliveryMantransportColor
        },
        { headers: { authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'UPDATE_SUCCESS' });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      toast.success('Perfil actualizado com sucesso');
      navigate('/');
    } catch (er) {
      dispatch({ type: 'UPDATE_FAIL', payload: getError(er) });
      toast.error(getError(er));
    }
  };
  useEffect(  () => {

    async function fetchData (){


      dispatch({ type: 'FETCH_USER_REQUEST' });
      try{
        const { data } = await axios.get(`api/users/${userInfo._id}`);
        
        dispatch({ type: 'FETCH_USER_SUCCESS' , payload: data});


       setIsDeliveryMan(data.isDeliveryMan);
    
        if (userInfo.isSeller && data) {
          setIsSeller(true);
          setSellerName(data.seller.name);
          setSellerLogo(data.seller.logo);
          setSellerDescription(data.seller.description);
          
          setPhoneNumberAccount(data.seller.phoneNumberAccount);
          setAlternativePhoneNumberAccount(data.seller.alternativePhoneNumberAccount);
          setAccountType(data.seller.accountType);
          setAccountNumber(data.seller.accountNumber);
          setAlternativeAccountType(data.seller.alternativeAccountType);
          setAlternativeAccountNumber(data.seller.alternativeAccountNumber);


          setSellerLocation(data.seller.province && data.seller.province._id);
          setSellerAddress(data.seller.address);
          setOpentime(data.seller.opentime);
          setClosetime(data.seller.closetime);
          setIsApproved(data.seller.isApproved)
          setWorkDaysWithTime(data.seller.workDayAndTime);

        }
        if (data.isDeliveryMan) {
          setDeliveryManPhoneNumber(data.phoneNumber);
          setDeliveryManName(data.name);
          setDeliveryMantransportType(data.deliveryman!==undefined?data.deliveryman.transport_type:'');
          setDeliveryMantransportColor(data.deliveryman!==undefined? data.deliveryman.transport_color:'');
          setDeliveryMantransportRegistration(data.deliveryman!==undefined?data.deliveryman.transport_registration:'');
        }
  
      }catch(e){
        dispatch({ type: 'FETCH_USER_FAIL', payload: getError(e) });
      }
    }
    fetchData();
  }, [userInfo]);



  
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
    <div className="container small-container">
      <Helmet>{t('profile')}</Helmet>
      <h1 className="mb-3"> {t('profile')}</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label> {t('name')}</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
          ></Form.Control>
        </Form.Group>

        <Form.Group className="mb-3" controlId="phone">
          <Form.Label> {t('phone')}</Form.Label>
          <Form.Control
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
            disabled
            required
          ></Form.Control>
        </Form.Group>

        <Form.Group className="mb-3" controlId="email">
          <Form.Label> Email</Form.Label>
          <Form.Control
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
          ></Form.Control>
        </Form.Group>


        {isDeliveryMan && (
          <div>
            <h2><b>Detalhes do veículo</b></h2>
        <Form.Group className="mb-3" controlId="transportType">
          <FontAwesomeIcon icon={faCar} /> <Form.Label>{t('vehicletype')}</Form.Label>
            <Form.Select aria-label="Tipo de veículo"
          value={deliveryMantransportType}
          onChange={(e)=>setDeliveryMantransportType(e.target.value)} required>
            <option value="">{t('select')}</option>
            {transportTypes && transportTypes.map(transport => (
            <option key={transport._id} value={transport.name}>
              {transport.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="colorTransport">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('color')}</Form.Label>
            <Form.Select aria-label="Cor do veículo"
          value={deliveryMantransportColor}
          onChange={(e)=>setDeliveryMantransportColor(e.target.value)} required>
            <option value="">{t('select')}</option>
            {colors && colors.map(color => (
            <option key={color._id} value={color.name}>
              {color.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="transportPlate">
              <FontAwesomeIcon icon={faDriversLicense} /> <Form.Label>{t('registration')}</Form.Label>
              <Form.Control
                type="text"
                value={deliveryMantransportRegistration}
                required
                onChange={(e) => {
                  setDeliveryMantransportRegistration(e.target.value);
                }}
              />
        </Form.Group>

 
          </div>
          
          )}


        <Form.Check
          className="mb-3"
          type="checkbox"
          id="isUpdatePassword"
          label={t('updateyourpassword')}
          checked={isUpdatePassword}
          onChange={(e) => setIsUpdatePassword(e.target.checked)}
        ></Form.Check>

        {isUpdatePassword && (
          <>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label> {t('password')}</Form.Label>
              <Form.Control
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                required={isUpdatePassword}
              ></Form.Control>
            </Form.Group>

            <Form.Group className="mb-3" controlId="confirm">
              <Form.Label> {t('confirmpassword')}</Form.Label>
              <Form.Control
                value={confirm}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                }}
                required={isUpdatePassword}
              ></Form.Control>
            </Form.Group>
          </>
        )}



        <Form.Check
          className="mb-3"
          type="checkbox"
          id="isSeller"
          label={t('areyousupplier')}
          checked={isSeller}
          onChange={(e) => setIsSeller(e.target.checked)}
        ></Form.Check>


    

{isSeller && (
          <>
          <br/>
          <div ><h4>{t('additionaldata')}</h4>

          <Form.Group className="mb-3" controlId="sellerPhoneAccount">
          <FontAwesomeIcon icon={faListNumeric} /> <Form.Label>{t('phonenumbertransfers')}</Form.Label>
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

        <Form.Group className="mb-3" controlId="sellerPhoneAccountAlternativo">
          <FontAwesomeIcon icon={faListNumeric} /> <Form.Label>{t('phonenumbertransfersoptional')}</Form.Label>
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
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('accounttype')}</Form.Label>
            <Form.Select aria-label="Tipo de conta"
          value={accountType}
          onChange={(e)=>setAccountType(e.target.value)} required>
            <option value="">{t('select')}</option>
            {accountTypes && accountTypes.map(account => (
            <option key={account._id} value={account.name}>
              {account.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerAccountNumber">
          <FontAwesomeIcon icon={faListNumeric} /> <Form.Label>{t('accountnumber')}</Form.Label>
          <Form.Control
            type="text"
            value={accountNumber}
            required
            onChange={(e) => {
              setAccountNumber(e.target.value);
            }}
          />
        </Form.Group>


        <Form.Group className="mb-3" controlId="sellerAccountTypeAlternativo">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('accounttypeoptional')}</Form.Label>
            <Form.Select aria-label="Tipo de conta alternativo (opcional)"
          value={alternativeAccountType}
          onChange={(e)=>setAlternativeAccountType(e.target.value)} required>
            <option value="">{t('select')}</option>
            {accountTypes && accountTypes.map(account => (
            <option key={account._id} value={account.name}>
              {account.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerAccountNumberAlternativo">
          <FontAwesomeIcon icon={faListNumeric} /> <Form.Label>{t('accountnumberoptional')}</Form.Label>
          <Form.Control
            type="text"
            value={alternativeAccountNumber}
            onChange={(e) => {
              setAlternativeAccountNumber(e.target.value);
            }}
          />
        </Form.Group>

      
          </div>

         
          <br/>
          <div><h4>{t('storedetails')} </h4>
          <Form.Group className="mb-3" controlId="sellerName">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('storename')}</Form.Label>
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
              <Form.Label>{t('storelogo')}</Form.Label>
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
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('storedescription')}</Form.Label>
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
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('province')}</Form.Label>
            <Form.Select aria-label="Provincia"
          value={sellerLocation}
          onChange={(e)=>setSellerLocation(e.target.value)} required>
            <option value="">{t('select')}</option>
            {provinces && provinces.map(province => (
            <option key={province._id} value={province._id}>
              {province.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerDescription">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>{t('storeaddress')}</Form.Label>
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
        <FaCalendarAlt /> <Form.Label>{t('weekday')}</Form.Label>
            <Form.Select aria-label="Week"
          value={dayOfWeek}
          onChange={(e)=>setDayOfWeek(e.target.value)}>
            <option value="">{t('select')}</option>
            {daysOfWeek && daysOfWeek.map(day => (
            <option key={day} value={day}>
              {day}
            </option>
        ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3" controlId="sellerOpentime">
          <FontAwesomeIcon icon={faClock} /> <Form.Label>{t('openingtime')}</Form.Label>
          <Form.Control
            type="time"
            value={opentime}
            onChange={(e) => {
              setOpentime(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerClosetime">
          <FontAwesomeIcon icon={faClockFour} /> <Form.Label>{t('closingtime')}</Form.Label>
          <Form.Control
            type="time"
            value={closetime}
            onChange={(e) => {
              setClosetime(e.target.value);
            }}
          />
        </Form.Group>
            <Button onClick={handleAddItem}>{t('add')}</Button>
       </div>

       {workDaysWithTime && <h6>{t('businessdays')}</h6>}
      <ul>
        {workDaysWithTime && workDaysWithTime.map((item, index) => (
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
          <Button
            className="customButtom"
            variant="light"
            type="submit"
            disabled={loadingUpdate}
          >
            {t('update')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
