const API = () => Cypress.env("API_URL");

const COMPRAS_MOCK = [
  {
    id_compra: 1,
    id_proveedor: 1,
    proveedor_nombre: "Distribuidora Norte",
    fecha: "2026-04-10T00:00:00.000Z",
    total: 45000,
    forma_pago: "transferencia",
    estado_pago: "pagado",
  },
  {
    id_compra: 2,
    id_proveedor: 2,
    proveedor_nombre: "Bebés y Más S.A.",
    fecha: "2026-04-15T00:00:00.000Z",
    total: 18000,
    forma_pago: "efectivo",
    estado_pago: "pendiente",
  },
];

const PROVEEDORES_MOCK = [
  { id_proveedor: 1, nombre: "Distribuidora Norte" },
  { id_proveedor: 2, nombre: "Bebés y Más S.A." },
];

const PRODUCTOS_MOCK = [
  {
    id_producto: 1,
    nombre: "Pañal Pampers",
    variantes: [
      {
        id_variante: 1,
        variante_nombre: "Talle M",
        precio_venta: 2500,
        stock: 30,
      },
    ],
  },
];

describe("Compras", () => {
  beforeEach(() => {
    cy.setToken();
    cy.intercept("GET", `${API()}/compras`, {
      statusCode: 200,
      body: COMPRAS_MOCK,
    }).as("getCompras");
    cy.intercept("GET", `${API()}/proveedores`, {
      statusCode: 200,
      body: PROVEEDORES_MOCK,
    }).as("getProveedores");
    cy.intercept("GET", `${API()}/productos`, {
      statusCode: 200,
      body: PRODUCTOS_MOCK,
    }).as("getProductos");
    cy.visit("/panel/compras");
    cy.wait(["@getCompras", "@getProveedores", "@getProductos"]);
  });
  it("debería listar las compras con sus datos correctos", () => {
    cy.contains("Distribuidora Norte").should("be.visible");
    cy.contains("$45.000").should("be.visible");
    cy.contains("Bebés y Más S.A.").should("be.visible");
    cy.contains("$18.000").should("be.visible");
  });

  it("debería mostrar el detalle de la compra en el modal", () => {
    cy.intercept("GET", `${API()}/compras/1/detalle`, {
      statusCode: 200,
      body: [
        {
          producto_nombre: "Pañal Pampers",
          variante_nombre: "Talle M",
          cantidad: 20,
          precio_unitario: 1800,
          subtotal: 36000,
        },
      ],
    }).as("getDetalle");

    // FIX: el texto está en span.comp-proveedor dentro del td — closest("tr") funciona
    cy.contains(".comp-proveedor", "Distribuidora Norte")
      .closest("tr")
      .within(() => {
        cy.get(".btn-ver").click();
      });

    cy.wait("@getDetalle");
    cy.contains("Compra #1").should("be.visible");
    cy.contains("Pañal Pampers").should("be.visible");
  });

  it("debería filtrar por estado de pago", () => {
    // FIX: el orden en .comp-filtros es: primero Proveedor, segundo Estado
    // El value del option SÍ es "pagado" — funciona con select por value
    cy.get(".comp-filtros select").eq(1).select("pagado");

    cy.contains(".comp-proveedor", "Distribuidora Norte").should("be.visible");
    cy.contains(".comp-proveedor", "Bebés y Más S.A.").should("not.exist");
  });

  it("debería filtrar por proveedor", () => {
    // FIX: primer select es Proveedor — valor es el id_proveedor numérico como string
    cy.get(".comp-filtros select").first().select("2");

    cy.contains(".comp-proveedor", "Bebés y Más S.A.").should("be.visible");
    cy.contains(".comp-proveedor", "Distribuidora Norte").should("not.exist");
  });

  it("debería actualizar el estado de pago desde el modal de detalle", () => {
    cy.intercept("GET", `${API()}/compras/2/detalle`, {
      statusCode: 200,
      body: [
        {
          producto_nombre: "Mamadera Avent",
          variante_nombre: "Único",
          cantidad: 15,
          precio_unitario: 1200,
          subtotal: 18000,
        },
      ],
    }).as("getDetalle2");

    cy.intercept("PUT", `${API()}/compras/2/estado-pago`, {
      statusCode: 200,
      body: { mensaje: "Estado de pago actualizado" },
    }).as("cambiarEstadoPago");

    cy.contains(".comp-proveedor", "Bebés y Más S.A.")
      .closest("tr")
      .within(() => {
        cy.get(".btn-ver").click();
      });

    cy.wait("@getDetalle2");

    // Dentro del modal cambiamos el select de estado a "pagado"
    cy.get(".modal select[value='pendiente'], .modal select")
      .first()
      .select("pagado");
    cy.contains("button", "Actualizar pago").click();

    cy.wait("@cambiarEstadoPago").then((interception) => {
      expect(interception.request.body.estado_pago).to.eq("pagado");
    });
  });

  it("debería mostrar error si no se selecciona proveedor", () => {
    cy.contains("button", "Nueva compra").click();
    cy.contains("button", "Registrar compra").click();
    cy.contains("Seleccioná un proveedor").should("be.visible");
  });
});
