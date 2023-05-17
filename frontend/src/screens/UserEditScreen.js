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
import { faTextSlash, faClock, faClockFour, faListNumeric } from '@fortawesome/free-solid-svg-icons';

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
    const [{loading, error, loadingUpdate,documentTypes, provinces, loadingProvinces}, dispatch]= useReducer(reducer, {loading: true, error: ''})
  
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
  
  const [sellerName, setSellerName] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');
  const [sellerDocument, setSellerDocument] = useState('');
  const [sellerDocumentNumber, setSellerDocumentNumber] = useState('');
  const [sellerFrontImgDoc, setSellerFrontImgDoc] = useState('');
  const [sellerBackImgDoc, setSellerBackImgDoc] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');

  const [sellerLogo, setSellerLogo] = useState('');
  const [opentime, setOpentime] = useState('');
  const [closetime, setClosetime] = useState('');

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
            setIsDeliveryMan(data.isDeliveryMan);
            setIsBanned(data.isBanned);

            if (data.isSeller) {
                console.log(data.seller.docType)
                setIsSeller(data.isSeller);
                setSellerName(data.seller.name);
                setSellerLogo(data.seller.logo);
                setSellerDescription(data.seller.description);
                setSellerDocument(data.seller.docType._id);
                setSellerDocumentNumber(data.seller.docNumber);
                setSellerFrontImgDoc(data.seller.frontDocImg);
                setSellerBackImgDoc(data.seller.backDocImg);
                setSellerLocation(data.seller.province._id);
                setSellerAddress(data.seller.address);
                setOpentime(data.seller.opentime);
                setClosetime(data.seller.closetime);
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
  }, []);

  const submitHandler = async (e)=>{
    e.preventDefault();
    try{
        dispatch({type: 'UPDATE_REQUEST'})
       const {data}= await axios.put(`/api/users/${userId}`,
        {_id: userId, name, email, isAdmin, isBanned, isDeliveryMan, isSeller},
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
            label="É Vendedor?" checked={isSeller}
            onChange={(e)=>setIsSeller(e.target.checked)}></Form.Check>        

            <Form.Check className='mb-3' type="checkbox" id="isDeliveryMan"
            label="É Entregador?" checked={isDeliveryMan}
            onChange={(e)=>setIsDeliveryMan(e.target.checked)}></Form.Check>        

            <Form.Check className='mb-3' type="checkbox" id="isBanned"
            label="Foi Banido?" checked={isBanned}
            onChange={(e)=>setIsBanned(e.target.checked)}></Form.Check> 

{isSeller && (
          <>
          <br/>
          <div ><h4>Dados adicionais</h4>
          
          <Form.Group className="mb-3" controlId="sellerDocument">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Tipo de documento</Form.Label>
            <Form.Select aria-label="Tipo de documento"
          value={sellerDocument}
          onChange={(e)=>setSellerDocument(e.target.value)} required>
            <option value="">Seleccione</option>
            {documentTypes && documentTypes.map(document => (
            <option key={document._id} value={document._id}>
              {document.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerDocNumber">
          <FontAwesomeIcon icon={faListNumeric} /> <Form.Label>Número de documento</Form.Label>
          <Form.Control
            type="text"
            value={sellerDocumentNumber}
            required
            onChange={(e) => {
              setSellerDocumentNumber(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerFrontDoc">
              <Form.Label>Imagem do documento frontal</Form.Label>
              {sellerFrontImgDoc && (
                <img
                  style={{
                    width: '6rem',
                    height: '6rem',
                    alignItems: 'center',
                    alignContent: 'center',
                  }}
                  src={sellerFrontImgDoc}
                  alt={name}
                  className="card-img-top"
                ></img>
              )}
            </Form.Group>

         


            <Form.Group className="mb-3" controlId="sellerFrontDoc">
              <Form.Label>Imagem de trás do documento</Form.Label>
              {sellerBackImgDoc && (
                <img
                  style={{
                    width: '6rem',
                    height: '6rem',
                    alignItems: 'center',
                    alignContent: 'center',
                  }}
                  src={sellerBackImgDoc}
                  alt={name}
                  className="card-img-top"
                ></img>
              )}
            </Form.Group>

          
          </div>

         
          <br/>
          <div><h4>Dados da sua Loja </h4>
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

        <Form.Group className="mb-3" controlId="sellerOpentime">
          <FontAwesomeIcon icon={faClock} /> <Form.Label>Hora de abertura</Form.Label>
          <Form.Control
            type="time"
            value={opentime}
            required
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
            required
            onChange={(e) => {
              setClosetime(e.target.value);
            }}

            
          />
        </Form.Group>
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
