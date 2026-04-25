
// ============================================================
// PRODUCTOS.CY.JS — URLs completas del backend en todos los intercepts
// Rutas confirmadas:
//   GET  /productos        → listar
//   POST /productos        → crear (multipart/form-data con multer)
//   PUT  /productos/:id    → editar
//   DELETE /productos/:id  → eliminar
//   GET  /categorias       → listar categorías
// ============================================================
 
const API = () => Cypress.env("API_URL");
 
const PRODUCTOS_MOCK = [
  {
    id_producto: 1, nombre: "Pañal Pampers",
    descripcion: "Pañal de alta absorción",
    nombre_categoria: "Pañales", id_categoria: 1,
    stock_total: 50, precio_min: 2500,
    variantes: [
      { id_variante: 1, nombre_variante: "Talle M", stock: 30, precio_venta: 2500, precio_compra: 1800 },
      { id_variante: 2, nombre_variante: "Talle G", stock: 20, precio_venta: 2800, precio_compra: 2000 },
    ],
  },
  {
    id_producto: 2, nombre: "Mamadera Avent",
    descripcion: "Mamadera 260ml",
    nombre_categoria: "Accesorios", id_categoria: 2,
    stock_total: 15, precio_min: 1800,
    variantes: [
      { id_variante: 3, nombre_variante: "Único", stock: 15, precio_venta: 1800, precio_compra: 1200 },
    ],
  },
];
 
const CATEGORIAS_MOCK = [
  { id_categoria: 1, nombre: "Pañales" },
  { id_categoria: 2, nombre: "Accesorios" },
];


