const AUTH_STORAGE_KEY = 'finance-app-authenticated';

const buildTransactions = (count = 42) =>
  Array.from({ length: count }).map((_, index) => {
    const day = String((index % 28) + 1).padStart(2, '0');
    const amountBase = 125.34 + index * 7.11;
    const feeBase = index % 3 === 0 ? 0.95 : index % 3 === 1 ? 1.45 : 0;
    const statusCycle = ['approved', 'pending', 'active', 'declined'];

    return {
      transaction_id: `txn_${1000 + index}`,
      account_id: `acct_${index % 4}`,
      person_id: `person_${(index % 5) + 1}`,
      type: index % 2 === 0 ? 'expense' : 'income',
      category_id: `cat_${index % 6}`,
      amount: amountBase.toFixed(2),
      fee: feeBase ? feeBase.toFixed(2) : null,
      occurred_on: `2025-02-${day}`,
      notes: `Automated test transaction ${index + 1}`,
      shop_id: index % 3 === 0 ? `shop_${index % 5}` : null,
      status: statusCycle[index % statusCycle.length],
      subscription_member_id: index % 4 === 0 ? `member_${index}` : null,
      linked_txn_id: index % 6 === 0 ? `link_${index}` : null,
      created_at: `2025-02-${day}T10:00:00.000Z`,
      updated_at: `2025-02-${day}T12:30:00.000Z`,
      cashback_movements: [],
    };
  });

describe('Transactions table scrollbody + sticky rows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.viewport(1100, 820);
    cy.intercept('GET', '/api/transactions', (req) => {
      req.reply({ statusCode: 200, body: buildTransactions() });
    }).as('loadTransactions');

    cy.visit('/transactions', {
      onBeforeLoad(win) {
        win.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      },
    });

    cy.wait('@loadTransactions');
  });

  it('keeps header and totals rows fixed while body scrolls', () => {
    cy.get('[data-testid="transactions-table-body"] tr').should('have.length.at.least', 20);

    cy.get('[data-testid="transactions-table-viewport"]').scrollTo('center', { ensureScrollable: false });

    cy.get('[data-testid="transactions-table-header"]').should(($thead) => {
      const viewport = $thead[0].closest('[data-testid="transactions-table-viewport"]');
      const headerRect = $thead[0].getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      expect(Math.abs(headerRect.top - viewportRect.top)).to.be.lte(2);
    });

    cy.get('[data-testid="transactions-table-viewport"]').scrollTo('bottom');

    cy.get('[data-testid="transactions-table-footer"]').should(($tfoot) => {
      const viewport = $tfoot[0].closest('[data-testid="transactions-table-viewport"]');
      const footerRect = $tfoot[0].getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      expect(Math.abs(footerRect.bottom - viewportRect.bottom)).to.be.lte(2);
    });

    cy.get('[data-testid="transactions-table-header"]').should(($thead) => {
      const viewport = $thead[0].closest('[data-testid="transactions-table-viewport"]');
      const headerRect = $thead[0].getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      expect(headerRect.bottom).to.be.gt(viewportRect.top);
    });
  });

  it('confines horizontal scrolling to the table viewport and keeps customize panel usable', () => {
    cy.window().its('scrollX').should('eq', 0);
    cy.window().its('scrollY').should('eq', 0);

    cy.get('[data-testid="transactions-table-viewport"]').should(($viewport) => {
      expect($viewport[0].scrollWidth).to.be.gt($viewport[0].clientWidth);
    });

    cy.get('[data-testid="transactions-table-viewport"]').scrollTo('right');
    cy.window().its('scrollX').should('eq', 0);

    cy.window().then((win) => {
      expect(win.document.body.scrollWidth).to.be.lte(win.innerWidth);
      expect(win.document.documentElement.scrollWidth).to.be.lte(win.innerWidth);
    });

    cy.contains('button', 'Customize').click();
    cy.get('aside[role="dialog"][aria-label="Customize table columns"]').should('have.attr', 'data-open', 'true');
    cy.get('aside[role="dialog"][aria-label="Customize table columns"]').should(($dialog) => {
      const rect = $dialog[0].getBoundingClientRect();
      expect(rect.left).to.be.gte(0);
      expect(rect.right).to.be.lte(Cypress.config('viewportWidth'));
      expect(rect.top).to.be.gte(0);
      expect(rect.bottom).to.be.lte(Cypress.config('viewportHeight'));
    });

    cy.get('aside[role="dialog"][aria-label="Customize table columns"]').within(() => {
      cy.contains('button', 'Done').click();
    });

    cy.get('aside[role="dialog"][aria-label="Customize table columns"]').should('have.attr', 'data-open', 'false');
  });

  it('keeps the layout constrained on narrow mobile widths', () => {
    cy.viewport(430, 780);
    cy.reload();
    cy.wait('@loadTransactions');

    cy.get('[data-testid="transactions-table-viewport"]').should(($viewport) => {
      expect($viewport[0].scrollWidth).to.be.gt($viewport[0].clientWidth);
    });

    cy.window().then((win) => {
      expect(win.document.body.scrollWidth).to.be.lte(win.innerWidth);
      expect(win.document.documentElement.scrollWidth).to.be.lte(win.innerWidth);
    });

    cy.contains('button', 'Customize').click();
    cy.get('aside[role="dialog"][aria-label="Customize table columns"]').should(($dialog) => {
      const rect = $dialog[0].getBoundingClientRect();
      expect(rect.left).to.be.gte(0);
      expect(rect.right).to.be.lte(Cypress.config('viewportWidth'));
      expect(rect.top).to.be.gte(0);
      expect(rect.bottom).to.be.lte(Cypress.config('viewportHeight'));
    });

    cy.get('aside[role="dialog"][aria-label="Customize table columns"]').within(() => {
      cy.contains('button', 'Done').click();
    });

    cy.get('aside[role="dialog"][aria-label="Customize table columns"]').should('have.attr', 'data-open', 'false');
  });
});
