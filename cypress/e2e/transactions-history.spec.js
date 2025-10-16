describe('Transactions History Page', () => {
  const authenticate = (win) => {
    win.localStorage.setItem('finance-app-authenticated', 'true');
  };

  const visitPage = () => {
    cy.visit('/transactions-history', {
      onBeforeLoad: authenticate,
    });
  };

  beforeEach(() => {
    visitPage();
    cy.get('[data-testid="transactions-table"]', { timeout: 15000 });
  });

  it('loads columns and rows from the API', () => {
    cy.get('[data-testid="transactions-table"] thead th').should('have.length.greaterThan', 5);
    cy.get('[data-testid="transactions-table"] tbody tr').should('have.length.greaterThan', 0);
  });

  it('searches transactions and supports clear/restore controls', () => {
    cy.get('[data-testid="transactions-search-input"]').type('groceries{enter}');
    cy.get('[data-testid="transactions-search-clear"]').should('exist').click();
    cy.get('[data-testid="transactions-search-restore"]').should('exist').click();
    cy.get('[data-testid="transactions-search-input"]').should('have.value', 'groceries');
  });

  it('opens filter modal and applies filters', () => {
    cy.get('[data-testid="transactions-filter-button"]').click();
    cy.get('[data-testid="transactions-filter-modal"]').should('exist');
    cy.get('[data-testid="transactions-filter-person"]').type('person_01');
    cy.get('[data-testid="transactions-filter-apply"]').click();
    cy.get('[data-testid="transactions-filter-modal"]').should('not.exist');
  });

  it('selects rows and shows total bar', () => {
    cy.get('[data-testid="transactions-table"] tbody tr')
      .first()
      .find('input[type="checkbox"]')
      .check({ force: true });
    cy.get('[data-testid="transactions-table"] tbody tr')
      .eq(1)
      .find('input[type="checkbox"]')
      .check({ force: true });
    cy.get('[data-testid="transactions-selection-total"]').should('exist');
  });

  it('opens the column customizer and toggles a column', () => {
    cy.get('[data-testid="transactions-column-customizer-toggle"]').click();
    cy.get('[data-testid="transactions-column-panel"]').should('have.attr', 'data-open', 'true');
    cy.get('[data-testid^="column-toggle-"]').first().should('be.disabled');
    cy.get('[data-testid="transactions-column-reset"]').click();
    cy.get('[data-testid="transactions-column-customizer-toggle"]').click();
  });
});
