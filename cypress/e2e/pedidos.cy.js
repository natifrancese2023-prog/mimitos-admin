// ============================================================
// PEDIDOS.CY.JS - Tests E2E para la gestión de Pedidos
// ============================================================
const API = Cypress.env("API_URL");
const PEDIDOS_MOCK = [
  {
    id_pedido: 1,
    id_cliente: 2,
    cliente_nombre: "Laura",
    cliente_apellido: "García",
    cliente_email: "laura@gmail.com",
    fecha: "2026-04-10T00:00:00.000Z",
    total: 5000,
    estado: "pendiente",
  },
  {
    id_pedido: 2,
    id_cliente: 3,
    cliente_nombre: "Carlos",
    cliente_apellido: "López",
    cliente_email: "carlos@gmail.com",
    fecha: "2026-04-12T00:00:00.000Z",
    total: 8500,
    estado: "entregado",
  },
];

const DETALLE_PEDIDO_1 = [
  {
    id_detalle: 1,
    id_pedido: 1,
    id_producto: 1,
    id_variante: 2,
    nombre_producto: "Pañal Pampers",
    nombre_variante: "Talle M",
    cantidad: 2,
    precio_unitario: 2500,
    subtotal: 5000,
  },
];

const CLIENTES_MOCK = [
  {
    id_usuario: 2,
    nombre: "Laura",
    apellido: "García",
    email: "laura@gmail.com",
    rol: "cliente",
  },
  {
    id_usuario: 3,
    nombre: "Carlos",
    apellido: "López",
    email: "carlos@gmail.com",
    rol: "cliente",
  },
];

const PRODUCTOS_PLANOS_MOCK = [
  {
    id_producto: 1,
    nombre: "Pañal Pampers",
    id_variante: 1,
    nombre_variante: "Talle M",
    precio_venta_variante: 2500,
    stock: 30,
  },
  {
    id_producto: 1,
    nombre: "Pañal Pampers",
    id_variante: 2,
    nombre_variante: "Talle G",
    precio_venta_variante: 2800,
    stock: 20,
  },
];

