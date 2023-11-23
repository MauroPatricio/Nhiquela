import React from 'react';
import {createRoot} from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { StoreProvider } from './Store';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';



i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: require('./../src/locales/pt/translation.json') },
    en: { translation: require('./../src/locales/en/translation.json') },
  },
  lng: 'pt',
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
});

// const root = ReactDOM.createRoot(document.getElementById('root'));
const root =createRoot( document.getElementById('root'));

root.render(
  <React.StrictMode>
    <StoreProvider>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </StoreProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
