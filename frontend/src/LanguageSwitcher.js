// LanguageSwitcher.js
import React from 'react';
import i18n from 'i18next';
import Flag from "react-country-flag"

import Form from 'react-bootstrap/Form';

export default function LanguageSwitcher () {

  const handleChangeLanguage = (event) => {
    const selectedLanguage = event.target.value;
    i18n.changeLanguage(selectedLanguage);
  };

  return (
    <select onChange={handleChangeLanguage} style={{textAlign: 'center'}}>
      <option value="pt">Português</option>
      <option value="en">English<Flag
          countryCode='US'
          svg
          style={{
            marginRight: '8px',
          }}
        /></option>
    </select>

    // <Form.Select aria-label="Linguas"
    // onChange={handleChangeLanguage} required>
    //  <option value="pt">PT</option>
    //  <option value="en">EN</option>
    // </Form.Select>
  );
}