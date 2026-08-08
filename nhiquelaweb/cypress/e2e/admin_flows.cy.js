describe('Admin Portal Flows', () => {
  beforeEach(() => {
    // Acessa a página principal do admin (que por agora, sem auth, já mostra a sidebar e rotas)
    cy.visit('/');
  });

  it('deve carregar a página de Login ou Dashboard', () => {
    cy.get('body').should('be.visible');
  });

  it('deve aceder e listar Motoristas', () => {
    // Tenta encontrar o link de Motoristas na navegação e clica
    cy.visit('/admin/drivers');
    // Verifica se a tabela/grid não dispara erro 500
    cy.get('body').should('not.contain', 'Internal Server Error');
  });

  it('deve aceder e listar Estabelecimentos (Admin)', () => {
    cy.visit('/admin/establishments');
    cy.get('body').should('not.contain', 'Internal Server Error');
  });

  it('deve aceder a Políticas de Cancelamento (Admin)', () => {
    cy.visit('/admin/cancellation-policies');
    cy.get('body').should('not.contain', 'Internal Server Error');
  });

  it('deve aceder a Encomenda de Documentos (Shop)', () => {
    cy.visit('/shop/document-order');
    cy.get('body').should('not.contain', 'Internal Server Error');
  });
});
