import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import "./Productos.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getAuthHeader() {
  const token = localStorage.getItem("token");
  // Si no hay token, devolvemos objeto vacío para no mandar "Bearer null"
  return token ? { Authorization: `Bearer ${token}` } : {};
}
const PRODUCTO_VACIO = {
  nombre: "",
  descripcion: "",
  id_categoria: "",
  // stock, precio_compra y precio_venta ELIMINADOS de acá
};

const VARIANTE_VACIA = {
  nombre_variante: "",
  stock: 0,
  precio_compra: 0,
  precio_venta: 0,
};

export default function Productos() {
  // ── Datos ────────────────────────────────────────────────
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ── Filtros ──────────────────────────────────────────────
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStockMin, setFiltroStockMin] = useState("");
  const [filtroStockMax, setFiltroStockMax] = useState("");

  // ── Modal producto ───────────────────────────────────────
  const [modalProducto, setModalProducto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [productoActual, setProductoActual] = useState(PRODUCTO_VACIO);

  // FIX: Estado separado para variantes para evitar pérdida de foco en inputs
  const [variantes, setVariantes] = useState([]);

  const [erroresForm, setErroresForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // ── Modal categorías ─────────────────────────────────────
  const [modalCategorias, setModalCategorias] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [errorCategoria, setErrorCategoria] = useState("");

  // ── Imágenes y otros ─────────────────────────────────────
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [productosRes, categoriasRes] = await Promise.all([
        axios.get(`${API_URL}/productos`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/categorias`, { headers: getAuthHeader() }),
      ]);
      console.log("DEBUG PRODUCTOS:", productosRes.data[0]);
      setProductos(productosRes.data);
      setCategorias(categoriasRes.data);
    } catch (err) {
      setError("No se pudieron cargar los datos.");
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ============================================================
  // FILTROS
  // FIX: productosFiltrados y limpiarFiltros estaban referenciados pero no definidos
  // ============================================================
  // 1. Primero filtramos los productos base
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const stockParaFiltrar = Number(p.stock_total ?? 0);
      const categoriaId = String(p.id_categoria ?? "");

      if (filtroCategoria && categoriaId !== String(filtroCategoria))
        return false;
      if (filtroStockMin !== "" && stockParaFiltrar < Number(filtroStockMin))
        return false;
      if (filtroStockMax !== "" && stockParaFiltrar > Number(filtroStockMax))
        return false;
      return true;
    });
  }, [productos, filtroCategoria, filtroStockMin, filtroStockMax]);
  const filasTabla = useMemo(() => {
    const filas = [];

    productosFiltrados.forEach((p) => {
      if (p.variantes && p.variantes.length > 0) {
        // Producto CON variantes: una fila por variante.
        // p.id_variante no existe en el raiz — precios/stock vienen del objeto variante.
        p.variantes.forEach((v, vIdx) => {
          const varKey =
            v.id_variante != null
              ? `prod-${p.id_producto}-var-${v.id_variante}`
              : `prod-${p.id_producto}-var-idx-${vIdx}`;
          filas.push({
            ...p,
            ...v,
            esVariante: true,
            stock: Number(v.stock) || 0,
            precio_venta: Number(v.precio_venta) || 0,
            precio_compra: Number(v.precio_compra) || 0,
            nombre_mostrar_variante: v.nombre_variante || "Sin nombre",
            keyUnique: varKey,
          });
        });
      } else {
        // Producto SIN variantes: una sola fila con los agregados del backend.
        filas.push({
          ...p,
          esVariante: false,
          stock: Number(p.stock_total) || 0,
          precio_compra: Number(p.precio_compra_min) || 0,
          precio_venta: Number(p.precio_min) || 0,
          nombre_mostrar_variante: "Estandar",
          keyUnique: `prod-${p.id_producto}-unico`,
        });
      }
    });

    return filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productosFiltrados]);
  const limpiarFiltros = () => {
    setFiltroCategoria("");
    setFiltroStockMin("");
    setFiltroStockMax("");
  };

  // ============================================================
  // LOGICA DE VARIANTES
  // FIX: Estado separado — evita re-render de productoActual y pérdida de foco
  // ============================================================
  const actualizarVariante = useCallback((index, campo, valor) => {
    setVariantes((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [campo]: valor } : v)),
    );
  }, []);

  const quitarVariante = useCallback((index) => {
    setVariantes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const agregarVariante = useCallback(() => {
    setVariantes((prev) => [...prev, { ...VARIANTE_VACIA }]);
  }, []);

  // ============================================================
  // VALIDACIÓN
  // FIX: ahora recibe variantes como parámetro y valida nombres vacíos
  // ============================================================
  function validarProducto(p, variantesActuales) {
    const err = {};

    if (!p.nombre.trim()) err.nombre = "El nombre es obligatorio";
    if (!p.id_categoria) err.id_categoria = "Seleccioná una categoría";

    // IMPORTANTE: Ahora siempre debe haber al menos una variante
    if (!variantesActuales || variantesActuales.length === 0) {
      err.variantes =
        "Debes agregar al menos una variante (ej: 'Único' o 'Talle M')";
    } else {
      const varianteInvalida = variantesActuales.some(
        (v) => !v.nombre_variante?.trim() || Number(v.precio_venta) <= 0,
      );
      if (varianteInvalida)
        err.variantes =
          "Todas las variantes deben tener nombre y precio de venta";
    }

    return err;
  }

  // ============================================================
  // HELPERS DE IMAGEN
  // FIX: revocar ObjectURL para evitar memory leaks
  // ============================================================
  const limpiarPreview = useCallback((urlActual) => {
    if (urlActual) URL.revokeObjectURL(urlActual);
  }, []);

  // ============================================================
  // MODALES abrir/cerrar
  // ============================================================
  const abrirCrear = () => {
    limpiarPreview(previewUrl);
    setImagenArchivo(null);
    setPreviewUrl(null);
    setProductoActual(PRODUCTO_VACIO);
    // Inicializamos con una variante vacía para facilitar la carga
    setVariantes([{ ...VARIANTE_VACIA, nombre_variante: "Único" }]);
    setErroresForm({});
    setModoEdicion(false);
    setModalProducto(true);
  };
  const abrirEditar = (producto) => {
    limpiarPreview(previewUrl);
    setImagenArchivo(null);
    setPreviewUrl(null);

    // Buscar el producto original para no perder imagen_url
    const productoOriginal =
      productos.find((p) => p.id_producto === producto.id_producto) || producto;
    const { variantes: variantesProducto, ...restoProducto } = productoOriginal;

    setProductoActual({
      ...restoProducto,
      descripcion: productoOriginal.descripcion || "",
    });
    setVariantes(variantesProducto || []);
    setErroresForm({});
    setModoEdicion(true);
    setModalProducto(true);
  };

  const cerrarModal = () => {
    // FIX: revocar URL de preview al cerrar
    limpiarPreview(previewUrl);
    setPreviewUrl(null);
    setImagenArchivo(null);
    setModalProducto(false);
    setErroresForm({});
    setMensajeExito("");
  };

  // ============================================================
  // GUARDAR (CREATE / UPDATE) - Versión Corregida
  // ============================================================
  const handleGuardar = async () => {
    const errores = validarProducto(productoActual, variantes);
    setErroresForm(errores);
    if (Object.keys(errores).length > 0) return;

    // 1. Obtención de headers (Authorization)
    const authHeaders = getAuthHeader();
    if (!authHeaders.Authorization) {
      setErroresForm({
        general: "Sesión expirada. Por favor, volvé a loguearte.",
      });
      return;
    }
    console.log(authHeaders);

    setGuardando(true);
    try {
      // 2. Construcción del FormData
      const formData = new FormData();
      formData.append("nombre", productoActual.nombre.trim());
      formData.append("descripcion", productoActual.descripcion.trim());
      formData.append("id_categoria", Number(productoActual.id_categoria));
      if (!imagenArchivo && productoActual.imagen_url) {
        formData.append("imagen_url", productoActual.imagen_url);
      }

      const tieneVariantes = variantes.length > 0;
      formData.append(
        "stock",
        tieneVariantes ? 0 : Number(productoActual.stock || 0),
      );
      formData.append(
        "precio_compra",
        tieneVariantes ? 0 : Number(productoActual.precio_compra || 0),
      );
      formData.append(
        "precio_venta",
        tieneVariantes ? 0 : Number(productoActual.precio_venta || 0),
      );

      // Importante para el backend: enviar variantes como string JSON
      formData.append("variantes", JSON.stringify(variantes));

      if (imagenArchivo) {
        formData.append("imagen", imagenArchivo);
      }

      // 3. Configuración de Axios — NO fijar Content-Type manualmente.
      // Axios detecta el FormData y genera el boundary correcto automáticamente.
      // Forzar "multipart/form-data" sin boundary rompe el parseo de Multer → 500.
      const config = { headers: { ...authHeaders } };

      // 4. Ejecución según el modo (POST o PUT)
      if (modoEdicion) {
        await axios.put(
          `${API_URL}/productos/${productoActual.id_producto}`,
          formData,
          config,
        );
        setMensajeExito("Producto actualizado correctamente");
      } else {
        await axios.post(`${API_URL}/productos`, formData, config);
        setMensajeExito("Producto creado correctamente");
      }

      // 5. Finalización exitosa
      await cargarDatos();
      setTimeout(() => cerrarModal(), 1200);
    } catch (err) {
      console.error("Error completo en handleGuardar:", err);
      // Intentamos capturar el detalle que pusimos en el backend
      const mensajeError =
        err.response?.data?.detalle ||
        err.response?.data?.error ||
        "Error al conectar con el servidor";

      setErroresForm({
        general: mensajeError,
      });
    } finally {
      setGuardando(false);
    }
  };

  // ============================================================
  // ELIMINAR PRODUCTO
  // ============================================================
  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    try {
      await axios.delete(
        `${API_URL}/productos/${confirmarEliminar.id_producto}`,
        {
          headers: getAuthHeader(),
        },
      );
      setConfirmarEliminar(null);
      await cargarDatos();
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  // ============================================================
  // CATEGORÍAS — crear
  // ============================================================
  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) {
      setErrorCategoria("El nombre es obligatorio");
      return;
    }
    setGuardandoCategoria(true);
    setErrorCategoria("");
    try {
      await axios.post(
        `${API_URL}/categorias`,
        { nombre: nuevaCategoria.trim() },
        { headers: getAuthHeader() },
      );
      setNuevaCategoria("");
      await cargarDatos();
    } catch (err) {
      setErrorCategoria(
        err.response?.data?.error || "Error al crear la categoría",
      );
    } finally {
      setGuardandoCategoria(false);
    }
  };

  // ============================================================
  // CATEGORÍAS — eliminar
  // ============================================================
  const handleEliminarCategoria = async (id) => {
    try {
      await axios.delete(`${API_URL}/categorias/${id}`, {
        headers: getAuthHeader(),
      });
      await cargarDatos();
    } catch (err) {
      setErrorCategoria(
        err.response?.data?.error || "Error al eliminar la categoría",
      );
    }
  };

  const hayFiltros =
    filtroCategoria || filtroStockMin !== "" || filtroStockMax !== "";

  // ============================================================
  // RENDERS DE ESTADO
  // ============================================================
  if (cargando) {
    return (
      <div className="prod-estado">
        <div className="spinner" />
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prod-estado prod-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={cargarDatos}>Reintentar</button>
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="productos-page">
      {/* ── ENCABEZADO ───────────────────────────────────── */}
      <div className="prod-header">
        <div>
          <h1>Productos</h1>
          <p>{productos.length} productos en total</p>
        </div>
        <div className="prod-header-acciones">
          <button
            className="btn-secundario"
            onClick={() => setModalCategorias(true)}
          >
            🏷️ Categorías
          </button>
          <button className="btn-primario" onClick={abrirCrear}>
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* ── FILTROS ──────────────────────────────────────── */}
      <div className="prod-filtros">
        <div className="filtro-grupo">
          <label>Categoría</label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Stock mínimo</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={filtroStockMin}
            onChange={(e) => setFiltroStockMin(e.target.value)}
          />
        </div>

        <div className="filtro-grupo">
          <label>Stock máximo</label>
          <input
            type="number"
            min="0"
            placeholder="999"
            value={filtroStockMax}
            onChange={(e) => setFiltroStockMax(e.target.value)}
          />
        </div>

        {hayFiltros && (
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            ✕ Limpiar filtros
          </button>
        )}
      </div>
      {/* ── TABLA DE PRODUCTOS ───────────────────────────── */}
      {productosFiltrados.length === 0 ? (
        <div className="prod-vacio">
          <span>📦</span>
          <p>No hay productos que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="prod-tabla-wrapper">
          <table className="prod-tabla">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Precio compra</th>
                <th>Precio venta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filasTabla.map((fila) => {
                // Nombres exactos según tu consola:
                const stock = Number(fila.stock) || 0;
                const precioCompra = Number(fila.precio_compra) || 0;
                const precioVenta = Number(fila.precio_venta) || 0;

                return (
                  <tr
                    key={fila.keyUnique}
                    className={stock < 5 ? "fila-alerta" : ""}
                  >
                    {/* IMAGEN */}
                    <td className="celda-foto">
                      {fila.imagen_url ? (
                        <img
                          src={
                            fila.imagen_url.startsWith("http")
                              ? fila.imagen_url
                              : `${API_URL}${fila.imagen_url}`
                          }
                          alt={fila.nombre}
                          className="mini-foto-tabla"
                        />
                      ) : (
                        <div className="sin-foto-mini">📷</div>
                      )}
                    </td>

                    {/* NOMBRE Y VARIANTE */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span
                          className="prod-nombre"
                          style={{ fontWeight: "bold", fontSize: "1rem" }}
                        >
                          {fila.nombre}
                        </span>
                        <span
                          className="prod-variante"
                          style={{
                            fontSize: "0.85rem",
                            color: "#007bff",
                            fontWeight: "500",
                          }}
                        >
                          • {fila.nombre_variante || "Único/General"}
                        </span>
                        {fila.descripcion && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#888",
                              fontStyle: "italic",
                            }}
                          >
                            {fila.descripcion}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CATEGORÍA */}
                    <td>
                      <span className="badge-categoria">
                        {fila.nombre_categoria || "Sin categoría"}
                      </span>
                    </td>

                    {/* STOCK - Usando stock_variante */}
                    <td>
                      <span
                        className={`badge-stock ${stock < 5 ? "stock-bajo" : "stock-ok"}`}
                      >
                        {stock}
                      </span>
                    </td>

                    {/* PRECIO COMPRA - Usando precio_compra_variante */}
                    <td>
                      $
                      {precioCompra.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    {/* PRECIO VENTA - Usando precio_venta_variante */}
                    <td>
                      <span style={{ fontWeight: "bold", color: "#2e7d32" }}>
                        $
                        {precioVenta.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td>
                      <div className="acciones">
                        <button
                          className="btn-editar"
                          onClick={() => abrirEditar(fila)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-eliminar"
                          onClick={() => setConfirmarEliminar(fila)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR PRODUCTO ───────────────── */}
      {modalProducto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar producto" : "Nuevo producto"}</h2>
              <button className="modal-cerrar" onClick={cerrarModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {mensajeExito && (
                <div className="alerta-exito">✅ {mensajeExito}</div>
              )}
              {erroresForm.general && (
                <div className="alerta-error">⚠️ {erroresForm.general}</div>
              )}

              <div className="form-grid">
                <div className="field-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={productoActual.nombre}
                    onChange={(e) =>
                      setProductoActual({
                        ...productoActual,
                        nombre: e.target.value,
                      })
                    }
                    className={erroresForm.nombre ? "input-error" : ""}
                  />
                  {erroresForm.nombre && (
                    <span className="campo-error">{erroresForm.nombre}</span>
                  )}
                </div>

                <div className="field-group">
                  <label>Categoría *</label>
                  <select
                    value={productoActual.id_categoria}
                    onChange={(e) =>
                      setProductoActual({
                        ...productoActual,
                        id_categoria: e.target.value,
                      })
                    }
                    className={erroresForm.id_categoria ? "input-error" : ""}
                  >
                    <option value="">Seleccioná una categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  {erroresForm.id_categoria && (
                    <span className="campo-error">
                      {erroresForm.id_categoria}
                    </span>
                  )}
                </div>
                {/* ── SECCIÓN DE VARIANTES ── */}
                <div className="field-group full-width">
                  <label className="label-variantes">
                    Variantes del Producto
                  </label>
                  <div className="variantes-panel">
                    {/* Encabezados de columna (opcional, ayuda visualmente) */}
                    {variantes.length > 0 && (
                      <div className="variantes-row">
                        <input placeholder="Nombre / talle" />
                        <input type="number" placeholder="Stock" />
                        <input type="number" placeholder="P. compra" />
                        <input type="number" placeholder="P. venta" />
                      </div>
                    )}

                    {variantes.map((v, index) => (
                      <div key={index} className="variante-row-card">
                        <div className="variante-inputs">
                          <input
                            className="input-nom-variante"
                            placeholder="Ej: Talle M o Azul"
                            value={v.nombre_variante}
                            onChange={(e) =>
                              actualizarVariante(
                                index,
                                "nombre_variante",
                                e.target.value,
                              )
                            }
                          />
                          <input
                            type="number"
                            className="input-stock-variante"
                            placeholder="Stock"
                            value={v.stock}
                            onChange={(e) =>
                              actualizarVariante(index, "stock", e.target.value)
                            }
                          />
                          <div className="input-with-symbol">
                            <span>$</span>
                            <input
                              type="number"
                              placeholder="Compra"
                              value={v.precio_compra}
                              onChange={(e) =>
                                actualizarVariante(
                                  index,
                                  "precio_compra",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="input-with-symbol">
                            <span>$</span>
                            <input
                              type="number"
                              placeholder="Venta"
                              value={v.precio_venta}
                              onChange={(e) =>
                                actualizarVariante(
                                  index,
                                  "precio_venta",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-eliminar-variante"
                          onClick={() => quitarVariante(index)}
                          title="Eliminar variante"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn-add-variante"
                      onClick={agregarVariante}
                    >
                      + Agregar talle, color o modelo
                    </button>

                    {erroresForm.variantes && (
                      <span className="campo-error">
                        {erroresForm.variantes}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── STOCK Y PRECIO BASE (Solo si NO hay variantes) ── */}
                {variantes.length === 0 && (
                  <div className="seccion-base-precios full-width">
                    <p className="ayuda-texto">
                      Este producto no tiene variantes, definí stock y precio
                      general:
                    </p>
                    <div className="form-grid-3">
                      <div className="field-group">
                        <label>Stock Total *</label>
                        <input
                          type="number"
                          value={productoActual.stock}
                          onChange={(e) =>
                            setProductoActual({
                              ...productoActual,
                              stock: e.target.value,
                            })
                          }
                          className={erroresForm.stock ? "input-error" : ""}
                        />
                      </div>
                      <div className="field-group">
                        <label>Precio Compra</label>
                        <input
                          type="number"
                          value={productoActual.precio_compra}
                          onChange={(e) =>
                            setProductoActual({
                              ...productoActual,
                              precio_compra: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="field-group">
                        <label>Precio Venta *</label>
                        <input
                          type="number"
                          value={productoActual.precio_venta}
                          onChange={(e) =>
                            setProductoActual({
                              ...productoActual,
                              precio_venta: e.target.value,
                            })
                          }
                          className={
                            erroresForm.precio_venta ? "input-error" : ""
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── IMAGEN ── */}
                <div className="field-group full-width">
                  <label>Imagen del producto</label>
                  <div className="upload-container">
                    <input
                      type="file"
                      id="input-foto"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          // FIX: revocar URL anterior antes de crear una nueva
                          limpiarPreview(previewUrl);
                          setImagenArchivo(file);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                    />

                    {(previewUrl ||
                      (modoEdicion && productoActual.imagen_url)) && (
                      <div className="preview-foto">
                        <img
                          src={previewUrl || productoActual.imagen_url}
                          alt="Preview"
                        />
                        <button
                          type="button"
                          className="btn-quitar-foto"
                          onClick={() => {
                            limpiarPreview(previewUrl);
                            setImagenArchivo(null);
                            setPreviewUrl(null);
                            if (modoEdicion)
                              setProductoActual({
                                ...productoActual,
                                imagen_url: null,
                              });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarModal}>
                Cancelar
              </button>
              <button
                className="btn-primario"
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : modoEdicion
                    ? "Guardar cambios"
                    : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: GESTIÓN DE CATEGORÍAS ─────────────────── */}
      {modalCategorias && (
        <div
          className="modal-overlay"
          onClick={() => setModalCategorias(false)}
        >
          <div
            className="modal modal-chico"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Categorías</h2>
              <button
                className="modal-cerrar"
                onClick={() => setModalCategorias(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="nueva-categoria">
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrearCategoria()}
                />
                <button
                  className="btn-primario"
                  onClick={handleCrearCategoria}
                  disabled={guardandoCategoria}
                >
                  {guardandoCategoria ? "..." : "Agregar"}
                </button>
              </div>
              {errorCategoria && (
                <span className="campo-error">{errorCategoria}</span>
              )}

              <ul className="lista-categorias">
                {categorias.length === 0 && (
                  <li className="cat-vacia">No hay categorías cargadas</li>
                )}
                {categorias.map((c) => (
                  <li key={c.id_categoria}>
                    <span>{c.nombre}</span>
                    <button
                      className="btn-eliminar"
                      onClick={() => handleEliminarCategoria(c.id_categoria)}
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR ELIMINACIÓN ─────────────────── */}
      {confirmarEliminar && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmarEliminar(null)}
        >
          <div
            className="modal modal-chico"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Eliminar producto</h2>
            </div>
            <div className="modal-body">
              <p>
                ¿Estás seguro que querés eliminar{" "}
                <strong>{confirmarEliminar.nombre}</strong>? Esta acción no se
                puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secundario"
                onClick={() => setConfirmarEliminar(null)}
              >
                Cancelar
              </button>
              <button className="btn-danger" onClick={handleEliminar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
