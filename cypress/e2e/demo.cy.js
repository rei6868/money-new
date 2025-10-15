describe('Demo Test', () => {
  it('Visit the homepage', () => {
    cy.visit('/')
    cy.contains('Welcome').should('exist')
  })
})
