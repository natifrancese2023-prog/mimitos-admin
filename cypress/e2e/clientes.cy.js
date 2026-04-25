// ============================================================
// CLIENTES.CY.JS - Tests E2E para la gestión de Clientes
// ============================================================
const API = () => Cypress.env("API_URL"); // función que devuelve la URL base

const CLIENTES_MOCK = [
  {
    id_usuario: 2,
    nombre: "Laura",
    apellido: "García",
    dni: "32000001",
    telefono: "3511111111",
    email: "laura@gmail.com",
    rol: "cliente",
  },
  {
    id_usuario: 3,
    nombre: "Carlos",
    apellido: "López",
    dni: "32000002",
    telefono: "3512222222",
    email: "carlos@gmail.com",
    rol: "cliente",
  },
];

const PEDIDOS_CLIENTE_MOCK = [
  {
    id_pedido: 1,
    fecha: "2026-04-10T00:00:00.000Z",
    total: 5000,
    estado: "entregado",
  },
];

describe("Clientes", () => {
  beforeEach(() => {
    cy.setToken();
    cy.intercept("GET", `${API()}/usuarios`, {
      statusCode: 200,
      body: CLIENTES_MOCK,
    }).as("getClientes");
    cy.visit("/panel/clientes");
    cy.wait("@getClientes");
  });

  it("debería listar los clientes con sus datos", () => {
    cy.contains("Laura García").should("be.visible");
    cy.contains("laura@gmail.com").should("be.visible");
    cy.contains("32000001").should("be.visible");
    cy.contains("Carlos López").should("be.visible");
    cy.contains("2 clientes registrados").should("be.visible");
  });

  it("debería filtrar clientes por nombre", () => {
    cy.get('input[placeholder*="Buscar por nombre"]').type("Laura");
    cy.contains("Laura García").should("be.visible");
    cy.contains("Carlos López").should("not.exist");
  });

  it("debería filtrar por email", () => {
    cy.get('input[placeholder*="Buscar por nombre"]').type("carlos@");
    cy.contains("Carlos López").should("be.visible");
    cy.contains("Laura García").should("not.exist");
  });

  it("debería limpiar el filtro al hacer click en ✕", () => {
    cy.get('input[placeholder*="Buscar por nombre"]').type("Laura");
    cy.get(".busqueda-limpiar").click();
    cy.contains("Laura García").should("be.visible");
    cy.contains("Carlos López").should("be.visible");
  });

  it("debería mostrar los pedidos del cliente en el modal", () => {
    cy.intercept("GET", `http://localhost:8080/usuarios/2/pedidos`, {
      statusCode: 200,
      body: PEDIDOS_CLIENTE_MOCK,
    }).as("getPedidosCliente");

    cy.contains("Laura García")
      .closest("tr")
      .within(() => {
        cy.get(".btn-ver").click();
      });

    cy.wait("@getPedidosCliente");
    cy.contains("Pedidos de Laura García").should("be.visible");
    cy.contains("$5.000").should("be.visible");
    cy.contains("entregado").should("be.visible");
  });

  it("debería mostrar errores de validación al guardar sin datos", () => {
    cy.contains("button", "Nuevo cliente").click();
    cy.contains("button", "Crear cliente").click();
    cy.contains("El nombre es obligatorio").should("be.visible");
  });

  it("debería crear un cliente correctamente", () => {
    cy.intercept("POST", `http://localhost:8080/usuarios/registro`, {
      statusCode: 201,
      body: { mensaje: "Cliente creado", id: 4 },
    }).as("crearCliente");

    cy.intercept("GET", `http://localhost:8080/usuarios`, {
      statusCode: 200,
      body: [
        ...CLIENTES_MOCK,
        {
          id_usuario: 4,
          nombre: "Ana",
          apellido: "Martínez",
          dni: "33000003",
          email: "ana@gmail.com",
          rol: "cliente",
        },
      ],
    }).as("getClientesActualizado");

    cy.contains("button", "Nuevo cliente").click();

    cy.get(".modal .form-grid input").eq(0).type("Ana");
    cy.get(".modal .form-grid input").eq(1).type("Martínez");
    cy.get(".modal .form-grid input").eq(2).type("33558896");
    cy.get(".modal .form-grid input").eq(3).type("3512440988");
    cy.get(".modal .form-grid input").eq(4).type("ana@gmail.com");

    cy.contains("button", "Crear cliente").click();

    cy.wait("@crearCliente").then((interception) => {
      expect(interception.request.body.nombre).to.eq("Ana");
      expect(interception.request.body.email).to.eq("ana@gmail.com");
    });

    cy.wait("@getClientesActualizado");
    cy.contains("✅").should("be.visible");
  });

  it("debería pedir confirmación antes de eliminar", () => {
    cy.contains("Laura García")
      .closest("tr")
      .within(() => {
        cy.get(".btn-eliminar").click();
      });
    cy.contains("¿Estás seguro").should("be.visible");
    cy.contains("button", "Cancelar").click();
    cy.contains("Laura García").should("be.visible");
  });
});
