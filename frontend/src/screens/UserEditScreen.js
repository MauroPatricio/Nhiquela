import React, { useContext, useEffect, useReducer, useState } from 'react'
import { Store } from '../Store';
import {  useNavigate, useParams } from 'react-router-dom';
import { getError } from '../utils';
import { toast } from 'react-toastify';
import axios from 'axios';
import Form from 'react-bootstrap/Form'
import Container from 'react-bootstrap/Container';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTextSlash, faClock, faClockFour } from '@fortawesome/free-solid-svg-icons';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FaCalendarAlt } from "react-icons/fa";

const reducer =(state, action) =>{
    switch(action.type){


        case 'DOCUMENT_REQUEST':
            return { ...state, loading: true };
      
          case 'DOCUMENT_SUCCESS':
            return { ...state, loading: false, documentTypes: action.payload.documentTypes,  pages: action.payload.pages};
      
          case 'DOCUMENT_FAIL':
            return { ...state, loading: false, error: action.payload };
      
            case 'FETCH_REQUEST_PROVINCE':
              return { ...state, loadingProvinces: true };
        
            case 'FETCH_SUCCESS_PROVINCE':
              return { ...state, loadingProvinces: false, provinces: action.payload.provinces,  pages: action.payload.pages};
        
            case 'FETCH_FAIL_PROVINCE':
              return { ...state, loadingProvinces: false, error: action.payload };


        case 'FETCH_REQUEST':
            return {...state, loading: true};
        case 'FETCH_SUCCESS':
                return {...state, loading: false};   
        case 'FETCH_FAIL':
                return {...state, loading: false, error: action.payload};
        case 'UPDATE_REQUEST':
            return {...state, loadingUpdate: true};
        case 'UPDATE_SUCCESS':
            return {...state, loadingUpdate: false, sucessUpdate: true};   
        case 'UPDATE_FAIL':
            return {...state, loadingUpdate: false, sucessUpdate: false};

           
        
        default:
            return state;
    
            }
}
export default function UserEditScreen() {
    const [{loading, error, loadingUpdate, provinces, loadingProvinces}, dispatch]= useReducer(reducer, {loading: true, error: ''})
  
  const {state} = useContext(Store);
  const {userInfo} = state;

  const params = useParams();
  const {id: userId} = params;
  
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeliveryMan, setIsDeliveryMan] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  
  const [isSeller, setIsSeller] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const [sellerName, setSellerName] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');

  const [sellerLogo, setSellerLogo] = useState('');
  const [opentime, setOpentime] = useState('');
  const [closetime, setClosetime] = useState('');

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
         if(dayOfWeek.includes("Sab")|| dayOfWeek.includes("Sat"))
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



  useEffect(()=>{
    const fetchData = async()=>{
        try{
            dispatch({type: 'FETCH_REQUEST'})
            const {data} = await axios.get(`/api/users/${userId}`,{headers: {Authorization: `Bearer ${userInfo.token}`}});
            setName(data.name);
            setEmail(data.email);
            setNumber(data.phoneNumber);

            setIsAdmin(data.isAdmin);
            setIsSeller(data.isSeller);
            setIsApproved(data.isApproved)
            setIsDeliveryMan(data.isDeliveryMan);
            setIsBanned(data.isBanned);

            if (data.isSeller) {
                setIsSeller(data.isSeller);
                setSellerName(data.seller.name);
                setSellerLogo(data.seller.logo);
                setSellerDescription(data.seller.description);
                setSellerLocation(data.seller.province._id);
                setSellerAddress(data.seller.address);
                setOpentime(data.seller.opentime);
                setClosetime(data.seller.closetime);
                setWorkDaysWithTime(data.seller.workDayAndTime);

              }

            dispatch({type: 'FETCH_SUCCESS', payload: data});
        }catch(err){
            dispatch({type: 'FETCH_FAIL', payload: getError(err)})
        }
    }
   
        fetchData();
    
  }, [userInfo, userId]);

 
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'DOCUMENT_REQUEST' });

        const { data } = await axios.get('/api/documents');
        
        dispatch({ type: 'DOCUMENT_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'DOCUMENT_FAIL', payload: getError(err) });
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
  }, [loadingProvinces]);

  const submitHandler = async (e)=>{
    e.preventDefault();
    try{
        dispatch({type: 'UPDATE_REQUEST'})
       const {data}= await axios.put(`/api/users/${userId}`,
        {_id: userId, name, email, isAdmin, isBanned, isDeliveryMan, isSeller, isApproved},
        {headers: {Authorization: `Bearer ${userInfo.token}`}})
        dispatch({type: 'UPDATE_SUCCESS'})
        toast.success(data.message)
        navigate('/admin/userlist')

    }catch(error){
        dispatch({type: 'UPDATE_FAIL'})
        toast.error(getError(error));
    }
  }
    return (
        <Container className='small-container'>
        <Helmet>
            <title>Editar Utilizador {userId}</title>
        </Helmet>
        <h1> Editar Utilizador {userId}</h1>
    
        {loading? (<LoadingBox></LoadingBox>):error?<MessageBox>{error}</MessageBox>:<>
        <Form onSubmit={submitHandler}>
            <Form.Group className='mb-3' controlId='name'>
            <Form.Label>Nome</Form.Label>
            <Form.Control value={name} onChange={(e)=>setName(e.target.value)} required/>
            </Form.Group>

            <Form.Group className='mb-3' controlId='number'>
            <Form.Label>Número de Telefone</Form.Label>
            <Form.Control value={number} onChange={(e)=>setNumber(e.target.value)} required disabled/>
            </Form.Group>
    
            <Form.Group className='mb-3' controlId='email'>
            <Form.Label>Email</Form.Label>
            <Form.Control value={email} onChange={(e)=>setEmail(e.target.value)} required/>
            </Form.Group>
    
            <Form.Check className='mb-3' type="checkbox" id="isAdmin"
            label="É Administrador?" checked={isAdmin}
            onChange={(e)=>setIsAdmin(e.target.checked)}></Form.Check>    

            <Form.Check className='mb-3' type="checkbox" id="isSeller"
            label="É nosso fornecedor?" checked={isSeller}
            onChange={(e)=>setIsSeller(e.target.checked)}></Form.Check>   

            <Form.Check className='mb-3' type="checkbox" id="isApproved"
            label="Aprovar como fornecedor" checked={isApproved}
            onChange={(e)=>setIsApproved(e.target.checked)}></Form.Check>        

            <Form.Check className='mb-3' type="checkbox" id="isDeliveryMan"
            label="É Entregador?" checked={isDeliveryMan}
            onChange={(e)=>setIsDeliveryMan(e.target.checked)}></Form.Check>        

            <Form.Check className='mb-3' type="checkbox" id="isBanned"
            label="Banido" checked={isBanned}
            onChange={(e)=>setIsBanned(e.target.checked)}></Form.Check> 

{isSeller && (
          <>
          <br/>
         

         
          <br/>
          <div><h4>Detalhes de sua Loja </h4>
          <Form.Group className="mb-3" controlId="sellerName">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Nome da Loja/empresa</Form.Label>
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
              <Form.Label>Logo da Loja</Form.Label>
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
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Provincia</Form.Label>
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

        <Form.Group className="mb-3" controlId="sellerDescription">
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
                        
            <div className='"mb-3'>
                 <Button type='submit' disabled={loadingUpdate}>Actualizar</Button>
                 {loadingUpdate && <LoadingBox/>}
            </div>
        </Form>
        </>}
       </Container>
  )
}
