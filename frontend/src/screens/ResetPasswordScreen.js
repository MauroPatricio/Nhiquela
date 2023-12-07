import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { Helmet } from 'react-helmet-async';
import  Container  from 'react-bootstrap/Container';
import  Button  from 'react-bootstrap/Button';
import  Form  from 'react-bootstrap/Form';
import { Store } from '../Store';


export default function ResetPasswordScreen() {
    const navigate = useNavigate();

    const {token} = useParams();
    const [password,setPassword] = useState('');
    const [confirmPassword,setConfirmPassword] = useState('');

    const {state} = useContext(Store);
    const {userInfo} = state;


    useEffect(()=>{
        if(userInfo || !token){
            navigate('/')
        }
    }, [navigate, userInfo, token])


    const submitHandler = async (e)=>{
        e.preventDefault();

        if(password !== confirmPassword){
            toast.error('A senha e a confirmação da senha não conferem');
            return;
        }

        try{
            await axios.post('/api/users/reset-password', {password, token});
            navigate('/signin');
            toast.success('Senha actualizada com Successo')
        }catch(err){
            toast.error(getError(err))
        }
    }

  return (
    <Container className="small-container">
        <Helmet><title>Actualizar Senha</title></Helmet>
        <h1 className='my-3'>Actualizar Senha</h1>

        <Form onSubmit={submitHandler}>
            <Form.Label>Nova Senha</Form.Label>
            <Form.Control type="password" required onChange={(e)=>setPassword(e.target.value)}/>

            <Form.Label>Confirmação da Senha</Form.Label>
            <Form.Control type="password" required onChange={(e)=>setConfirmPassword(e.target.value)}/>
            <br/>

            <Button type="submit" className='customButtom'>Actualizar Senha</Button>
        </Form>
    </Container>
  )
}
