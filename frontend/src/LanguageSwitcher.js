// LanguageSwitcher.js
import React, { useContext, useEffect, useReducer } from 'react';
import i18n from 'i18next';
import { Store } from './Store';


export default function LanguageSwitcher () {
  

  const { state, dispatch: ctxDispatch } = useContext(Store);

  const {changelng} = state;




  useEffect(()=>{
    handleChangeLanguage()
  },[changelng])

  let handleChangeLanguage = (event) => {
    let selectedLanguage = '';
    if(event){
       selectedLanguage = event.target.value;
       ctxDispatch({ type: 'CHANGE_LNG', payload: selectedLanguage });
    }

    i18n.changeLanguage(selectedLanguage);
  };

  return (
    <select onChange={handleChangeLanguage} style={{textAlign: 'center'}}>
      <option value="pt">Português</option>
      <option value="en">English</option>
    </select>

    // <Form.Select aria-label="Linguas"
    // onChange={handleChangeLanguage} required>
    //  <option value="pt">PT</option>
    //  <option value="en">EN</option>
    // </Form.Select>
  );
}