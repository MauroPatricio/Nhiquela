import axios from 'axios';
import React, { useEffect, useState } from 'react';

import { Link, useLocation } from 'react-router-dom';
import { getError } from '../utils';
import Rating from './Rating';
import Card from 'react-bootstrap/Card';
import { useReducer } from 'react';
import CloseButton from 'react-bootstrap/CloseButton';

import Button from 'react-bootstrap/Button';

const reducer = (state, action) => {
  switch (action.type) {
    case 'CATEGORIES_REQUEST':
      return { ...state, loadingCategories: true };

    case 'CATEGORIES_SUCCESS':
      return { ...state, loadingCategories: false, categories: action.payload.categories };

    case 'CATEGORIES_FAIL':
      return { ...state, loadingCategories: false };

    default:
      return state;
  }
};

export default function CategoriesFilter() {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const category = searchParams.get('category') || 'all';
  const query = searchParams.get('query') || 'all';
  const price = searchParams.get('price') || 'all';
  const rating = searchParams.get('rating') || 'all';
  const order = searchParams.get('order') || 'newest';
  const page = searchParams.get('page') || 1;

  const [isMaximized, setIsMaximized] = useState(false);
  const [showComponent, setShowComponent] = useState(false);
  const [showHeader, setShowHeader] = useState(true);




  const [{ categories, loadingCategories }, dispatch] = useReducer(reducer, {
    categories: [],
    loadingCategories: true,
    error: '',
  });

  const prices = [
    {
      id: 1,
      name: 'De 100 a 500 Mt',
      value: '100-500',
    },
    { id: 2, name: 'De 500 a 2000 Mt', value: '500-2000' },
    { id: 3, name: 'De 2000 acima', value: '2000-100000' },
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
    const filterQuery = filter.query || query;
    const filterPrice = filter.price || price;
    const filterRating = filter.rating || rating;
    const filterOrder = filter.order || order;
    const filterPage = filter.page || page;
    return `/search?category=${filterCategory}&query=${filterQuery}&price=${filterPrice}&rating=${filterRating}&order=${filterOrder}&page=${filterPage}`;
  };



  const handleClose = () => {
    // handle close here
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
        <CloseButton className='show-close-button' onClick={handleToggleMaximized} style={{marginLeft: '255px'}}>
                </CloseButton>
      </Card.Header>}
      {!showComponent && <h6 style={{marginLeft: '10px', marginTop: '10px'}}>Categorias</h6>}
        {showComponent && 
        <Card.Body>
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
