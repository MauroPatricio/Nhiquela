import axios from 'axios';
import React, { useEffect, useState } from 'react';

import { Link, useLocation } from 'react-router-dom';
import { getError } from '../utils';
import Rating from './Rating';
import Card from 'react-bootstrap/Card';
import { useReducer } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { FaStar } from "react-icons/fa";
import { FaStarHalf } from "react-icons/fa";
import { FaRegStar } from "react-icons/fa";

const reducer = (state, action) => {
  switch (action.type) {
    case 'CATEGORIES_REQUEST':
      return { ...state, loadingCategories: true };

    case 'CATEGORIES_SUCCESS':
      return { ...state, loadingCategories: false, categories: action.payload.categories };

    case 'CATEGORIES_FAIL':
      return { ...state, loadingCategories: false };

      case 'PROVINCE_REQUEST':
        return { ...state, loadingProvinces: true };
  
      case 'PROVINCE_SUCCESS':
        return { ...state, loadingProvinces: false, provinces: action.payload.provinces };
  
      case 'PROVINCE_FAIL':
        return { ...state, loadingProvinces: false };

    default:
      return state;
  }
};

export default function CategoriesFilter() {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const category = searchParams.get('category') || 'all';
  const province = searchParams.get('province') || 'all';
  const query = searchParams.get('query') || 'all';
  const price = searchParams.get('price') || 'all';
  const rating = searchParams.get('rating') || 'all';
  const order = searchParams.get('order') || 'newest';
  const page = searchParams.get('page') || 1;

  const [isMaximized, setIsMaximized] = useState(false);
  const [showComponent, setShowComponent] = useState(false);
  const [showHeader, setShowHeader] = useState(true);


  library.add(fas);


  const [{ categories, loadingCategories, provinces, loadingProvinces}, dispatch] = useReducer(reducer, {
    categories: [],
    loadingCategories: true,
    loadingProvinces: true,
    error: '',
  });

  const prices = [
    {
      id: 1,
      name: 'De 100 a 500 MT',
      value: '100-500',
    },
    { id: 2, name: 'De 500 a 2000 MT', value: '500-2000' },
    { id: 3, name: 'De 2000 a 5000 MT', value: '2000-5000' },
    { id: 4, name: 'De 5000 acima', value: '5000-10000' },

  ];

  const ratings = [
    { id: 1, name: 'Mais de 4 estrelas', rating: 4 },
    { id: 2, name: 'Mais de 3 estrelas', rating: 3 },
    { id: 3, name: 'Mais de 2 estrelas', rating: 2 },
    { id: 4, name: 'Mais de 1 estrela', rating: 1 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'CATEGORIES_REQUEST' });
        const { data } = await axios.get('/api/categories');
        dispatch({ type: 'CATEGORIES_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'CATEGORIES_FAIL', payload: getError(err) });
      }
    };
    if (loadingCategories) {
      fetchData();
    }
  }, [categories, loadingCategories]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'PROVINCE_REQUEST' });
        const { data } = await axios.get('/api/provinces');
        dispatch({ type: 'PROVINCE_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'PROVINCE_FAIL', payload: getError(err) });
      }
    };
    if (loadingProvinces) {
      fetchData();
    }
  }, [loadingProvinces]);


  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 540) {
        setShowHeader(false);
        setShowComponent(true)
      } else {
        setShowHeader(true);
        setShowComponent(false)
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


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
  
  const handleToggleMaximized = () => {
    setIsMaximized(!isMaximized);
    setShowComponent(!showComponent);
  };

  // const handleClick = () => {
  // }


  return (
    <div>
      <Card>
      {showHeader &&   <Card.Header >
        <FontAwesomeIcon icon={faPlus}  className='show-close-button' onClick={handleToggleMaximized} style={{marginLeft: '255px'}}></FontAwesomeIcon>

      </Card.Header>}
      {!showComponent && <h6 style={{marginLeft: '10px', marginTop: '10px'}} onClick={handleToggleMaximized}  >Filtros de Pesquisa</h6>}
        {showComponent && 
        <Card.Body style={{marginLeft: '10px'}}>
            <h6>Categorias</h6>
          <div>
            <Link
              className={
                'all' === category ? 'text-bold link-none' : 'link-none'
              }
              to={getFilterUrl({ category: 'all' })}
            >
              Todas
            </Link>
            {categories &&
              categories.map((c) => (
                <li key={c._id}>
                  <Link
                    className={
                      c._id === category ? 'text-bold link-none' : 'link-none'
                    }
                    to={getFilterUrl({ category: c._id })}
                  >
                  {c.name}
                  </Link>
                </li>
              ))}
          </div>
          <br />
          <div>
            <h6>Preços por intervalos</h6>
            <Link
              className={'all' === price ? 'text-bold link-none' : 'link-none'}
              to={getFilterUrl({ price: 'all' })}
            >
              Todos preços
            </Link>

            {prices.map((p) => (
              <li key={p.id}>
                <Link
                  className={
                    p.value === price ? 'text-bold link-none' : 'link-none'
                  }
                  to={getFilterUrl({ price: p.value })}
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </div>
          <br/>
          <h6>Localização</h6>
          <div>
            <Link
              className={
                'all' === province ? 'text-bold link-none' : 'link-none'
              }
              to={getFilterUrl({ province: 'all' })}
            >
              Todas
            </Link>
            {provinces &&
              provinces.map((p) => (
                <li key={p._id}>
                  <Link
                    className={
                      p._id === province ? 'text-bold link-none' : 'link-none'
                    }
                    to={getFilterUrl({ province: p._id })}
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
          </div>
          <br />
          <div>
            <h6>Pontuaçōes</h6>

            {ratings.map((r) => (
              <Link
                key={r.id}
                className={r === rating ? 'text-bold link' : 'link'}
                to={getFilterUrl({ rating: r.rating })}
              >
                <Rating caption={' & acima'} rating={r.rating}></Rating>
              </Link>
            ))}

            <Link
              to={getFilterUrl({ rating: 'all' })}
              className={rating === 'all' ? 'text-bold' : ''}
            >
              <Rating caption={' & acima'} rating={0}></Rating>
            </Link>
          </div>
           
        </Card.Body>
        }
      </Card>
    </div>
  );
}
