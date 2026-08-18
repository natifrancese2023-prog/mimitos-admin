// ============================================================
// DASHBOARD.CY.JS — URLs completas del backend en todos los intercepts
// Ruta: GET /api/stats/dashboard?inicio=...&fin=...
// ============================================================

const API = () => Cypress.env("API_URL");

const DASHBOARD_MOCK = {
  totales: {
    ingresos: 150000, egresos: 80000, gananciaNeta: 70000,
    cantidadFacturas: 12, ticketPromedio: "12500.00",
  },
  alertas: {
    stockCritico: [
      { nombre: "Pañal Pampers", nombre_variante: "Talle M", stock: 2 },
      { nombre: "Toallitas", nombre_variante: null, stock: 0 },
    ],
  },
  topProductos: [
    { nombre: "Pañal Pampers", nombre_variante: "Talle M", total_vendido: 45 },
    { nombre: "Mamadera Avent", nombre_variante: null, total_vendido: 20 },
  ],
  grafico: [
    { dia: "01/04", ventas: 5000, egresos: 2000 },
    { dia: "02/04", ventas: 8000, egresos: 3000 },
  ],
  mediosPago: [],
};

describe("Dashboard", () => {
  beforeEach(() => {
    cy.setToken(); // 1. token primero

    // 2. intercept con URL completa
    cy.intercept("GET", `${API()}/api/stats/dashboard*`, {
      statusCode: 200, body: DASHBOARD_MOCK,
    }).as("getDashboard");

    cy.visit("/panel"); // 3. visit después del token
    cy.wait("@getDashboard"); // 4. wait al final
  });

  // ──────────────────────────────────────────────────────────
  // TARJETAS
  // ──────────────────────────────────────────────────────────
  it("debería mostrar las 4 tarjetas con datos correctos", () => {
    cy.contains("Ingresos").should("be.visible");
    cy.contains("$150.000").should("be.visible");
    cy.contains("12 ventas").should("be.visible");
    cy.contains("Egresos").should("be.visible");
    cy.contains("$80.000").should("be.visible");
    cy.contains("Balance").should("be.visible");
    cy.contains("$70.000").should("be.visible");
    cy.contains("Stock Crítico").should("be.visible");
    cy.contains("2").should("be.visible");
  });

  it("debería mostrar la sección de Reposición Urgente", () => {
    cy.contains("Reposición Urgente").should("be.visible");
    cy.contains("Pañal Pampers - Talle M").should("be.visible");
    cy.contains("2 u.").should("be.visible");
    cy.contains("Toallitas").should("be.visible");
    cy.contains("0 u.").should("be.visible");
  });

  it("debería mostrar el gráfico de Evolución de Caja", () => {
    cy.contains("Evolución de Caja").should("be.visible");
    cy.get(".recharts-wrapper").should("exist");
  });

  it("debería mostrar Top Productos", () => {
    cy.contains("Productos más vendidos").should("be.visible");
    cy.contains("Pañal Pampers - Talle M").should("be.visible");
    cy.contains("45 u.").should("be.visible");
    cy.contains("Mamadera Avent").should("be.visible");
    cy.contains("20 u.").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // FILTROS DE FECHA
  // ──────────────────────────────────────────────────────────
  it("debería llamar al backend con rango correcto al hacer click en '7d'", () => {
    cy.intercept("GET", `${API()}/api/stats/dashboard*`).as("dashboardFiltrado");
    cy.contains("button", "7d").click();
    cy.wait("@dashboardFiltrado").then((interception) => {
      expect(interception.request.query).to.have.property("inicio");
      expect(interception.request.query).to.have.property("fin");
    });
  });

  it("debería llamar al backend al hacer click en 'Actualizar'", () => {
    cy.intercept("GET", `${API()}/api/stats/dashboard*`).as("dashboardActualizado");
    cy.get('input[type="date"]').first().clear().type("2026-01-01");
    cy.contains("button", "Actualizar").click();
    cy.wait("@dashboardActualizado").then((interception) => {
      expect(interception.request.query.inicio).to.eq("2026-01-01");
    });
  });

  // ──────────────────────────────────────────────────────────
  // ESTADO VACÍO
  // ──────────────────────────────────────────────────────────
  it("debería mostrar mensaje vacío si no hay datos", () => {
    cy.intercept("GET", `${API()}/api/stats/dashboard*`, {
      statusCode: 200,
      body: {
        totales: { ingresos: 0, egresos: 0, gananciaNeta: 0, cantidadFacturas: 0, ticketPromedio: 0 },
        alertas: { stockCritico: [] },
        grafico: [], topProductos: [], mediosPago: [],
      },
    }).as("dashboardVacio");

    cy.contains("button", "Actualizar").click();
    cy.wait("@dashboardVacio");
    cy.contains("No hay movimientos registrados").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // SPINNER
  // ──────────────────────────────────────────────────────────
  it("debería mostrar el spinner mientras carga", () => {
    cy.intercept("GET", `${API()}/api/stats/dashboard*`, (req) => {
      req.reply((res) => { res.setDelay(300); res.send(DASHBOARD_MOCK); });
    }).as("dashboardLento");

    cy.contains("button", "Actualizar").click();
    cy.get(".spinner").should("exist");
    cy.wait("@dashboardLento");
  });
});