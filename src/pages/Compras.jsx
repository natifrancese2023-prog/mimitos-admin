// ============================================================
// COMPRAS.JSX - Gestión completa de compras a proveedores
// ============================================================
// ACTUALIZACIÓN: soporte para variantes de productos
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import "./Compras.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const FORMAS_PAGO = ["efectivo", "transferencia", "debito", "credito"];
const FORMA_PAGO_ICONO = {
  efectivo: "💵",
  transferencia: "🏦",
  debito: "💳",
  credito: "💳",
};

// Línea vacía incluye id_variante
const LINEA_VACIA = {
  id_producto: "",
  id_variante: null,
  cantidad: 1,
  precio_unitario: "",
};

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Modal nueva compra
  const [modalCompra, setModalCompra] = useState(false);
  const [idProveedor, setIdProveedor] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [estadoPago, setEstadoPago] = useState("pendiente");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }]);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [exitoCrear, setExitoCrear] = useState("");

  // Modal detalle
  const [compraDetalle, setCompraDetalle] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cambiandoPago, setCambiandoPago] = useState(false);
  const [nuevoEstadoPago, setNuevoEstadoPago] = useState("");
  const [nuevaFormaPago, setNuevaFormaPago] = useState("");

  // ── Carga ──────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [comprasRes, provRes, prodRes] = await Promise.all([
        axios.get(`${API_URL}/compras`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/proveedores`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/productos`, { headers: getAuthHeader() }),
      ]);
      setCompras(comprasRes.data);
      setProveedores(provRes.data);
      setProductos(prodRes.data);
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

  // ── Filtros ────────────────────────────────────────────
  const comprasFiltradas = useMemo(
    () =>
      compras.filter((c) => {
        if (
          filtroProveedor &&
          String(c.id_proveedor) !== String(filtroProveedor)
        )
          return false;
        if (filtroEstado && c.estado_pago !== filtroEstado) return false;
        return true;
      }),
    [compras, filtroProveedor, filtroEstado],
  );

  const hayFiltros = filtroProveedor || filtroEstado;

  const limpiarFiltros = useCallback(() => {
    setFiltroProveedor("");
    setFiltroEstado("");
  }, []);

  // ── Helper: variantes de un producto ──────────────────
  const getVariantesDeProducto = useCallback(
    (idProducto) => {
      if (!idProducto) return [];
      const prod = productos.find(
        (p) => String(p.id_producto) === String(idProducto),
      );
      return prod?.variantes?.length > 0 ? prod.variantes : [];
    },
    [productos],
  );

  // ── Líneas de compra ───────────────────────────────────
  const agregarLinea = useCallback(() => {
    setLineas((prev) => [...prev, { ...LINEA_VACIA }]);
  }, []);

  const eliminarLinea = useCallback((idx) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }, []);