describe("Productos", () => {
  beforeEach(() => {
    cy.setToken(); // 1. token primero
 
    // 2. intercepts con URL completa del backend
    cy.intercept("GET", `${API()}/productos`, {
      statusCode: 200, body: PRODUCTOS_MOCK,
    }).as("getProductos");
 
    cy.intercept("GET", `${API()}/categorias`, {
      statusCode: 200, body: CATEGORIAS_MOCK,
    }).as("getCategorias");
 
    cy.visit("/panel/productos"); // 3. visit después del token
    cy.wait(["@getProductos", "@getCategorias"]); // 4. wait al final
  });
 
 
  // ──────────────────────────────────────────────────────────
  // RENDERIZADO DE LA LISTA
  // ──────────────────────────────────────────────────────────
  it("debería listar los productos con sus datos correctos", () => {
    cy.contains("Pañal Pampers").should("be.visible");
    cy.contains("Mamadera Avent").should("be.visible");
    cy.contains("Pañales").should("be.visible");
    cy.contains("50").should("be.visible");   // stock_total
    cy.contains("$2.500").should("be.visible"); // precio_min
    cy.contains("2 productos").should("be.visible");
  });

  it("debería mostrar las variantes del producto en la tabla", () => {
    // Las variantes se muestran dentro de la fila del producto
    cy.contains("Talle M").should("be.visible");
    cy.contains("Talle G").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // FILTROS
  // FIX: Productos NO tiene buscador de texto — solo filtros de categoría y stock
  // ──────────────────────────────────────────────────────────
  it("debería filtrar por categoría", () => {
    // El select de categoría filtra por id_categoria
    cy.get("select").first().select("1"); // id_categoria de Pañales

    cy.contains("Pañal Pampers").should("be.visible");
    cy.contains("Mamadera Avent").should("not.exist");
  });

  it("debería filtrar por stock mínimo", () => {
    // Input de stock mínimo — placeholder "0"
    cy.get('input[placeholder="0"]').clear().type("20");

    // Mamadera tiene stock 15, no debería aparecer
    cy.contains("Pañal Pampers").should("be.visible");
    cy.contains("Mamadera Avent").should("not.exist");
  });

  // ──────────────────────────────────────────────────────────
  // CREAR PRODUCTO
  // ──────────────────────────────────────────────────────────
  it("debería abrir el modal de creación al hacer click en '+ Nuevo producto'", () => {
    cy.contains("button", "Nuevo producto").click();
    cy.contains("Nuevo producto").should("be.visible");
    // El label del campo nombre dice "Nombre *"
    cy.contains("label", "Nombre *").should("be.visible");
  });

  it("debería mostrar error de validación si el nombre está vacío", () => {
    cy.contains("button", "Nuevo producto").click();
    cy.contains("button", "Crear producto").click();
    cy.contains("El nombre es obligatorio").should("be.visible");
  });

  it("debería crear un producto correctamente y refrescar la lista", () => {
    cy.intercept("POST", "/productos", {
      statusCode: 201,
      body: { mensaje: "Producto creado con éxito", id: 3 },
    }).as("crearProducto");

    cy.intercept("GET", "/productos", {
      statusCode: 200,
      body: [...PRODUCTOS_MOCK, {
        id_producto: 3, nombre: "Crema Johnsons",
        nombre_categoria: "Accesorios", id_categoria: 2,
        stock_total: 10, precio_min: 900,
        variantes: [{ id_variante: 4, nombre_variante: "Único", stock: 10, precio_venta: 900, precio_compra: 600 }],
      }],
    }).as("getProductosActualizado");

    cy.contains("button", "Nuevo producto").click();

    // FIX: el input de nombre NO tiene placeholder — se accede por su posición
    // Es el primer input type="text" dentro del modal
    cy.get('.modal input[type="text"]').first().type("Crema Johnsons");

    // Seleccionamos categoría por valor numérico
    cy.get(".modal select").first().select("2"); // id_categoria Accesorios

    // FIX: placeholders exactos de las variantes
    cy.get('input[placeholder="Ej: Talle M o Azul"]').first().type("Único");
    cy.get('input[placeholder="Stock"]').first().type("10");
    cy.get('input[placeholder="Compra"]').first().type("600");
    cy.get('input[placeholder="Venta"]').first().type("900");

    cy.contains("button", "Crear producto").click();

    cy.wait("@crearProducto");
    cy.wait("@getProductosActualizado");
    cy.contains("✅").should("be.visible");
  });

  // ──────────────────────────────────────────────────────────
  // EDITAR PRODUCTO
  // ──────────────────────────────────────────────────────────
  it("debería abrir el modal de edición con los datos del producto", () => {
    cy.contains("Pañal Pampers")
      .closest("tr")
      .within(() => {
        cy.get(".btn-editar").click();
      });

    cy.contains("Editar producto").should("be.visible");
    // FIX: el input de nombre no tiene placeholder, verificamos su valor
    cy.get('.modal input[type="text"]').first().should("have.value", "Pañal Pampers");
  });

  // ──────────────────────────────────────────────────────────
  // ELIMINAR PRODUCTO
  // ──────────────────────────────────────────────────────────
  it("debería mostrar modal de confirmación antes de eliminar", () => {
    cy.contains("Pañal Pampers")
      .closest("tr")
      .within(() => {
        cy.get(".btn-eliminar").click();
      });

    cy.contains("¿Estás seguro").should("be.visible");
    cy.contains("button", "Sí, eliminar").should("be.visible");
    cy.contains("button", "Cancelar").should("be.visible");
  });

  it("debería cancelar la eliminación al hacer click en Cancelar", () => {
    cy.contains("Pañal Pampers")
      .closest("tr")
      .within(() => {
        cy.get(".btn-eliminar").click();
      });

    cy.contains("button", "Cancelar").click();
    cy.contains("Pañal Pampers").should("be.visible");
  });

  it("debería eliminar el producto y actualizar la lista", () => {
    cy.intercept("DELETE", "/productos/1", {
      statusCode: 200,
      body: { mensaje: "Producto eliminado correctamente" },
    }).as("eliminarProducto");

    cy.intercept("GET", "/productos", {
      statusCode: 200,
      body: [PRODUCTOS_MOCK[1]],
    }).as("getProductosSinPrimero");

    cy.contains("Pañal Pampers")
      .closest("tr")
      .within(() => {
        cy.get(".btn-eliminar").click();
      });

    cy.contains("button", "Sí, eliminar").click();

    cy.wait("@eliminarProducto");
    cy.wait("@getProductosSinPrimero");

    cy.contains("Pañal Pampers").should("not.exist");
    cy.contains("Mamadera Avent").should("be.visible");
  });
});