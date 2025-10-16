const AUTH_STORAGE_KEY = 'finance-app-authenticated';

const visitDashboard = () =>
  cy.visit('/dashboard', {
    onBeforeLoad(win) {
      win.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    },
  });

const getSidebar = () => cy.get('[data-testid="sidebar"]');
const getLayout = () => cy.get('[data-testid="layout-content"]');

const assertNoSidebarOverlap = () => {
  getSidebar().then(($sidebar) => {
    const sidebarRect = $sidebar[0].getBoundingClientRect();
    getLayout().then(($content) => {
      const contentRect = $content[0].getBoundingClientRect();
      expect(sidebarRect.right, 'sidebar right edge').to.be.lte(contentRect.left + 1);
    });
  });
};

const PRIMARY_ROUTES = [
  { testId: 'sidebar-item-dashboard', path: '/dashboard' },
  { testId: 'sidebar-item-transactions', path: '/transactions' },
  { testId: 'sidebar-item-accounts', path: '/accounts' },
  { testId: 'sidebar-item-people', path: '/people' },
  { testId: 'sidebar-item-reports', path: '/reports' },
  { testId: 'sidebar-item-settings', path: '/settings' },
];

describe('Responsive menu sidebar', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('anchors the collapse control to the sidebar edge on desktop', () => {
    cy.viewport(1440, 900);
    visitDashboard();

    getSidebar().should('be.visible');
    getLayout().should('be.visible');
    cy.get('[data-testid="sidebar-collapse-button"]').as('collapseControl');

    cy.get('@collapseControl').then(($button) => {
      const buttonRect = $button[0].getBoundingClientRect();
      getSidebar().then(($sidebar) => {
        const sidebarRect = $sidebar[0].getBoundingClientRect();
        expect(buttonRect.left, 'collapse button left edge').to.be.lessThan(sidebarRect.right);
        expect(buttonRect.right, 'collapse button right edge').to.be.greaterThan(sidebarRect.right);
      });
    });

    getSidebar().invoke('outerWidth').should('be.within', 250, 320);

    cy.get('@collapseControl').click();
    getSidebar().invoke('outerWidth').should('be.within', 80, 140);
    cy.get('@collapseControl').should('have.attr', 'aria-expanded', 'false');

    cy.get('@collapseControl').click();
    getSidebar().invoke('outerWidth').should('be.within', 250, 320);
    cy.get('@collapseControl').should('have.attr', 'aria-expanded', 'true');
  });

  it('remains interactive across iPad orientations', () => {
    cy.viewport(1024, 768);
    visitDashboard();

    getSidebar().should('be.visible');
    getLayout().should('be.visible');
    cy.get('[data-testid="sidebar-toggle"]').should('not.be.visible');

    cy.get('[data-testid="sidebar-item-accounts"]').click();
    cy.location('pathname').should('eq', '/accounts');
    assertNoSidebarOverlap();

    cy.viewport(768, 1024);
    cy.wait(150);
    cy.get('[data-testid="sidebar-toggle"]').click();
    getSidebar().should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      const isOpen = transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';
      expect(isOpen, 'sidebar open after portrait toggle').to.be.true;
    });

    cy.get('[data-testid="sidebar-item-reports"]').click();
    cy.location('pathname').should('eq', '/reports');
    assertNoSidebarOverlap();
  });

  it('slides in on mobile and closes after navigation', () => {
    cy.viewport(390, 844);
    visitDashboard();

    getSidebar().should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      expect(transform, 'sidebar starts hidden for mobile').to.not.equal('none');
    });

    cy.get('[data-testid="sidebar-toggle"]').should('be.visible').click();

    getSidebar().should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      const isOpen = transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';
      expect(isOpen, 'sidebar slides into view').to.be.true;
    });

    cy.get('[data-testid="sidebar-item-people"]').click();
    cy.location('pathname').should('eq', '/people');

    getSidebar().should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      const isClosed = transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
      expect(isClosed, 'sidebar closes after navigation on mobile').to.be.true;
    });
  });

  it('toggles between light and dark appearances', () => {
    cy.viewport(1440, 900);
    visitDashboard();

    getLayout().should('be.visible');
    cy.get('[data-testid="app-root"]').should('have.attr', 'data-theme', 'light');
    cy.get('[data-testid="sidebar-theme-toggle"]').click();
    cy.get('[data-testid="app-root"]').should('have.attr', 'data-theme', 'dark');
    cy.get('[data-testid="sidebar-theme-toggle"]').click();
    cy.get('[data-testid="app-root"]').should('have.attr', 'data-theme', 'light');
  });

  it('navigates to each primary route without breaking layout', () => {
    cy.viewport(1440, 900);
    visitDashboard();

    getLayout().should('be.visible');
    cy.wrap(PRIMARY_ROUTES).each((route) => {
      cy.get(`[data-testid="${route.testId}"]`).click();
      cy.location('pathname').should('eq', route.path);
      assertNoSidebarOverlap();
    });
  });
});
