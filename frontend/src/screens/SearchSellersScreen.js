import axios from 'axios';
import React, { useEffect, useReducer } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import MessageBox from '../components/MessageBox';
import LoadingBox from '../components/LoadingBox';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { getError } from '../utils';
import Button from 'react-bootstrap/Button';
import { useTranslation } from 'react-i18next';


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
        sellers: action.payload.sellers,
        page: action.payload.page,
        pages: action.payload.pages,
        countSellers: action.payload.countSellers,
      };

    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function SearchSellersScreen() {
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



  const [{ loading, error, sellers, pages, countSellers }, dispatch] =
    useReducer(reducer, { loading: true, error: '' });

  useEffect(() => {
    const fetchSearchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
          const  {data}  = await axios.get(
            `api/users/sellers?page=${page}`
          );
      


        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {

        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
    fetchSearchData();
  }, [category, order, page, price, query, rating, province]);


  const getFilterUrl = (filter) => {
    const filterPage = filter.page || page;
    return `/sellers?page=${filterPage}`;
  };

  

  return (
    <div>
      <Helmet>
        <title>Pesquisar fornecedores</title>
      </Helmet>
      <h1><p>Pesquisa de fornecedores</p></h1>
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
                  {countSellers === 0 ? '0' : countSellers} Resultado(s) encontrado(s) {' '}
                  </div>
                </Col>
              </Row>
              {sellers.length === 0 && (<MessageBox> {t('suppliersnotfound')}</MessageBox>)}
            <Row>
              {sellers.map((seller)=>(
                <Col sm={6} lg={3} className="mb-3" key={seller._id}>
                  <Product seller={seller}></Product>
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
