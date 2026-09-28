describe('Nhiquela Import - E2E Testing (MVP)', () => {
  beforeEach(() => {
    // Intercetar API calls (Mocking)
    cy.intercept('GET', '/api/import/requests', {
      statusCode: 200,
      body: [
        { id: 'NQ-IMP-001', customer: 'João Silva', product: 'Máquina de Gelo 50kg', origin: 'China', status: 'REQUESTED' }
      ]
    }).as('getRequests');

    cy.intercept('POST', '/api/import/requests', {
      statusCode: 201,
      body: {
        id: 'NQ-IMP-002',
        status: 'REQUESTED'
      }
    }).as('createRequest');
  });

  it('Deve mostrar o banner no HomeScreen e redireccionar para a Área de Importação', () => {
    cy.visit('/shop');
    
    // Verifica se o Banner existe
    cy.contains('Nhiquela Import').should('be.visible');
    cy.contains('Começar a Importar').click();

    // Deve redireccionar para a página de importação do cliente
    cy.url().should('include', '/shop/import');
  });

  it('O cliente deve conseguir preencher o formulário de pedido de importação', () => {
    cy.visit('/shop/import');

    cy.contains('Pedir Produto').should('be.visible');

    // Preencher formulário
    cy.get('input[placeholder="Ex: Máquina de fazer gelo 50kg/dia"]').type('Portátil Gaming');
    cy.get('input[type="number"]').clear().type('2');
    cy.get('textarea').type('Portátil com RTX 4070 e 32GB RAM.');
    
    // Seleccionar origem
    cy.get('select').select('China');

    cy.contains('Solicitar Cotação').click();

    // Num cenário real validamos o trigger da API ou o mock
    // cy.wait('@createRequest');
  });

  it('Deve mostrar as importações do cliente na Tab "Minhas Importações"', () => {
    cy.visit('/shop/import');
    
    // Clicar na Tab "Minhas Importações"
    cy.contains('Minhas Importações').click();

    // Validar se o dummy data (que simula a API real) aparece
    cy.contains('NQ-IMP-001').should('be.visible');
    cy.contains('Máquina de Gelo 50kg').should('be.visible');
    cy.contains('Em trânsito').should('be.visible');
  });

  it('O Administrador deve ver as estatísticas no Admin Dashboard', () => {
    cy.visit('/admin/import');
    
    cy.contains('Gestão centralizada de importações').should('be.visible');
    
    // Validar Cards de estatísticas
    cy.contains('Pedidos Sourcing').should('be.visible');
    cy.contains('Cotações Pend.').should('be.visible');
    cy.contains('Ordens Pagas').should('be.visible');
    cy.contains('Em Trânsito').should('be.visible');

    // Tabela
    cy.contains('Pedidos Recentes').should('be.visible');
    cy.contains('NQ-IMP-001').should('be.visible');
  });
});
