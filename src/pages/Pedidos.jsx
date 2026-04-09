// ============================================================
// PEDIDOS.JSX - Gestión completa de pedidos para el dueño
// ============================================================
// ACTUALIZACIÓN: soporte para variantes de productos
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import "./Pedidos.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

const ESTADOS = ["pendiente", "confirmado", "entregado", "cancelado", "facturado"];

const ESTADO_CLASE = {
  pendiente:  "estado-pendiente",
  confirmado: "estado-confirmado",
  entregado:  "estado-entregado",
  cancelado:  "estado-cancelado",
  facturado:  "estado-facturado",
};

const ESTADO_ICONO = {
  pendiente:  "🕐",
  confirmado: "✅",
  entregado:  "📦",
  cancelado:  "❌",
  facturado:  "🧾",
};

const FORMAS_PAGO = ["efectivo", "debito", "credito", "transferencia"];
const FORMA_PAGO_ICONO = { efectivo: "💵", debito: "💳", credito: "💳", transferencia: "🏦" };

// Línea vacía ahora incluye id_variante
const LINEA_VACIA = { id_producto: "", id_variante: null, cantidad: 1 };

export default function Pedidos() {
  const [pedidos, setPedidos]     = useState([]);
  const [clientes, setClientes]   = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState("");

  const [filtroEstado,     setFiltroEstado]     = useState("");
  const [filtroCliente,    setFiltroCliente]    = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const [pedidoDetalle,   setPedidoDetalle]   = useState(null);
  const [detalle,         setDetalle]         = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const [modalFacturar,   setModalFacturar]   = useState(false);
  const [pedidoAFacturar, setPedidoAFacturar] = useState(null);
  const [formaPagoFact,   setFormaPagoFact]   = useState("");
  const [obsFact,         setObsFact]         = useState("");
  const [facturando,      setFacturando]      = useState(false);
  const [errorFact,       setErrorFact]       = useState("");
  const [exitoFact,       setExitoFact]       = useState("");

  const [modalCrear,     setModalCrear]     = useState(false);
  const [idClienteNuevo, setIdClienteNuevo] = useState("");
  const [lineas,         setLineas]         = useState([{ ...LINEA_VACIA }]);
  const [creando,        setCreando]        = useState(false);
  const [errorCrear,     setErrorCrear]     = useState("");
  const [exitoCrear,     setExitoCrear]     = useState("");

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  const cargarDatos = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [pedidosRes, clientesRes, productosRes] = await Promise.all([
        axios.get(`${API_URL}/pedidos`,   { headers: getAuthHeader() }),
        axios.get(`${API_URL}/usuarios`,  { headers: getAuthHeader() }),
        axios.get(`${API_URL}/productos`, { headers: getAuthHeader() }),
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data.filter(u => u.rol === "cliente"));
      setProductos(productosRes.data);
    } catch (err) {
      setError("No se pudieron cargar los datos.");
      console.error(err);
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ============================================================
  // FILTROS — useMemo para evitar recálculo en cada render
  // ============================================================
  const pedidosFiltrados = useMemo(() => pedidos.filter((p) => {
    if (filtroEstado && p.estado !== filtroEstado) return false;
    if (filtroCliente && String(p.id_usuario) !== String(filtroCliente)) return false;
    if (filtroFechaDesde) {
      const fecha = new Date(p.fecha).toISOString().split("T")[0];
      if (fecha < filtroFechaDesde) return false;
    }
    if (filtroFechaHasta) {
      const fecha = new Date(p.fecha).toISOString().split("T")[0];
      if (fecha > filtroFechaHasta) return false;
    }
    return true;
  }), [pedidos, filtroEstado, filtroCliente, filtroFechaDesde, filtroFechaHasta]);

  const hayFiltros = filtroEstado || filtroCliente || filtroFechaDesde || filtroFechaHasta;

  const limpiarFiltros = useCallback(() => {
    setFiltroEstado("");
    setFiltroCliente("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
  }, []);

  // ============================================================
  // DETALLE
  // ============================================================
  const abrirDetalle = useCallback(async (pedido) => {
    setPedidoDetalle(pedido); setCargandoDetalle(true); setDetalle([]);
    try {
      const res = await axios.get(
        `${API_URL}/pedidos/${pedido.id_pedido}/detalle`,
        { headers: getAuthHeader() }
      );
      setDetalle(res.data);
    } catch (err) { console.error(err); }
    finally { setCargandoDetalle(false); }
  }, []);

  const cerrarDetalle = useCallback(() => {
    setPedidoDetalle(null);
    setDetalle([]);
  }, []);

  const handleCambiarEstado = useCallback(async (nuevoEstado) => {
    if (!pedidoDetalle) return;
    setCambiandoEstado(true);
    try {
      await axios.put(
        `${API_URL}/pedidos/${pedidoDetalle.id_pedido}/estado`,
        { estado: nuevoEstado },
        { headers: getAuthHeader() }
      );
      setPedidos(prev =>
        prev.map(p =>
          p.id_pedido === pedidoDetalle.id_pedido ? { ...p, estado: nuevoEstado } : p
        )
      );
      setPedidoDetalle(prev => ({ ...prev, estado: nuevoEstado }));
    } catch (err) { console.error(err); }
    finally { setCambiandoEstado(false); }
  }, [pedidoDetalle]);

  // ============================================================
  // FACTURAR
  // ============================================================
  const abrirFacturar = useCallback((pedido) => {
    setPedidoAFacturar(pedido); setFormaPagoFact(""); setObsFact("");
    setErrorFact(""); setExitoFact(""); setModalFacturar(true);
  }, []);

  const cerrarFacturar = useCallback(() => {
    setModalFacturar(false); setPedidoAFacturar(null);
    setFormaPagoFact(""); setObsFact(""); setErrorFact(""); setExitoFact("");
  }, []);

  const handleFacturar = useCallback(async () => {
    setErrorFact("");
    if (!formaPagoFact) { setErrorFact("Seleccioná una forma de cobro"); return; }
    setFacturando(true);
    try {
      await axios.post(`${API_URL}/facturas`, {
        id_pedido: pedidoAFacturar.id_pedido,
        forma_pago: formaPagoFact,
        observaciones: obsFact || null,
      }, { headers: getAuthHeader() });
      setExitoFact("Pedido facturado correctamente");
      await cargarDatos();
      setTimeout(() => cerrarFacturar(), 1200);
    } catch (err) {
      setErrorFact(err.response?.data?.error || "Error al facturar el pedido");
    } finally { setFacturando(false); }
  }, [formaPagoFact, obsFact, pedidoAFacturar, cargarDatos, cerrarFacturar]);

  // ============================================================
  // LINEAS DEL NUEVO PEDIDO — con soporte de variantes
  // ============================================================
  const agregarLinea = useCallback(() => {
    setLineas(prev => [...prev, { ...LINEA_VACIA }]);
  }, []);

  const actualizarLinea = useCallback((idx, campo, valor) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      // Si cambia el producto, resetear la variante seleccionada
      if (campo === "id_producto") {
        return { ...l, id_producto: valor, id_variante: null };
      }
      return { ...l, [campo]: valor };
    }));
  }, []);

  const eliminarLinea = useCallback((idx) => {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Helper: obtener variantes del producto seleccionado en una línea
  const getVariantesDeLinea = useCallback((idProducto) => {
    if (!idProducto) return [];
    const prod = productos.find(p => String(p.id_producto) === String(idProducto));
    return prod?.variantes?.length > 0 ? prod.variantes : [];
  }, [productos]);

  // Calcula total del preview teniendo en cuenta variantes
  const calcularTotalPreview = useMemo(() => {
    return lineas.reduce((acc, l) => {
      const prod = productos.find(p => String(p.id_producto) === String(l.id_producto));
      if (!prod || !l.cantidad) return acc;

      // Si el producto tiene variantes y hay una seleccionada, usar su precio
      let precio = Number(prod.precio_venta);
      if (prod.variantes?.length > 0 && l.id_variante) {
        const variante = prod.variantes.find(v => String(v.id_variante) === String(l.id_variante));
        if (variante?.precio_venta) precio = Number(variante.precio_venta);
      }

      return acc + precio * Number(l.cantidad);
    }, 0);
  }, [lineas, productos]);

  // ============================================================
  // CREAR PEDIDO
  // ============================================================
  const handleCrearPedido = useCallback(async () => {
    setErrorCrear(""); setExitoCrear("");
    if (!idClienteNuevo) { setErrorCrear("Seleccioná un cliente"); return; }

    for (const l of lineas) {
      if (!l.id_producto) { setErrorCrear("Completá todos los productos"); return; }
      if (!l.cantidad || Number(l.cantidad) <= 0) {
        setErrorCrear("Las cantidades deben ser mayores a 0");
        return;
      }
      // Validar que si el producto tiene variantes, se haya seleccionado una
      const variantes = getVariantesDeLinea(l.id_producto);
      if (variantes.length > 0 && !l.id_variante) {
        setErrorCrear("Seleccioná una variante para cada producto que la requiera");
        return;
      }
    }

    setCreando(true);
    try {
      await axios.post(`${API_URL}/pedidos`, {
        id_cliente: Number(idClienteNuevo),
        // Enviar id_variante en cada item; null si el producto no tiene variantes
        productos: lineas.map(l => ({
          id_producto: Number(l.id_producto),
          cantidad: Number(l.cantidad),
          id_variante: l.id_variante ? Number(l.id_variante) : null,
        })),
      }, { headers: getAuthHeader() });
      setExitoCrear("Pedido creado correctamente");
      await cargarDatos();
      setTimeout(() => cerrarModalCrear(), 1200);
    } catch (err) {
      setErrorCrear(err.response?.data || "Error al crear el pedido");
    } finally { setCreando(false); }
  }, [idClienteNuevo, lineas, getVariantesDeLinea, cargarDatos]);

  const cerrarModalCrear = useCallback(() => {
    setModalCrear(false); setIdClienteNuevo("");
    setLineas([{ ...LINEA_VACIA }]); setErrorCrear(""); setExitoCrear("");
  }, []);

  // ============================================================
  // HELPERS
  // ============================================================
  const formatFecha = useCallback((fecha) => {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }, []);

  // ============================================================
  // RENDERS DE ESTADO
  // ============================================================
  if (cargando) return (
    <div className="ped-estado"><div className="spinner"/><p>Cargando pedidos...</p></div>
  );
  if (error) return (
    <div className="ped-estado ped-error">
      <span>⚠️</span><p>{error}</p>
      <button onClick={cargarDatos}>Reintentar</button>
    </div>
  );

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="pedidos-page">

      {/* ── ENCABEZADO ── */}
      <div className="ped-header">
        <div><h1>Pedidos</h1><p>{pedidos.length} pedidos en total</p></div>
        <button className="btn-primario" onClick={() => setModalCrear(true)}>
          + Nuevo pedido
        </button>
      </div>

      {/* ── FILTROS ── */}
      <div className="ped-filtros">
        <div className="filtro-grupo">
          <label>Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map(e => (
              <option key={e} value={e}>
                {ESTADO_ICONO[e]} {e.charAt(0).toUpperCase() + e.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Cliente</label>
          <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="">Todos</option>
            {clientes.map(c => (
              <option key={c.id_usuario} value={c.id_usuario}>
                {c.nombre} {c.apellido}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Desde</label>
          <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)}/>
        </div>
        <div className="filtro-grupo">
          <label>Hasta</label>
          <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)}/>
        </div>
        {hayFiltros && (
          <button className="btn-limpiar" onClick={limpiarFiltros}>✕ Limpiar</button>
        )}
      </div>

      {hayFiltros && (
        <p className="ped-resultado">
          Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
        </p>
      )}

      {/* ── CARDS RESUMEN ── */}
      <div className="ped-resumen">
        {ESTADOS.map(est => (
          <div
            key={est}
            className={`resumen-card ${ESTADO_CLASE[est]} ${filtroEstado === est ? "activo" : ""}`}
            onClick={() => setFiltroEstado(filtroEstado === est ? "" : est)}
          >
            <span className="resumen-icono">{ESTADO_ICONO[est]}</span>
            <span className="resumen-count">{pedidos.filter(p => p.estado === est).length}</span>
            <span className="resumen-label">{est.charAt(0).toUpperCase() + est.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* ── TABLA ── */}
      {pedidosFiltrados.length === 0 ? (
        <div className="ped-vacio"><span>🛒</span><p>No hay pedidos que coincidan</p></div>
      ) : (
        <div className="ped-tabla-wrapper">
          <table className="ped-tabla">
            <thead>
              <tr>
                <th>#</th><th>Cliente</th><th>Fecha</th>
                <th>Total</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map(p => (
                <tr key={p.id_pedido}>
                  <td className="ped-id">#{p.id_pedido}</td>
                  <td>
                    <span className="ped-cliente-nombre">
                      {p.cliente_nombre} {p.cliente_apellido}
                    </span>
                    <span className="ped-cliente-email">{p.cliente_email}</span>
                  </td>
                  <td>{formatFecha(p.fecha)}</td>
                  <td className="ped-total">${Number(p.total).toLocaleString("es-AR")}</td>
                  <td>
                    <span className={`badge-estado ${ESTADO_CLASE[p.estado]}`}>
                      {ESTADO_ICONO[p.estado]} {p.estado}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <button className="btn-ver" onClick={() => abrirDetalle(p)}>
                        Ver detalle
                      </button>
                      {p.estado === "entregado" && (
                        <button className="btn-facturar" onClick={() => abrirFacturar(p)}>
                          🧾 Facturar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {pedidoDetalle && (
        <div className="modal-overlay" onClick={cerrarDetalle}>
          <div className="modal modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Pedido #{pedidoDetalle.id_pedido}</h2>
                <p className="modal-subtitulo">
                  {pedidoDetalle.cliente_nombre} {pedidoDetalle.cliente_apellido}
                  {" · "}{formatFecha(pedidoDetalle.fecha)}
                </p>
              </div>
              <button className="modal-cerrar" onClick={cerrarDetalle}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detalle-estado-section">
                <label>Estado del pedido</label>
                <div className="estado-botones">
                  {ESTADOS.filter(e => e !== "facturado").map(est => (
                    <button
                      key={est}
                      className={`btn-estado ${ESTADO_CLASE[est]} ${pedidoDetalle.estado === est ? "activo" : ""}`}
                      onClick={() => handleCambiarEstado(est)}
                      disabled={
                        cambiandoEstado ||
                        pedidoDetalle.estado === est ||
                        pedidoDetalle.estado === "facturado"
                      }
                    >
                      {ESTADO_ICONO[est]} {est.charAt(0).toUpperCase() + est.slice(1)}
                    </button>
                  ))}
                </div>
                {pedidoDetalle.estado === "entregado" && (
                  <div className="facturar-aviso">
                    🧾 Este pedido está listo para facturar.
                    <button
                      className="btn-facturar-inline"
                      onClick={() => { cerrarDetalle(); abrirFacturar(pedidoDetalle); }}
                    >
                      Facturar ahora
                    </button>
                  </div>
                )}
                {pedidoDetalle.estado === "facturado" && (
                  <div className="facturado-aviso">✅ Este pedido ya fue facturado.</div>
                )}
              </div>

              <div className="detalle-productos">
                <h3>Productos</h3>
                {cargandoDetalle ? (
                  <div className="ped-estado"><div className="spinner"/></div>
                ) : (
                  <table className="detalle-tabla">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Precio unit.</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.map((d, i) => (
                        <tr key={i}>
                          <td>
                            {d.producto_nombre}
                            {/* Mostrar nombre de variante si el detalle la incluye */}
                            {d.variante_nombre && (
                              <span className="badge-variante-detalle">
                                {d.variante_nombre}
                              </span>
                            )}
                          </td>
                          <td>${Number(d.precio_venta).toLocaleString("es-AR")}</td>
                          <td>{d.cantidad}</td>
                          <td>${Number(d.subtotal).toLocaleString("es-AR")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="total-label">Total</td>
                        <td className="total-valor">
                          ${Number(pedidoDetalle.total).toLocaleString("es-AR")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FACTURAR ── */}
      {modalFacturar && pedidoAFacturar && (
        <div className="modal-overlay" onClick={cerrarFacturar}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Facturar pedido #{pedidoAFacturar.id_pedido}</h2>
                <p className="modal-subtitulo">
                  {pedidoAFacturar.cliente_nombre} {pedidoAFacturar.cliente_apellido}
                  {" · "}Total: ${Number(pedidoAFacturar.total).toLocaleString("es-AR")}
                </p>
              </div>
              <button className="modal-cerrar" onClick={cerrarFacturar}>✕</button>
            </div>
            <div className="modal-body">
              {exitoFact && <div className="alerta-exito">✅ {exitoFact}</div>}
              {errorFact && <div className="alerta-error">⚠️ {errorFact}</div>}
              <div className="form-col">
                <div className="field-group">
                  <label>Forma de cobro *</label>
                  <div className="formas-pago-grid">
                    {FORMAS_PAGO.map(f => (
                      <button
                        key={f}
                        className={`btn-forma-pago ${formaPagoFact === f ? "activo" : ""}`}
                        onClick={() => setFormaPagoFact(f)}
                      >
                        <span>{FORMA_PAGO_ICONO[f]}</span>
                        <span>{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label>Observaciones</label>
                  <input
                    type="text"
                    value={obsFact}
                    onChange={e => setObsFact(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="factura-resumen">
                <span>Total a cobrar</span>
                <strong>${Number(pedidoAFacturar.total).toLocaleString("es-AR")}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarFacturar}>Cancelar</button>
              <button
                className="btn-facturar-confirm"
                onClick={handleFacturar}
                disabled={facturando}
              >
                {facturando ? "Facturando..." : "🧾 Confirmar facturación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR PEDIDO ── */}
      {modalCrear && (
        <div className="modal-overlay" onClick={cerrarModalCrear}>
          <div className="modal modal-grande" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo pedido</h2>
              <button className="modal-cerrar" onClick={cerrarModalCrear}>✕</button>
            </div>

            <div className="modal-body">
              {exitoCrear && <div className="alerta-exito">✅ {exitoCrear}</div>}
              {errorCrear && <div className="alerta-error">⚠️ {errorCrear}</div>}

              <div className="field-group" style={{ marginBottom: "1.2rem" }}>
                <label>Cliente *</label>
                <select
                  value={idClienteNuevo}
                  onChange={e => setIdClienteNuevo(e.target.value)}
                >
                  <option value="">Seleccioná un cliente</option>
                  {clientes.map(c => (
                    <option key={c.id_usuario} value={c.id_usuario}>
                      {c.nombre} {c.apellido} — {c.email}
                    </option>
                  ))}
                </select>
              </div>

              <h3 style={{ marginBottom: "0.75rem" }}>Productos</h3>

              <div className="lineas-productos">
                {lineas.map((l, idx) => {
                  const variantesDisponibles = getVariantesDeLinea(l.id_producto);
                  return (
                    <div className="linea-producto" key={idx}>

                      {/* Selector de producto */}
                      <select
                        value={l.id_producto}
                        onChange={e => actualizarLinea(idx, "id_producto", e.target.value)}
                      >
                        <option value="">Seleccioná un producto</option>
                        {productos.map(p => (
                          <option key={p.id_producto} value={p.id_producto}>
                            {p.nombre}
                            {p.variantes?.length > 0 ? ` (${p.variantes.length} variantes)` : ""}
                            {" — "}${Number(p.precio_venta).toLocaleString("es-AR")}
                          </option>
                        ))}
                      </select>

                      {/* Selector de variante — aparece solo si el producto tiene variantes */}
                      {variantesDisponibles.length > 0 && (
                        <select
                          value={l.id_variante ?? ""}
                          onChange={e =>
                            actualizarLinea(idx, "id_variante", e.target.value || null)
                          }
                          className={!l.id_variante ? "select-variante select-variante--requerido" : "select-variante"}
                        >
                          <option value="">— Elegí una variante —</option>
                          {variantesDisponibles.map(v => (
                            <option key={v.id_variante} value={v.id_variante}>
                              {v.nombre_variante}
                              {v.stock !== undefined ? ` (stock: ${v.stock})` : ""}
                              {v.precio_venta ? ` — $${Number(v.precio_venta).toLocaleString("es-AR")}` : ""}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Cantidad */}
                      <input
                        type="number"
                        min="1"
                        value={l.cantidad}
                        onChange={e => actualizarLinea(idx, "cantidad", e.target.value)}
                        placeholder="Cant."
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

              {calcularTotalPreview > 0 && (
                <div className="total-preview">
                  Total estimado:{" "}
                  <strong>${calcularTotalPreview.toLocaleString("es-AR")}</strong>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarModalCrear}>Cancelar</button>
              <button
                className="btn-primario"
                onClick={handleCrearPedido}
                disabled={creando}
              >
                {creando ? "Creando..." : "Crear pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}