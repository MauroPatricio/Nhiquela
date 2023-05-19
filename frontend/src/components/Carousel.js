import axios from 'axios';
import React, { useEffect, useState } from 'react';

import { Link, useLocation } from 'react-router-dom';
import { getError } from '../utils';
import { useReducer } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

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

export default function Carousel() {
 
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true, // Enable auto slide
      autoplaySpeed: 3000 // Set auto slide duration (in milliseconds)
  };


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
    <div>
       <Slider {...settings}>
       {popularItems && popularItems.map(p=>{
        <div key={p._id}>
          {console.log(p)}
        </div>
       })}
      </Slider>
    </div>
  );
}
