import React, { useContext, useReducer, useState,  } from 'react';
import axios from 'axios';
import {  useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import { getError } from '../utils';


import Container from 'react-bootstrap/Container';
import { Store } from '../Store';

const reducer = (state, action )=>{
    switch(action.type){

            case 'CREATE_REQUEST':
                return {...state, loadingCreate: true};
            
            case 'CREATE_SUCCESS':
                return {...state, 
                    loadingCreate: false};
            
            case 'CREATE_FAIL':
                return {...state, error: action.payload ,loadingCreate: false};
    
        default:
            return state
    }
}
export default function ConditionStatusCreateScreen() {
    const navigate = useNavigate();
    const { state } = useContext(Store);
    const { userInfo } = state;

    const [{loading, error, loadingCreate}, dispatch] = useReducer(reducer, {loading: false, error:''});
 
    const [name, setName] = useState('');
    const [nome, setNome] = useState('');

    const [description, setDescription] = useState('');
    

    const submitHandler = async (e)=>{
        e.preventDefault();

        try{
            dispatch({type: 'CREATE_REQUEST'});
            await axios.post(`/api/conditionstatus/`,{
                name,
                nome,
                description
            }, {
                headers: {Authorization: `Bearer ${userInfo.token}`}
            });
            dispatch({type: 'CREATE_SUCCESS'});
            toast.success('Estado de uso Criada com Sucesso');
            navigate('/conditionstatusList/');

        }catch(err){
            toast.error(getError(err));
            dispatch({type: 'CREATE_FAIL'});
        }
    }


return (
   <Container className='small-container'>
    <Helmet>
        <title>Criar Estado do Produto </title>
    </Helmet>
    <h1> Criar Estado do Produto</h1>

    {loading? (<LoadingBox></LoadingBox>):error?<MessageBox>{error}</MessageBox>:<>
    <Form onSubmit={submitHandler}>


        <Form.Group className='mb-3' controlId='nome'>
        <Form.Label>Nome (pt)</Form.Label>
        <Form.Control value={nome} onChange={(e)=>setNome(e.target.value)} required/>
        </Form.Group>

        <Form.Group className='mb-3' controlId='name'>
        <Form.Label>Nome (en)</Form.Label>
        <Form.Control value={name} onChange={(e)=>setName(e.target.value)} required/>
        </Form.Group>

        <Form.Group className='mb-3' controlId='slug'>
        <Form.Label>Descrição</Form.Label>
        <Form.Control value={description} onChange={(e)=>setDescription(e.target.value)} required/>
        </Form.Group>

        <div className='"mb-3'>
             <Button className="customButtom" variant='light' type='submit' disabled={loadingCreate}>Registar</Button>
             {loadingCreate && <LoadingBox/>}
        </div>
    </Form>
    </>}
   </Container>
  )
}
