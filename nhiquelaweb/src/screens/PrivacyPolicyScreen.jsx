import React, { useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import { Helmet } from 'react-helmet-async';

export default function PrivacyPolicyScreen() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mt-4 mb-4">
      <Helmet>
        <title>Política de Privacidade</title>
      </Helmet>

      <Card>
        <Card.Body style={{ padding: '40px' }}>
          <h4 className='howitworks link'><b>Política de Privacidade</b></h4>
          <br />

          <h5 className='howitworks'><b>Objeto</b></h5>
          <p>
            A Nhiquela Serviços & Consultoria, SU, LDA compromete-se a proteger a privacidade dos seus usuários.
            Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações pessoais dos usuários do nosso aplicativo.
          </p>

          <h5 className='howitworks'><b>1. Informações Coletadas</b></h5>
          <p>Podemos coletar as seguintes informações pessoais:</p>
          <ul>
            <li>Nome completo</li>
            <li>Endereço de e-mail</li>
            <li>Número de telefone</li>
            <li>Endereço físico</li>
            <li>Dados de localização</li>
            <li>Informações de pagamento</li>
            <li>Outras informações relevantes para a prestação dos nossos serviços</li>
          </ul>

          <h5 className='howitworks'><b>2. Uso das Informações</b></h5>
          <p>As informações coletadas são utilizadas para:</p>
          <ul>
            <li>Fornecer e gerenciar nossos serviços</li>
            <li>Processar transações</li>
            <li>Melhorar a experiência do usuário</li>
            <li>Enviar comunicações promocionais, caso o usuário tenha consentido</li>
            <li>Cumprir obrigações legais e regulatórias</li>
          </ul>

          <h5 className='howitworks'><b>3. Compartilhamento de Informações</b></h5>
          <p>Não compartilhamos informações pessoais com terceiros, exceto:</p>
          <ul>
            <li>Quando necessário para a prestação dos nossos serviços</li>
            <li>Para cumprir obrigações legais</li>
            <li>Com consentimento prévio do usuário</li>
          </ul>

          <h5 className='howitworks'><b>4. Segurança das Informações</b></h5>
          <p>Implementamos medidas de segurança para proteger as informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.</p>

          <h5 className='howitworks'><b>5. Direitos dos Usuários</b></h5>
          <p>Os usuários têm o direito de:</p>
          <ul>
            <li>Acessar suas informações pessoais</li>
            <li>Corrigir informações incorretas ou desatualizadas</li>
            <li>Solicitar a exclusão de suas informações pessoais</li>
            <li>Retirar o consentimento para o processamento de suas informações</li>
          </ul>

          <h5 className='howitworks'><b>6. Retenção de Dados</b></h5>
          <p>Reteremos as informações pessoais pelo tempo necessário para cumprir os propósitos descritos nesta Política de Privacidade, a menos que um período de retenção mais longo seja exigido ou permitido por lei.</p>

          <h5 className='howitworks'><b>7. Alterações nesta Política</b></h5>
          <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos os usuários sobre quaisquer alterações significativas através do nosso aplicativo ou outros meios apropriados.</p>

          <h5 className='howitworks'><b>8. Contato</b></h5>
          <p>Se você tiver dúvidas ou preocupações sobre esta Política de Privacidade, entre em contato conosco:</p>
          <ul>
            <li><b>Endereço:</b> Rua de Malhangalene, Bairro de Malhangalene n° 11, 3° andar, Kampfumu, Maputo Cidade</li>
            <li><b>E-mail:</b> nhiquelaservicosconsultoria@gmail.com</li>
            <li><b>Telefone:</b> 853600036</li>
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
}
