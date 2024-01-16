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
import CarouselSlide from '../components/CarouselSlide';
import { Carousel } from 'react-responsive-carousel';
import { t } from 'i18next';


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
export function HomeScreen() {
  const [
    {
      loading,
      error,
      topSellers,
      loadingTopUsers,
      errorTopUsers,
    },
    dispatch,
  ] = useReducer(reducer, {
    topSellers: [],
    loading: true,
    error: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [items, setItems] = useState([]);
  const [showCaroselTopSellers, setShowCaroselTopSellers] = useState(false);
  const [showDivTopSellers, setShowDivTopSellers] = useState(false);




  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
     

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 540) {
        setShowCaroselTopSellers(true);
        setShowDivTopSellers(false)
      } else {
        setShowCaroselTopSellers(false);
        setShowDivTopSellers(true)

      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const sortedProductsByCategory = [];
        let currentCategory = null;
        
        const {data} = await axios.get(`/api/products?page=${page}`);
        data.products.forEach(product => {

          if (product.category !== currentCategory) {
            currentCategory = product.category;
            sortedProductsByCategory.push(product);
          }
        });

        setItems(sortedProductsByCategory);

        
        // setItems(data.products);

        dispatch({ type: 'FETCH_SUCCESS', payload: data });
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
    const {data} = await axios.get(`/api/products?page=${newPage}`);
    setItems([...items, ...data.products]);
    setPage(newPage);
  };

  // const sortedProducts = items.sort((a, b) => {
  //   if (a.category._id < b.category._id) {
  //     return -1;
  //   } else if (a.category._id > b.category._id) {
  //     return 1;
  //   } else {
  //     return 0;
  //   }
  // });

  return (
    <div>
      <Container>
  
        <Row>
          <Col md={3}>
      
            <CategoriesFilter></CategoriesFilter>

          </Col>
          <Col md={9}>
            <CarouselSlide></CarouselSlide>
            <h3>{t('thebestsuppliers')}</h3>

            {loadingTopUsers ? (
              <LoadingBox />
            ) : errorTopUsers ? (
              <MessageBox variant="danger">{errorTopUsers}</MessageBox>
            ) : (
              <>
                {topSellers.length === 0 && (
                  <MessageBox>{t('suppliersnotfound')}</MessageBox>
                )}
                {/* <Carousel showArrows autoPlay showThumbs={false}> */}

                <Row className="row-widget">
                  {topSellers && topSellers.length === 0 && (
                    <MessageBox>{t('suppliersnotadd')}</MessageBox>
                  )}

{showCaroselTopSellers && <Carousel showArrows infiniteLoop={true} autoPlay showThumbs={false}  showIndicators={false} className='carousel-custom'>
      {topSellers && topSellers.map((seller) => (
        <Col key={seller._id} sm={2} md={4} lg={3} className="mb-3">
        <Product seller={seller}></Product>
      </Col>
      ))}
    </Carousel>}


                  {showDivTopSellers && topSellers && topSellers.map((seller) => (
                    <Col key={seller._id} sm={2} md={4} lg={3} className="mb-3">
                      <Product seller={seller}></Product>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            <h3>{t('Productsforyou')}</h3>
            <div className="products">
              {loading ? (
                <LoadingBox />
              ) : error ? (
                <MessageBox variant="danger">{error}</MessageBox>
              ) : (
                <>
                  <Row className="row-widget">
                    {items && items.length === 0 && (
                      <MessageBox>{t('therearenoaddedproducts')}</MessageBox>
                    )}
                    {items && items.map((product) => (
                <Col
                        key={product._id}
                        sm={2}
                        md={4}
                        lg={3}
                        className="mb-3"
                        >
                        <Product product={product}></Product>
                      </Col>
                   



                    ))}
                   
                  <div>
                    {items && items.length === pageSize * page && (
                      // <Button className="end-margin-bottom" variant="light" onClick={handleShowMore}>
                      //   Ver mais
                      // </Button>

                      <Button className="customButtom" variant="light" onClick={handleShowMore}>
                        {t('showmore')}
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
