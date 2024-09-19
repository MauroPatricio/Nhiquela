import axios from 'axios';
import React, { useContext, useEffect } from 'react';

import { Link } from 'react-router-dom';
import { getError, truncateString } from '../utils';
import { useReducer } from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { useTranslation } from 'react-i18next';
import { Store } from '../Store';

const reducer = (state, action) => {
  switch (action.type) {
    case 'ITEMS_REQUEST':
      return { ...state, loadingPopular: true };

    case 'ITEMS_SUCCESS':
      return { ...state, loadingPopular: false, popularItems: action.payload.orders };

    case 'ITEMS_FAIL':
      return { ...state, loadingPopular: false };

    default:
      return state;
  }
};

export default function CarouselSlide() {

  const { t } = useTranslation();

  const [{  popularItems, loadingPopular}, dispatch] = useReducer(reducer, {
    loadingPopular: true,
    error: '',
  });

  const { state } = useContext(Store);

  const {changelng} = state;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'ITEMS_REQUEST' });
        const { data } = await axios.get('/api/orders/popularitems');
        dispatch({ type: 'ITEMS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'ITEMS_FAIL', payload: getError(err) });
      }
    };
    if (loadingPopular) {
      fetchData();
    }
  }, [loadingPopular]);


  return (
    <>
<br/>
     {popularItems && popularItems.length !== 0 && <h3>{t('featuredproducts')}</h3>} 
    <Carousel showArrows infiniteLoop={true}  autoPlay showThumbs={false}  showIndicators={false} className='carousel-custom'>
      {popularItems && popularItems.map((p) => (
       <Link className="link" to={`/product/${p.slug}`} key={p._id}>
        <div key={p._id}>
          <img className='img-carousel' src={p.image} alt={p.name} />
                      {p && p.onSale &&  <span className="sale"><b>{t('onsale')}</b></span>}
                      {p && p.onSale &&  <span className="sale-percentage"><b>{p.onSalePercentage*100}%</b></span>}
           
        <br/><b>{changelng=='pt'?truncateString(p.nome,30):truncateString(p.nome,30)}</b>
        </div>
        </Link>
      ))}
    </Carousel>
    <br/>
    </>

  );
}
