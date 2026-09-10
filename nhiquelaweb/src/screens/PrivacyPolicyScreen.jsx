import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import './PrivacyPolicy.css';

export default function PrivacyPolicyScreen() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="privacy-container mt-4 mb-5">
      <Helmet>
        <title>Política de Privacidade | Nhiquela</title>
      </Helmet>

      <div className="privacy-card">
        <div style={{ padding: '40px 50px' }}>
          <div className="privacy-header">
            <h1 className="privacy-title">Política de Privacidade</h1>
            <button className="privacy-download-btn" onClick={handlePrint} title="Imprimir ou Guardar como PDF">
              <i className="fas fa-file-pdf"></i> Download PDF
            </button>
          </div>

          <h5 className="privacy-section-title">Objeto</h5>
          <p className="privacy-text">
            A Nhiquela Serviços & Consultoria, SU, LDA compromete-se a proteger a privacidade dos seus utilizadores. Esta Política de Privacidade descreve como recolhemos, utilizamos, armazenamos e protegemos os dados pessoais dos utilizadores da aplicação NhiquelaDriver.
          </p>

          <h5 className="privacy-section-title">1. Informações Coletadas</h5>
          <p className="privacy-text">
            Podemos recolher: nome completo, e-mail, telefone, endereço, dados de localização (em primeiro e segundo plano quando necessário para a prestação dos serviços), informações de pagamento e outros dados necessários à prestação dos serviços.
          </p>

          <h5 className="privacy-section-title">2. Uso das Informações</h5>
          <p className="privacy-text">
            As informações são utilizadas para fornecer e gerir os serviços, processar transações, melhorar a experiência do utilizador, enviar comunicações promocionais (com consentimento), cumprir obrigações legais e utilizar a localização em tempo real para navegação, acompanhamento das viagens, cálculo do tempo estimado de chegada (ETA) e execução dos serviços.
          </p>

          <h5 className="privacy-section-title">2.1 Utilização da Localização em Segundo Plano</h5>
          <p className="privacy-text">
            A NhiquelaDriver utiliza a localização do dispositivo em primeiro e segundo plano exclusivamente para permitir a prestação dos serviços. Quando o motorista estiver online ou a realizar um serviço ativo, a aplicação poderá continuar a aceder à localização mesmo quando estiver minimizada ou em segundo plano. Esta informação é utilizada para atualizar a localização do motorista em tempo real, permitir que o cliente acompanhe a chegada do motorista, calcular o ETA, atualizar automaticamente o estado da viagem ou entrega, melhorar a navegação até ao ponto de recolha e ao destino e garantir a segurança, qualidade e fiabilidade dos serviços. A localização em segundo plano é utilizada apenas enquanto o motorista estiver disponível para receber pedidos ou durante um serviço ativo. Quando o motorista ficar offline ou terminar o serviço, a recolha contínua da localização deixa de ser necessária.
          </p>

          <h5 className="privacy-section-title">3. Compartilhamento de Informações</h5>
          <p className="privacy-text">Não partilhamos informações pessoais com terceiros, exceto quando necessário para a prestação dos serviços, para cumprir obrigações legais ou com o consentimento do utilizador.</p>

          <h5 className="privacy-section-title">4. Segurança das Informações</h5>
          <p className="privacy-text">Implementamos medidas técnicas e organizacionais para proteger os dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição.</p>

          <h5 className="privacy-section-title">5. Direitos dos Utilizadores</h5>
          <p className="privacy-text">Os utilizadores podem aceder, corrigir, eliminar os seus dados, retirar o consentimento quando aplicável e exercer outros direitos previstos na legislação.</p>

          <h5 className="privacy-section-title">6. Retenção de Dados</h5>
          <p className="privacy-text">Os dados serão conservados apenas durante o período necessário para cumprir as finalidades descritas nesta política ou conforme exigido por lei.</p>

          <h5 className="privacy-section-title">7. Alterações</h5>
          <p className="privacy-text">Esta política poderá ser atualizada periodicamente. Alterações relevantes serão comunicadas através da aplicação ou por outros meios apropriados.</p>

          <h5 className="privacy-section-title">8. Contacto</h5>
          <ul className="privacy-list">
            <li><b>Endereço:</b> Rua de Malhangalene, Bairro de Malhangalene n.º 11, 3.º andar, Kampfumu, Maputo Cidade</li>
            <li><b>E-mail:</b> nhiquelaservicos@gmail.com</li>
            <li><b>Telefone:</b> +258 853600036</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
