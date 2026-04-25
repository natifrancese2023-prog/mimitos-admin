// ============================================================
// COMMANDS.JS
// ============================================================
 
const API = () => Cypress.env("API_URL"); // http://localhost:8080
 
/**
 * cy.setToken()
 * Inyecta el token en el localStorage del navegador.
 * CRÍTICO: usa cy.window(), NO window.localStorage directamente.
 * window.localStorage en Cypress apunta al window del runner, no al de la app.
 */
Cypress.Commands.add("setToken", () => {
  const token = Cypress.env("TEST_TOKEN");
  cy.window().then((win) => {
    win.localStorage.setItem("token", token);
    win.localStorage.setItem("rol", "dueno");
  });
});
 
/**
 * cy.loginAdmin()
 * Usa mock — no llama al backend real para evitar 401/404.
 */
Cypress.Commands.add("loginAdmin", () => {
  cy.intercept("POST", `${API()}/usuarios/login`, {
    statusCode: 200,
    body: { mensaje: "Login exitoso", token: Cypress.env("TEST_TOKEN") },
  }).as("loginCmd");
 
  cy.visit("/");
  cy.get('input[type="email"]').type("mimitos_agostina@gmail.com");
  cy.get('input[type="password"]').type("Mimitos1!");
  cy.get('button[type="submit"]').click();
  cy.wait("@loginCmd");
  cy.url().should("include", "/panel");
});