import React, { useContext, useEffect, useReducer } from 'react'
import { Store } from '../Store';
import { getError } from '../utils';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import axios from 'axios';
import Chart from 'react-google-charts';

const reducer = (state, action) =>{
  switch(action.type){
    case 'FETCH_REQUEST' :
      return {...state, loading: true};
    
    case 'FETCH_SUCCESS':
      return {...state, summary: action.payload,loading:false};

    case 'FETCH_FAIL':
      return {...state, error: action.payload, loading: false}
      default:
        return state;
  }
}
export default function DashboardScreen() {

  const {state} = useContext(Store);
  const {userInfo} = state;

  const [{loading, summary, error}, dispatch] = useReducer(reducer,{loading: true, error: ''});


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
useEffect(()=>{
const fetchData = async () =>{
  try{
    dispatch({type: 'FETCH_REQUEST'})

    const {data} = await axios.get('/api/orders/summary', {
      headers: {Authorization: `Bearer ${userInfo.token}`}
    });
    dispatch({type: 'FETCH_SUCCESS', payload: data})
  }catch(err){
    dispatch({type: 'FETCH_FAIL', payload: getError(err)});
  }
}
fetchData();
},[userInfo]);

return (
    <div>
      <h1> Painel de Controle
        </h1>
        {loading? (<LoadingBox/>)
    : error ? (<MessageBox variant="danger">{error}</MessageBox>)
    :(<>
    <Row>
    <Col md={3}>
      <Card>
        <Card.Body>
          <Card.Title>{summary.deliveryMen && summary.deliveryMen[0]?summary.deliveryMen[0].numDeliveryMan:0}</Card.Title>
          <Card.Text>Entregadores</Card.Text>
        </Card.Body>
      </Card>
      </Col>


      <Col md={3}>
      <Card>
        <Card.Body>
          <Card.Title>{summary.users && summary.users[0]? summary.users[0].numUsers: 0}</Card.Title>
          <Card.Text>Usuários</Card.Text>
        </Card.Body>
      </Card>
      </Col>

      <Col md={3}>
      <Card>
        <Card.Body>
          <Card.Title>{summary.orders && summary.orders[0]? summary.orders[0].numOrders: 0}</Card.Title>
          <Card.Text>Pedidos</Card.Text>
        </Card.Body>
      </Card>
      </Col>

      <Col md={3}>
      <Card>
        <Card.Body>
          <Card.Title>{summary.orders && summary.orders[0]? summary.orders[0].totalSales: 0} MT</Card.Title>
          <Card.Text>Total Vendido</Card.Text>
        </Card.Body>
      </Card>
      </Col>
    </Row>
    <br/>
    <div className="my-3">
      <h2>Relatório de Vendas</h2>
      {summary.dailyOrders.lenght === 0?(<MessageBox>Sem vendas</MessageBox>):(
        <Chart width="100%" height="300px" chartType="AreaChart" loader={<div>Processando...</div>}
        data={[['Data','Vendas'], ...summary.dailyOrders.map((x)=>([x._id, x.sales]))]}></Chart>
      )}
    </div>
    <br/>
    <div className="my-3">
      <h2>Categorias</h2>
      {summary.productCategories.lenght === 0?(<MessageBox>Sem categorias</MessageBox>):(
        <Chart width="100%" height="300px" chartType="PieChart" loader={<div>Processando...</div>}
        data={[['Categorias','Produtos'], ...summary.productCategories.map((x)=>([x._id[0].name, x.count]))]}></Chart>
      )}
    </div>
    </>)}
 





    </div>



    )
}
