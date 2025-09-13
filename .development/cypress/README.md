# Cypress Testing for Interactive Page Elements

This document describes the Cypress testing setup for the Turbo Asset Management Platform, focusing on testing all interactive page elements.

## Overview

The Cypress testing suite provides comprehensive end-to-end testing for interactive elements across the application, including:

- Navigation components
- Form inputs and validation
- Data tables and sorting
- Modal dialogs
- Search and filter functionality
- Pagination controls
- Bulk operations
- Responsive design elements

## Test Structure

### Test Files

- `cypress/e2e/dashboard.cy.ts` - Tests for dashboard interactive elements
- `cypress/e2e/assets.cy.ts` - Tests for asset management page interactions
- `cypress/e2e/integration.cy.ts` - Integration tests combining multiple interactive elements

### Test Data

- `cypress/fixtures/testData.json` - Test data including users, assets, and configuration

### Support Files

- `cypress/support/commands.ts` - Custom Cypress commands
- `cypress/support/e2e.ts` - Global configuration and setup

## Interactive Elements Tested

### Navigation Components
- Multi-page navigation links
- Active state management
- Hover effects and styling
- Browser back/forward navigation

### Form Elements
- Text inputs with validation
- Select dropdowns
- Checkboxes and radio buttons
- Textarea elements
- Form submission and reset
- Required field validation
- Error handling

### Data Tables
- Column headers and sorting
- Row selection (individual and bulk)
- Action buttons (view, edit, delete)
- Status indicators
- Hover effects

### Modal Dialogs
- Modal open/close functionality
- Multiple close methods (X button, cancel, outside click)
- Modal content interaction
- Keyboard navigation

### Search and Filtering
- Text search inputs
- Filter dropdowns
- Apply/clear filter actions
- Search result handling

### Pagination
- Page navigation buttons
- Current page highlighting
- Previous/next navigation
- Page state management

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure the server can start:
   ```bash
   npm run dev
   ```

### Running Tests

#### Interactive Mode (Cypress Test Runner)
```bash
# Start server and open Cypress UI
npm run e2e:open

# Or manually start server first, then open Cypress
npm run dev
npm run cypress:open
```

#### Headless Mode (CI/Command Line)
```bash
# Run all tests headlessly
npm run e2e

# Or run tests against already running server
npm run cypress:run
```

#### Specific Test Files
```bash
# Run specific test file
npx cypress run --spec "cypress/e2e/dashboard.cy.ts"

# Run tests matching pattern
npx cypress run --spec "cypress/e2e/**/assets*"
```

## Test Categories

### 1. Basic Interaction Tests
- Element visibility and presence
- Click events and navigation
- Form input and submission
- Basic user workflows

### 2. Validation Tests
- Required field validation
- Input format validation
- Error message display
- Form reset functionality

### 3. State Management Tests
- Navigation state persistence
- Form data retention
- Selection state management
- Filter state handling

### 4. Responsive Design Tests
- Mobile viewport (375x667)
- Tablet viewport (768x1024)
- Desktop viewport (1920x1080)
- Element visibility across screen sizes

### 5. Accessibility Tests
- Keyboard navigation
- ARIA labels and roles
- Semantic HTML structure
- Focus management

### 6. Performance Tests
- Page load times
- Rapid interaction handling
- Multiple concurrent operations

### 7. Edge Cases
- Empty form submissions
- Long input handling
- Rapid clicking prevention
- Error state recovery

## Custom Commands

### `cy.dataCy(selector)`
Selects elements using `data-cy` attributes for reliable testing:
```typescript
cy.dataCy('submit-button').click();
```

### `cy.login(email, password)`
Authenticates user for protected routes:
```typescript
cy.login('admin@turboasset.com', 'adminPassword123');
```

## Best Practices

### Test Data Management
- Use fixtures for consistent test data
- Create reusable test data sets
- Avoid hardcoding values in tests

### Element Selection
- Use `data-cy` attributes for test-specific selectors
- Avoid CSS selectors that may change
- Use semantic selectors when appropriate

### Assertions
- Test both positive and negative cases
- Verify element states and properties
- Test error conditions and edge cases

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Keep tests focused and atomic

## Configuration

### Cypress Configuration (`cypress.config.ts`)
```typescript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
  },
});
```

### Environment Variables
- `CYPRESS_baseUrl` - Override base URL
- `NODE_ENV=test` - Set test environment
- Custom environment variables in `cypress.env.json`

## CI/CD Integration

### GitHub Actions
The repository includes a GitHub Actions workflow (`.github/workflows/cypress.yml`) that:
- Runs tests on push and pull requests
- Sets up Node.js environment
- Installs dependencies
- Starts the server and runs tests
- Captures screenshots and videos on failure

### Local CI Testing
```bash
# Run the same commands as CI
npm ci
npm run e2e
```

## Debugging

### Debug Mode
```bash
# Open Cypress with debug logs
DEBUG=cypress:* npm run cypress:open
```

### Screenshots and Videos
- Screenshots automatically captured on test failure
- Videos recorded for failed test runs (when enabled)
- Artifacts stored in `cypress/screenshots` and `cypress/videos`

### Browser DevTools
- Access browser DevTools in Cypress Test Runner
- Inspect elements and debug JavaScript
- View network requests and console logs

## Maintenance

### Adding New Tests
1. Identify new interactive elements
2. Add appropriate `data-cy` attributes to HTML
3. Create test cases covering happy path and edge cases
4. Update test data fixtures as needed
5. Run tests to ensure they pass

### Updating Existing Tests
1. Review failing tests after UI changes
2. Update selectors if necessary
3. Verify test logic still applies
4. Update assertions for new behavior

### Performance Monitoring
- Monitor test execution time
- Identify slow tests for optimization
- Review test stability and flakiness

## Troubleshooting

### Common Issues

#### Server Not Starting
- Verify Node.js version compatibility
- Check for port conflicts (default 3000)
- Ensure all dependencies are installed

#### Tests Timing Out
- Increase command timeout in configuration
- Check for slow-loading elements
- Verify server is responding

#### Element Not Found
- Verify `data-cy` attributes exist in HTML
- Check for dynamic content loading
- Use `cy.wait()` for asynchronous operations

#### Flaky Tests
- Add proper waits for dynamic content
- Avoid testing external services
- Use stable selectors and assertions

For additional help, refer to the [Cypress Documentation](https://docs.cypress.io/) or create an issue in the project repository.