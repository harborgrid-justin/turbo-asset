/// <reference types="cypress" />

describe('Dashboard Interactive Elements', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('should display the main dashboard page with all elements', () => {
    cy.dataCy('page-title').should('contain', 'Turbo Asset Management Dashboard');
    cy.dataCy('navigation').should('be.visible');
    cy.dataCy('asset-summary-widget').should('be.visible');
    cy.dataCy('financial-widget').should('be.visible');
    cy.dataCy('maintenance-widget').should('be.visible');
  });

  describe('Navigation', () => {
    it('should have all navigation links', () => {
      cy.dataCy('nav-dashboard').should('contain', 'Dashboard').and('be.visible');
      cy.dataCy('nav-assets').should('contain', 'Assets').and('be.visible');
      cy.dataCy('nav-reports').should('contain', 'Reports').and('be.visible');
      cy.dataCy('nav-settings').should('contain', 'Settings').and('be.visible');
    });

    it('should navigate to assets page when assets link is clicked', () => {
      cy.dataCy('nav-assets').click();
      cy.url().should('include', '/assets.html');
    });

    it('should highlight navigation links on hover', () => {
      cy.dataCy('nav-assets')
        .trigger('mouseover')
        .should('have.css', 'background-color', 'rgb(52, 152, 219)')
        .should('have.css', 'color', 'rgb(255, 255, 255)');
    });
  });

  describe('Dashboard Widgets', () => {
    it('should display correct data in asset summary widget', () => {
      cy.dataCy('total-assets').should('contain', '15,234');
      cy.dataCy('active-assets').should('contain', '14,891');
      cy.dataCy('maintenance-assets').should('contain', '343');
    });

    it('should display correct data in financial widget', () => {
      cy.dataCy('total-value').should('contain', '$2,450,000');
      cy.dataCy('monthly-costs').should('contain', '$125,000');
      cy.dataCy('savings').should('contain', '$18,500');
    });

    it('should display correct data in maintenance widget', () => {
      cy.dataCy('open-tickets').should('contain', '23');
      cy.dataCy('in-progress-tickets').should('contain', '7');
      cy.dataCy('completed-today').should('contain', '12');
    });

    it('should trigger actions when widget buttons are clicked', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('view-assets-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Navigate to assets page');

      cy.dataCy('view-financial-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Navigate to financial details');

      cy.dataCy('create-ticket-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Create new maintenance ticket');
    });
  });

  describe('Asset Search Form', () => {
    it('should have all form elements', () => {
      cy.dataCy('form-section-title').should('contain', 'Quick Asset Search');
      cy.dataCy('asset-type-select').should('be.visible');
      cy.dataCy('asset-location-input').should('be.visible');
      cy.dataCy('asset-status-select').should('be.visible');
      cy.dataCy('search-btn').should('contain', 'Search Assets');
      cy.dataCy('clear-btn').should('contain', 'Clear');
      cy.dataCy('advanced-search-btn').should('contain', 'Advanced Search');
    });

    it('should populate form fields correctly', () => {
      cy.dataCy('asset-type-select').select('equipment');
      cy.dataCy('asset-type-select').should('have.value', 'equipment');

      cy.dataCy('asset-location-input').type('Building A');
      cy.dataCy('asset-location-input').should('have.value', 'Building A');

      cy.dataCy('asset-status-select').select('active');
      cy.dataCy('asset-status-select').should('have.value', 'active');
    });

    it('should submit the form and show alert', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('asset-type-select').select('furniture');
      cy.dataCy('asset-location-input').type('Room 101');
      cy.dataCy('search-btn').click();

      cy.get('@alert').should('have.been.calledWith', 'Search functionality would be implemented here');
    });

    it('should clear the form when clear button is clicked', () => {
      cy.dataCy('asset-type-select').select('equipment');
      cy.dataCy('asset-location-input').type('Building A');
      cy.dataCy('asset-status-select').select('active');

      cy.dataCy('clear-btn').click();

      cy.dataCy('asset-type-select').should('have.value', '');
      cy.dataCy('asset-location-input').should('have.value', '');
      cy.dataCy('asset-status-select').should('have.value', '');
    });
  });

  describe('Assets Table', () => {
    it('should display table with correct headers', () => {
      cy.dataCy('table-header-id').should('contain', 'Asset ID');
      cy.dataCy('table-header-name').should('contain', 'Name');
      cy.dataCy('table-header-type').should('contain', 'Type');
      cy.dataCy('table-header-status').should('contain', 'Status');
      cy.dataCy('table-header-location').should('contain', 'Location');
      cy.dataCy('table-header-actions').should('contain', 'Actions');
    });

    it('should display asset data correctly', () => {
      cy.dataCy('asset-id-1').should('contain', 'AST-001');
      cy.dataCy('asset-name-1').should('contain', 'Conference Room Projector');
      cy.dataCy('asset-type-1').should('contain', 'Equipment');
      cy.dataCy('asset-status-1').should('contain', 'Active');
      cy.dataCy('asset-location-1').should('contain', 'Building A, Room 201');
    });

    it('should show different status indicators', () => {
      cy.dataCy('asset-status-1').find('.status-active').should('be.visible');
      cy.dataCy('asset-status-2').find('.status-pending').should('be.visible');
      cy.dataCy('asset-status-3').find('.status-active').should('be.visible');
    });

    it('should trigger edit action for assets', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('edit-asset-1').click();
      cy.get('@alert').should('have.been.calledWith', 'Edit functionality would be implemented here');
    });

    it('should trigger delete action with confirmation', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('delete-asset-1').click();
      cy.get('@alert').should('have.been.calledWith', 'Delete functionality would be implemented here');
    });

    it('should cancel delete when user declines confirmation', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('delete-asset-1').click();
      cy.get('@alert').should('not.have.been.called');
    });
  });

  describe('Modal Functionality', () => {
    it('should open modal when show modal button is clicked', () => {
      cy.dataCy('sample-modal').should('not.be.visible');
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('modal-title').should('contain', 'Asset Details');
    });

    it('should close modal when close button is clicked', () => {
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('modal-close').click();
      cy.dataCy('sample-modal').should('not.be.visible');
    });

    it('should close modal when cancel button is clicked', () => {
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('modal-cancel-btn').click();
      cy.dataCy('sample-modal').should('not.be.visible');
    });

    it('should close modal when clicking outside', () => {
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('sample-modal').click();
      cy.dataCy('sample-modal').should('not.be.visible');
    });
  });

  describe('Action Buttons', () => {
    it('should trigger appropriate actions for main buttons', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('add-asset-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Add new asset form would open');

      cy.dataCy('export-data-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Export data functionality');

      cy.dataCy('refresh-data-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Data refreshed');
    });
  });

  describe('Responsive Design', () => {
    it('should display correctly on mobile viewport', () => {
      cy.viewport(375, 667);
      cy.dataCy('page-title').should('be.visible');
      cy.dataCy('navigation').should('be.visible');
      cy.dataCy('dashboard-widgets').should('be.visible');
    });

    it('should display correctly on tablet viewport', () => {
      cy.viewport(768, 1024);
      cy.dataCy('page-title').should('be.visible');
      cy.dataCy('navigation').should('be.visible');
      cy.dataCy('dashboard-widgets').should('be.visible');
    });

    it('should display correctly on desktop viewport', () => {
      cy.viewport(1920, 1080);
      cy.dataCy('page-title').should('be.visible');
      cy.dataCy('navigation').should('be.visible');
      cy.dataCy('dashboard-widgets').should('be.visible');
    });
  });

  describe('Quick Actions Toolbar', () => {
    it('should display all quick action buttons', () => {
      cy.dataCy('quick-actions').should('be.visible');
      cy.dataCy('recent-items-btn').should('contain', 'Recent').and('be.visible');
      cy.dataCy('bookmarks-btn').should('contain', 'Bookmarks').and('be.visible');
      cy.dataCy('shortcuts-btn').should('contain', 'Shortcuts').and('be.visible');
      cy.dataCy('help-btn').should('contain', 'Help').and('be.visible');
      cy.dataCy('settings-toggle-btn').should('contain', 'Settings').and('be.visible');
    });

    it('should toggle active state when quick action buttons are clicked', () => {
      cy.dataCy('recent-items-btn').click();
      cy.dataCy('recent-items-btn').should('have.class', 'active');
      
      cy.dataCy('bookmarks-btn').click();
      cy.dataCy('bookmarks-btn').should('have.class', 'active');
      
      cy.dataCy('shortcuts-btn').click();
      cy.dataCy('shortcuts-btn').should('have.class', 'active');
    });

    it('should open settings panel when settings button is clicked', () => {
      cy.dataCy('settings-toggle-btn').click();
      cy.dataCy('settings-panel').should('have.class', 'active');
      cy.dataCy('settings-overlay').should('have.class', 'active');
    });
  });

  describe('Settings Panel', () => {
    beforeEach(() => {
      cy.dataCy('settings-toggle-btn').click();
    });

    it('should display all settings controls', () => {
      cy.dataCy('theme-light').should('be.visible');
      cy.dataCy('theme-dark').should('be.visible');
      cy.dataCy('theme-blue').should('be.visible');
      cy.dataCy('language-select').should('be.visible');
      cy.dataCy('notifications-enabled').should('be.visible');
      cy.dataCy('auto-save-enabled').should('be.visible');
    });

    it('should change theme when theme options are clicked', () => {
      cy.dataCy('theme-dark').click();
      cy.dataCy('theme-dark').should('have.class', 'selected');
      
      cy.dataCy('theme-blue').click();
      cy.dataCy('theme-blue').should('have.class', 'selected');
    });

    it('should close settings panel when close button is clicked', () => {
      cy.dataCy('close-settings-btn').click();
      cy.dataCy('settings-panel').should('not.have.class', 'active');
      cy.dataCy('settings-overlay').should('not.have.class', 'active');
    });

    it('should close settings panel when overlay is clicked', () => {
      cy.dataCy('settings-overlay').click();
      cy.dataCy('settings-panel').should('not.have.class', 'active');
      cy.dataCy('settings-overlay').should('not.have.class', 'active');
    });
  });

  describe('Advanced Search Panel', () => {
    it('should toggle advanced search panel', () => {
      cy.dataCy('advanced-search-btn').click();
      cy.dataCy('advanced-search-panel').should('have.class', 'active');
      
      cy.dataCy('advanced-search-btn').click();
      cy.dataCy('advanced-search-panel').should('not.have.class', 'active');
    });

    it('should have all advanced search controls', () => {
      cy.dataCy('advanced-search-btn').click();
      
      cy.dataCy('value-range-min').should('be.visible');
      cy.dataCy('value-range-max').should('be.visible');
      cy.dataCy('date-from-input').should('be.visible');
      cy.dataCy('date-to-input').should('be.visible');
      cy.dataCy('warranty-filter').should('be.visible');
      cy.dataCy('critical-filter').should('be.visible');
      cy.dataCy('apply-advanced-search').should('be.visible');
      cy.dataCy('reset-advanced-search').should('be.visible');
    });

    it('should update range slider values', () => {
      cy.dataCy('advanced-search-btn').click();
      
      cy.dataCy('value-range-min').invoke('val', 5000).trigger('input');
      cy.dataCy('value-min-display').should('contain', '$5,000');
      
      cy.dataCy('value-range-max').invoke('val', 50000).trigger('input');
      cy.dataCy('value-max-display').should('contain', '$50,000');
    });

    it('should reset advanced search form', () => {
      cy.dataCy('advanced-search-btn').click();
      
      cy.dataCy('warranty-filter').check();
      cy.dataCy('critical-filter').check();
      cy.dataCy('date-from-input').type('2023-01-01');
      
      cy.dataCy('reset-advanced-search').click();
      
      cy.dataCy('warranty-filter').should('not.be.checked');
      cy.dataCy('critical-filter').should('not.be.checked');
      cy.dataCy('date-from-input').should('have.value', '');
    });
  });

  describe('Expandable Sections', () => {
    it('should expand and collapse insights section', () => {
      cy.dataCy('insights-header').click();
      cy.dataCy('insights-content').should('have.class', 'expanded');
      cy.dataCy('insights-expand-icon').should('contain', '▲');
      
      cy.dataCy('insights-header').click();
      cy.dataCy('insights-content').should('not.have.class', 'expanded');
      cy.dataCy('insights-expand-icon').should('contain', '▼');
    });

    it('should expand and collapse reports section', () => {
      cy.dataCy('reports-header').click();
      cy.dataCy('reports-content').should('have.class', 'expanded');
      cy.dataCy('reports-expand-icon').should('contain', '▲');
      
      cy.dataCy('reports-header').click();
      cy.dataCy('reports-content').should('not.have.class', 'expanded');
      cy.dataCy('reports-expand-icon').should('contain', '▼');
    });

    it('should have all report buttons when expanded', () => {
      cy.dataCy('reports-header').click();
      
      cy.dataCy('monthly-report-btn').should('be.visible');
      cy.dataCy('maintenance-report-btn').should('be.visible');
      cy.dataCy('financial-report-btn').should('be.visible');
      cy.dataCy('compliance-report-btn').should('be.visible');
    });

    it('should have all insight buttons when expanded', () => {
      cy.dataCy('insights-header').click();
      
      cy.dataCy('view-cost-breakdown').should('be.visible');
      cy.dataCy('view-utilization-details').should('be.visible');
    });
  });

  describe('Notification System', () => {
    it('should show notifications when actions are performed', () => {
      // Test that notifications appear (they auto-dismiss after 3 seconds)
      cy.dataCy('advanced-search-btn').click();
      cy.dataCy('notification-container').children().should('have.length.at.least', 1);
      
      cy.dataCy('settings-toggle-btn').click();
      cy.dataCy('theme-dark').click();
      cy.dataCy('notification-container').children().should('have.length.at.least', 1);
    });

    it('should auto-dismiss notifications after timeout', () => {
      cy.dataCy('advanced-search-btn').click();
      cy.dataCy('notification-container').children().should('have.length.at.least', 1);
      
      // Wait for auto-dismiss (3 seconds + transition time)
      cy.wait(4000);
      cy.dataCy('notification-container').children().should('have.length', 0);
    });
  });
});