import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { Helmet } from 'react-helmet-async';
import  Container  from 'react-bootstrap/Container';
import  Form  from 'react-bootstrap/Form';
import { Store } from '../Store';


export default function EmailSentScreen() {
    const navigate = useNavigate();
    const [email,setEmail] = useState('');
    
    const {state} = useContext(Store);
    const {userInfo} = state;


    useEffect(()=>{
        if(userInfo){
            navigate('/')
        }
    }, [navigate, userInfo])


    const submitHandler = async (e)=>{
        e.preventDefault();

        try{
            const {data} = await axios.post('/api/users/forget-password', {email});
            toast.success(data.message);
            
        }catch(err){
            toast.error(getError(err));
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);

  return (
    <Container className="small-container">
        <Helmet><title>Email enviado </title></Helmet>
        <h1 className='my-3'>Email enviado com sucesso</h1>

        <Form onSubmit={submitHandler}>
            O email de recuperação da senha foi enviado com sucesso para o email por sí informado.
        </Form>
    </Container>
  )
}
