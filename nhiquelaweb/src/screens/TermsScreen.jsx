import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import './PrivacyPolicy.css';

export default function TermsScreen() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="privacy-container mt-4 mb-5">
      <Helmet>
        <title>Termos e Condições | Nhiquela</title>
      </Helmet>
      
      <div className="privacy-card">
        <div style={{ padding: '40px 50px' }}>
          <div className="privacy-header">
            <h1 className="privacy-title">Termos e Condições</h1>
            <button className="privacy-download-btn" onClick={handlePrint} title="Imprimir ou Guardar como PDF">
              <i className="fas fa-file-pdf"></i> Download PDF
            </button>
          </div>

          <h5 className="privacy-section-title">Objecto</h5>
          <p className="privacy-text">
            O presente documento (de ora em diante, simplesmente "Termos e Condições") regula os termos e as condições gerais de utilização da plataforma que acaba de aceder com base do regime jurídico da Constituição da República de Moçambique, propriedade da NHIQUELA SERVIÇOS & CONSULTORIA, SU, LDA, assim como os termos e as condições de compra e venda dos produtos comercializados através da respectiva loja online, de ora em diante.
          </p>

          <h5 className="privacy-section-title">Regime Jurídico</h5>
          <p className="privacy-text">
            As presentes cláusulas compromissórias abaixo, fazem parte do presente regime jurídico intrínseco da presente plataforma de venda on-line, visando transmitir a transparência com o consumidor, garantir mais segurança e confiabilidade na relação entre as partes. O regime jurídico desta plataforma de venda on-line será a Lei de Transacções Electrónicas (Lei n°3/2017 de 9 de Janeiro) e Lei de Defesa do Consumidor (Lei n° 22/2009 de 28 de Setembro).
          </p>

          <h5 className="privacy-section-title">(Domicílio do provedor intermediário de serviços)</h5>
          <p className="privacy-text">
            As operações inerentes ao presente regime jurídico, o fornecedor intermediário têm o seu domicílio profissional sita na Rua de Malhangalene, Bairro de Malhangalene n° 11, 3° andar, Kampfumu, Maputo Cidade.
          </p>

          <h5 className="privacy-section-title">(Comunicação de mensagens de dados)</h5>
          <p className="privacy-text">
            Nas relações entre o remetente e o destinatário de uma mensagem electrónica, não se nega validade ou eficácia a uma declaração de vontade ou outra declaração pelo facto de a declaração ter sido feita por uma mensagem electrónica.
          </p>

          <h5 className="privacy-section-title">(Deveres do provedor intermediário de serviços)</h5>
          <ul className="privacy-list">
            <li>1. O fornecedor intermediário de serviços é responsável por garantir o acesso e assegurar a comunicação de informação transmitida pelos utilizadores a ele vinculados, através de uma rede do presente sistema de comunicação on-line.</li>
            <li>2. O fornecedor intermediário deve manter em sigilo e confidencia todas as comunicações de informação transmitidas pelos utilizadores a si vinculados, não podendo divulgar, fornecer ou utilizar em prejuízo dos utilizadores;</li>
            <li>3. Deve manter a integridade da informação que recebe e transmitir na sua qualidade de provedor intermediário;</li>
            <li>4. Evitar a remoção ou desactivação do acesso a informação armazenada;</li>
            <li>5. Responder pelos danos e prejuízos causados aos utilizadores, no âmbito do dever de sigilo e protecção de dados e informação destes;</li>
            <li>6. Proceder segundo as regras de boa-fé, sob pena de responder pelos danos que culposamente possa causar à outra parte.</li>
            <li>7. Entregar o bem ou prestar serviço até 7 dias, a contar do dia seguinte, àquele em que o comprador o transmitiu.</li>
            <li>8. Em caso de incumprimento do contrato pelo vendedor, devido a indisponibilidade do bem ou serviço encomendado, deve informar o facto ao comprador e reembolsar o montante que tenha pago, no prazo máximo de 10 dias a contar da data do conhecimento daquela indisponibilidade;</li>
            <li>9. O fornecedor intermediário não esta sujeito à obrigação geral de monitorar a informação que transmita ou armazene, nem de procurar factos ou circunstâncias indicativas de actividade ilegal;</li>
          </ul>

          <h5 className="privacy-section-title">(Direitos do Fornecedor Intermediário de Serviços)</h5>
          <ul className="privacy-list">
            <li>1. Receber pagamento devido pelos serviços fornecidos ao consumidor;</li>
            <li>2. Solicitar esclarecimento ao consumidor de certos factos menos claros;</li>
            <li>3. Se escusar de qualquer responsabilidade ligada ao defeito do produto fornecido, se tiver previamente procedido a informações devidas ao consumidor;</li>
            <li>4. Se escusar de qualquer responsabilidade findo o prazo de denuncia pelo consumidor, previsto no ponto do presente regime jurídico;</li>
            <li>5. Se escusar de responsabilidade por falta de informação, informação insuficiente, ilegível ou ambígua qua comprometa a utilização adequada do bem ou do serviço, se o consumidor não exercer o direito de retractação do contrato relativo à sua aquisição ou prestação, no prazo de sete dias úteis a contar da data de recepção do bem ou da data de celebração do contrato de prestação de serviços;</li>
            <li>6. Se escusar da responsabilidade quando não tenha colocado o produto no mercado; embora tenha colocado o produto no mercado, o defeito era inexistente; ou a culpa pelo defeito seja exclusivamente do consumidor ou terceiro.</li>
          </ul>

          <h5 className="privacy-section-title">(Direitos do Consumidor)</h5>
          <p className="privacy-text">São Direitos do Fornecido ou Consumidor:</p>
          <ul className="privacy-list">
            <li><b>1. Qualidade dos bens e serviços.</b><br/>Os bens e serviços destinados ao consumo devem ser aptos a satisfazer os fins a que se destinam e produzir os efeitos que se lhes atribuem segundo as normas legalmente estabelecidas ou, na falta delas, de modo adequado as legitimas expectativas do consumidor.</li>
            <li><b>2. Informação para o consumo</b><br/>O intermediário de bens ou prestador de serviços deve, tanto nas negociações, como na celebração de um contrato, informar de forma clara, objectiva e adequada ao consumidor, nomeadamente, sobre características, composição e preço do bem ou serviço, bem como sobre o período de vigência do contrato, garantias, prazos de entrega e assistência após o negócio jurídico.</li>
            <li><b>3. Protecção contra a publicidade enganosa e abusiva.</b><br/>É enganosa qualquer modalidade de informação ou comunicação de carácter publicitário, inteira ou parcialmente falsa ou, por qualquer outro modo, mesmo por omissão, capaz de induzir ao erro o consumidor a respeito da natureza, características, qualidade, quantidade, propriedades, origem, preço e qualquer outros dados sobre produtos e serviços.<br/>Não é enganosa a publicidade que de tal forma, que o consumidor, fácil e imediatamente, a identifique como tal.<br/>O consumidor a quem seja fornecida a coisa com defeito, salvo se dele tivesse sido previamente informado e esclarecido antes da celebração do contrato, pode exigir independentemente de culpa do fornecedor do bem, a reparação da coisa ou a sua substituição, a redução do preço ou a resolução do contrato.<br/>O consumidor deve denunciar o defeito no prazo de 30 dias, caso se trate de bem móvel, ou de um ano se se tratar de bem imóvel, após o seu conhecimento e, dentro dos prazos de garantia nunca inferior a 1 ano para bens móveis não consumíveis e nunca inferior a 5 anos para bens imóveis, comprados por contrato e / ou factura.<br/>Os direitos conferidos ao consumidor nos termos do parágrafo acima caducam se o consumidor não tenha feito a denúncia ou decorridos sobre esta seis meses, não se contando, para o efeito, o tempo despendido com as operações de reparação.<br/>O consumidor será tratado com urbanidade na cobrança das dívidas.</li>
          </ul>

          <h5 className="privacy-section-title">(Dever do consumidor)</h5>       
          <ul className="privacy-list">
            <li>1. Pagar pontualmente o fornecedor intermediário pelo serviço de fornecimento prestado;</li>
            <li>2. Disponibilizar os locais, as instalações e os equipamentos necessários, que sejam de sua responsabilidade, conforme a natureza dos serviços a serem prestados, para viabilizar a execução das actividades do prestador;</li>
            <li>3. Dirigir a execução das actividades do prestador, observadas suas possibilidades normais, os limites contratuais, os usos da praça e a legislação aplicável;</li>
            <li>4. Conferir ao prestador de serviços, desde que por este solicitado, atestado de conclusão dos serviços ou outro documento equivalente; e</li>
            <li>5. Verificar se os serviços foram prestados nos termos previstos no contrato que lhes deu causa, sob pena de não poder responsabilizar o prestador de serviços.</li>
          </ul>

          <h5 className="privacy-section-title">(Garantias)</h5>       
          <ul className="privacy-list">
            <li>1. O prazo de garantia de bens móveis não consumíveis será garantido o seu bom estado e o seu funcionamento por período nunca inferior a um ano.</li>
            <li>2. O decurso do prazo de garantia suspende-se durante o período de tempo em que o consumidor se achar privado do uso dos bens em virtude das operações de reparação resultantes de defeitos originários.</li>
          </ul>

          <h5 className="privacy-section-title">(Sigilo Profissional)</h5>       
          <p className="privacy-text">
            As partes obrigam-se após a respectiva adesão do contrato, a guardar sigilo e não utilizar para si ou para qualquer outra pessoa, singular ou colectiva, quaisquer dados ou informações relativas a negócios, produtos, clientes e estratégias de procedimentos que tiver tido acesso ou conhecimento durante a execução do presente contrato de fornecimento. Abster-se de utilizar ou passar para terceiro dados ou informação enviada ou destinada aos utilizadores a ele vinculados, salvo por decisão judicial.
          </p>

          <h5 className="privacy-section-title">(Resolução de litígio)</h5>       
          <p className="privacy-text">
            Para a resolução de qualquer conflito ou litígio que surgir da execução do presente contrato as partes se comprometem a resolver em primeiro lugar de forma amigável, e em caso se impossibilidade de se alcançar um determinado acordo as partes atribuem a competência exclusiva ao Tribunal judicial da Cidade de Maputo.
          </p>

        </div>
      </div>
    </div>
  );
}
