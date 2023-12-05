import axios from 'axios';
import React, { useContext, useEffect, useReducer } from 'react'
import { Store } from '../Store';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { faEdit } from '@fortawesome/free-solid-svg-icons';



const reducer = (state, action )=>{
    switch(action.type){
        case 'FETCH_REQUEST':
            return {...state, loading: true};
        
        case 'FETCH_SUCCESS':
            return {...state, products: action.payload,
                loading: false};
        
        case 'FETCH_FAIL':
            return {...state, error: action.payload ,loading: false};

        case 'CREATE_REQUEST':
            return {...state, loadingCreate: true};

            case 'CREATE_SUCCESS':
                return {...state, loadingCreate: false};

                case 'CREATE_FAIL':
                    return {...state , loadingCreate: false};


                    case 'DELETE_REQUEST':
                        return {...state, loadingDelete: true, successDelete: false };
            
                        case 'DELETE_SUCCESS':
                            return {...state, successDelete: true ,loadingDelete: false};
            
                            case 'DELETE_FAIL':
                                return {...state ,successDelete: false , loadingDelete: false};
        
                                case 'DELETE_RESET':
                                    return {...state ,successDelete: false , loadingDelete: false};
          
                                default:
                             return state
    }
}


export default function ProductListSellerScreen() {

    const [{loading, error, pages, products, loadingCreate, successDelete,loadingDelete}, dispatch] = useReducer(reducer, {
        loading: true,
        error: ''
    });

     const {state} =useContext(Store);

     const {userInfo} = state;

     const {search} =useLocation();
     const sp = new URLSearchParams(search);
     const page = sp.get('page') || 1 ;
     const navigate =useNavigate()

    useEffect( ()=>{
        const fetchData = async () => {
            try{
                dispatch({type: 'FETCH_REQUEST'});
                        const {data} = await axios.get(`/api/products`,{
                            headers: {Authorization: `Bearer ${userInfo.token}`}
                        })
                        dispatch({type: 'FETCH_SUCCESS', payload: data})
                
            }catch(err){
                dispatch({type: 'FETCH_FAIL', payload:getError(err)})
            }
        }

        if(successDelete){
            dispatch({type: 'DELETE_RESET'})
        }else{
            fetchData();
        }
    }
    ,[page, userInfo, successDelete]);

    const createHandler = async () =>{
            if(window.confirm('Tem a certeza que deseja criar um novo Produto?')){
                navigate('/product/create')
            }
    }

    const deleteHandler = async(id)=>{
        if(window.confirm('Tem a certeza que deseja apagar este produto?')){
           try{
          const {data} = await axios.delete(`/api/products/${id}`,
            {headers: {Authorization: `Bearer ${userInfo.token}`}});
            dispatch({type: 'DELETE_SUCCESS'})
            toast.success(data.message);
           }catch(err){
            toast.error(getError(err));
            dispatch({type: 'DELETE_FAIL', payload:getError(err)})
           } 
        }
    }
  return (
    <div>
                {loading?(<LoadingBox></LoadingBox>): error?(<MessageBox variant="danger">{error}</MessageBox>):(<>

        <Row>
            <Col><h1>Produtos</h1></Col>
            <Col className='col text-end'>
                <div >
                    <Button className='customButtom'  variant='light' type="button"  onClick={createHandler}>
                        Criar produto
                    </Button>
                </div>
            </Col>

        </Row>
            {loadingCreate&&<LoadingBox></LoadingBox>}
            {loadingDelete &&<LoadingBox></LoadingBox>}

        <table className='table'>
            <thead>
            <tr>
                <th>Imagem do Produto</th>
                <th>Nome do Produto</th>
                <th>Quantidade</th>
                <th>Preço + Comissão</th>
                <th>Categoria</th>
                <th>Acções</th>

            </tr>
            </thead>
        <tbody>
             {products.map((product)=>
               <tr key={product._id}>
         <td> <img
            className="img-thumbnail"
            src={product.image}
            alt={product.name}
          ></img></td>
                    <td>{product.name}</td>
                    <td>{product.countInStock}</td>
                    <td>{product.price} MT</td>
                    <td>{product.category.name}</td>
                    <td>
                        <Button type="button" variant='light'
                        onClick={()=>navigate(`/product/${product.slug}`)}>
                  <FontAwesomeIcon icon={faEdit}></FontAwesomeIcon>
                        </Button>&nbsp;
                        <Button type="button" variant='light'
                        disabled={loadingDelete}
                        onClick={()=>deleteHandler(product._id)}>
                    <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                        </Button>
                    </td>
                </tr>
            )} 
        </tbody>
        </table>
        {loading?(<LoadingBox></LoadingBox>): error?(<MessageBox variant="danger">{error}</MessageBox>):(<>

        <div>
            {[...Array(pages).keys()].map((x)=>(
                <Link className={x + 1 === Number(page)? 'btn text-bold': 'btn'} key={x+1} to={`/productlist/seller?page=${x+1}`}>
                    {x+1}
                </Link>
            ))}
        </div>
        </>
        )}
        </>)}

    </div>
  )
}
