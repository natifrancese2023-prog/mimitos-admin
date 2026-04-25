const API = () => Cypress.env("API_URL");

const GASTOS_MOCK = [
  { id_gasto: 1, descripcion: "Pago de alquiler", categoria: "alquiler",
    monto: 25000, forma_pago: "transferencia", fecha: "2026-04-01T00:00:00.000Z" },
  { id_gasto: 2, descripcion: "Servicio de luz", categoria: "servicios",
    monto: 5000, forma_pago: "efectivo", fecha: "2026-04-05T00:00:00.000Z" },
  { id_gasto: 3, descripcion: "Flete proveedor", categoria: "transporte",
    monto: 3000, forma_pago: "efectivo", fecha: "2026-04-08T00:00:00.000Z" },
];

describe("Gastos", () => {
  beforeEach(() => {
    cy.setToken();
    cy.intercept("GET", `${API()}/gastos`, { statusCode: 200, body: GASTOS_MOCK }).as("getGastos");
    cy.visit("/panel/gastos");
    cy.wait("@getGastos");
  });

  it("debería listar los gastos con sus datos correctos", () => {
    cy.contains("Pago de alquiler").should("be.visible");
    cy.contains("$25.000").should("be.visible");
    cy.contains("alquiler").should("be.visible");
    cy.contains("Servicio de luz").should("be.visible");
    cy.contains("$5.000").should("be.visible");
    cy.contains("$33.000").should("be.visible");
  });

  it("debería mostrar el total general en el encabezado", () => {
    cy.contains("3 gastos registrados").should("be.visible");
    cy.contains("Total: $33.000").should("be.visible");
  });

  it("debería filtrar por categoría", () => {
    cy.get("select").first().select("alquiler");
    cy.contains("Pago de alquiler").should("be.visible");
    cy.contains("Servicio de luz").should("not.exist");
    cy.contains("Flete proveedor").should("not.exist");
    cy.contains("1 gastos").should("be.visible");
    cy.contains("Subtotal: $25.000").should("be.visible");
  });

  it("debería filtrar por forma de pago", () => {
    cy.get("select").eq(1).select("efectivo");
    cy.contains("Servicio de luz").should("be.visible");
    cy.contains("Flete proveedor").should("be.visible");
    cy.contains("Pago de alquiler").should("not.exist");
  });

  it("debería filtrar por rango de fechas", () => {
    cy.get('input[type="date"]').first().type("2026-04-04");
    cy.get('input[type="date"]').last().type("2026-04-06");
    cy.contains("Servicio de luz").should("be.visible");
    cy.contains("Pago de alquiler").should("not.exist");
    cy.contains("Flete proveedor").should("not.exist");
  });

  it("debería limpiar los filtros", () => {
    cy.get("select").first().select("alquiler");
    cy.contains("button", "Limpiar").click();
    cy.contains("Pago de alquiler").should("be.visible");
    cy.contains("Servicio de luz").should("be.visible");
    cy.contains("Flete proveedor").should("be.visible");
  });

  it("debería mostrar errores si el formulario está vacío", () => {
    cy.contains("button", "Nuevo gasto").click();
    cy.contains("button", "Registrar gasto").click();
    cy.contains("La descripción es obligatoria").should("be.visible");
    cy.contains("El monto debe ser mayor a 0").should("be.visible");
  });

  it("debería crear un gasto correctamente", () => {
    cy.intercept("POST", `${API()}/gastos`, {
      statusCode: 201,
      body: { gasto: { id_gasto: 4, descripcion: "Papelería", monto: 800 } },
    }).as("crearGasto");

    cy.intercept("GET", `${API()}/gastos`, {
      statusCode: 200,
      body: [...GASTOS_MOCK, {
        id_gasto: 4, descripcion: "Papelería", categoria: "insumos",
        monto: 800, forma_pago: "efectivo", fecha: "2026-04-21T00:00:00.000Z",
      }],
    }).as("getGastosActualizado");

    cy.contains("button", "Nuevo gasto").click();
    cy.get('input[placeholder="Ej: Pago de alquiler enero"]').type("Papelería");
    cy.get('input[placeholder="0.00"]').type("800");
    cy.get('input[type="date"]').last().type("2026-04-21");
    cy.get("select").contains("Sin categoría").parent().select("insumos");
    cy.contains("button", "Registrar gasto").click();

    cy.wait("@crearGasto").then((interception) => {
      expect(interception.request.body.descripcion).to.eq("Papelería");
      expect(interception.request.body.monto).to.eq(800);
    });

    cy.wait("@getGastosActualizado");
    cy.contains("✅").should("be.visible");
  });

  it("debería abrir el modal de edición con los datos del gasto", () => {
    cy.contains("Pago de alquiler").closest("tr").within(() => {
      cy.get(".btn-editar").click();
    });
    cy.get('input[placeholder="Ej: Pago de alquiler enero"]').should("have.value", "Pago de alquiler");
    cy.get('input[placeholder="0.00"]').should("have.value", "25000");
  });

  it("debería eliminar un gasto tras confirmar", () => {
    cy.intercept("DELETE", `${API()}/gastos/1`, { statusCode: 200 }).as("eliminarGasto");
    cy.intercept("GET", `${API()}/gastos`, {
      statusCode: 200, body: GASTOS_MOCK.filter(g => g.id_gasto !== 1),
    }).as("getGastosSinPrimero");

    cy.contains("Pago de alquiler").closest("tr").within(() => {
      cy.get(".btn-eliminar").click();
    });
    cy.contains("button", "Sí, eliminar").click();
    cy.wait("@eliminarGasto");
    cy.wait("@getGastosSinPrimero");
    cy.contains("Pago de alquiler").should("not.exist");
  });
});