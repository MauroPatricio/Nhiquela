import React, { useContext, useEffect, useReducer, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import { Store } from '../Store';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faClock } from '@fortawesome/free-solid-svg-icons';
import { faClockFour } from '@fortawesome/free-solid-svg-icons';

const reducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_REQUEST':
      return { ...state, loadingUpdate: true };

    case 'UPDATE_SUCCESS':
      return { ...state, loadingUpdate: false };

    case 'UPDATE_FAIL':
      return { ...state, loadingUpdate: false };

    case 'UPLOAD_REQUEST':
      return { ...state, loadingUpload: true };

    case 'UPLOAD_SUCCESS':
      return { ...state, loadingUpload: false, errorUpload: '' };

    case 'UPLOAD_FAIL':
      return { ...state, errorUpload: action.payload, loadingUpload: false };

    default:
      return state;
  }
};

export default function ProfileScreen() {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const navigate = useNavigate();
  const [name, setName] = useState(userInfo.name);
  const [email, setEmail] = useState(userInfo.email);
  const [phoneNumber, setPhoneNumber] = useState(userInfo.phoneNumber);
  const [password, setPassword] = useState('');
  const [confirm, setConfirmPassword] = useState('');

  const [isSeller, setIsSeller] = useState(false);
  const [isUpdatePassword, setIsUpdatePassword] = useState(false);

  const [sellerName, setSellerName] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');
  const [sellerDocument, setSellerDocument] = useState('');
  const [sellerDocumentNumber, setSellerDocumentNumber] = useState('');
  const [sellerFrontImgDoc, setSellerFrontImgDoc] = useState('');
  const [sellerBackImgDoc, setSellerBackImgDoc] = useState('');

  const [sellerLogo, setSellerLogo] = useState('');
  const [opentime, setOpentime] = useState('');
  const [closetime, setClosetime] = useState('');
  let openRef = useRef(null);
  let closeRef = useRef(null);


  const [{ loadingUpdate, loadingUpload }, dispatch] = useReducer(reducer, {
    loadingUpdate: false,
  });

  const submitHandler = async (e) => {
    e.preventDefault();
    dispatch({ Type: 'UPDATE_REQUEST' });
    try {
      const { data } = await axios.put(
        'api/users/profile',
        {
          name,
          email,
          password,
          phoneNumber,
          isSeller,
          sellerName,
          sellerDescription,
          sellerLogo,
          sellerDocument,
          sellerDocumentNumber,
          sellerFrontImgDoc,
          sellerBackImgDoc,
          sellerLocation,
          opentime,
          closetime
        },
        { headers: { authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'UPDATE_SUCCESS' });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      toast.success('Perfil actualizado com sucesso');
      navigate('/');
    } catch (er) {
      dispatch({ type: 'UPDATE_FAIL', payload: getError(er) });
      toast.error(getError(er));
    }
  };
  useEffect(() => {
    if (userInfo.isSeller) {
      setIsSeller(userInfo.isSeller);
      setSellerName(userInfo.seller.name);
      setSellerLogo(userInfo.seller.logo);
      setSellerDescription(userInfo.seller.description);


      setOpentime(userInfo.seller.opentime);
      setClosetime(userInfo.seller.closetime);

    }
    if (userInfo.isDeliveryMan) {
      //   setDeliveryName(userInfo.deliveryMan.name)
    }
  }, [dispatch, userInfo]);

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      dispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userInfo.token}`,
        },
      });
      dispatch({ type: 'UPLOAD_SUCCESS', payload: data });

      setSellerLogo(data.secure_url);

      toast.success('Upload de Imagem com Sucesso. Clique em Registar');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
    }
  };

  return (
    <div className="container small-container">
      <Helmet>Perfil</Helmet>
      <h1 className="mb-3"> Perfil</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label> Nome</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
          ></Form.Control>
        </Form.Group>

        <Form.Group className="mb-3" controlId="phone">
          <Form.Label> Número de telefone</Form.Label>
          <Form.Control
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
            disabled
            required
          ></Form.Control>
        </Form.Group>

        <Form.Group className="mb-3" controlId="email">
          <Form.Label> Email</Form.Label>
          <Form.Control
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
          ></Form.Control>
        </Form.Group>

        <Form.Check
          className="mb-3"
          type="checkbox"
          id="isUpdatePassword"
          label="Deseja actualizar a password?"
          checked={isUpdatePassword}
          onChange={(e) => setIsUpdatePassword(e.target.checked)}
        ></Form.Check>

        {isUpdatePassword && (
          <>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label> Password</Form.Label>
              <Form.Control
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                required={isUpdatePassword}
              ></Form.Control>
            </Form.Group>

            <Form.Group className="mb-3" controlId="confirm">
              <Form.Label> Confirme Password</Form.Label>
              <Form.Control
                value={confirm}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                }}
                required={isUpdatePassword}
              ></Form.Control>
            </Form.Group>
          </>
        )}

        <Form.Check
          className="mb-3"
          type="checkbox"
          id="isSeller"
          label="É Vendedor?"
          checked={isSeller}
          onChange={(e) => setIsSeller(e.target.checked)}
        ></Form.Check>

        {isSeller && (
          <>
            <h2> Vendedor</h2>

            <Form.Group className="mb-3" controlId="sellerName">
              <Form.Label>Nome da sua Loja online</Form.Label>
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
                  alt={sellerName}
                  className="card-img-top"
                ></img>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="imageFile">
              <Form.Label>Upload logo</Form.Label>
              <Form.Control type="file" onChange={uploadFileHandler} />
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>

            

            <Form.Group className="mb-3" controlId="sellerDescription">
              <Form.Label>Descrição do Vendedor</Form.Label>
              <Form.Control
                type="text"
                as="textarea"

                value={sellerDescription}
                maxLength={60}
                required
                onChange={(e) => {
                  setSellerDescription(e.target.value);
                }}
              />
            </Form.Group>




        <Form.Group className="mb-3" controlId="sellerOpentime">
          <FontAwesomeIcon icon={faClock} /> <Form.Label>Hora de abertura</Form.Label>
          <Form.Control
            type="time"
            ref={openRef}

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
          ref={closeRef}
            type="time"
            value={closetime}
            required
            onChange={(e) => {
              setClosetime(e.target.value);
            }}
          />
        </Form.Group>

          </>
        )}

        <div className="mb-3">
          <Button
            className="customButtom"
            variant="light"
            type="submit"
            disabled={loadingUpdate}
          >
            Actualizar
          </Button>
        </div>
      </Form>
    </div>
  );
}
