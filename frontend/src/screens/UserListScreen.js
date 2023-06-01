import React, { useContext, useEffect, useReducer } from 'react'
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
          return {...state, users: action.payload.users, pages: action.payload.pages,  loading: false};
    case 'FETCH_FAIL':
        return {...state, error: action.payload, loading: false};

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

export default function UserListScreen() {
  const [{loading, error, users, loadingDelete, successDelete, pages}, dispatch] = useReducer(reducer,{
    loading: true, error: ''
  })
  const {state} = useContext(Store);
  const {userInfo} = state;
  const navigate = useNavigate();
  const {search} =useLocation();
  const sp = new URLSearchParams(search);
  const page = sp.get('page') || 1 ;

  useEffect(()=>{
    const fetchData = async () =>{
        try {
          dispatch({type:'FETCH_REQUEST'});
          const {data} = await axios.get(`/api/users?page=${page}`,{
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

  }, [userInfo, successDelete, page]);

  const deleteHandler = async (id)=>{
    if(window.confirm('Tem a certeza que deseja remover este Utilizador?')){

    try {
      dispatch({type:'DELETE_REQUEST'});
      const {data} = await axios.delete(`/api/users/${id}`,{
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
      <title>Utilizadores</title></Helmet>
      <h1>Utilizadores</h1>
      {loading?(<LoadingBox></LoadingBox>):error?<MessageBox variant="danger">{error}</MessageBox>:(
        <>
        <table className='table'>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Número de telefone</th>
              <th>É Vendedor?</th>
              <th>Foi aprovado?</th>
              <th>É Administrador?</th>
              <th>É Entregador?</th>
              <th>Foi Banido?</th>

              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u)=>(
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.phoneNumber}</td>
                <td>{u.isSeller? <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}</td>
                <td>{u.isApproved? <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}</td>

                <td>{u.isAdmin?  <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}</td>
                <td>{u.isDeliveryMan?  <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}</td>
                <td>{u.isBanned?  <Badge bg="success" variant="success">Sim</Badge>: <Badge bg="danger" variant="danger">Não</Badge>}</td>

                <td>
                        <Button type="button" variant='light'
                        onClick={()=>navigate(`/api/users/${u._id}`)}>
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
     <Link className={x + 1 === Number(page)? 'btn text-bold': 'btn'} key={x+1} to={`/admin/userlist?page=${x+1}`}>
         {x+1}
     </Link>
 ))}
</div>
        </>
      )}
      </div>
  )
}
