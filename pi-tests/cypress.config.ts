import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:5173",
    specPattern: "src/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    env: {
      apiUrl: process.env.CYPRESS_API_URL || "http://localhost:5481",
    },
  },
});
