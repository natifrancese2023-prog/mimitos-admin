const API = () => Cypress.env("API_URL");

const PROVEEDORES_MOCK = [
  { id_proveedor: 1, nombre: "Distribuidora Norte", telefono: "351-100-0001", direccion: "Av. Colón 1234" },
  { id_proveedor: 2, nombre: "Bebés y Más S.A.",    telefono: "351-100-0002", direccion: "Bv. Chacabuco 800" },
];

const HISTORIAL_MOCK = [
  { id_compra: 1, fecha: "2026-03-15T00:00:00.000Z", total: 45000,
    forma_pago: "transferencia", estado_pago: "pagado",
    detalle: [{ nombre: "Pañal Pampers", cantidad: 20 }, { nombre: "Toallitas", cantidad: 10 }] },
  { id_compra: 2, fecha: "2026-04-01T00:00:00.000Z", total: 30000,
    forma_pago: "efectivo", estado_pago: "pendiente",
    detalle: [{ nombre: "Mamadera Avent", cantidad: 15 }] },
];

describe("Proveedores", () => {
  beforeEach(() => {
    cy.setToken();
    cy.intercept("GET", `${API()}/proveedores`, { statusCode: 200, body: PROVEEDORES_MOCK }).as("getProveedores");
    cy.visit("/panel/proveedores");
    cy.wait("@getProveedores");
  });

  it("debería listar los proveedores con sus datos", () => {
    cy.contains("Distribuidora Norte").should("be.visible");
    cy.contains("351-100-0001").should("be.visible");
    cy.contains("Av. Colón 1234").should("be.visible");
    cy.contains("Bebés y Más S.A.").should("be.visible");
    cy.contains("2 proveedores registrados").should("be.visible");
  });

  it("debería filtrar proveedores por nombre", () => {
    cy.get('input[placeholder*="Buscar"]').type("Norte");
    cy.contains("Distribuidora Norte").should("be.visible");
    cy.contains("Bebés y Más S.A.").should("not.exist");
  });

  it("debería filtrar por teléfono", () => {
    cy.get('input[placeholder*="Buscar"]').type("0002");
    cy.contains("Bebés y Más S.A.").should("be.visible");
    cy.contains("Distribuidora Norte").should("not.exist");
  });

  it("debería mostrar el historial de compras del proveedor", () => {
    cy.intercept("GET", `${API()}/proveedores/1/compras`, {
      statusCode: 200, body: HISTORIAL_MOCK,
    }).as("getHistorial");

    cy.contains("Distribuidora Norte").closest("tr").within(() => {
      cy.contains("Historial").click();
    });

    cy.wait("@getHistorial");
    cy.contains("Historial de compras").should("be.visible");
    cy.contains("Distribuidora Norte").should("be.visible");
    cy.contains("$75.000").should("be.visible");
    cy.contains("✅ Pagado").should("be.visible");
    cy.contains("Pañal Pampers × 20").should("be.visible");
    cy.contains("🕐 Pendiente").should("be.visible");
  });

  it("debería mostrar mensaje vacío si el proveedor no tiene compras", () => {
    cy.intercept("GET", `${API()}/proveedores/2/compras`, {
      statusCode: 200, body: [],
    }).as("getHistorialVacio");

    cy.contains("Bebés y Más S.A.").closest("tr").within(() => {
      cy.contains("Historial").click();
    });

    cy.wait("@getHistorialVacio");
    cy.contains("No hay compras registradas para este proveedor").should("be.visible");
  });

  it("debería mostrar error de validación si el nombre está vacío", () => {
    cy.contains("button", "Nuevo proveedor").click();
    cy.contains("button", "Crear proveedor").click();
    cy.contains("El nombre es obligatorio").should("be.visible");
  });

  it("debería crear un proveedor correctamente", () => {
    cy.intercept("POST", `${API()}/proveedores`, {
      statusCode: 201,
      body: { id_proveedor: 3, nombre: "Pañalera Central" },
    }).as("crearProveedor");

    cy.intercept("GET", `${API()}/proveedores`, {
      statusCode: 200,
      body: [...PROVEEDORES_MOCK, { id_proveedor: 3, nombre: "Pañalera Central", telefono: "3515555555", direccion: "" }],
    }).as("getProveedoresActualizado");

    cy.contains("button", "Nuevo proveedor").click();
    cy.get('input[type="text"]').first().type("Pañalera Central");
    cy.get('input[type="text"]').eq(1).type("3515555555");
    cy.contains("button", "Crear proveedor").click();

    cy.wait("@crearProveedor").then((interception) => {
      expect(interception.request.body.nombre).to.eq("Pañalera Central");
    });

    cy.wait("@getProveedoresActualizado");
    cy.contains("✅ Proveedor creado correctamente").should("be.visible");
  });

  it("debería abrir el modal de edición con los datos del proveedor", () => {
    cy.contains("Distribuidora Norte").closest("tr").within(() => {
      cy.get(".btn-editar").click();
    });
    cy.contains("Editar proveedor").should("be.visible");
    cy.get('input[type="text"]').first().should("have.value", "Distribuidora Norte");
  });

  it("debería eliminar un proveedor tras confirmar", () => {
    cy.intercept("DELETE", `${API()}/proveedores/1`, { statusCode: 200 }).as("eliminarProveedor");
    cy.intercept("GET", `${API()}/proveedores`, {
      statusCode: 200, body: [PROVEEDORES_MOCK[1]],
    }).as("getProveedoresSinPrimero");

    cy.contains("Distribuidora Norte").closest("tr").within(() => {
      cy.get(".btn-eliminar").click();
    });
    cy.contains("¿Estás seguro").should("be.visible");
    cy.contains("button", "Sí, eliminar").click();
    cy.wait("@eliminarProveedor");
    cy.wait("@getProveedoresSinPrimero");
    cy.contains("Distribuidora Norte").should("not.exist");
    cy.contains("Bebés y Más S.A.").should("be.visible");
  });
});