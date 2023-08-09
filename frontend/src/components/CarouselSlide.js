import axios from 'axios';
import React, { useEffect } from 'react';

import { Link } from 'react-router-dom';
import { getError } from '../utils';
import { useReducer } from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

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


  const [{  popularItems, loadingPopular}, dispatch] = useReducer(reducer, {
    loadingPopular: true,
    error: '',
  });


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
     {popularItems && popularItems.length != 0 && <h3>Produtos em Destaque</h3>} 
    <Carousel showArrows infiniteLoop={true}  autoPlay showThumbs={false}  showIndicators={false} className='carousel-custom'>
      {popularItems && popularItems.map((p) => (
       <Link className="link" to={`/product/${p.slug}`} key={p._id}>
        <div key={p._id}>

          <img className='img-carousel' src={p.image} alt={p.name} />
          <p>{p.name}</p>
        
        </div>
        </Link>
      ))}
    </Carousel>
    <br/>
    </>

  );
}
