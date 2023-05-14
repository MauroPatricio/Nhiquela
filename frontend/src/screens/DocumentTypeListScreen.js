import React, { useContext, useEffect, useReducer } from 'react';
import { Store } from '../Store';
import axios from 'axios';
import { getError } from '../utils';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Button from 'react-bootstrap/Button';
import {Link,  useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Badge from 'react-bootstrap/Badge';
import Col from 'react-bootstrap/Col';
import {faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, documentTypes: action.payload.documentTypes,  pages: action.payload.pages};

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };

    case 'DELETE_REQUEST':
      return { ...state, loadingDelete: true, successDelete: false };

    case 'DELETE_SUCCESS':
      return { ...state, loadingDelete: false, successDelete: true };

    case 'DELETE_FAIL':
      return { ...state, loadingDelete: false };

    case 'DELETE_RESET':
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function DocumentTypeListScreen() {
  const [{ loading, error, documentTypes, loadingDelete, successDelete, pages }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: '',
    });

  const { state } = useContext(Store);
  const { userInfo } = state;



  const navigate = useNavigate();

  const {search} =useLocation();
  const sp = new URLSearchParams(search);
  const page = sp.get('page') || 1 ;

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
    if (successDelete) {
      dispatch({ type: 'DELETE_RESET' });
    } else {
      fetchData();
    }
  }, [userInfo, successDelete, page]);

   const createHandler = async () =>{
  if(window.confirm('Tem a certeza que deseja criar um novo tipo de documento?')){
    navigate('/document/create')
}
}

  const deleteHandler = async (id) => {
    if (window.confirm('Tem a certeza que deseja remover este tipo de documento?')) {
      try {
        dispatch({ type: 'DELETE_REQUEST' });
        const { data } = await axios.delete(`/api/documents/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success(data.message);
        dispatch({ type: 'DELETE_SUCCESS' });
      } catch (err) {
        dispatch({
          type: 'DELETE_FAIL',
        });
        toast.error(getError(error));
      }
    }
  };

  return (
    <div>
      <Helmet>
        <title>Tipos de documentos</title>
      </Helmet>
      <h1>Tipos de documentos</h1>

      <Col className='col text-end'>
                <div >
                    <Button className='customButtom'  variant='light' type="button"  onClick={createHandler}>
                        Criar Tipo de Documento
                    </Button>
                </div>
            </Col>

      {loadingDelete && <LoadingBox></LoadingBox>}
      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox>{error}</MessageBox>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Estado</th>
                <th>Acções</th>
              </tr>
            </thead>
            <tbody>
              {documentTypes.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>
                    {c.isActive ? (
                      <Badge bg="success" variant="success">
                        Activo
                      </Badge>
                    ) : (
                      <Badge bg="danger" variant="danger">
                        Inactivo
                      </Badge>
                    )}
                  </td>
                  <td>
                    <Button
                      type="Button"
                      variant="light"
                      onClick={() => {
                        navigate(`/document/${c._id}`);
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit}></FontAwesomeIcon>
                    </Button>
                    &nbsp;
                    <Button
                      type="Button"
                      variant="light"
                      onClick={() => deleteHandler(c._id)}
                    >
                      <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
 {[...Array(pages).keys()].map((x)=>(
     <Link className={x + 1 === Number(page)? 'btn text-bold': 'btn'} key={x+1} to={`/documentTypeList?page=${x+1}`}>
         {x+1}
     </Link>
 ))}
</div>
        </>
      )}
    </div>
  );
}
