import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import Button from 'react-bootstrap/Button';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { formatedDate, getError } from '../utils';
import Badge from 'react-bootstrap/Badge';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList } from '@fortawesome/free-solid-svg-icons';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

import { toast } from 'react-toastify';

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return { ...state, orders: action.payload, loading: false };

    case 'FETCH_FAIL':
      return { ...state, error: action.payload, loading: false };

      case 'DELETE_REQUEST':
        return { ...state, loadingDelete: false };

      case 'DELETE_SUCCESS':
        return { ...state,  loadingDelete: true };

        case 'DELETE_FAIL':
          return { ...state,loadingDelete: false };

    default:
      return state;
  }
}

export default function OrderHistoryScreen() {
  const { state } = useContext(Store);
  const { userInfo } = state;
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');



  const [{ loading, error, orders, loadingDelete }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });

  const filteredData =
  orders &&
  orders.filter((row) =>
    row.code.toLowerCase().includes(searchQuery.toLowerCase())
  );


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_REQUEST' });
      try {
        const { data } = await axios.get('/api/orders/mine', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(error) });
      }
    };
    fetchData();
  }, [userInfo, loadingDelete]);

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

  return (
    <div>
      <Helmet>Histórico de pedidos</Helmet>
      <h1>Histórico de pedidos</h1>
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
          
            {filteredData.map((order) => (
              <tr key={order._id}>
                                <td>Nº {order.code}</td>
                <td>{formatedDate(order.createdAt)}</td>
                <td>{order.totalPrice} MT</td>
                <td>{order.isPaid ? <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}</td>
                <td>
                  {order.isDelivered
                    ? <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}
                </td><td>
                  {order.status === 'Finalizado'?<Badge  bg="success">{order.status }</Badge> : order.status === 'Cancelado'?<Badge  bg="danger">{order.status }</Badge>: <Badge>{order.status }</Badge>}
                
                </td>
                <td>
                  <Button
                  variant ="light"
                    type="Button"
                    onClick={() => {
                      navigate(`/order/${order._id}`);
                    }}
                  >
                    <FontAwesomeIcon icon={faList}></FontAwesomeIcon>
                  </Button>
                  &nbsp;
                  {(order.status==='Pendente'|| order.status==='Cancelado' || order.status==='Finalizado' ) &&
                   <Button
                     type="Button"
                     variant="light"
                     onClick={() => deleteHandler(order._id)}
                   >
                     <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                   </Button>
                  
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </div>
  );
}
