import { useEffect, useReducer, useState } from 'react';
import axios from 'axios';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Product from '../components/Product';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { getError } from '../utils';
import Container from 'react-bootstrap/Container';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import CategoriesFilter from '../components/CategoriesFilter';
import Button from 'react-bootstrap/Button';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        products: action.payload.products,
        pages: action.payload.pages,
        loading: false,
      };

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };

    case 'TOP_SELLERS_REQUEST':
      return { ...state, loadingTopUsers: true };

    case 'TOP_SELLERS_SUCCESS':
      return { ...state, topSellers: action.payload, loadingTopUsers: false };

    case 'TOP_SELLERS_FAIL':
      return {
        ...state,
        loadingTopUsers: false,
        errorTopUsers: action.payload,
      };

    default:
      return state;
  }
};
function HomeScreen() {
  const [
    {
      loading,
      error,
      products,
      topSellers,
      loadingTopUsers,
      errorTopUsers,
    },
    dispatch,
  ] = useReducer(reducer, {
    topSellers: [],
    products: [],
    loading: true,
    error: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const result = await axios.get(`/api/products?page=${page}`);
        setItems(result.data.products);

        dispatch({ type: 'FETCH_SUCCESS', payload: result.data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
    if (page === 1) {
      fetchData();
    }
  }, [page]);

  useEffect(() => {
    const topSellers = async () => {
      try {
        dispatch({ type: 'TOP_SELLERS_REQUEST' });
        const result = await axios.get('/api/users/top-sellers');
        dispatch({ type: 'TOP_SELLERS_SUCCESS', payload: result.data });
      } catch (err) {
        dispatch({ type: 'TOP_SELLERS_FAIL', payload: getError(err) });
      }
    };
    topSellers();
  }, []);

  const handleShowMore = async () => {
    const newPage = page + 1;
    const res = await axios.get(`/api/products?page=${newPage}`);
    setItems([...products, ...res.data.products]);
    setPage(newPage);
  };

  return (
    <div>
      <Container>
        <Row>
          <Col md={3}>
            <CategoriesFilter></CategoriesFilter>
          </Col>
          <Col md={9}>
            <h3>Melhores Vendedores</h3>

            {loadingTopUsers ? (
              <LoadingBox />
            ) : errorTopUsers ? (
              <MessageBox variant="danger">{errorTopUsers}</MessageBox>
            ) : (
              <>
                {topSellers.length === 0 && (
                  <MessageBox>Vendendores não encontrados</MessageBox>
                )}
                {/* <Carousel showArrows autoPlay showThumbs={false}> */}

                <Row className="row-widget">
                  {topSellers.length === 0 && (
                    <MessageBox>Não existem vendedores adicionados</MessageBox>
                  )}
                  {topSellers.map((seller) => (
                    <Col key={seller._id} sm={2} md={4} lg={3} className="mb-3">
                      <Product seller={seller}></Product>
                    </Col>
                  ))}
                </Row>

                {/* {topSellers.map((seller) => (
                    <div key={seller._id}>
                      <Link className="link" to={`/seller/${seller._id}`}>
                        <img
                          src={seller.seller.logo}
                          alt={seller.seller.name}
                        ></img>
                        <p className="legend">{seller.seller.name}</p>
                      </Link>
                    </div>
                  ))} */}
                {/* </Carousel> */}
              </>
            )}

            <h3>Produtos para Si </h3>
            <div className="products">
              {loading ? (
                <LoadingBox />
              ) : error ? (
                <MessageBox variant="danger">{error}</MessageBox>
              ) : (
                <>
                  <Row className="row-widget">
                    {products.length === 0 && (
                      <MessageBox>Não existem produtos adicionados</MessageBox>
                    )}
                    {items.map((product) => (
                      <Col
                        key={product.slug}
                        sm={2}
                        md={4}
                        lg={3}
                        className="mb-3"
                      >
                        <Product product={product}></Product>
                      </Col>
                    ))}
                  <div>
                    {items.length === pageSize * page && (
                      <Button className="end-margin-bottom" variant="light" onClick={handleShowMore}>
                        ver mais
                      </Button>
                    )}
                  </div>
                  </Row>

                </>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default HomeScreen;
