import React, { useEffect } from 'react'
import Card  from 'react-bootstrap/Card'
import { Helmet } from 'react-helmet-async'

export default function ReturnPolicy() {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div style={{ textAlign: 'left'}}>
       <Helmet>
        <title>Política de devolução</title>
      </Helmet>

      <head>
                <title>Política de devolução</title>
            </head>
            <Card>
                <Card.Body >

                <h4 className='howitworks link'><b>Política de Devolução e Reembolso</b></h4>
                <br/>
                <h5 className='howitworks'><b >CONDIÇÕES GERAIS</b></h5>
                <p>1.1. Para solicitar o reembolso, devolução ou troca do produto entre em contato através do e-mail: <b>geral@nhiquelashop.co.mz</b> com o assunto: <b>"Devolução, Reembolso ou Troca de produto".</b>
                  <br/>
                  1.2. Ao receber seu pedido confira se todos os produtos foram entregues em suas embalagens originais, devidamente lacradas. Se no momento da entrega do pedido constatar alguma irregularidade, como embalagem ou produto avariado, recuse o mesmo. Caso ocorra alguma irregularidade no recebimento, como embalagem e produto avariado, ou entrega de produto divergente do pedido, solicite a troca em até 24 horas após o recebimento.
                  <br/>
                  1.3. O produto deve estar em perfeitas condições de uso e em sua embalagem original devidamente lacrado, com exceção dos produtos com defeito de fabricação.
                  <br/>
                  1.4. As trocas dependem da disponibilidade dos nossos fornecedores.</p>
                <br/>

                <h5 className='howitworks '><b >2. REEMBOLSO</b></h5>
                <p>
                2.1. Caso tenha optado pela devolução do(s) valor(es) pago(s) em lugar da troca, você deverá enviar um e-mail até 24 horas para realizar a solicitação de reembolso no email acima indicado.
                <br/>
                2.2. Toda solicitação de troca ou devolução devem ser encaminhada por e-mail dentro dos prazos estabelecidos, não sendo aceitas solicitações fora dos prazos estipulados.
               
               </p>
                <br/>

                Em caso de dúvidas entre em contato através do e-mail: <b>geral@nhiquelashop.co.mz</b>

                </Card.Body>
                </Card>
      
    </div>
  )
}
