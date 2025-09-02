/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      dataCy(value: string): Chainable<JQuery<HTMLElement>>
      tab(): Chainable<JQuery<HTMLElement>>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email,
      password,
    },
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token)
  })
})

Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy=${value}]`)
})

Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  return cy.wrap(subject).trigger('keydown', { keyCode: 9, key: 'Tab' }).then(() => {
    // Move focus to next focusable element
    cy.focused().then($el => {
      const focusableElements = Cypress.$(':focusable:visible');
      const currentIndex = focusableElements.index($el);
      if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
        focusableElements.eq(currentIndex + 1).focus();
      }
    });
  });
})

export {}