const actualizarLinea = useCallback(
  (idx, campo, valor) => {
    setLineas((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;

        // 1. Normalizar el valor: si es un ID, pasarlo a número o null
        let valorNormalizado = valor;
        if (campo === "id_producto" || campo === "id_variante") {
          valorNormalizado = valor ? Number(valor) : null;
        }

        const nueva = { ...l, [campo]: valorNormalizado };

        // 2. Lógica cuando cambia el Producto
        if (campo === "id_producto") {
          nueva.id_variante = null; // Siempre resetear variante

          if (valorNormalizado) {
            const prod = productos.find(
              (p) => Number(p.id_producto) === valorNormalizado
            );

            // Si no tiene variantes, usamos su precio base
            if (prod?.precio_compra && (!prod.variantes || prod.variantes.length === 0)) {
              nueva.precio_unitario = prod.precio_compra;
            } else {
              nueva.precio_unitario = ""; // Obligar a elegir variante para ver precio
            }
          }
        }

        // 3. Lógica cuando cambia la Variante
        if (campo === "id_variante" && valorNormalizado) {
          const prod = productos.find(
            (p) => Number(p.id_producto) === Number(l.id_producto)
          );
          const variante = prod?.variantes?.find(
            (v) => Number(v.id_variante) === valorNormalizado
          );

          if (variante?.precio_compra) {
            nueva.precio_unitario = variante.precio_compra;
          } else if (prod?.precio_compra) {
            nueva.precio_unitario = prod.precio_compra;
          }
        }

        return nueva;
      })
    );
  },
  [productos]
);

  // ── Total preview ──────────────────────────────────────
  const calcularTotal = useMemo(
    () =>
      lineas.reduce((acc, l) => {
        if (!l.cantidad || !l.precio_unitario) return acc;
        return acc + Number(l.cantidad) * Number(l.precio_unitario);
      }, 0),
    [lineas],
  );

  // ── Crear compra ───────────────────────────────────────
  const handleCrear = useCallback(async () => {
    setErrorCrear("");
    setExitoCrear("");
    if (!idProveedor) {
      setErrorCrear("Seleccioná un proveedor");
      return;
    }
    if (lineas.length === 0) {
      setErrorCrear("Agregá al menos un producto");
      return;
    }

    for (const l of lineas) {
      if (!l.id_producto) {
        setErrorCrear("Completá todos los productos");
        return;
      }
      if (!l.cantidad || Number(l.cantidad) <= 0) {
        setErrorCrear("Las cantidades deben ser mayores a 0");
        return;
      }
      if (!l.precio_unitario || Number(l.precio_unitario) <= 0) {
        setErrorCrear("Los precios deben ser mayores a 0");
        return;
      }
      // Validar variante obligatoria si el producto la requiere
      const variantes = getVariantesDeProducto(l.id_producto);
      if (variantes.length > 0 && !l.id_variante) {
        setErrorCrear(
          "Seleccioná una variante para cada producto que la requiera",
        );
        return;
      }
    }

    setCreando(true);
    try {
      await axios.post(
        `${API_URL}/compras`,
        {
          id_proveedor: Number(idProveedor),
          forma_pago: formaPago || null,
          estado_pago: estadoPago,
          observaciones: observaciones || null,
          productos: lineas.map((l) => ({
            id_producto: Number(l.id_producto),
            cantidad: Number(l.cantidad),
            precio_unitario: Number(l.precio_unitario),
            // Enviar id_variante; null si el producto es simple
            id_variante: l.id_variante ? Number(l.id_variante) : null,
          })),
        },
        { headers: getAuthHeader() },
      );
      setExitoCrear("Compra registrada correctamente");
      await cargarDatos();
      setTimeout(() => cerrarModalCompra(), 1200);
    } catch (err) {
      setErrorCrear(
        err.response?.data?.error || "Error al registrar la compra",
      );
    } finally {
      setCreando(false);
    }
  }, [
    idProveedor,
    lineas,
    formaPago,
    estadoPago,
    observaciones,
    getVariantesDeProducto,
    cargarDatos,
  ]);

  const cerrarModalCompra = useCallback(() => {
    setModalCompra(false);
    setIdProveedor("");
    setFormaPago("");
    setEstadoPago("pendiente");
    setObservaciones("");
    setLineas([{ ...LINEA_VACIA }]);
    setErrorCrear("");
    setExitoCrear("");
  }, []);

  // ── Ver detalle ────────────────────────────────────────
  const abrirDetalle = useCallback(async (compra) => {
    setCompraDetalle(compra);
    setNuevoEstadoPago(compra.estado_pago);
    setNuevaFormaPago(compra.forma_pago || "");
    setCargandoDetalle(true);
    setDetalle([]);
    try {
      const res = await axios.get(
        `${API_URL}/compras/${compra.id_compra}/detalle`,
        { headers: getAuthHeader() },
      );
      setDetalle(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  const cerrarDetalle = useCallback(() => {
    setCompraDetalle(null);
    setDetalle([]);
  }, []);

  // ── Cambiar estado pago ────────────────────────────────
  const handleCambiarEstadoPago = useCallback(async () => {
    if (!compraDetalle) return;
    setCambiandoPago(true);
    try {
      await axios.put(
        `${API_URL}/compras/${compraDetalle.id_compra}/estado-pago`,
        { estado_pago: nuevoEstadoPago, forma_pago: nuevaFormaPago },
        { headers: getAuthHeader() },
      );
      setCompras((prev) =>
        prev.map((c) =>
          c.id_compra === compraDetalle.id_compra
            ? { ...c, estado_pago: nuevoEstadoPago, forma_pago: nuevaFormaPago }
            : c,
        ),
      );
      setCompraDetalle((prev) => ({
        ...prev,
        estado_pago: nuevoEstadoPago,
        forma_pago: nuevaFormaPago,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setCambiandoPago(false);
    }
  }, [compraDetalle, nuevoEstadoPago, nuevaFormaPago]);

  // ── Helpers ────────────────────────────────────────────
  const formatFecha = useCallback(
    (f) =>
      f
        ? new Date(f).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "—",
    [],
  );

  // ── Renders estado ─────────────────────────────────────
  if (cargando)
    return (
      <div className="comp-estado">
        <div className="spinner" />
        <p>Cargando compras...</p>
      </div>
    );
  if (error)
    return (
      <div className="comp-estado comp-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={cargarDatos}>Reintentar</button>
      </div>
    );

  return (
    <div className="compras-page">
      {/* ── ENCABEZADO ── */}
      <div className="comp-header">
        <div>
          <h1>Compras</h1>
          <p>{compras.length} compras registradas</p>
        </div>
        <button className="btn-primario" onClick={() => setModalCompra(true)}>
          + Nueva compra
        </button>
      </div>

      {/* ── RESUMEN ── */}
      <div className="comp-resumen">
        <div className="resumen-card">
          <span className="resumen-icono">📦</span>
          <span className="resumen-count">{compras.length}</span>
          <span className="resumen-label">Total compras</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-icono">🕐</span>
          <span className="resumen-count">
            {compras.filter((c) => c.estado_pago === "pendiente").length}
          </span>
          <span className="resumen-label">Pago pendiente</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-icono">✅</span>
          <span className="resumen-count">
            {compras.filter((c) => c.estado_pago === "pagado").length}
          </span>
          <span className="resumen-label">Pagadas</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-icono">💰</span>
          <span className="resumen-count">
            $
            {compras
              .reduce((a, c) => a + Number(c.total || 0), 0)
              .toLocaleString("es-AR")}
          </span>
          <span className="resumen-label">Total invertido</span>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="comp-filtros">
        <div className="filtro-grupo">
          <label>Proveedor</label>
          <select
            value={filtroProveedor}
            onChange={(e) => setFiltroProveedor(e.target.value)}
          >
            <option value="">Todos</option>
            {proveedores.map((p) => (
              <option key={p.id_proveedor} value={p.id_proveedor}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Estado de pago</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pendiente">🕐 Pendiente</option>
            <option value="pagado">✅ Pagado</option>
          </select>
        </div>
        {hayFiltros && (
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {hayFiltros && (
        <p className="comp-resultado">
          Mostrando {comprasFiltradas.length} de {compras.length} compras
        </p>
      )}

      {/* ── TABLA ── */}
      {comprasFiltradas.length === 0 ? (
        <div className="comp-vacio">
          <span>📦</span>
          <p>No hay compras registradas</p>
        </div>
      ) : (
        <div className="comp-tabla-wrapper">
          <table className="comp-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Total</th>
                <th>Forma pago</th>
                <th>Estado pago</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comprasFiltradas.map((c) => (
                <tr key={c.id_compra}>
                  <td>{formatFecha(c.fecha)}</td>
                  <td>
                    <span className="comp-proveedor">{c.proveedor_nombre}</span>
                  </td>
                  <td>
                    <strong>${Number(c.total).toLocaleString("es-AR")}</strong>
                  </td>
                  <td>
                    {FORMA_PAGO_ICONO[c.forma_pago] || "—"}{" "}
                    {c.forma_pago || "—"}
                  </td>
                  <td>
                    <span
                      className={`badge-pago ${c.estado_pago === "pagado" ? "pago-ok" : "pago-pendiente"}`}
                    >
                      {c.estado_pago === "pagado"
                        ? "✅ Pagado"
                        : "🕐 Pendiente"}
                    </span>
                  </td>
                  <td>
                    <button className="btn-ver" onClick={() => abrirDetalle(c)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL NUEVA COMPRA ── */}
      {modalCompra && (
        <div className="modal-overlay" onClick={cerrarModalCompra}>
          <div
            className="modal modal-grande"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Nueva compra</h2>
              <button className="modal-cerrar" onClick={cerrarModalCompra}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {exitoCrear && (
                <div className="alerta-exito">✅ {exitoCrear}</div>
              )}
              {errorCrear && (
                <div className="alerta-error">⚠️ {errorCrear}</div>
              )}

              <div className="form-grid-2">
                <div className="field-group">
                  <label>Proveedor *</label>
                  <select
                    value={idProveedor}
                    onChange={(e) => setIdProveedor(e.target.value)}
                  >
                    <option value="">Seleccioná un proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label>Estado de pago</label>
                  <select
                    value={estadoPago}
                    onChange={(e) => setEstadoPago(e.target.value)}
                  >
                    <option value="pendiente">🕐 Pendiente</option>
                    <option value="pagado">✅ Pagado</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Forma de pago</label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                  >
                    <option value="">Sin especificar</option>
                    {FORMAS_PAGO.map((f) => (
                      <option key={f} value={f}>
                        {FORMA_PAGO_ICONO[f]} {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label>Observaciones</label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <h3 className="lineas-titulo">Productos</h3>

              <div className="lineas-productos">
                {lineas.map((l, idx) => {
                  const variantesDisponibles = getVariantesDeProducto(
                    l.id_producto,
                  );
                  return (
                    <div className="linea-compra" key={idx}>
                      {/* Selector de producto */}
                      <select
                        value={l.id_producto}
                        onChange={(e) =>
                          actualizarLinea(idx, "id_producto", e.target.value)
                        }
                      >
                        <option value="">Seleccioná producto</option>
                        {productos.map((p) => (
                          <option
                            key={`prod-${p.id_producto}`}
                            value={p.id_producto}
                          >
                            {p.nombre}{" "}
                            {p.stock !== undefined ? `(Stock: ${p.stock})` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Selector de variante — solo si el producto tiene variantes */}
                      {variantesDisponibles.length > 0 && (
                        <select
                          value={l.id_variante ?? ""}
                          onChange={(e) =>
                            actualizarLinea(
                              idx,
                              "id_variante",
                              e.target.value || null,
                            )
                          }
                          className={
                            !l.id_variante
                              ? "select-variante select-variante--requerido"
                              : "select-variante"
                          }
                        >
                          <option value="">— Elegí variante —</option>
                          {variantesDisponibles.map((v) => (
                            <option key={v.id_variante} value={v.id_variante}>
                              {v.nombre_variante}
                              {v.stock !== undefined
                                ? ` (stock: ${v.stock})`
                                : ""}
                              {v.precio_compra
                                ? ` — $${Number(v.precio_compra).toLocaleString("es-AR")}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Cantidad */}
                      <input
                        type="number"
                        min="1"
                        value={l.cantidad}
                        onChange={(e) =>
                          actualizarLinea(idx, "cantidad", e.target.value)
                        }
                        placeholder="Cant."
                      />

                      {/* Precio unitario */}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.precio_unitario}
                        onChange={(e) =>
                          actualizarLinea(
                            idx,
                            "precio_unitario",
                            e.target.value,
                          )
                        }
                        placeholder="Precio unit."
                      />

                      {lineas.length > 1 && (
                        <button
                          className="btn-eliminar-linea"
                          onClick={() => eliminarLinea(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn-agregar-linea" onClick={agregarLinea}>
                + Agregar producto
              </button>

              {calcularTotal > 0 && (
                <div className="total-preview">
                  Total estimado:{" "}
                  <strong>${calcularTotal.toLocaleString("es-AR")}</strong>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarModalCompra}>
                Cancelar
              </button>
              <button
                className="btn-primario"
                onClick={handleCrear}
                disabled={creando}
              >
                {creando ? "Registrando..." : "Registrar compra"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {compraDetalle && (
        <div className="modal-overlay" onClick={cerrarDetalle}>
          <div
            className="modal modal-grande"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Compra #{compraDetalle.id_compra}</h2>
                <p className="modal-subtitulo">
                  {compraDetalle.proveedor_nombre} ·{" "}
                  {formatFecha(compraDetalle.fecha)}
                </p>
              </div>
              <button className="modal-cerrar" onClick={cerrarDetalle}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Cambiar estado pago */}
              <div className="detalle-pago-section">
                <label>Estado de pago</label>
                <div className="pago-controles">
                  <select
                    value={nuevoEstadoPago}
                    onChange={(e) => setNuevoEstadoPago(e.target.value)}
                  >
                    <option value="pendiente">🕐 Pendiente</option>
                    <option value="pagado">✅ Pagado</option>
                  </select>
                  <select
                    value={nuevaFormaPago}
                    onChange={(e) => setNuevaFormaPago(e.target.value)}
                  >
                    <option value="">Sin especificar</option>
                    {FORMAS_PAGO.map((f) => (
                      <option key={f} value={f}>
                        {FORMA_PAGO_ICONO[f]} {f}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primario"
                    onClick={handleCambiarEstadoPago}
                    disabled={cambiandoPago}
                  >
                    {cambiandoPago ? "Guardando..." : "Actualizar pago"}
                  </button>
                </div>
              </div>

              {/* Productos del detalle */}
              <h3 style={{ margin: "1.25rem 0 0.75rem" }}>
                Productos de la compra
              </h3>
              {cargandoDetalle ? (
                <div className="comp-estado">
                  <div className="spinner" />
                </div>
              ) : (
                <table className="detalle-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((d, i) => (
                      <tr key={i}>
                        <td>
                          {/* Mostrar variante entre paréntesis si el detalle la incluye */}
                          {d.variante_nombre
                            ? `${d.producto_nombre} (${d.variante_nombre})`
                            : d.producto_nombre}
                        </td>
                        <td>{d.cantidad}</td>
                        <td>
                          ${Number(d.precio_unitario).toLocaleString("es-AR")}
                        </td>
                        <td>${Number(d.subtotal).toLocaleString("es-AR")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="total-label">
                        Total
                      </td>
                      <td className="total-valor">
                        ${Number(compraDetalle.total).toLocaleString("es-AR")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
