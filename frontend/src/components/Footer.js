import React, { useEffect } from 'react'
import { FaFacebookF } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";
import { Link } from 'react-router-dom';

import LanguageSwitcher from './../LanguageSwitcher';
import { useTranslation } from 'react-i18next';



export default function Footer() {
  const { t } = useTranslation();

  const handleFacebookClick = (e) => {
    e.preventDefault(); // Prevent the default navigation behavior

    const facebookUrl = "https://web.facebook.com/profile.php?id=61551226670311";
    const newTab = window.open(facebookUrl, '_blank');
    newTab.focus(); 
  };

  const handleYoutubeClick = (e) => {
    e.preventDefault(); // Prevent the default navigation behavior
    const youtubeUrl = "https://www.youtube.com/channel/UCgP2pdDdw5F_y40-nh4Vw9A";
    const newTab = window.open(youtubeUrl, '_blank');
    newTab.focus(); 
  };

  const handleTiktokClick = (e) => {
    e.preventDefault(); // Prevent the default navigation behavior
    const tiktokUrl = "https://www.tiktok.com/@nhiquelashopofficial";
    const newTab = window.open(tiktokUrl, '_blank');
    newTab.focus(); 
  };

  const handleInstagramClick = (e) => {
    e.preventDefault(); // Prevent the default navigation behavior
    const instagramUrl = "https://www.instagram.com/nhiquelashop/";
    const newTab = window.open(instagramUrl, '_blank');
    newTab.focus(); 
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
&nbsp;
    <footer
        className="text-center text-lg-start text-white"
        style={{backgroundColor: '#1c2331'}}
        >
  <section
           className="d-flex justify-content-between p-4"
           style={{backgroundColor: '#6351ce'}}
           >
    <div className="me-5">
      <span>{t('stayconnected')}</span>
    </div>

    <div>
      <a href="#" onClick={handleFacebookClick} className="text-white me-4">
        <i className="fab fa-facebook-f"></i>
      <FaFacebookF></FaFacebookF>
        </a>
      <a href="#" onClick={handleYoutubeClick} className="text-white me-4">
        <FaYoutube></FaYoutube>
      </a>
      <a href="#" onClick={handleTiktokClick} className="text-white me-4">
      <FaTiktok></FaTiktok>
        </a>
      <a href="#" onClick={handleInstagramClick} className="text-white me-4">
      <FaInstagram></FaInstagram>
      </a>
    <LanguageSwitcher />
    </div>
  </section>

  <section className="">
    <div className="container text-center text-md-start mt-5">
      <div className="row mt-3">
      <div className="col-md-3 col-lg-2 col-xl-2 mx-auto mb-4">
      <img style={{width: '12rem', height: '12rem', textAlign: 'center'}}
            src="nhiquelalogo.png" 
            alt="Nhiquela" ></img>   
        </div>
            <div className="col-md-3 col-lg-4 col-xl-3 mx-auto mb-4">
          <h6 className="text-uppercase fw-bold">Nhiquela Shop</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
          <p>
         {t('everythinginhands')} <br/>{t('wedeliveryourorder')}
          </p>
        </div>
   
        <div className="col-md-3 col-lg-2 col-xl-2 mx-auto mb-4">
          <h6 className="text-uppercase fw-bold">{t('importantlinks')}</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
       

          <p>
            <Link to="/help" className="text-white link-none">{t('howtobuy')}</Link>
          </p>
          <p>
            <Link to="/howtobeseller" className="text-white link-none">{t('howtobesupplier')}</Link>
          </p>
          <p>
            <Link to="/terms" className="text-white link-none">{t('termsandcondition')}</Link>
          </p>
          <p>
            <Link to="/returnpolicy" className="text-white link-none">{t('returnpolicy')}</Link>
          </p>
          
        </div>

        <div className="col-md-4 col-lg-3 col-xl-3 mx-auto mb-md-0 mb-4">
          <h6 className="text-uppercase fw-bold">{t('contacts')}</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
          <p>
           <i className="fas fa-print mr-3"></i> +258 853600036<br/>
           </p>
         <p><i className="fas fa-print mr-3"></i> +258 879300036<br/></p>
          <p><i className="fas fa-envelope mr-3"></i>geral@nhiquelashop.co.mz<br/></p>
          <p><i className="fas fa-home mr-3"></i> {t('mozambique')},{t('maputocity')}</p>

        </div>
      </div>
    </div>
  </section>

  <div
       className="text-center p-3"
       style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}

       >
    © 2023 {t('reservedrights')} {' '}
    {/* <a className="text-white" href="https://deliveryshop.herokuapp.com/">nhiquelashop.co.mz</a > */}
  </div>
  </footer>

    </>

  )
}
