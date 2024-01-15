import React, { useContext, useEffect, useReducer } from 'react';
import { Store } from '../Store';
import axios from 'axios';
import { getError } from '../utils';
import {  useParams } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Product from '../components/Product';
import Card from 'react-bootstrap/Card';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';


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
  const { t } = useTranslation();

  const params = useParams();
  const { id: sellerId } = params;

  const { state } = useContext(Store);

  const { userInfo } = state;

  // const {search} =useLocation();
  // const sp = new URLSearchParams(search);
  // const page = sp.get('page') || 1 ;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [
    {
      loadingSeller,
      loadingProducts,
      errorSeller,
      sellerDetails,
      productsError,
      productsBySeller,
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
        <title>{t('supplierpage')}</title>
      </Helmet>
      <h3>{t('supplierproducts')}: <b className='text_color'>{sellerDetails && sellerDetails.seller.name}</b></h3>
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
                    <Card.Img variant="top" style={{height: '250px'}} src={sellerDetails.seller.logo} alt={sellerDetails.seller.name} />
                    <Card.Body    style={{
                          alignItems: 'center',
                        }}>

                   
                       <br/>
                      <FontAwesomeIcon icon={faClockFour}/> <span style={{color:'green'}}> {userInfo && t('workdays')}: </span>{userInfo && sellerDetails.seller.workDayAndTime.map((workDay)=>(
                <Col  key={workDay.dayOfWeek}>
                  {workDay.dayOfWeek} - {workDay.opentime} - {workDay.closetime}
                </Col>
              ))}<br/>

                      {/* <Rating
                        rating={sellerDetails.seller.rating}
                        numReviews={sellerDetails.seller.numReviews}
                      ></Rating> */}

                     

                    <b>{userInfo && t('address')}:</b> {userInfo && sellerDetails.seller.province && sellerDetails.seller.province.name},{userInfo && sellerDetails.seller.address}<br/>
                   
                    <b>{userInfo && t('specialty')}:</b>  {userInfo && sellerDetails.seller.description}<br/><br/>
                     {userInfo && userInfo.isAdmin &&  <b>Numero(s) telefone para transferencia(s):</b>}{ userInfo && userInfo.isAdmin && sellerDetails.seller && sellerDetails.seller.phoneNumberAccount} {userInfo && userInfo.isAdmin && ';'}{userInfo && userInfo.isAdmin && sellerDetails.seller && sellerDetails.seller.alternativePhoneNumberAccount}<br/>
                      
                     {userInfo && userInfo.isAdmin && <b>Numero(s) conta para transferencia(s):</b> }{userInfo && userInfo.isAdmin && sellerDetails.seller && sellerDetails.seller.accountType} {userInfo && userInfo.isAdmin && '-'} {userInfo && userInfo.isAdmin && sellerDetails.seller && sellerDetails.seller.accountNumber}{ userInfo && userInfo.isAdmin &&';'} {userInfo && userInfo.isAdmin && sellerDetails.seller && sellerDetails.seller.alternativeAccountType} {userInfo && userInfo.isAdmin && '-'} {userInfo && userInfo.isAdmin && sellerDetails.seller && sellerDetails.seller.alternativeAccountNumber}<br/>

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
                            {t('therearenoaddedproducts')}
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
