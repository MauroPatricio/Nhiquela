import React, { useContext, useEffect, useReducer, useState } from 'react';
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
import { faTextSlash } from '@fortawesome/free-solid-svg-icons';

import { faClockFour } from '@fortawesome/free-solid-svg-icons';
import { faListNumeric } from '@fortawesome/free-solid-svg-icons';


const reducer = (state, action) => {
  switch (action.type) {

    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, documentTypes: action.payload.documentTypes,  pages: action.payload.pages};

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };


      case 'FETCH_USER_REQUEST':
        return { ...state, loadingUser: true };
  
      case 'FETCH_USER_SUCCESS':
        return { ...state, loadingUser: false, user: action.payload};
  
      case 'FETCH_USER_FAIL':
        return { ...state, loadingUser: false, error: action.payload };


      case 'FETCH_REQUEST_PROVINCE':
        return { ...state, loading: true };
  
      case 'FETCH_SUCCESS_PROVINCE':
        return { ...state, loading: false, provinces: action.payload.provinces,  pages: action.payload.pages};
  
      case 'FETCH_FAIL_PROVINCE':
        return { ...state, loading: false, error: action.payload };

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
  const [approved, setIsApproved] = useState(userInfo.isApproved);

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
  const [sellerAddress, setSellerAddress] = useState('');

  const [sellerLogo, setSellerLogo] = useState('');
  const [opentime, setOpentime] = useState('');
  const [closetime, setClosetime] = useState('');


  const [{ loadingUpdate, loadingUpload,documentTypes, provinces, loadingUser, user }, dispatch] = useReducer(reducer, {
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
          sellerAddress,
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
  useEffect(  () => {

    async function fetchData (){


      dispatch({ type: 'FETCH_USER_REQUEST' });
      try{
        const { data } = await axios.get(`api/users/${userInfo._id}`);
        
        dispatch({ type: 'FETCH_USER_SUCCESS' , payload: data});
    
        if (userInfo.isSeller && data) {
          setIsSeller(true);
          setSellerName(data.seller.name);
          setSellerLogo(data.seller.logo);
          setSellerDescription(data.seller.description);
          setSellerDocument(data.seller.docType._id);
          setSellerDocumentNumber(data.seller.docNumber);
          setSellerFrontImgDoc(data.seller.frontDocImg);
          setSellerBackImgDoc(data.seller.backDocImg);
          setSellerLocation(data.seller.province._id);
          setSellerAddress(data.seller.address);
          setOpentime(data.seller.opentime);
          setClosetime(data.seller.closetime);
          setIsApproved(data.seller.isApproved)
    
        }
        if (data.isDeliveryMan) {
          //   setDeliveryName(userInfo.deliveryMan.name)
        }
  
      }catch(e){
        dispatch({ type: 'FETCH_USER_FAIL', payload: getError(e) });
      }
    }
    fetchData();
  }, [userInfo]);



  
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });

        const { data } = await axios.get('/api/documents');
        
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
   
      fetchData();
    
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST_PROVINCE' });

        const { data } = await axios.get('/api/provinces');
        
        dispatch({ type: 'FETCH_SUCCESS_PROVINCE', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL_PROVINCE', payload: getError(err) });
      }
    };
      fetchData();
  }, []);

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      ctxDispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      ctxDispatch({ type: 'UPLOAD_SUCCESS', payload: data });

      setSellerLogo(data.secure_url);

      toast.success('Upload de Imagem com Sucesso. Clique em Registar');
    } catch (err) {
      toast.error(getError(err));
      ctxDispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
    }
  };

  const uploadFrontHandler = async (e) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      ctxDispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      ctxDispatch({ type: 'UPLOAD_SUCCESS', payload: data });

      setSellerFrontImgDoc(data.secure_url);

      toast.success('Upload de Imagem com Sucesso.');
    } catch (err) {
      toast.error(getError(err));
      ctxDispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
    }
  };

  const uploadBackHandler = async (e) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      ctxDispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      ctxDispatch({ type: 'UPLOAD_SUCCESS', payload: data });

      setSellerBackImgDoc(data.secure_url);

      toast.success('Upload de Imagem com Sucesso.r');
    } catch (err) {
      toast.error(getError(err));
      ctxDispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
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
          <br/>
          <div ><h4>Dados adicionais</h4>
          
          <Form.Group className="mb-3" controlId="sellerDocument">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Tipo de documento</Form.Label>
            <Form.Select aria-label="Tipo de documento"
          value={sellerDocument}
          onChange={(e)=>setSellerDocument(e.target.value)} required>
            <option value="">Seleccione</option>
            {documentTypes && documentTypes.map(document => (
            <option key={document._id} value={document._id}>
              {document.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerDocNumber">
          <FontAwesomeIcon icon={faListNumeric} /> <Form.Label>Número de documento</Form.Label>
          <Form.Control
            type="text"
            value={sellerDocumentNumber}
            required
            onChange={(e) => {
              setSellerDocumentNumber(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerFrontDoc">
              <Form.Label>Imagem do documento frontal</Form.Label>
              {sellerFrontImgDoc && (
                <img
                  style={{
                    width: '6rem',
                    height: '6rem',
                    alignItems: 'center',
                    alignContent: 'center',
                  }}
                  src={sellerFrontImgDoc}
                  alt={name}
                  className="card-img-top"
                ></img>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="imageFile">
              <Form.Label>Upload documento frontal</Form.Label>
              <Form.Control type="file" onChange={uploadFrontHandler} />
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>



            <Form.Group className="mb-3" controlId="sellerFrontDoc">
              <Form.Label>Imagem de trás do documento</Form.Label>
              {sellerBackImgDoc && (
                <img
                  style={{
                    width: '6rem',
                    height: '6rem',
                    alignItems: 'center',
                    alignContent: 'center',
                  }}
                  src={sellerBackImgDoc}
                  alt={name}
                  className="card-img-top"
                ></img>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="imageFile">
              <Form.Label>Upload de trás do documento </Form.Label>
              <Form.Control type="file" onChange={uploadBackHandler} />
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>
          </div>

         
          <br/>
          <div><h4>Detalhes de sua Loja </h4>
          <Form.Group className="mb-3" controlId="sellerName">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Nome da Loja/empresa</Form.Label>
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
                  alt={name}
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
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Descrição da loja [Especialidade]</Form.Label>
          <Form.Control
            type="text"
            value={sellerDescription}
            as="textarea"
            required
            onChange={(e) => {
              setSellerDescription(e.target.value);
            }}
          />
        </Form.Group>


       

        <Form.Group className="mb-3" controlId="sellerLocation">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Provincia</Form.Label>
            <Form.Select aria-label="Provincia"
          value={sellerLocation}
          onChange={(e)=>setSellerLocation(e.target.value)} required>
            <option value="">Seleccione</option>
            {provinces && provinces.map(province => (
            <option key={province._id} value={province._id}>
              {province.name}
            </option>
        ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerDescription">
          <FontAwesomeIcon icon={faTextSlash} /> <Form.Label>Endereço da loja [Rua/Av.]</Form.Label>
          <Form.Control
            type="text"
            value={sellerAddress}
            as="textarea"
            required
            onChange={(e) => {
              setSellerAddress(e.target.value);
            }}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="sellerOpentime">
          <FontAwesomeIcon icon={faClock} /> <Form.Label>Hora de abertura</Form.Label>
          <Form.Control
            type="time"
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
            type="time"
            value={closetime}
            required
            onChange={(e) => {
              setClosetime(e.target.value);
            }}

            
          />
        </Form.Group>
        </div>
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
