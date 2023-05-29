import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FaFacebookF } from "react-icons/fa";
import { FaTwitter } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa";




export default function Footer() {
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
      <a href="" className="text-white me-4">
        <i className="fab fa-facebook-f"></i>
      <FaFacebookF></FaFacebookF>
        </a>
      <a href="" className="text-white me-4">
        <FaTwitter></FaTwitter>
      </a>
      <a href="" className="text-white me-4">
      <FaTiktok></FaTiktok>
        </a>
      <a href="" className="text-white me-4">
      <FaInstagram></FaInstagram>
      </a>
    </div>
  </section>

  <section className="">
    <div className="container text-center text-md-start mt-5">
      <div className="row mt-3">
        <div className="col-md-3 col-lg-4 col-xl-3 mx-auto mb-4">
          <h6 className="text-uppercase fw-bold">Delivery Shop</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
          <p>
          Tudo em suas mãos. De forma fácil e rápida num só clique
          </p>
        </div>
   
        <div className="col-md-3 col-lg-2 col-xl-2 mx-auto mb-4">
          <h6 className="text-uppercase fw-bold">Outros links</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
          <p>
            <a href="#!" className="text-white">Criar Conta</a>
          </p>
          <p>
            <a href="#!" className="text-white">Como tornar-se vendedor</a>
          </p>
          <p>
            <a href="#!" className="text-white">Termos de uso e condições</a>
          </p>
          <p>
            <a href="#!" className="text-white">Como podemos ajuda?</a>
          </p>
        </div>

        <div className="col-md-4 col-lg-3 col-xl-3 mx-auto mb-md-0 mb-4">
          <h6 className="text-uppercase fw-bold">Contactos</h6>
          <hr
              className="mb-4 mt-0 d-inline-block mx-auto"
              style={{backgroundColor: '#7c4dff', width: '60px', height: '2px'}}

              />
          <p><i className="fas fa-home mr-3"></i> Mocambique, Maputo cidade</p>
          <p><i className="fas fa-envelope mr-3"></i> deliveryshop@example.com</p>
          <p><i className="fas fa-phone mr-3"></i> +258 82 00 00 000<br/>
           <i className="fas fa-print mr-3"></i> +258 84 00 00 000<br/>
         <i className="fas fa-print mr-3"></i> +258 87 00 00 000</p>

        </div>
      </div>
    </div>
  </section>

  <div
       className="text-center p-3"
       style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}

       >
    © 2023 Todos os direitos são reservados: {' '}
    <a className="text-white" href="https://deliveryshop.herokuapp.com/">deliveryshop.herokuapp.com</a >
  </div>
  </footer>

    </>

  )
}
