import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Store } from '../Store';
import axios from 'axios';
import { formatedDate, getError } from '../utils';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Button from 'react-bootstrap/Button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Badge from 'react-bootstrap/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, deliverRequests: action.payload.deliverRequests, pages:  action.payload.pages};

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

export default function RequestDelivermanHistoryByAdminScreen() {
  const {t} = useTranslation();
  const [{ loading, error, deliverRequests, loadingDelete, successDelete, pages }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: ''
        });

  const { state} = useContext(Store);
  const { userInfo } = state;
  const navigate = useNavigate();

  const {search} =useLocation();
  const sp = new URLSearchParams(search);
  const page = sp.get('page') || 1 ;


  const [searchQuery, setSearchQuery] = useState('');


  const filteredData = 
  deliverRequests &&
  deliverRequests.filter((row) =>
      row.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

  
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });

        const { data } = await axios.get(`/api/requestdeliver/admin?page=${page}`, {
          headers: { authorization: `Bearer ${userInfo.token}` },
        });
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

  const deleteHandler = async (id) => {
    if (window.confirm('Tem a certeza que deseja remover este pedido?')) {
      try {
        dispatch({ type: 'DELETE_REQUEST' });
        const { data } = await axios.delete(`/api/requestdeliver/${id}`, {
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
        <title>{t('alldeliveryrequesthistory')}</title>
      </Helmet>
      <h1>{t('alldeliveryrequesthistory')}</h1>
      {loadingDelete && <LoadingBox></LoadingBox>}
      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox>{error}</MessageBox>
      ) : (
        <>
          <div style={{ textAlign: 'right' }}>
            {' '}
            Pesquise pelo código de pedido:{' '}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Data e Hora</th>
                <th>Código do pedido</th>
                <th>Tipo de bem a transportar</th>
                 <th>Foi pago?</th>
                {/* <th>Entregue</th>
                <th>Estado do Pedido</th> */}
                <th>Acções</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((o) => (
                <tr key={o._id}>
                  <td>{formatedDate(o.createdAt)}</td>
                  <td>Nº {o.code}</td>
                  <td>{o.goodType}</td>
                  <td>{o.isPaid ?  <Badge bg="success" variant="success">
                        Sim
                      </Badge> : <Badge bg="danger" variant="danger">
                      Não
                      </Badge>}</td>

                  {/* <td>{o.isDelivered ? <Badge bg="success" variant="success">
                        Sim
                      </Badge> : <Badge bg="danger" variant="danger">
                      Não
                      </Badge>}</td>
                      <td>
                      <Badge
                      bg={o.status === 'Finalizado' ? 'success' : o.status === 'Cancelado' ? 'danger' : 'primary'}
                      variant={o.status === 'Finalizado' ? 'success' : 'primary'}
                    >
                      {o.status}
                    </Badge>
                      
                      </td> */}
                  <td>
                    
                    <Button
                      type="Button"
                      variant="light"
                      onClick={() => {
                        navigate(`/requestdelivermanprogress/${o._id}`);
                      }}
                    >
                      <FontAwesomeIcon icon={faList}></FontAwesomeIcon>
                    </Button>
                    {/* &nbsp;
                    <Button
                      type="Button"
                      variant="light"
                      onClick={() => deleteHandler(o._id)}
                    >
                      <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                    </Button> */}
                    &nbsp;
                    {
                    <Button
                      type="Button"
                      variant="light"
                      onClick={() => deleteHandler(o._id)}
                    >
                      <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                    </Button>
}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>


          <div>
 {[...Array(pages).keys()].map((x)=>(
     <Link className={x + 1 === Number(page)? 'btn text-bold': 'btn'} key={x+1} to={`/orderhistorybycustomer/seller?page=${x+1}`}>
         {x+1}
     </Link>
 ))}
</div>
        </>
      )}
    </div>
  );
}
