import React, { useContext, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Store } from '../Store.js';
import { useNavigate } from 'react-router-dom';
import CheckoutSteps from '../components/CheckoutSteps.js';
import Container from 'react-bootstrap/esm/Container';

export default function AddressScreen() {
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const { cart } = state;
  const [fullName, setFullName] = useState(cart.address.fullName || '');
  const [city, setCity] = useState(cart.address.city ||'');
  const [address, setAddress] = useState(cart.address.address ||'');
  const [referenceAddress, setReferenceAddress] = useState(cart.address.referenceAddress ||'');
  const navigate = useNavigate();

  
  const submitHandler = (e) => {
    e.preventDefault();
    ctxDispatch({
      type: 'SAVE_ADDRESS',
      payload: {
        fullName,
        city,
        address,
        referenceAddress,
      },
    });
    localStorage.setItem(
      'address',
      JSON.stringify({
        fullName,
        city,
        address,
        referenceAddress,
      })
    );
    navigate('/payment');
  };

  return (
    <div>
      <Container className="small-container">
      <Helmet>
        <title>Endereço de Entrega</title>
      </Helmet>
      <CheckoutSteps step1 step2 ></CheckoutSteps>
      <div className="container small-container">
        <h1 className="my-3">Detalhes do Endereço de Entrega</h1>
        <br></br>
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-3" controlId="fullName">
            <Form.Label>Nome Completo</Form.Label>
            <Form.Control
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            ></Form.Control>
          </Form.Group>
 
          <Form.Group className="mb-3" controlId="fullcityname">
          <Form.Label>Cidade</Form.Label>
          <Form.Select aria-label="Cidade"
          value={city}
          onChange={(e)=>setCity(e.target.value)} required>
            <option value="">Seleccione</option>
            <option value="Maputo Cidade">Maputo Cidade</option>
            <option value="Maputo Provincia">Maputo Província</option>
          </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="address">
            <Form.Label>Endereço</Form.Label>
            <Form.Control
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            ></Form.Control>
          </Form.Group>
          <Form.Group className="mb-3" controlId="reference">
            <Form.Label>
              Mais informações do seu Endereço
            </Form.Label>
          <Form.Control
                as="textarea"
                placeholder="Para facilitar a sua localização ao entregador"
                value={referenceAddress}
                onChange={(e) => setReferenceAddress(e.target.value)}
              ></Form.Control>
          </Form.Group>
          <div>
            <Button className='customButtom' variant="light" type="submit">
              Confirmar
            </Button>
          </div>
        </Form>
      </div>
    </Container>
    </div>
  );
}
