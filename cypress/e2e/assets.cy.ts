/// <reference types="cypress" />

describe('Asset Management Interactive Elements', () => {
  beforeEach(() => {
    cy.visit('/assets.html');
  });

  it('should display the asset management page with all sections', () => {
    cy.dataCy('page-title').should('contain', 'Asset Management');
    cy.dataCy('navigation').should('be.visible');
    cy.dataCy('create-asset-form').should('be.visible');
    cy.dataCy('asset-filters').should('be.visible');
    cy.dataCy('assets-table').should('be.visible');
  });

  describe('Navigation', () => {
    it('should highlight the assets navigation link as active', () => {
      cy.dataCy('nav-assets')
        .should('have.class', 'active')
        .should('have.css', 'background-color', 'rgb(52, 152, 219)');
    });

    it('should navigate back to dashboard', () => {
      cy.dataCy('nav-dashboard').click();
      cy.url().should('include', '/index.html');
    });
  });

  describe('Create Asset Form', () => {
    it('should have all required form fields', () => {
      cy.dataCy('create-asset-title').should('contain', 'Create New Asset');
      cy.dataCy('asset-name-input').should('be.visible');
      cy.dataCy('asset-category-select').should('be.visible');
      cy.dataCy('asset-value-input').should('be.visible');
      cy.dataCy('asset-serial-input').should('be.visible');
      cy.dataCy('asset-location-select').should('be.visible');
      cy.dataCy('asset-condition-select').should('be.visible');
      cy.dataCy('asset-description-input').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.dataCy('submit-asset-btn').click();
      cy.dataCy('asset-name-input').should('be.invalid');
      cy.dataCy('asset-category-select').should('be.invalid');
      cy.dataCy('asset-location-select').should('be.invalid');
    });

    it('should populate and submit form correctly', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('asset-name-input').type('Test Equipment');
      cy.dataCy('asset-category-select').select('equipment');
      cy.dataCy('asset-value-input').type('1500.00');
      cy.dataCy('asset-serial-input').type('TEST-001-2024');
      cy.dataCy('asset-location-select').select('building-a');
      cy.dataCy('asset-condition-select').select('excellent');
      cy.dataCy('asset-description-input').type('This is a test asset for Cypress testing');

      // Check feature checkboxes
      cy.dataCy('feature-warranty').check();
      cy.dataCy('feature-maintenance').check();
      cy.dataCy('feature-critical').check();

      // Verify form values
      cy.dataCy('asset-name-input').should('have.value', 'Test Equipment');
      cy.dataCy('asset-category-select').should('have.value', 'equipment');
      cy.dataCy('asset-value-input').should('have.value', '1500.00');
      cy.dataCy('asset-serial-input').should('have.value', 'TEST-001-2024');
      cy.dataCy('asset-location-select').should('have.value', 'building-a');
      cy.dataCy('asset-condition-select').should('have.value', 'excellent');

      // Verify checkboxes
      cy.dataCy('feature-warranty').should('be.checked');
      cy.dataCy('feature-maintenance').should('be.checked');
      cy.dataCy('feature-critical').should('be.checked');
      cy.dataCy('feature-portable').should('not.be.checked');

      // Submit form
      cy.dataCy('submit-asset-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Asset created successfully!');
    });

    it('should reset form when reset button is clicked', () => {
      cy.dataCy('asset-name-input').type('Test Asset');
      cy.dataCy('asset-category-select').select('furniture');
      cy.dataCy('feature-warranty').check();

      cy.dataCy('reset-form-btn').click();

      cy.dataCy('asset-name-input').should('have.value', '');
      cy.dataCy('asset-category-select').should('have.value', '');
      cy.dataCy('feature-warranty').should('not.be.checked');
    });

    it('should save draft when save draft button is clicked', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('save-draft-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Draft saved!');
    });

    it('should handle numeric input validation', () => {
      cy.dataCy('asset-value-input').type('invalid-number').should('have.value', '');
      cy.dataCy('asset-value-input').type('999.99').should('have.value', '999.99');
    });
  });

  describe('Asset Filters', () => {
    it('should have all filter controls', () => {
      cy.dataCy('filter-search-input').should('be.visible');
      cy.dataCy('filter-category-select').should('be.visible');
      cy.dataCy('filter-status-select').should('be.visible');
      cy.dataCy('filter-location-select').should('be.visible');
      cy.dataCy('apply-filters-btn').should('be.visible');
      cy.dataCy('clear-filters-btn').should('be.visible');
    });

    it('should apply filters correctly', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('filter-search-input').type('projector');
      cy.dataCy('filter-category-select').select('equipment');
      cy.dataCy('filter-status-select').select('active');
      cy.dataCy('filter-location-select').select('building-a');

      cy.dataCy('apply-filters-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Filters applied!');
    });

    it('should clear all filters', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      // Set filters
      cy.dataCy('filter-search-input').type('test search');
      cy.dataCy('filter-category-select').select('furniture');
      cy.dataCy('filter-status-select').select('maintenance');

      // Clear filters
      cy.dataCy('clear-filters-btn').click();

      // Verify filters are cleared
      cy.dataCy('filter-search-input').should('have.value', '');
      cy.dataCy('filter-category-select').should('have.value', '');
      cy.dataCy('filter-status-select').should('have.value', '');

      cy.get('@alert').should('have.been.calledWith', 'Filters cleared!');
    });
  });

  describe('Assets Data Table', () => {
    it('should display table with correct structure', () => {
      cy.dataCy('assets-table').should('be.visible');
      cy.dataCy('table-header-select').should('be.visible');
      cy.dataCy('table-header-name').should('contain', 'Name');
      cy.dataCy('table-header-category').should('contain', 'Category');
      cy.dataCy('table-header-serial').should('contain', 'Serial');
      cy.dataCy('table-header-value').should('contain', 'Value');
      cy.dataCy('table-header-location').should('contain', 'Location');
      cy.dataCy('table-header-status').should('contain', 'Status');
      cy.dataCy('table-header-actions').should('contain', 'Actions');
    });

    it('should display asset data in rows', () => {
      cy.dataCy('asset-name-1').should('contain', 'Conference Room Projector');
      cy.dataCy('asset-category-1').should('contain', 'Equipment');
      cy.dataCy('asset-serial-1').should('contain', 'PROJ-001-2024');
      cy.dataCy('asset-value-1').should('contain', '$2,500.00');
      cy.dataCy('asset-location-1').should('contain', 'Building A - Room 201');

      cy.dataCy('asset-name-2').should('contain', 'Executive Desk');
      cy.dataCy('asset-category-2').should('contain', 'Furniture');
      cy.dataCy('asset-name-3').should('contain', 'Company Van');
      cy.dataCy('asset-category-3').should('contain', 'Vehicle');
    });

    it('should handle select all checkbox', () => {
      cy.dataCy('select-all-checkbox').check();
      cy.dataCy('select-asset-1').should('be.checked');
      cy.dataCy('select-asset-2').should('be.checked');
      cy.dataCy('select-asset-3').should('be.checked');

      cy.dataCy('select-all-checkbox').uncheck();
      cy.dataCy('select-asset-1').should('not.be.checked');
      cy.dataCy('select-asset-2').should('not.be.checked');
      cy.dataCy('select-asset-3').should('not.be.checked');
    });

    it('should handle individual asset selection', () => {
      cy.dataCy('select-asset-1').check().should('be.checked');
      cy.dataCy('select-asset-2').check().should('be.checked');
      cy.dataCy('select-asset-3').should('not.be.checked');
    });

    it('should trigger view asset action', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('view-asset-1').click();
      cy.get('@alert').should('have.been.calledWith', 'View asset details');

      cy.dataCy('view-asset-2').click();
      cy.get('@alert').should('have.been.calledWith', 'View asset details');
    });

    it('should trigger edit asset action', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('edit-asset-1').click();
      cy.get('@alert').should('have.been.calledWith', 'Edit asset form would open');
    });

    it('should handle delete confirmation', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('delete-asset-1').click();
      cy.get('@alert').should('have.been.calledWith', 'Asset deleted!');
    });

    it('should cancel delete when user declines', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('delete-asset-2').click();
      cy.get('@alert').should('not.have.been.called');
    });

    it('should show status indicators correctly', () => {
      cy.dataCy('asset-status-1').find('.status-active').should('be.visible');
      cy.dataCy('asset-status-2').find('.status-pending').should('be.visible');
      cy.dataCy('asset-status-3').find('.status-active').should('be.visible');
    });
  });

  describe('Bulk Actions', () => {
    it('should have bulk action buttons', () => {
      cy.dataCy('bulk-edit-btn').should('be.visible').and('contain', 'Bulk Edit');
      cy.dataCy('bulk-delete-btn').should('be.visible').and('contain', 'Bulk Delete');
      cy.dataCy('export-selected-btn').should('be.visible').and('contain', 'Export Selected');
    });

    it('should trigger bulk edit action', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('bulk-edit-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Bulk edit functionality');
    });

    it('should trigger bulk delete with confirmation', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('bulk-delete-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Selected assets deleted!');
    });

    it('should cancel bulk delete when user declines', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('bulk-delete-btn').click();
      cy.get('@alert').should('not.have.been.called');
    });

    it('should trigger export action', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('export-selected-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Export functionality');
    });
  });

  describe('Pagination', () => {
    it('should have pagination controls', () => {
      cy.dataCy('pagination').should('be.visible');
      cy.dataCy('prev-page-btn').should('be.visible').and('contain', 'Previous');
      cy.dataCy('page-1-btn').should('be.visible').and('contain', '1');
      cy.dataCy('page-2-btn').should('be.visible').and('contain', '2');
      cy.dataCy('page-3-btn').should('be.visible').and('contain', '3');
      cy.dataCy('next-page-btn').should('be.visible').and('contain', 'Next');
    });

    it('should highlight current page', () => {
      cy.dataCy('page-1-btn').should('have.class', 'current');
    });

    it('should handle page navigation', () => {
      cy.dataCy('page-2-btn').click();
      cy.dataCy('page-2-btn').should('have.class', 'current');
      cy.dataCy('page-1-btn').should('not.have.class', 'current');

      cy.dataCy('page-3-btn').click();
      cy.dataCy('page-3-btn').should('have.class', 'current');
      cy.dataCy('page-2-btn').should('not.have.class', 'current');
    });

    it('should trigger previous/next page actions', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('prev-page-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Previous page');

      cy.dataCy('next-page-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Next page');
    });
  });

  describe('Form Interactions', () => {
    it('should handle all select options correctly', () => {
      const categories = ['equipment', 'furniture', 'vehicle', 'property', 'it'];
      const locations = ['building-a', 'building-b', 'building-c', 'warehouse', 'parking'];
      const conditions = ['excellent', 'good', 'fair', 'poor'];

      categories.forEach(category => {
        cy.dataCy('asset-category-select').select(category);
        cy.dataCy('asset-category-select').should('have.value', category);
      });

      locations.forEach(location => {
        cy.dataCy('asset-location-select').select(location);
        cy.dataCy('asset-location-select').should('have.value', location);
      });

      conditions.forEach(condition => {
        cy.dataCy('asset-condition-select').select(condition);
        cy.dataCy('asset-condition-select').should('have.value', condition);
      });
    });

    it('should handle textarea input', () => {
      const description = 'This is a long description for the asset that spans multiple lines and contains various details about the asset.';
      
      cy.dataCy('asset-description-input').type(description);
      cy.dataCy('asset-description-input').should('have.value', description);
    });

    it('should handle all checkbox combinations', () => {
      // Test individual checkboxes
      cy.dataCy('feature-warranty').check().should('be.checked');
      cy.dataCy('feature-maintenance').check().should('be.checked');
      cy.dataCy('feature-portable').check().should('be.checked');
      cy.dataCy('feature-critical').check().should('be.checked');

      // Test unchecking
      cy.dataCy('feature-warranty').uncheck().should('not.be.checked');
      cy.dataCy('feature-maintenance').uncheck().should('not.be.checked');

      // Test mixed state
      cy.dataCy('feature-portable').should('be.checked');
      cy.dataCy('feature-critical').should('be.checked');
      cy.dataCy('feature-warranty').should('not.be.checked');
      cy.dataCy('feature-maintenance').should('not.be.checked');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form elements', () => {
      cy.get('label[for="asset-name"]').should('exist');
      cy.get('label[for="asset-category"]').should('exist');
      cy.get('label[for="asset-value"]').should('exist');
      cy.get('label[for="asset-serial"]').should('exist');
      cy.get('label[for="asset-location"]').should('exist');
      cy.get('label[for="asset-condition"]').should('exist');
      cy.get('label[for="asset-description"]').should('exist');
    });

    it('should support keyboard navigation', () => {
      cy.dataCy('asset-name-input').focus().should('be.focused');
      cy.dataCy('asset-name-input').tab();
      cy.dataCy('asset-category-select').should('be.focused');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      cy.viewport(375, 667);
      cy.dataCy('create-asset-form').should('be.visible');
      cy.dataCy('asset-filters').should('be.visible');
      cy.dataCy('assets-table').should('be.visible');
    });

    it('should adapt to tablet viewport', () => {
      cy.viewport(768, 1024);
      cy.dataCy('create-asset-form').should('be.visible');
      cy.dataCy('asset-filters').should('be.visible');
      cy.dataCy('assets-table').should('be.visible');
    });

    it('should maintain functionality on different screen sizes', () => {
      cy.viewport(1200, 800);
      
      cy.dataCy('asset-name-input').type('Responsive Test');
      cy.dataCy('asset-category-select').select('equipment');
      cy.dataCy('asset-location-select').select('building-a');

      cy.viewport(375, 667);

      cy.dataCy('asset-name-input').should('have.value', 'Responsive Test');
      cy.dataCy('asset-category-select').should('have.value', 'equipment');
      cy.dataCy('asset-location-select').should('have.value', 'building-a');
    });
  });
});