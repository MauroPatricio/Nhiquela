import React from 'react'
import { FaFacebookF } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";
import { Link } from 'react-router-dom';




export default function Footer() {

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
      <span>Fique conectado a nós nas seguintes redes sociais:</span>
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
          Tudo em suas mãos. <br/>Fazemos entrega de seus pedidos de forma rápida e fácil
          </p>
        </div>
   
        <div className="col-md-3 col-lg-2 col-xl-2 mx-auto mb-4">
          <h6 className="text-uppercase fw-bold">Outros links</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
          <p>
            <Link to="/help" className="text-white link-none">Como comprar produtos?</Link>
          </p>
          <p>
            <Link to="/howtobeseller" className="text-white link-none">Como tornar-se vendedor</Link>
          </p>
          <p>
            <Link to="/terms" className="text-white link-none">Termos de uso e condições</Link>
          </p>
        </div>

        <div className="col-md-4 col-lg-3 col-xl-3 mx-auto mb-md-0 mb-4">
          <h6 className="text-uppercase fw-bold">Contactos</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
          <p>
           <i className="fas fa-print mr-3"></i> +258 853600036<br/>
           </p>
         <p><i className="fas fa-print mr-3"></i> +258 879300036<br/></p>
          <p><i className="fas fa-envelope mr-3"></i> nhiquelaservicosconsultoria@gmail.com<br/></p>
          <p><i className="fas fa-home mr-3"></i> Moçambique, Maputo Cidade</p>

        </div>
      </div>
    </div>
  </section>

  <div
       className="text-center p-3"
       style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}

       >
    © 2023 Todos os direitos são reservados {' '}
    {/* <a className="text-white" href="https://deliveryshop.herokuapp.com/">nhiquelashop.co.mz</a > */}
  </div>
  </footer>

    </>

  )
}
