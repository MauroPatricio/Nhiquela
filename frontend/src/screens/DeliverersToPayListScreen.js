import React, { useContext, useEffect, useReducer, useState } from 'react'
import { Store } from '../Store';
import { getError } from '../utils';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Button from 'react-bootstrap/Button';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import Badge from 'react-bootstrap/Badge';
import { Link } from 'react-router-dom';



const reducer= (state, action) =>{
  switch(action.type){
      case 'FETCH_REQUEST':
          return {...state, loading: true};
      case 'FETCH_SUCCESS':
            return {...state, orders: action.payload.orders, pages: action.payload.pages,  loading: false};
      case 'FETCH_FAIL':
          return {...state, error: action.payload, loading: false};


      case 'UPDATE_PAYMENT_REQUEST':
          return {...state, loadingUpdate: true};
      case 'UPDATE_PAYMENT_SUCCESS':
            return {...state,  updateSuccess: true};
      case 'UPDATE_PAYMENT_FAIL':
          return {...state, loadingUpdate: false, loading: false};
  
          case 'UPDATE_RESET':
            return {...state, loadingUpdate: false, loading: false, updateSuccess: false};

        case 'DELETE_REQUEST':
          return {...state, loadingDelete: true};
        case 'DELETE_SUCCESS':
          return {...state, successDelete: true, loadingDelete: false};
        case 'DELETE_FAIL':
        return {...state,  loadingDelete: false};
        case 'DELETE_RESET':
          return {...state,  loadingDelete: false, successDelete: false};

  default:
    return state;
  }

}

export default function DeliverersToPayListScreen() {
  const [{loading, error, orders, loadingDelete, successDelete, pages, updateSuccess}, dispatch] = useReducer(reducer,{
    loading: true, error: '', orders: []
  })
  const {state} = useContext(Store);
  const {userInfo} = state;
  const navigate = useNavigate();
  const {search} =useLocation();
  const sp = new URLSearchParams(search);
  const page = sp.get('page') || 1 ;

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
    
    
  useEffect(() => {
    const numericSearchQuery = parseInt(searchQuery);
    if (!isNaN(numericSearchQuery)) {
      
      const filtered = orders && orders.filter((user) => user.phoneNumber === numericSearchQuery);
      if(filtered.length>0){
        setFilteredData(filtered);
      }else{
        setFilteredData(orders);
      }
    } else {
      // If the searchQuery is not a valid number, set filteredData to the original user data.
      setFilteredData(orders);
    }
  }, [searchQuery, orders]);




  useEffect(()=>{
    const fetchData = async () =>{
        try {
          dispatch({type:'FETCH_REQUEST'});
          const {data} = await axios.get(`/api/orders/deliverorderstopay?page=${page}`,{
            headers: {Authorization: `Bearer ${userInfo.token}`}
          })
          dispatch({type:'FETCH_SUCCESS', payload: data});

        } catch (err) {
          dispatch({type:'FETCH_FAIL', payload: getError(err)})
          toast.error(err.message)
        }
    }

    if(successDelete){
      dispatch({type:'DELETE_RESET'});
    }else{
      fetchData();
    }

    if(updateSuccess){
      dispatch({type:'UPDATE_RESET'});
    }else{
      fetchData();
    }

  }, [userInfo, successDelete, page, updateSuccess]);


  const updateOrderHandler = async (id) => {
    try {
      dispatch({ type: 'UPDATE_PAYMENT_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${id}/updatedeliverpayment`,
        {},
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      dispatch({ type: 'UPDATE_PAYMENT_SUCCESS'});
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'UPDATE_PAYMENT_FAIL' });
    }
  };

  const deleteHandler = async (id)=>{
    if(window.confirm('Tem a certeza que deseja remover este pedido?')){

    try {
      dispatch({type:'DELETE_REQUEST'});
      const {data} = await axios.delete(`/api/orders/${id}`,{
        headers: {Authorization: `Bearer ${userInfo.token}`}
      })
      dispatch({type:'DELETE_SUCCESS'});
      toast.success(data.message)

    } catch (err) {
      dispatch({type:'DELETE_FAIL', payload: getError(err)})
      toast.error(err.message)
    }
  }
  }
  return (
    <div><Helmet>
      <title>Entregadores por pagar</title></Helmet>
      <h1>Entregadores por pagar</h1>
      {loading?(<LoadingBox></LoadingBox>):error?<MessageBox variant="danger">{error}</MessageBox>:(
        <>
        <div style={{textAlign: "right"}}> Pesquise pelo número de telefone:{' '}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          </div>
        <table className='table'>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Número de telefone</th>
              <th>Valor por pagar</th>
              <th>Foi pago?</th>
              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((u)=>(
              <tr key={u._id}>
                <td>{u.deliveryman && u.deliveryman.name}</td>
                <td>{u.deliveryman && u.deliveryman.phoneNumber}</td>
                <td>{u.deliveryman && u.deliveryman.pricetopay}</td>
                <td>{u.isDeliverPaid? <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}</td>
                <td>
                        <Button type="button" variant='light'
                        onClick={()=>updateOrderHandler(u._id)}>
                  <FontAwesomeIcon icon={faEdit}></FontAwesomeIcon>
                        </Button>&nbsp;
                        <Button type="button" variant='light'
                        disabled={loadingDelete}
                        onClick={()=>deleteHandler(u._id)}>
                    <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                        </Button>
                    </td>
              </tr>
            ))}
          </tbody>

        </table>
 <div>
 {[...Array(pages).keys()].map((x)=>(
     <Link className={x + 1 === Number(page)? 'btn text-bold': 'btn'} key={x+1} to={`/admin/deliverstopay?page=${x+1}`}>
         {x+1}
     </Link>
 ))}
</div>
        </>
      )}
      </div>
  )
}
