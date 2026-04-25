// ============================================================
// CYPRESS.CONFIG.JS
// Pegalo en la raíz del proyecto frontend (donde está package.json)
// ============================================================
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    // URL base del frontend — Cypress le agrega las rutas automáticamente
    // cy.visit("/panel") → http://localhost:5173/panel
    baseUrl: "http://localhost:5173",

    // Carpeta donde viven los specs
    specPattern: "cypress/e2e/**/*.cy.{js,jsx}",

    // Carpeta de support (commands.js, etc.)
    supportFile: "cypress/support/commands.js",

    // Tiempo máximo de espera para que los elementos aparezcan (ms)
    defaultCommandTimeout: 8000,

    // Variables de entorno disponibles en los specs con Cypress.env("nombre")
    env: {
      // Generá este token con tu backend y pegalo acá para los tests
      // que usan cy.setToken() en lugar de pasar por el formulario
      API_URL: "http://localhost:8080",
      TEST_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sIjoiZHVlbm8iLCJpYXQiOjE3NzcwNzM3NzUsImV4cCI6MTgwODYwOTc3NX0.U6IDBD6DOrF1Mh4CVzacKU0B1g3Deh901SVgSTdcTmw",
    },

    setupNodeEvents(on, config) {
      // Acá podés agregar plugins de Node si los necesitás en el futuro
      return config;
    },
  },
});