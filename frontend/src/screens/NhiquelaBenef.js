import React, { useEffect } from 'react'
import Card  from 'react-bootstrap/Card';
import { Helmet } from 'react-helmet-async';

export default function NhiquelaBenef() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ textAlign: 'left'}}>
      
      <Helmet>
        <title>Benefícios de comprar na Nhiquela</title>
      </Helmet>

      <head>
                <title>Benefícios de comprar na Nhiquela</title>
            </head>
            <Card>
                <Card.Body >

                <h4 className='howitworks link'><b>Benefícios de comprar na Nhiquela</b></h4>
                <br/>
                <p> Comprar pela internet tornou-se um hábito e cada vez mais pessoas tem se adaptado a era digital e com principal enfoque ao comércio eletrônico. De pequenas a grandes marcas do mercado, o comércio eletrônico oferece uma série de produtos e vantagens para o consumidor. <br/>São muitos os motivos para se optar por fazer compras online, abaixo algumas destas vantagens que a Nhiquela Shop possui.
                </p>
                <h5 className='howitworks link'><b >Comodidade</b></h5>
                <p>
                Pela Nhiquela shop tens a possibilidade de fazer compras sem sair de onde esta economizando assim o seu tempo e dinheiro.
                </p>
                <br/>

                <h5 className='howitworks link'><b >Várias formas de pagamento</b></h5>
                <p>
                  Temos variadas formas de pagamentos como: Mpesa, e-Mola e BCI. Muitas vezes, as lojas físicas só possuem uma forma de pagamento restrita. O que dificulta muito a sua compra. 
               </p>
                <br/>

                <h5 className='howitworks link'><b >Opções diversas de produtos</b></h5>
                <p>
                  Possuimos um catálogo amplo de produtos onde o usuário tem a possibilidade de escolher livremente qual produto atende seu gosto, auxiliando assim, na competitividade e disputa de preços.
               </p>
                <br/>
               <h5 className='howitworks link'><b >Opinião de outros usuários</b></h5>
                <p>
                Na Nhiquela Shop tens a possibilidade de visualizar os comentários e opiniões de outros usuários sobre a venda ou produto, o que possibilita avaliar e comparar se os produtos oferecidos são realmente satisfatórios garantindo assim maior segurança e clareza na sua compra.
               </p>
               <br/>
               <h5 className='howitworks link'><b >Entregas</b></h5>
                <p>
                Possuimos entregadores de confiança e garantimos que a sua encomenda ou pedido chegue de forma rápida, fácil e segura.
               </p>
               <br/>
               <h5 className='howitworks link'><b >Acompanhamento de pedidos</b></h5>
                <p>
                 Pela nossa plataforma tens a possibilidade de acompanhar por etapas o processamento de seus pedidos por SMS's e/ou email's. Facilitando assim, a estimativa de tempo de chegada e seu posicionamento para a recepção do pedido.
               </p>
                </Card.Body>
                </Card>
      
    </div>
  )
}
