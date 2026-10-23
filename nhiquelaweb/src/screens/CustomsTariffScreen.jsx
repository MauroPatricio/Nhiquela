import React from 'react';
import { Container, Breadcrumb } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import CustomsTariffCalculator from '../components/CustomsTariffCalculator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function CustomsTariffScreen() {
  const navigate = useNavigate();

  const handleApplyToRequest = (data) => {
    // Redireciona para /shop/import com os dados da simulação
    navigate('/shop/import', { state: { prefill: data } });
  };

  return (
    <div className="bg-light min-vh-100 py-3 py-md-4">
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Breadcrumb className="mb-0 small">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/shop' }}>Início</Breadcrumb.Item>
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/shop/import' }}>Importações</Breadcrumb.Item>
            <Breadcrumb.Item active>Simulador Pautal Oficial</Breadcrumb.Item>
          </Breadcrumb>

          <button 
            type="button" 
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            onClick={() => navigate('/shop/import')}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="me-1.5" />
            Voltar às Importações
          </button>
        </div>

        <div className="mb-3">
          <h4 className="fw-bold text-dark mb-1">
            Simulador de Direitos Pautais e Impostos de Importação
          </h4>
          <p className="text-muted small mb-0">
            Consulte a posição pautal e calcule o valor de CIF, Direitos Aduaneiros (DA), ICE e IVA para Moçambique.
          </p>
        </div>

        <CustomsTariffCalculator onApplyToRequest={handleApplyToRequest} />
      </Container>
    </div>
  );
}
