import axios from 'axios';
import React, { useEffect, useReducer } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import MessageBox from '../components/MessageBox';
import LoadingBox from '../components/LoadingBox';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getError } from '../utils';
import Button from 'react-bootstrap/Button';
import { useTranslation } from 'react-i18next';


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import Product from '../components/Product';
import CategoriesFilter from '../components/CategoriesFilter';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        products: action.payload.products,
        page: action.payload.page,
        pages: action.payload.pages,
        countProducts: action.payload.countProducts,
      };

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function SearchScreen() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const category = searchParams.get('category') || 'all';
  const query = searchParams.get('query') || 'all';
  const price = searchParams.get('price') || 'all';
  const rating = searchParams.get('rating') || 'all';
  const order = searchParams.get('order') || 'newest';
  const page = searchParams.get('page') || 1;
  const province = searchParams.get('province') || 'all';
  const { t } = useTranslation();



  const [{ loading, error, products, pages, countProducts }, dispatch] =
    useReducer(reducer, { loading: true, error: '' });

  useEffect(() => {
    const fetchSearchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
    

            const {data}  = await axios.get(
            `api/products/search?page=${page}&query=${query}&category=${category}&price=${price}&rating=${rating}&order=${order}&province=${province}`
          );
        


        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {

        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
    fetchSearchData();
  }, [category, order, page, price, query, rating, province]);


  const getFilterUrl = (filter) => {
    const filterCategory = filter.category || category;
    const filterProvince = filter.province || province;
    const filterQuery = filter.query || query;
    const filterPrice = filter.price || price;
    const filterRating = filter.rating || rating;
    const filterOrder = filter.order || order;
    const filterPage = filter.page || page;
    return `/search?category=${filterCategory}&query=${filterQuery}&price=${filterPrice}&rating=${filterRating}&order=${filterOrder}&page=${filterPage}&province=${filterProvince}`;
  };

  

  return (
    <div>
      <Helmet>
        <title>{t('searchproducts')}</title>
      </Helmet>
      <h1><p>{t('searchproducts')}</p></h1>
      <Row>
        <Col md={3}>
        <CategoriesFilter></CategoriesFilter>
        </Col>
        <Col md={9}>
          {loading ? (
            <LoadingBox></LoadingBox>
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : (
            <>
              <Row className="justify-content-between mb-3">
                <Col md={6}>
                  <div>
                    {countProducts === 0 ? '0' : countProducts} {t('resultfound')} {' '}
                    {query !== 'all' && ' : ' + query}
                    {category !== 'all' && ' : ' + products && products[0] && products[0].category && products[0].category.name}
                    {province !== 'all' && ' : ' + products && products[0] && products[0].province && products && products[0].province.name}
                    {price !== 'all' && ' : Preço ' + price +' MT'}
                    {rating !== 'all' && ' : Rating ' + rating + ' & acima'}
                    {query !== 'all' ||
                    province !== 'all' ||
                    category !== 'all' ||
                    rating !== 'all' ||
                    price !== 'all' ? (
                      <Button
                        variant="light"
                        onClick={() => {
                          navigate('/search');
                        }}
                      >
                        {' '}
                        <FontAwesomeIcon icon={faTimesCircle}></FontAwesomeIcon>
                      </Button>
                    ) : null}
                  </div>
                </Col>
                <Col className="text-end">
                  {t('orderby')}{' '}
                  <select value={order}
                  onChange={(e)=>{
                    navigate(getFilterUrl({order: e.target.value}));
                  }}>
                    <option value="newest">{t('newproducts')}</option>
                    <option value="lowest">{t('lowtohigh')}</option>
                    <option value="highest">{t('hightolow')}</option>
                    <option value="toprated">{t('avgcustomerreviews')}</option>

                  </select>
                </Col>
              </Row>
              {products.length === 0 && (<MessageBox> {t('productsnotfound')}</MessageBox>)}
            <Row>
              {products.map((product)=>(
                <Col sm={6} lg={3} className="mb-3" key={product._id}>
                  <Product product={product}></Product>
                </Col>
              ))}
            </Row>
            
            </>
          )}
      <div>
      {[...Array(pages).keys()].map((x)=>(
          <Link
          key={x+1}
          className="mx-1"
          to={getFilterUrl({ page: x+1 })}
          >
            <Button className={Number(page) === x +1? 'text-bold':''} variant="light">
              {x+1}
            </Button>
          </Link>
        ))}
      </div>
        </Col>
      </Row>
    </div>
  );
}
