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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { faList } from '@fortawesome/free-solid-svg-icons';
import Badge from 'react-bootstrap/Badge';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, orders: action.payload.orders, pages: action.payload.pages };

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

      case 'REMOVE_REQUEST':
        return { ...state, loadingRemove: true, successRemove: false };
  
      case 'REMOVE_SUCCESS':
        return { ...state, loadingRemove: false, successRemove: true };
  
      case 'REMOVE_FAIL':
        return { ...state, loadingRemove: false };
  
      case 'REMOVE_RESET':
        return { ...state, loadingRemove: false, successRemove: false };
      
    default:
      return state;
  }
};

export default function OrderListScreen() {
  const [{ loading, error, orders, loadingDelete, successDelete,loadingRemove, successRemove,pages }, dispatch] =
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


  const [searchQuery, setSearchQuery] = useState('');


  const filteredData = orders && orders.filter((row) =>
  row.code.toLowerCase().includes(searchQuery.toLowerCase())
);

useEffect(() => {
  window.scrollTo(0, 0);
}, []);


  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });

        const { data } = await axios.get(`/api/orders?page=${page}`, {
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

    if (successDelete) {
      dispatch({ type: 'REMOVE_RESET' });
    } else {
      fetchData();
    }
  }, [userInfo, successDelete, page, successRemove]);

  const deleteHandler = async (id) => {
    if (window.confirm('Tem a certeza que deseja remover este pedido?')) {
      try {
        dispatch({ type: 'DELETE_REQUEST' });
        const { data } = await axios.delete(`/api/orders/${id}`, {
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

  const removerOrderHandler = async (id) => {
    if (window.confirm('Tem a certeza que deseja remover por completo este pedido?')) {
      try {
        dispatch({ type: 'REMOVE_REQUEST' });
        const { data } = await axios.delete(`/api/orders/admin/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success(data.message);
        dispatch({ type: 'REMOVE_SUCCESS' });
      } catch (err) {
        dispatch({
          type: 'REMOVE_FAIL',
        });
        toast.error(getError(error));
      }
    }
  };
  return (
    <div>
      <Helmet>
        <title>Pedidos</title>
      </Helmet>
      <h1>Pedidos</h1>
      {loadingDelete && <LoadingBox></LoadingBox>}
      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox>{error}</MessageBox>
      ) : (
        <>
        <div style={{textAlign: "right"}}> Pesquise pelo código de pedido:{' '}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Código do pedido</th>
                <th>Data</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Entregue</th>
                <th>Estado</th>
                <th>Acções</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((o) => (
                <tr key={o._id}>
                  <td>Nº {o.code}</td>
                  <td>{formatedDate(o.createdAt)}</td>
                  <td>{o.totalPrice} MT</td>
                  <td>
                    {o.isPaid ? (
                      <Badge bg="success" variant="success">
                        Sim
                      </Badge>
                    ) : (
                      <Badge bg="danger" variant="danger">
                        Não
                      </Badge>
                    )}
                  </td>
                  <td>
                    {o.isDelivered ? (
                      <Badge bg="success" variant="success">
                        Sim
                      </Badge>
                    ) : (
                      <Badge bg="danger" variant="danger">
                        Não
                      </Badge>
                    )}
                  </td>
                  <td>
                  <Badge
                      bg={o.status === 'Finalizado' ? 'success' : o.status === 'Cancelado' ? 'danger' : 'primary'}
                      variant={o.status === 'Finalizado' ? 'success' : 'primary'}
                    >
                      {o.status}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      type="Button"
                      variant="light"
                      onClick={() => {
                        navigate(`/order/${o._id}`);
                      }}
                    >
                      <FontAwesomeIcon icon={faList}></FontAwesomeIcon>
                    </Button>
                    &nbsp;
                    <Button
                      type="Button"
                      variant="light"
                      onClick={() => deleteHandler(o._id)}
                    >
                      <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                    </Button>
                    &nbsp;
                    <Button
                      type="Button"
                      variant="dark"
                      onClick={() => removerOrderHandler(o._id)}
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
                <Link className={x + 1 === Number(page)? 'btn text-bold': 'btn'} key={x+1} to={`/admin/orderlist?page=${x+1}`}>
                    {x+1}
                </Link>
            ))}
        </div>
        </>
      )}
    </div>
  );
}
