// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// --- Import Custom Commands ---
// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively, you can use CommonJS syntax:
// require('./commands')

// --- Global Hooks ---

// Example: Run before each test
// beforeEach(() => {
//   cy.log('Global beforeEach: Clearing session or setting up common state');
//   // Example: cy.loginViaApi(); // Custom command to log in programmatically
// });

// Example: Run after each test
// afterEach(() => {
//   cy.log('Global afterEach: Cleaning up test data');
// });

// --- Handle Uncaught Exceptions ---
// Cypress will automatically fail the test when an uncaught exception occurs.
// You can prevent this behavior for specific errors if they are expected
// or if they don't interfere with the test's purpose.
// Use with caution, as this can hide real application bugs.
// Cypress.on('uncaught:exception', (err, runnable) => {
//   // returning false here prevents Cypress from failing the test
//   if (err.message.includes('Some expected error message from a third-party script')) {
//     return false;
//   }
//   // Allow other uncaught exceptions to fail the test
//   return true;
// });

// --- Configure Third-Party Libraries ---
// Example: If using Cypress Testing Library for more semantic queries
// import '@testing-library/cypress/add-commands';

// --- Environment Variable Check (Optional) ---
// You can add checks here to ensure necessary Cypress environment variables are set,
// which is especially useful for CI/CD environments.
//
// const requiredEnvVars = ['API_URL', 'TEST_USER_EMAIL', 'TEST_USER_PASSWORD'];
// requiredEnvVars.forEach((envVar) => {
//   if (!Cypress.env(envVar)) {
//     throw new Error(`Cypress environment variable ${envVar} is not set. Please check your cypress.config.ts or cypress.env.json file.`);
//   }
// });

// --- Supabase Specific Setup (If needed globally) ---
// If you need to interact with Supabase client directly in tests (less common for E2E, more for component tests)
// you might import and configure it here, but typically E2E tests interact via UI or API calls.

// --- Intercept Common API Calls (Optional) ---
// You can set up common intercepts here that apply to many tests.
// beforeEach(() => {
//   cy.intercept('GET', '/api/auth/user').as('getUser');
//   cy.intercept('POST', '/api/auth/login').as('loginRequest');
//   // Add more common intercepts
// });

// --- Types for Custom Commands (if not in commands.ts or a separate .d.ts file) ---
// It's generally better to put these in `commands.ts` or `cypress/support/index.d.ts`
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       loginViaApi(email?: string, password?: string): Chainable<any>;
//       getByTestId(testId: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>): Chainable<JQuery<HTMLElement>>;
//     }
//   }
// }

console.log('Cypress support/e2e.ts file loaded.');
