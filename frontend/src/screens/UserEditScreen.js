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


const reducer =(state, action) =>{
    switch(action.type){
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
    const [{loading, error, loadingUpdate}, dispatch]= useReducer(reducer, {loading: true, error: ''})
  
  const {state} = useContext(Store);
  const {userInfo} = state;

  const params = useParams();
  const {id: userId} = params;
  
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isDeliveryMan, setIsDeliveryMan] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

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
            dispatch({type: 'FETCH_SUCCESS', payload: data});
        }catch(err){
            dispatch({type: 'FETCH_FAIL', payload: getError(err)})
        }
    }
   
        fetchData();
    
  }, [userInfo, userId]);

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
                        
            <div className='"mb-3'>
                 <Button type='submit' disabled={loadingUpdate}>Actualizar</Button>
                 {loadingUpdate && <LoadingBox/>}
            </div>
        </Form>
        </>}
       </Container>
  )
}
