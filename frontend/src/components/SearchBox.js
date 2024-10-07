import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import  Form  from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';

import { useNavigate } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

export default function SearchBox() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const searchHandler = (e) => {
    e.preventDefault();
    navigate(query ? `search?query=${query}` : '/search');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
        <InputGroup>
          <FormControl
            type="text"
            name="query"
            id="query"
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchproducts')}
            aria-label="Pesquisar Produtos"
            aria-describedby="button-search"
          ></FormControl>
          <Button className='customButtom' variant="light" type="submit" id="button-search" onClick={searchHandler}>
            <FontAwesomeIcon icon={faSearch}></FontAwesomeIcon>
          </Button>
        </InputGroup>
    </div>
  );
}
