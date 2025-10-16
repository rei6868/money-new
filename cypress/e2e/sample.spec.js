describe('Finance app root page', () => {
  it('loads the application shell', () => {
    cy.visit('/');
    cy.get('[data-testid="app-root"]').should('be.visible');
  });
});
