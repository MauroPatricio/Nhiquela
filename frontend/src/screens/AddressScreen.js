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
  const [phoneNumber, setPhoneNumber] = useState(cart.address.phoneNumber ||'');
  const [alternativePhoneNumber, setAlternativePhoneNumber] = useState(cart.address.alternativePhoneNumber ||'');

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
        phoneNumber,
        alternativePhoneNumber
      },
    });
    localStorage.setItem(
      'address',
      JSON.stringify({
        fullName,
        city,
        address,
        referenceAddress,
        phoneNumber,
        alternativePhoneNumber
      })
    );
    navigate('/payment');
  };

  return (
    <div>
      <Container className="small-container">
      <Helmet>
        <title>Endereço de entrega</title>
      </Helmet>
      <CheckoutSteps step1 ></CheckoutSteps>
      <div className="container small-container">
        <h1 className="my-3">Detalhes do endereço de entrega</h1>
        <br></br>
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-3" controlId="fullName">
            <Form.Label>Nome do receptor do pedido</Form.Label>
            <Form.Control
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            ></Form.Control>
          </Form.Group>

          <Form.Group className="mb-3" controlId="phoneNumber">
            <Form.Label>Número para chamadas</Form.Label>
            <Form.Control
              value={phoneNumber}
              placeholder="8********"
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            ></Form.Control>
          </Form.Group>


          <Form.Group className="mb-3" controlId="alternativePhoneNumber">
            <Form.Label>Número alternativo (opcional)</Form.Label>
            <Form.Control
              placeholder="8********"
              value={alternativePhoneNumber}
              onChange={(e) => setAlternativePhoneNumber(e.target.value)}
            ></Form.Control>
          </Form.Group>
 
          <Form.Group className="mb-3" controlId="fullcityname">
          <Form.Label>Cidade de entrega</Form.Label>
          <Form.Select aria-label="Cidade"
          value={city}
          onChange={(e)=>setCity(e.target.value)} required>
            <option value="">Seleccione</option>
            <option value="Maputo Cidade">Maputo cidade</option>
            <option value="Maputo Provincia">Maputo província</option>
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
              Informações adicionais do seu endereço
            </Form.Label>
          <Form.Control
                as="textarea"
                placeholder="Mais detalhes para facilitar a sua localização ao entregador"
                value={referenceAddress}
                onChange={(e) => setReferenceAddress(e.target.value)}
                required
              ></Form.Control>
          </Form.Group>
          <div>
            <Button className='customButtom' variant="light" type="submit">
            Próximo
            </Button>
          </div>
        </Form>
      </div>
    </Container>
    </div>
  );
}
