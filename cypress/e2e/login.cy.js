// ============================================================
// LOGIN.CY.JS - Tests E2E para la pantalla de Login
// ============================================================
const API = Cypress.env("API_URL");
describe("Login", () => {
  beforeEach(() => {
    // Siempre partimos de la pantalla de login limpia
    cy.visit("/");
  });

  // ──────────────────────────────────────────────────────────
  // RENDERIZADO
  // ──────────────────────────────────────────────────────────
  it("debería renderizar el formulario de login correctamente", () => {
    // Verificamos que los elementos clave están presentes
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("be.visible").and("contain", "Ingresar");

    // Branding visible
    cy.contains("mimitos").should("be.visible");
    cy.contains("Panel de administración").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // VALIDACIONES FRONTEND (sin llamar al backend)
  // ──────────────────────────────────────────────────────────
  it("debería mostrar error si el email está vacío al perder el foco", () => {
    cy.get('input[type="email"]').focus().blur();
    cy.contains("El email es obligatorio").should("be.visible");
  });

  it("debería mostrar error si el email tiene formato inválido", () => {
    cy.get('input[type="email"]').type("no-es-un-email").blur();
    cy.contains("El formato del email no es válido").should("be.visible");
  });

  it("debería mostrar error si la contraseña tiene menos de 8 caracteres", () => {
    cy.get('input[type="password"]').type("Abc1!").blur();
    cy.contains("al menos 8 caracteres").should("be.visible");
  });

  it("debería mostrar error si la contraseña no tiene mayúscula", () => {
    cy.get('input[type="password"]').type("abcd1234!").blur();
    cy.contains("al menos una mayúscula").should("be.visible");
  });

  it("debería mostrar error si la contraseña no tiene número", () => {
    cy.get('input[type="password"]').type("Abcdefgh!").blur();
    cy.contains("al menos un número").should("be.visible");
  });

  it("debería mostrar error si la contraseña no tiene símbolo", () => {
    cy.get('input[type="password"]').type("Abcdefg1").blur();
    cy.contains("al menos un símbolo").should("be.visible");
  });

  it("no debería enviar el formulario si hay errores de validación", () => {
    // Interceptamos para asegurarnos de que NO se llama al backend
    cy.intercept("POST", "/usuarios/login").as("loginRequest");

    cy.get('input[type="email"]').type("email-invalido");
    cy.get('input[type="password"]').type("corta");
    cy.get('button[type="submit"]').click();

    // La URL no debería cambiar
    cy.url().should("eq", Cypress.config("baseUrl") + "/");

    // El backend no debería haber recibido el request
    cy.get("@loginRequest.all").should("have.length", 0);
  });

  // ──────────────────────────────────────────────────────────
  // FLUJO COMPLETO — ÉXITO
  // ──────────────────────────────────────────────────────────
 it("debería iniciar sesión correctamente y redirigir al panel", () => {
  const API = () => Cypress.env("API_URL");

  // Mockeamos la respuesta — no dependemos de la contraseña real
  cy.intercept("POST", `${API()}/usuarios/login`, {
    statusCode: 200,
    body: { 
      mensaje: "Login exitoso",
      token: Cypress.env("TEST_TOKEN")
    }
  }).as("loginRequest");

  cy.get('input[type="email"]').type("mimitos_agostina@gmail.com");
  cy.get('input[type="password"]').type("Mimitos1!");
  cy.get('button[type="submit"]').click();

  cy.wait("@loginRequest").then((interception) => {
    // Verificamos que el front envió los campos correctos
    expect(interception.request.body).to.have.property("email");
    expect(interception.request.body).to.have.property("contrasena");
  });

  // El token fue guardado en localStorage
  cy.window().its("localStorage").invoke("getItem", "token").should("exist");

  // Fuimos redirigidos al panel
  cy.url().should("include", "/panel");
});
  // ──────────────────────────────────────────────────────────
  // FLUJO COMPLETO — ERROR (credenciales incorrectas)
  // ──────────────────────────────────────────────────────────
  it("debería mostrar error si las credenciales son incorrectas", () => {
    // Simulamos respuesta 401 del backend
    cy.intercept("POST", "/usuarios/login", {
      statusCode: 401,
      body: { error: "Credenciales incorrectas" },
    }).as("loginFallido");

    cy.get('input[type="email"]').type("noexiste@gmail.com");
    cy.get('input[type="password"]').type("Password123!");
    cy.get('button[type="submit"]').click();

    cy.wait("@loginFallido");

    // El mensaje de error del servidor debe mostrarse
    cy.contains("Credenciales incorrectas").should("be.visible");

    // No navegamos al panel
    cy.url().should("not.include", "/panel");
  });

  // ──────────────────────────────────────────────────────────
  // ESTADO DEL BOTÓN
  // ──────────────────────────────────────────────────────────
  it("debería deshabilitar el botón mientras se procesa el login", () => {
    // Retrasamos la respuesta del backend para ver el estado de carga
    cy.intercept("POST", "/usuarios/login", (req) => {
      req.reply((res) => {
        res.setDelay(500);
      });
    }).as("loginLento");

    cy.get('input[type="email"]').type("mimitos_agostina@gmail.com");
    cy.get('input[type="password"]').type("MimiTos2026!");
    cy.get('button[type="submit"]').click();

    // Durante el request, el botón debe estar deshabilitado y mostrar "Ingresando..."
    cy.get('button[type="submit"]')
      .should("be.disabled")
      .and("contain", "Ingresando...");

    cy.wait("@loginLento");
  });
});
