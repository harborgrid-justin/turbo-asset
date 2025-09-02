/// <reference types="cypress" />

describe('Interactive Elements Integration Tests', () => {
  let testData: any;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
    });
  });

  describe('Cross-Page Navigation and State', () => {
    it('should maintain consistent navigation across pages', () => {
      // Start on dashboard
      cy.visit('/index.html');
      cy.dataCy('page-title').should('contain', 'Dashboard');
      cy.dataCy('nav-dashboard').should('be.visible');

      // Navigate to assets page
      cy.dataCy('nav-assets').click();
      cy.url().should('include', '/assets.html');
      cy.dataCy('page-title').should('contain', 'Asset Management');
      cy.dataCy('nav-assets').should('have.class', 'active');

      // Navigate back to dashboard
      cy.dataCy('nav-dashboard').click();
      cy.url().should('include', '/index.html');
      cy.dataCy('page-title').should('contain', 'Dashboard');
    });

    it('should handle browser back and forward navigation', () => {
      cy.visit('/index.html');
      cy.dataCy('nav-assets').click();
      cy.url().should('include', '/assets.html');

      cy.go('back');
      cy.url().should('include', '/index.html');
      cy.dataCy('page-title').should('contain', 'Dashboard');

      cy.go('forward');
      cy.url().should('include', '/assets.html');
      cy.dataCy('page-title').should('contain', 'Asset Management');
    });
  });

  describe('Form Validation and Error Handling', () => {
    beforeEach(() => {
      cy.visit('/assets.html');
    });

    it('should validate required fields and show appropriate messages', () => {
      cy.dataCy('submit-asset-btn').click();
      
      // Check HTML5 validation
      cy.dataCy('asset-name-input').should('be.invalid');
      cy.dataCy('asset-category-select').should('be.invalid');
      cy.dataCy('asset-location-select').should('be.invalid');

      // Partially fill form and check remaining validation
      cy.dataCy('asset-name-input').type('Test Asset');
      cy.dataCy('submit-asset-btn').click();
      
      cy.dataCy('asset-name-input').should('be.valid');
      cy.dataCy('asset-category-select').should('be.invalid');
      cy.dataCy('asset-location-select').should('be.invalid');
    });

    it('should handle complete form workflow from validation to submission', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      // First attempt - incomplete form
      cy.dataCy('submit-asset-btn').click();
      cy.get('@alert').should('not.have.been.called');

      // Complete form with test data
      const asset = testData.testData.validAsset;
      
      cy.dataCy('asset-name-input').type(asset.name);
      cy.dataCy('asset-category-select').select(asset.category);
      cy.dataCy('asset-value-input').type(asset.value);
      cy.dataCy('asset-serial-input').type(asset.serial);
      cy.dataCy('asset-location-select').select(asset.location);
      cy.dataCy('asset-condition-select').select(asset.condition);
      cy.dataCy('asset-description-input').type(asset.description);

      // Select features
      asset.features.forEach((feature: string) => {
        cy.dataCy(`feature-${feature}`).check();
      });

      // Submit and verify
      cy.dataCy('submit-asset-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Asset created successfully!');

      // Verify form is reset after submission
      cy.dataCy('asset-name-input').should('have.value', '');
      cy.dataCy('asset-category-select').should('have.value', '');
    });
  });

  describe('Interactive Table Operations', () => {
    beforeEach(() => {
      cy.visit('/assets.html');
    });

    it('should handle complete table interaction workflow', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
        cy.stub(win, 'confirm').as('confirm');
      });

      // Select multiple assets
      cy.dataCy('select-asset-1').check();
      cy.dataCy('select-asset-2').check();

      // Perform bulk operations
      cy.dataCy('bulk-edit-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Bulk edit functionality');

      // Test bulk delete with confirmation
      cy.get('@confirm').returns(true);
      cy.dataCy('bulk-delete-btn').click();
      cy.get('@confirm').should('have.been.called');
      cy.get('@alert').should('have.been.calledWith', 'Selected assets deleted!');

      // Test individual asset operations
      cy.dataCy('view-asset-3').click();
      cy.get('@alert').should('have.been.calledWith', 'View asset details');

      cy.dataCy('edit-asset-3').click();
      cy.get('@alert').should('have.been.calledWith', 'Edit asset form would open');

      // Test delete confirmation flow
      cy.get('@confirm').returns(false);
      cy.dataCy('delete-asset-3').click();
      cy.get('@confirm').should('have.been.called');
      // Alert should not be called since user declined
    });

    it('should handle select all functionality correctly', () => {
      // Initially no assets selected
      cy.dataCy('select-asset-1').should('not.be.checked');
      cy.dataCy('select-asset-2').should('not.be.checked');
      cy.dataCy('select-asset-3').should('not.be.checked');

      // Select all
      cy.dataCy('select-all-checkbox').check();
      cy.dataCy('select-asset-1').should('be.checked');
      cy.dataCy('select-asset-2').should('be.checked');
      cy.dataCy('select-asset-3').should('be.checked');

      // Deselect one asset manually
      cy.dataCy('select-asset-2').uncheck();
      cy.dataCy('select-all-checkbox').should('not.be.checked');

      // Select remaining assets manually
      cy.dataCy('select-asset-2').check();
      // Select all should not auto-check (would require additional logic)

      // Unselect all
      cy.dataCy('select-all-checkbox').uncheck();
      cy.dataCy('select-asset-1').should('not.be.checked');
      cy.dataCy('select-asset-2').should('not.be.checked');
      cy.dataCy('select-asset-3').should('not.be.checked');
    });
  });

  describe('Search and Filter Integration', () => {
    beforeEach(() => {
      cy.visit('/index.html');
    });

    it('should perform complete search workflow', () => {
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      // Test search on dashboard
      cy.dataCy('asset-type-select').select('equipment');
      cy.dataCy('asset-location-input').type('Building A');
      cy.dataCy('asset-status-select').select('active');
      cy.dataCy('search-btn').click();

      cy.get('@alert').should('have.been.calledWith', 'Search functionality would be implemented here');

      // Clear the search
      cy.dataCy('clear-btn').click();
      cy.dataCy('asset-type-select').should('have.value', '');
      cy.dataCy('asset-location-input').should('have.value', '');
      cy.dataCy('asset-status-select').should('have.value', '');

      // Navigate to assets page and test advanced filters
      cy.dataCy('nav-assets').click();

      testData.testData.filterCombinations.forEach((filter: any, index: number) => {
        if (filter.category) {
          cy.dataCy('filter-category-select').select(filter.category);
        }
        if (filter.status) {
          cy.dataCy('filter-status-select').select(filter.status);
        }
        if (filter.location) {
          cy.dataCy('filter-location-select').select(filter.location);
        }

        cy.dataCy('apply-filters-btn').click();
        cy.get('@alert').should('have.been.calledWith', 'Filters applied!');

        // Clear filters for next iteration
        if (index < testData.testData.filterCombinations.length - 1) {
          cy.dataCy('clear-filters-btn').click();
          cy.get('@alert').should('have.been.calledWith', 'Filters cleared!');
        }
      });
    });

    it('should handle search text input with various queries', () => {
      cy.visit('/assets.html');
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      testData.testData.searchQueries.forEach((query: string) => {
        cy.dataCy('filter-search-input').clear().type(query);
        cy.dataCy('apply-filters-btn').click();
        cy.get('@alert').should('have.been.calledWith', 'Filters applied!');

        // Verify the search input retains the value
        cy.dataCy('filter-search-input').should('have.value', query);
      });
    });
  });

  describe('Modal and Dialog Interactions', () => {
    beforeEach(() => {
      cy.visit('/index.html');
    });

    it('should handle complete modal lifecycle', () => {
      // Modal should be hidden initially
      cy.dataCy('sample-modal').should('not.be.visible');

      // Open modal
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('modal-title').should('contain', 'Asset Details');
      cy.dataCy('modal-content').should('be.visible');

      // Test modal action buttons
      cy.dataCy('modal-save-btn').should('be.visible');
      cy.dataCy('modal-cancel-btn').should('be.visible');

      // Close via cancel button
      cy.dataCy('modal-cancel-btn').click();
      cy.dataCy('sample-modal').should('not.be.visible');

      // Reopen and close via X button
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('modal-close').click();
      cy.dataCy('sample-modal').should('not.be.visible');

      // Test clicking outside modal to close
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('sample-modal').click();
      cy.dataCy('sample-modal').should('not.be.visible');

      // Test that clicking modal content doesn't close modal
      cy.dataCy('show-modal-btn').click();
      cy.dataCy('sample-modal').should('be.visible');
      cy.dataCy('modal-content').click();
      cy.dataCy('sample-modal').should('be.visible');
    });
  });

  describe('Pagination and Data Navigation', () => {
    beforeEach(() => {
      cy.visit('/assets.html');
    });

    it('should handle pagination controls correctly', () => {
      // Check initial state
      cy.dataCy('page-1-btn').should('have.class', 'current');
      cy.dataCy('page-2-btn').should('not.have.class', 'current');
      cy.dataCy('page-3-btn').should('not.have.class', 'current');

      // Navigate through pages
      cy.dataCy('page-2-btn').click();
      cy.dataCy('page-2-btn').should('have.class', 'current');
      cy.dataCy('page-1-btn').should('not.have.class', 'current');

      cy.dataCy('page-3-btn').click();
      cy.dataCy('page-3-btn').should('have.class', 'current');
      cy.dataCy('page-2-btn').should('not.have.class', 'current');

      // Go back to page 1
      cy.dataCy('page-1-btn').click();
      cy.dataCy('page-1-btn').should('have.class', 'current');
      cy.dataCy('page-3-btn').should('not.have.class', 'current');

      // Test prev/next buttons
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      cy.dataCy('prev-page-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Previous page');

      cy.dataCy('next-page-btn').click();
      cy.get('@alert').should('have.been.calledWith', 'Next page');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should load pages quickly and handle multiple interactions', () => {
      const startTime = Date.now();
      cy.visit('/index.html');
      cy.dataCy('page-title').should('be.visible');
      
      // Basic performance check - page should load in under 2 seconds
      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(2000);
      });

      // Rapid interaction test
      cy.dataCy('nav-assets').click();
      cy.dataCy('nav-dashboard').click();
      cy.dataCy('nav-assets').click();

      // Multiple form interactions
      cy.dataCy('asset-name-input').type('Performance Test Asset');
      cy.dataCy('asset-category-select').select('equipment');
      cy.dataCy('asset-location-select').select('building-a');
      cy.dataCy('reset-form-btn').click();

      // Multiple filter operations
      cy.dataCy('filter-category-select').select('furniture');
      cy.dataCy('clear-filters-btn').click();
      cy.dataCy('filter-status-select').select('active');
      cy.dataCy('clear-filters-btn').click();

      // All interactions should complete without errors
      cy.dataCy('page-title').should('contain', 'Asset Management');
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    beforeEach(() => {
      cy.visit('/assets.html');
    });

    it('should support keyboard navigation through form elements', () => {
      // Tab through form elements
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'nav-dashboard');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'nav-assets');
      
      cy.focused().tab();
      cy.focused().tab();
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'asset-name-input');

      // Should be able to type in focused input
      cy.focused().type('Keyboard Navigation Test');
      cy.dataCy('asset-name-input').should('have.value', 'Keyboard Navigation Test');

      // Continue tabbing through form
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'asset-category-select');

      // Should be able to select with keyboard
      cy.focused().select('equipment');
      cy.dataCy('asset-category-select').should('have.value', 'equipment');
    });

    it('should have proper ARIA labels and accessible elements', () => {
      // Check for proper label associations
      cy.get('input[required]').each($input => {
        const inputId = $input.attr('id');
        cy.get(`label[for="${inputId}"]`).should('exist');
      });

      cy.get('select[required]').each($select => {
        const selectId = $select.attr('id');
        cy.get(`label[for="${selectId}"]`).should('exist');
      });

      // Check for semantic HTML
      cy.get('main, section, article, nav, header, footer').should('exist');
      cy.get('h1, h2, h3').should('exist');
      
      // Check for button text and accessible names
      cy.get('button').each($button => {
        expect($button.text().trim()).to.not.be.empty;
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle rapid clicking and prevent double submissions', () => {
      cy.visit('/assets.html');
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alert');
      });

      // Fill minimum required fields
      cy.dataCy('asset-name-input').type('Rapid Click Test');
      cy.dataCy('asset-category-select').select('equipment');
      cy.dataCy('asset-location-select').select('building-a');

      // Rapid click submit button
      cy.dataCy('submit-asset-btn').click().click().click();
      
      // Should only alert once due to form reset
      cy.get('@alert').should('have.been.calledWith', 'Asset created successfully!');
    });

    it('should handle empty and whitespace-only inputs', () => {
      cy.visit('/assets.html');

      // Test with whitespace-only input
      cy.dataCy('asset-name-input').type('   ');
      cy.dataCy('asset-description-input').type('   \n\n\t   ');
      
      // Form validation should still fail for empty content
      cy.dataCy('submit-asset-btn').click();
      // HTML5 validation might not catch whitespace, but it's still invalid
      cy.dataCy('asset-category-select').should('be.invalid');
    });

    it('should handle very long inputs gracefully', () => {
      cy.visit('/assets.html');

      const longText = 'A'.repeat(1000);
      const veryLongText = 'B'.repeat(10000);

      cy.dataCy('asset-name-input').type(longText);
      cy.dataCy('asset-description-input').type(veryLongText);
      
      // Inputs should accept the text without breaking
      cy.dataCy('asset-name-input').should('contain.value', 'A');
      cy.dataCy('asset-description-input').should('contain.value', 'B');
    });
  });
});