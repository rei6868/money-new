const AUTH_STORAGE_KEY = 'finance-app-authenticated';

const visitAuthenticatedHome = () =>
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    },
  });

const assertNoSidebarOverlap = () => {
  cy.get('[data-testid="sidebar"]').then(($sidebar) => {
    const sidebarRect = $sidebar[0].getBoundingClientRect();
    cy.get('[data-testid="layout-content"]').then(($content) => {
      const contentRect = $content[0].getBoundingClientRect();
      expect(sidebarRect.right).to.be.lte(contentRect.left + 1);
    });
  });
};

describe('Responsive sidebar layout', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('keeps the sidebar stable on desktop viewports', () => {
    cy.viewport(1440, 900);
    visitAuthenticatedHome();

    cy.get('[data-testid="app-root"]').should('be.visible');
    cy.get('[data-testid="sidebar"]').should('be.visible');
    cy.get('[data-testid="sidebar"]')
      .invoke('outerWidth')
      .then((width) => {
        expect(width).to.be.greaterThan(220);
        expect(width).to.be.lessThan(320);
      });

    assertNoSidebarOverlap();
    cy.get('[data-testid="sidebar-link-dashboard"]').should('be.visible');

    cy.get('[data-testid="sidebar-collapse-button"]').click();
    cy.get('[data-testid="sidebar"]')
      .invoke('outerWidth')
      .then((width) => {
        expect(width).to.be.greaterThan(60);
        expect(width).to.be.lessThan(150);
      });

    cy.get('[data-testid="sidebar-collapse-button"]').click();
    cy.get('[data-testid="sidebar"]')
      .invoke('outerWidth')
      .then((width) => {
        expect(width).to.be.greaterThan(220);
      });
  });

  it('maintains visible navigation on iPad landscape', () => {
    cy.viewport(1024, 768);
    visitAuthenticatedHome();

    cy.get('[data-testid="sidebar"]').should('be.visible');
    cy.get('[data-testid="sidebar-toggle"]').should('not.be.visible');
    assertNoSidebarOverlap();
    cy.get('[data-testid="sidebar-link-reports"]').click();
    cy.location('pathname').should('eq', '/reports');
    assertNoSidebarOverlap();
  });

  it('keeps the sidebar fully accessible on iPad portrait', () => {
    cy.viewport(768, 1024);
    visitAuthenticatedHome();

    cy.get('[data-testid="sidebar"]').should('be.visible');
    assertNoSidebarOverlap();
    cy.get('[data-testid="sidebar-link-settings"]').click();
    cy.location('pathname').should('eq', '/settings');
    cy.get('[data-testid="sidebar"]').should('be.visible');
  });

  it('toggles the sidebar for iPhone viewports', () => {
    cy.viewport(390, 844);
    visitAuthenticatedHome();

    cy.get('[data-testid="sidebar"]').should('exist');
    cy.get('[data-testid="sidebar"]').should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      expect(transform, 'sidebar starts out hidden via transform').to.not.equal('none');
    });

    cy.get('[data-testid="sidebar-toggle"]').should('be.visible').click();
    cy.get('[data-testid="sidebar"]').should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      const isOpen = transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';
      expect(isOpen, 'sidebar slides into view for mobile').to.be.true;
    });
    cy.get('[data-testid="sidebar-backdrop"]').should('exist');

    cy.get('[data-testid="sidebar-link-accounts"]').click();
    cy.location('pathname').should('eq', '/accounts');
    cy.get('[data-testid="sidebar"]').should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      expect(transform, 'sidebar returns to hidden state on link navigation').to.not.equal('none');
    });
  });
});