describe("Pedidos", () => {
  beforeEach(() => {
    cy.setToken();
    cy.intercept("GET", `${API()}/pedidos`, {
      statusCode: 200,
      body: PEDIDOS_MOCK,
    }).as("getPedidos");
    cy.intercept("GET", `${API()}/usuarios`, {
      statusCode: 200,
      body: CLIENTES_MOCK,
    }).as("getClientes");
    cy.intercept("GET", `${API()}/productos`, {
      statusCode: 200,
      body: PRODUCTOS_PLANOS_MOCK,
    }).as("getProductos");
    cy.visit("/panel/pedidos");
    cy.wait(["@getPedidos", "@getClientes", "@getProductos"]);
  });

  // ──────────────────────────────────────────────────────────
  // RENDERIZADO DE LA LISTA
  // ──────────────────────────────────────────────────────────
  it("debería mostrar la tabla con los pedidos del backend", () => {
    cy.contains("#1").should("be.visible");
    cy.contains("Laura García").should("be.visible");
    cy.contains("$5.000").should("be.visible");
    cy.contains("pendiente").should("be.visible");

    cy.contains("#2").should("be.visible");
    cy.contains("Carlos López").should("be.visible");
    cy.contains("$8.500").should("be.visible");
    cy.contains("entregado").should("be.visible");
  });

  it("debería mostrar el contador total de pedidos en el encabezado", () => {
    cy.contains("2 pedidos en total").should("be.visible");
  });

  it("debería mostrar las cards de resumen por estado", () => {
    // Hay 1 pendiente y 1 entregado en el mock
    cy.contains("pendiente").should("be.visible");
    cy.contains("entregado").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // FILTROS
  // ──────────────────────────────────────────────────────────
  it("debería filtrar por estado al seleccionar en el dropdown", () => {
    cy.get("select").first().select("pendiente");

    cy.contains("Laura García").should("be.visible");
    cy.contains("Carlos López").should("not.exist");

    cy.contains("Mostrando 1 de 2 pedidos").should("be.visible");
  });

  it("debería filtrar por cliente", () => {
    // Seleccionamos a Laura en el filtro de cliente
    cy.get("select").eq(1).select("2"); // id_usuario de Laura

    cy.contains("Laura García").should("be.visible");
    cy.contains("Carlos López").should("not.exist");
  });

  it("debería limpiar los filtros al hacer click en 'Limpiar'", () => {
    cy.get("select").first().select("pendiente");
    cy.contains("button", "Limpiar").click();

    // Vuelven a verse ambos pedidos
    cy.contains("Laura García").should("be.visible");
    cy.contains("Carlos López").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // DETALLE DEL PEDIDO
  // ──────────────────────────────────────────────────────────
  it("debería abrir el modal de detalle con los productos del pedido", () => {
    cy.intercept("GET", "/pedidos/1/detalle", {
      statusCode: 200,
      body: DETALLE_PEDIDO_1,
    }).as("getDetalle");

    // Hacemos click en "Ver detalle" del pedido #1
    cy.contains("Laura García")
      .closest("tr")
      .within(() => {
        cy.contains("Ver detalle").click();
      });

    cy.wait("@getDetalle");

    // El modal debe mostrar los datos del pedido
    cy.contains("Pedido #1").should("be.visible");
    cy.contains("Laura García").should("be.visible");
    cy.contains("Pañal Pampers").should("be.visible");
    cy.contains("Talle M").should("be.visible");
    cy.contains("$2.500").should("be.visible");
    cy.contains("2").should("be.visible"); // cantidad
    cy.contains("$5.000").should("be.visible"); // subtotal y total
  });

  // ──────────────────────────────────────────────────────────
  // CAMBIO DE ESTADO
  // ──────────────────────────────────────────────────────────
  it("debería cambiar el estado del pedido al hacer click en un botón de estado", () => {
    cy.intercept("GET", "/pedidos/1/detalle", {
      statusCode: 200,
      body: DETALLE_PEDIDO_1,
    }).as("getDetalle");

    cy.intercept("PUT", "/pedidos/1/estado", {
      statusCode: 200,
      body: {
        mensaje: "Estado actualizado",
        pedido: { ...PEDIDOS_MOCK[0], estado: "confirmado" },
      },
    }).as("cambiarEstado");

    // Abrimos el detalle
    cy.contains("Laura García")
      .closest("tr")
      .within(() => {
        cy.contains("Ver detalle").click();
      });

    cy.wait("@getDetalle");

    // Hacemos click en el botón "Confirmado"
    cy.contains("button", "Confirmado").click();

    cy.wait("@cambiarEstado").then((interception) => {
      expect(interception.request.body.estado).to.eq("confirmado");
    });
  });

  // ──────────────────────────────────────────────────────────
  // FACTURAR
  // ──────────────────────────────────────────────────────────
  it("debería mostrar el botón 'Facturar' solo para pedidos entregados", () => {
    // Pedido pendiente NO debe tener botón de facturar
    cy.contains("Laura García")
      .closest("tr")
      .within(() => {
        cy.contains("Facturar").should("not.exist");
      });

    // Pedido entregado SÍ debe tener botón de facturar
    cy.contains("Carlos López")
      .closest("tr")
      .within(() => {
        cy.contains("Facturar").should("be.visible");
      });
  });

  it("debería facturar un pedido entregado correctamente", () => {
    cy.intercept("POST", "/facturas", {
      statusCode: 201,
      body: { mensaje: "Factura creada", factura: { id_factura: 1 } },
    }).as("crearFactura");

    cy.intercept("GET", "/pedidos", {
      statusCode: 200,
      body: PEDIDOS_MOCK.map((p) =>
        p.id_pedido === 2 ? { ...p, estado: "facturado" } : p,
      ),
    }).as("getPedidosActualizados");

    // Abrimos el modal de facturar del pedido entregado
    cy.contains("Carlos López")
      .closest("tr")
      .within(() => {
        cy.contains("Facturar").click();
      });

    // Seleccionamos forma de pago
    cy.contains("button", "efectivo").click();

    // Confirmamos
    cy.contains("button", "Confirmar facturación").click();

    cy.wait("@crearFactura").then((interception) => {
      expect(interception.request.body.id_pedido).to.eq(2);
      expect(interception.request.body.forma_pago).to.eq("efectivo");
    });

    cy.contains("✅ Pedido facturado correctamente").should("be.visible");
  });

  it("debería mostrar error si se intenta facturar sin seleccionar forma de pago", () => {
    cy.contains("Carlos López")
      .closest("tr")
      .within(() => {
        cy.contains("Facturar").click();
      });

    // Confirmamos sin seleccionar forma de pago
    cy.contains("button", "Confirmar facturación").click();

    cy.contains("Seleccioná una forma de cobro").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // CREAR PEDIDO
  // ──────────────────────────────────────────────────────────
  it("debería abrir el modal de creación de pedido", () => {
    cy.contains("button", "Nuevo pedido").click();
    cy.contains("Nuevo pedido").should("be.visible");
    cy.contains("Seleccioná un cliente").should("be.visible");
  });

  it("debería calcular el total estimado al seleccionar variante y cantidad", () => {
    cy.contains("button", "Nuevo pedido").click();

    // Seleccionamos cliente
    cy.get("select").contains("Seleccioná un cliente").parent().select("2");

    // Seleccionamos variante (Pañal Pampers - Talle M — $2500)
    cy.get(".lineas-productos select").first().select("1"); // id_variante = 1

    // El total estimado debería ser $2.500 (1 unidad × $2.500)
    cy.contains("Total estimado")
      .parent()
      .contains("$2.500")
      .should("be.visible");

    // Cambiamos la cantidad a 2
    cy.get('input[type="number"]').first().clear().type("2");

    // El total debería actualizarse a $5.000
    cy.contains("Total estimado")
      .parent()
      .contains("$5.000")
      .should("be.visible");
  });

  it("debería crear un pedido válido y refrescar la lista", () => {
    cy.intercept("POST", "/pedidos", {
      statusCode: 201,
      body: {
        mensaje: "Pedido creado correctamente",
        id_pedido: 3,
        total: 2500,
      },
    }).as("crearPedido");

    cy.intercept("GET", "/pedidos", {
      statusCode: 200,
      body: [
        ...PEDIDOS_MOCK,
        {
          id_pedido: 3,
          id_cliente: 2,
          cliente_nombre: "Laura",
          cliente_apellido: "García",
          fecha: "2026-04-21T00:00:00.000Z",
          total: 2500,
          estado: "pendiente",
        },
      ],
    }).as("getPedidosNuevo");

    cy.contains("button", "Nuevo pedido").click();

    // Seleccionamos cliente
    cy.get("select").contains("Seleccioná un cliente").parent().select("2");

    // Seleccionamos variante
    cy.get(".lineas-productos select").first().select("1");

    cy.contains("button", "Crear Pedido").click();

    cy.wait("@crearPedido").then((interception) => {
      expect(interception.request.body.id_cliente).to.eq(2);
      expect(interception.request.body.productos).to.have.length(1);
      expect(interception.request.body.productos[0].precio_unitario).to.eq(
        2500,
      );
    });

    cy.contains("✅ Pedido creado correctamente").should("be.visible");
  });
});
