// Cypress E2E Support File
// Custom global configurations and handlers

Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing tests on third-party unhandled exceptions
  return false;
});
