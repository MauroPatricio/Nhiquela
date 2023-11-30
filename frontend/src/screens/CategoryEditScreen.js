import React, { useContext, useEffect, useReducer, useState,  } from 'react'
import axios from 'axios';
import {  useNavigate, useParams } from 'react-router-dom';
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

        case 'FETCH_REQUEST':
            return {...state, loading: true};
        
        case 'FETCH_SUCCESS':
            return {...state, 
                loading: false, category: action.payload};
        
        case 'FETCH_FAIL':
            return {...state, error: action.payload ,loadingEdit: false};

            case 'EDIT_REQUEST':
                return {...state, loadingEdit: true};
            
            case 'EDIT_SUCCESS':
                return {...state, 
                    loadingEdit: false};
            
            case 'EDIT_FAIL':
                return {...state, error: action.payload ,loadingEdit: false};
    
        default:
            return state
    }
}
export default function CategoryEditScreen() {
    const navigate = useNavigate();
    const { state } = useContext(Store);
    const { userInfo } = state;

    const params = useParams();
    const {id: categoryId} = params;
  

    const [{loading, error, loadingEdit}, dispatch] = useReducer(reducer, {loadingEdit: false, error:''});
 
    const [icon, setIcon] = useState('');
    const [name, setName] = useState('');
    const [nome, setNome] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(false);


    
    // const allIcons = [ fas];
    useEffect(()=>{
        const fetchData = async()=>{
            try{
                dispatch({type: 'FETCH_REQUEST'})
                const {data} = await axios.get(`/api/categories/${categoryId}`,{headers: {Authorization: `Bearer ${userInfo.token}`}});
                setIcon(data.icon);
                setName(data.name);
                setNome(data.nome);

                setDescription(data.description);
                setIsActive(data.isActive);
              
                dispatch({type: 'FETCH_SUCCESS', payload: data});
            }catch(err){
                dispatch({type: 'FETCH_FAIL', payload: getError(err)})
            }
        }
       
            fetchData();
        
      }, [userInfo, categoryId]);


    const submitHandler = async (e)=>{
        e.preventDefault();

        try{
            dispatch({type: 'EDIT_REQUEST'});
            await axios.put(`/api/categories/${categoryId}`,{
                name,
                nome,
                icon,
                description,
                isActive
            }, {
                headers: {Authorization: `Bearer ${userInfo.token}`}
            });
            dispatch({type: 'EDIT_SUCCESS'});
            toast.success('Categoria Actualizada com Sucesso');
            navigate('/categoryList/');

        }catch(err){
            toast.error(getError(err));
            dispatch({type: 'EDIT_FAIL'});
        }
    }


return (
   <Container className='small-container'>
    <Helmet>
        <title>Editar Categoria </title>
    </Helmet>
    <h1> Editar Categoria</h1>

    {loading? (<LoadingBox></LoadingBox>):error?<MessageBox>{error}</MessageBox>:<>
    <Form onSubmit={submitHandler}>

        <Form.Group className='mb-3' controlId='name'>
        <Form.Label>Nome(pt)</Form.Label>
        <Form.Control value={nome} onChange={(e)=>setNome(e.target.value)} required/>
        </Form.Group>

        <Form.Group className='mb-3' controlId='name'>
        <Form.Label>Name(en)</Form.Label>
        <Form.Control value={name} onChange={(e)=>setName(e.target.value)} required/>
        </Form.Group>

        <Form.Group className='mb-3' controlId='slug'>
        <Form.Label>Descrição</Form.Label>
        <Form.Control value={description} onChange={(e)=>setDescription(e.target.value)} required/>
        </Form.Group>

        <Form.Check
          className="mb-3"
          type="checkbox"
          id="isActive"
          label="Esta Activo?"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        ></Form.Check>

        <div className='"mb-3'>
             <Button className="customButtom" variant='light' type='submit' disabled={loadingEdit}>Actualizar</Button>
             {loadingEdit && <LoadingBox/>}
        </div>
    </Form>
    </>}
   </Container>
  )
}
