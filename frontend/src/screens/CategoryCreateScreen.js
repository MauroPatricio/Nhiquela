import React, { useContext, useReducer, useState,  } from 'react'
import axios from 'axios';
import {  useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoffee, faUser, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

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
export default function CategoryCreateScreen() {
    const navigate = useNavigate();
    const { state } = useContext(Store);
    const { userInfo } = state;

    const [{loading, error, loadingCreate}, dispatch] = useReducer(reducer, {loading: false, error:''});
 
    const [iconName, setIconName] = useState('');
    const [iconType, setIconType] = useState('fas');    
    const [icon, setIcon] = useState(null);    

    const [name, setName] = useState('');
    const [nome, setNome] = useState('');

    const [description, setDescription] = useState('');

    library.add(fas);

    
    const icons = [
        { name: 'Coffee', icon: faCoffee },
        { name: 'User', icon: faUser },
        { name: 'Envelope', icon: faEnvelope },
      ];
    
    // const allIcons = [ fas];



    const submitHandler = async (e)=>{
        e.preventDefault();

        try{
            dispatch({type: 'CREATE_REQUEST'});
            await axios.post(`/api/categories/`,{
                name,
                nome,
                icon,
                description
            }, {
                headers: {Authorization: `Bearer ${userInfo.token}`}
            });
            dispatch({type: 'CREATE_SUCCESS'});
            toast.success('Categoria Criada com Sucesso');
            navigate('/categoryList/');

        }catch(err){
            toast.error(getError(err));
            dispatch({type: 'CREATE_FAIL'});
        }
    }


    const handleInputChange = event => {
        const { name, value } = event.target;
        if (name === 'iconName') {
          setIconName(value);
        } else if (name === 'iconType') {
          setIconType(value);
        }
      };

return (
   <Container className='small-container'>
    <Helmet>
        <title>Criar Categoria </title>
    </Helmet>
    <h1> Criar Categoria</h1>

    {loading? (<LoadingBox></LoadingBox>):error?<MessageBox>{error}</MessageBox>:<>
    <Form onSubmit={submitHandler}>
    <select value={icon} onChange={event => setIcon(event.target.value)}>
        <option value="">Select an icon</option>
        {icons.map(icon => (
            <option key={icon.name} value={icon.name}>
            <FontAwesomeIcon icon={icon.icon} />
            </option>
        ))}
        </select>


        <label>
        Icon Name:
        <input
          type="text"
          name="iconName"
          value={iconName}
          onChange={handleInputChange}
        />
      </label>
      <label>
        Icon Type:
        <select name="iconType" value={iconType} onChange={handleInputChange}>
          <option value="fas">fas</option>
        </select>
      </label>

        <Form.Group className='mb-3' controlId='name'>
        <Form.Label>Nome</Form.Label>
        <Form.Control value={nome} onChange={(e)=>setNome(e.target.value)} required/>
        </Form.Group>

        <Form.Group className='mb-3' controlId='name'>
        <Form.Label>Name</Form.Label>
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
