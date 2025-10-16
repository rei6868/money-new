const AUTH_STORAGE_KEY = 'finance-app-authenticated';

const visitAuthenticatedDashboard = () =>
  cy.visit('/', {
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

describe('Responsive left menu experience', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('expands and collapses cleanly on desktop without overlap', () => {
    cy.viewport(1440, 900);
    visitAuthenticatedDashboard();

    getSidebar().should('be.visible');
    cy.get('[data-testid="app-root"]').should('have.attr', 'data-theme', 'light');

    getSidebar().invoke('outerWidth').should('be.within', 250, 320);
    assertNoSidebarOverlap();

    cy.get('[data-testid="sidebar-item-overview"]').should('be.visible');

    cy.get('[data-testid="sidebar-collapse-button"]').click();
    getSidebar().invoke('outerWidth').should('be.within', 80, 140);
    cy.get('[data-testid="sidebar-item-overview"]').should('be.visible');

    cy.get('[data-testid="sidebar-collapse-button"]').click();
    getSidebar().invoke('outerWidth').should('be.within', 250, 320);
    assertNoSidebarOverlap();
  });

  it('retains structure across iPad orientations', () => {
    cy.viewport(1024, 768);
    visitAuthenticatedDashboard();

    getSidebar().should('be.visible');
    cy.get('[data-testid="sidebar-toggle"]').should('not.be.visible');
    assertNoSidebarOverlap();

    cy.get('[data-testid="sidebar-item-geo"]').click();
    cy.location('pathname').should('eq', '/geo-information');
    assertNoSidebarOverlap();

    cy.viewport(768, 1024);
    cy.wait(150);
    assertNoSidebarOverlap();

    cy.get('[data-testid="sidebar-item-inventory"]').click();
    cy.location('pathname').should('eq', '/inventory');
    assertNoSidebarOverlap();
  });

  it('slides in on mobile and closes after navigation', () => {
    cy.viewport(390, 844);
    visitAuthenticatedDashboard();

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

    cy.get('[data-testid="sidebar-backdrop"]').should('exist');
    cy.get('[data-testid="sidebar-item-users"]').click();
    cy.location('pathname').should('eq', '/users');

    getSidebar().should(($sidebar) => {
      const transform = getComputedStyle($sidebar[0]).transform;
      const isClosed = transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
      expect(isClosed, 'sidebar closes after navigation on mobile').to.be.true;
    });
  });

  it('toggles between light and dark appearances', () => {
    cy.viewport(1440, 900);
    visitAuthenticatedDashboard();

    cy.get('[data-testid="app-root"]').should('have.attr', 'data-theme', 'light');
    cy.get('[data-testid="sidebar-theme-toggle"]').click();
    cy.get('[data-testid="app-root"]').should('have.attr', 'data-theme', 'dark');
    cy.get('[data-testid="sidebar-theme-toggle"]').click();
    cy.get('[data-testid="app-root"]').should('have.attr', 'data-theme', 'light');
  });

  it('navigates to each placeholder route without overlapping layout', () => {
    cy.viewport(1440, 900);
    visitAuthenticatedDashboard();

    const routes = [
      { testId: 'sidebar-item-dashboard', path: '/dashboard' },
      { testId: 'sidebar-item-overview', path: '/overview' },
      { testId: 'sidebar-item-geo', path: '/geo-information' },
      { testId: 'sidebar-item-hub', path: '/hub' },
      { testId: 'sidebar-item-users', path: '/users' },
      { testId: 'sidebar-item-product', path: '/product' },
      { testId: 'sidebar-item-orders', path: '/orders' },
      { testId: 'sidebar-item-inventory', path: '/inventory' },
      { testId: 'sidebar-item-invoice', path: '/invoice' },
      { testId: 'sidebar-item-attendance', path: '/attendance' },
      { testId: 'sidebar-item-settings', path: '/settings' },
    ];

    cy.wrap(routes).each((route) => {
      cy.get(`[data-testid="${route.testId}"]`).click();
      cy.location('pathname').should('eq', route.path);
      assertNoSidebarOverlap();
    });
  });
});
