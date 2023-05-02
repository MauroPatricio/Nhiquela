import React, { useContext, useEffect, useReducer } from 'react';
import { Store } from '../Store';
import axios from 'axios';
import { getError } from '../utils';
import {  useLocation, useParams } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Product from '../components/Product';
import Card from 'react-bootstrap/Card';
import { Helmet } from 'react-helmet-async';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faClockFour} from '@fortawesome/free-solid-svg-icons'
const reducer = (state, action) => {
  switch (action.type) {
    case 'SELLER_DETAILS_REQUEST':
      return { ...state, loadingSeller: true };

    case 'SELLER_DETAILS_SUCCESS':
      return { ...state, sellerDetails: action.payload, loadingSeller: false };

    case 'SELLER_DETAILS_FAIL':
      return { ...state, errorSeller: action.payload, loadingSeller: false };

    case 'PRODUCT_REQUEST':
      return { ...state, loadingProducts: true };

    case 'PRODUCT_SUCCESS':
      return {
        ...state,
        productsBySeller: action.payload.products,
        pages: action.payload.pages,
        loadingProducts: false,
      };

    case 'PRODUCT_FAIL':
      return {
        ...state,
        productsError: action.payload,
        loadingProducts: false,
      };

    default:
      return state;
  }
};

export default function SellerScreen() {
  const params = useParams();
  const { id: sellerId } = params;

  const { state } = useContext(Store);

  const { userInfo } = state;

  const {search} =useLocation();
  const sp = new URLSearchParams(search);
  const page = sp.get('page') || 1 ;

  const [
    {
      loadingSeller,
      loadingProducts,
      errorSeller,
      sellerDetails,
      productsError,
      productsBySeller,
      pages
    },
    dispatch,
  ] = useReducer(reducer, { sellerDetails: '', loading: true, error: '' });

  useEffect(() => {
    const fetchSellerDetails = async () => {
      try {
        dispatch({ type: 'SELLER_DETAILS_REQUEST' });
        const { data } = await axios.get(`/api/users/${sellerId}`, {});
        dispatch({ type: 'SELLER_DETAILS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'SELLER_DETAILS_FAIL', payload: getError(err) });
      }
    };
    fetchSellerDetails();
  }, [dispatch, userInfo, sellerId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'PRODUCT_REQUEST' });
        const { data } = await axios.get(
          `/api/products?seller=${sellerId}`,
          {}
        );
        dispatch({ type: 'PRODUCT_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'PRODUCT_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [sellerId]);
  return (
    <div>
      <Helmet>
        <title>Página do Vendedor</title>
      </Helmet>
      <h3>Produtos do Vendedor: {sellerDetails && sellerDetails.seller.name}</h3><p></p>
      {loadingSeller ? (
        <LoadingBox></LoadingBox>
      ) : errorSeller ? (
        <MessageBox variant="danger">{errorSeller}</MessageBox>
      ) : (
        <>
          {sellerDetails && (
            <div>
              <Row>
                <Col md={3}>
                  <Card>
                    <Card.Body    style={{
                          alignItems: 'center',
                        }}>
                      <img
                        style={{
                          width: '14rem',
                          height: '14rem',
                          alignItems: 'center',
                          alignContent: 'center'
                        }}
                        src={sellerDetails.seller.logo}
                        alt={sellerDetails.seller.name}
                      ></img>
                      <p>
                        <b>{sellerDetails.seller.name}</b><br/>
                        <b><FontAwesomeIcon icon={faClockFour}/> <b style={{color: 'green'}}> Aberto: </b>{sellerDetails.seller.opentime} - {sellerDetails.seller.closetime} </b><br/>

                      {/* <Rating
                        rating={sellerDetails.seller.rating}
                        numReviews={sellerDetails.seller.numReviews}
                      ></Rating> */}
                      {sellerDetails.seller.description}</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={9}>
                  <div className="products">
                    {loadingProducts ? (
                      <LoadingBox />
                    ) : productsError ? (
                      <MessageBox variant="danger">{productsError}</MessageBox>
                    ) : (
                      <>
                      <Row className="row-widget">
                        {productsBySeller.length === 0 && (
                          <MessageBox>
                            Não existem produtos adicionados
                          </MessageBox>
                        )}
                        {productsBySeller.map((product) => (
                          <Col
                            key={product.slug}
                            sm={6}
                            md={4}
                            lg={3}
                            className="mb-3"
                          >
                            <Product product={product}></Product>
                          </Col>
                        ))}
                      </Row>
                     
                      </>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </>
      )}
    </div>
  );
}
