import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { Helmet } from 'react-helmet-async';
import  Container  from 'react-bootstrap/Container';
import  Button  from 'react-bootstrap/Button';
import  Form  from 'react-bootstrap/Form';
import { Store } from '../Store';
import { useTranslation } from 'react-i18next';


export default function ForgetPasswordScreen() {
    const { t } = useTranslation();

    const navigate = useNavigate();
    const [email,setEmail] = useState('');
    
    const {state} = useContext(Store);
    const {userInfo} = state;


    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);
      
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

            navigate('/email-sent')

        }catch(err){
            toast.error(getError(err));
        }
    }

  return (
    <Container className="small-container">
        <Helmet><title>{t('iforgotmypassword')}</title></Helmet>
        <h1 className='my-3'>{t('iforgotmypassword')}</h1>

        <Form onSubmit={submitHandler}>
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" required onChange={(e)=>setEmail(e.target.value)}/>
<br/>
            <Button type="submit" className='customButtom'>{t('send')}</Button>
        </Form>
    </Container>
  )
}
