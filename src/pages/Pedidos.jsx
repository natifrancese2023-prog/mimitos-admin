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

const ESTADOS = [
  "pendiente",
  "confirmado",
  "entregado",
  "cancelado",
  "facturado",
];

const ESTADO_CLASE = {
  pendiente: "estado-pendiente",
  confirmado: "estado-confirmado",
  entregado: "estado-entregado",
  cancelado: "estado-cancelado",
  facturado: "estado-facturado",
};

const ESTADO_ICONO = {
  pendiente: "🕐",
  confirmado: "✅",
  entregado: "📦",
  cancelado: "❌",
  facturado: "🧾",
};

const FORMAS_PAGO = ["efectivo", "debito", "credito", "transferencia"];
const FORMA_PAGO_ICONO = {
  efectivo: "💵",
  debito: "💳",
  credito: "💳",
  transferencia: "🏦",
};

// Línea vacía ahora incluye id_variante
const LINEA_VACIA = { id_producto: "", id_variante: null, cantidad: 1 };

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const [modalFacturar, setModalFacturar] = useState(false);
  const [pedidoAFacturar, setPedidoAFacturar] = useState(null);
  const [formaPagoFact, setFormaPagoFact] = useState("");
  const [obsFact, setObsFact] = useState("");
  const [facturando, setFacturando] = useState(false);
  const [errorFact, setErrorFact] = useState("");
  const [exitoFact, setExitoFact] = useState("");

  const [modalCrear, setModalCrear] = useState(false);
  const [idClienteNuevo, setIdClienteNuevo] = useState("");
  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }]);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [exitoCrear, setExitoCrear] = useState("");

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [pedidosRes, clientesRes, productosRes] = await Promise.all([
        axios.get(`${API_URL}/pedidos`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/usuarios`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/productos`, { headers: getAuthHeader() }),
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data.filter((u) => u.rol === "cliente"));
      const productosPlanos = productosRes.data.flatMap((p) =>
        p.variantes.map((v) => ({
          id_producto: p.id_producto,
          nombre: p.nombre,
          id_variante: v.id_variante,
          nombre_variante: v.nombre_variante,
          precio_venta_variante: v.precio_venta,
          stock: v.stock,
        })),
      );
      setProductos(productosPlanos);
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
  // FILTROS — useMemo para evitar recálculo en cada render
  // ============================================================
  const pedidosFiltrados = useMemo(
    () =>
      pedidos.filter((p) => {
        if (filtroEstado && p.estado !== filtroEstado) return false;
        if (filtroCliente && String(p.id_cliente) !== String(filtroCliente))
          return false;
        if (filtroFechaDesde) {
          const fecha = new Date(p.fecha).toISOString().split("T")[0];
          if (fecha < filtroFechaDesde) return false;
        }
        if (filtroFechaHasta) {
          const fecha = new Date(p.fecha).toISOString().split("T")[0];
          if (fecha > filtroFechaHasta) return false;
        }
        return true;
      }),
    [pedidos, filtroEstado, filtroCliente, filtroFechaDesde, filtroFechaHasta],
  );

  const hayFiltros =
    filtroEstado || filtroCliente || filtroFechaDesde || filtroFechaHasta;

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
    setPedidoDetalle(pedido);
    setCargandoDetalle(true);
    setDetalle([]);
    try {
      const res = await axios.get(
        `${API_URL}/pedidos/${pedido.id_pedido}/detalle`,
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
    setPedidoDetalle(null);
    setDetalle([]);
  }, []);

  const handleCambiarEstado = useCallback(
    async (nuevoEstado) => {
      if (!pedidoDetalle) return;
      setCambiandoEstado(true);
      try {
        await axios.put(
          `${API_URL}/pedidos/${pedidoDetalle.id_pedido}/estado`,
          { estado: nuevoEstado },
          { headers: getAuthHeader() },
        );
        setPedidos((prev) =>
          prev.map((p) =>
            p.id_pedido === pedidoDetalle.id_pedido
              ? { ...p, estado: nuevoEstado }
              : p,
          ),
        );
        setPedidoDetalle((prev) => ({ ...prev, estado: nuevoEstado }));
      } catch (err) {
        console.error(err);
      } finally {
        setCambiandoEstado(false);
      }
    },
    [pedidoDetalle],
  );

  // ============================================================
  // FACTURAR
  // ============================================================
  const abrirFacturar = useCallback((pedido) => {
    setPedidoAFacturar(pedido);
    setFormaPagoFact("");
    setObsFact("");
    setErrorFact("");
    setExitoFact("");
    setModalFacturar(true);
  }, []);

  const cerrarFacturar = useCallback(() => {
    setModalFacturar(false);
    setPedidoAFacturar(null);
    setFormaPagoFact("");
    setObsFact("");
    setErrorFact("");
    setExitoFact("");
  }, []);

  const handleFacturar = useCallback(async () => {
    setErrorFact("");
    if (!formaPagoFact) {
      setErrorFact("Seleccioná una forma de cobro");
      return;
    }
    setFacturando(true);
    try {
      await axios.post(
        `${API_URL}/facturas`,
        {
          id_pedido: pedidoAFacturar.id_pedido,
          forma_pago: formaPagoFact,
          observaciones: obsFact || null,
        },
        { headers: getAuthHeader() },
      );
      setExitoFact("Pedido facturado correctamente");
      await cargarDatos();
      setTimeout(() => cerrarFacturar(), 1200);
    } catch (err) {
      setErrorFact(err.response?.data?.error || "Error al facturar el pedido");
    } finally {
      setFacturando(false);
    }
  }, [formaPagoFact, obsFact, pedidoAFacturar, cargarDatos, cerrarFacturar]);

  // ============================================================
  // LINEAS DEL NUEVO PEDIDO — con soporte de variantes
  // ============================================================
  const agregarLinea = useCallback(() => {
    setLineas((prev) => [...prev, { ...LINEA_VACIA }]);
  }, []);

  const actualizarLinea = useCallback(
    (idx, campo, valor) => {
      setLineas((prev) =>
        prev.map((l, i) => {
          if (i !== idx) return l;

          // Si lo que cambia es la variante (nuestro nuevo selector único)
          if (campo === "id_variante") {
            const varId = valor;
            // Buscamos la variante en la lista de productos que cargaste del back
            const prodAsociado = productos.find((p) => p.id_variante == varId);

            if (prodAsociado) {
              return {
                ...l,
                id_variante: varId,
                id_producto: prodAsociado.id_producto,
                // Guardamos el precio usando el nombre exacto de tu log
                precio_unitario: parseFloat(prodAsociado.precio_venta_variante),
              };
            }
          }

          // Para cualquier otro campo (como 'cantidad')
          return { ...l, [campo]: valor };
        }),
      );
    },
    [productos],
  ); // Importante agregar 'productos' a las dependencias del useCallback

  const eliminarLinea = useCallback((idx) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Helper: obtener variantes del producto seleccionado en una línea
  const getVariantesDeLinea = useCallback(
    (idProducto) => {
      if (!idProducto) return [];
      const prod = productos.find(
        (p) => String(p.id_producto) === String(idProducto),
      );
      return prod?.variantes?.length > 0 ? prod.variantes : [];
    },
    [productos],
  );

  // Calcula total del preview teniendo en cuenta variantes
  const calcularTotalPreview = useMemo(() => {
    return lineas.reduce((acc, l) => {
      const prod = productos.find(
        (p) => String(p.id_producto) === String(l.id_producto),
      );
      if (!prod || !l.cantidad) return acc;

      // Si el producto tiene variantes y hay una seleccionada, usar su precio
      let precio = Number(prod.precio_venta);
      if (prod.variantes?.length > 0 && l.id_variante) {
        const variante = prod.variantes.find(
          (v) => String(v.id_variante) === String(l.id_variante),
        );
        if (variante?.precio_venta_variante)
          precio = Number(variante.precio_venta_variante);
      }

      return acc + precio * Number(l.cantidad);
    }, 0);
  }, [lineas, productos]);

  const cerrarModalCrear = useCallback(() => {
    setModalCrear(false);
    setIdClienteNuevo("");
    setLineas([{ ...LINEA_VACIA }]);
    setErrorCrear("");
    setExitoCrear("");
  }, []);

  // ============================================================
  // CREAR PEDIDO
  // ============================================================
  const handleCrearPedido = useCallback(async () => {
    console.log("Estado actual de lineas:", lineas);
    setErrorCrear("");
    setExitoCrear("");

    if (!idClienteNuevo) {
      setErrorCrear("Seleccioná un cliente");
      return;
    }
    const productosFormateados = lineas.map((l) => {
      // Buscamos el objeto original en la lista de productos para asegurar el precio
      const prodOriginal = productos.find(
        (p) => String(p.id_variante) === String(l.id_variante),
      );

      console.log(`Verificando datos para enviar:`, prodOriginal);

      // Usamos el nombre exacto que vimos en tu log: precio_venta_variante
      // Si no existe, usamos el precio_unitario que ya debería estar en la línea
      const precioFinal = prodOriginal
        ? Number(prodOriginal.precio_venta_variante)
        : Number(l.precio_unitario || 0);

      return {
        id_producto: Number(l.id_producto),
        id_variante: Number(l.id_variante),
        cantidad: Number(l.cantidad),
        precio_unitario: precioFinal,
      };
    });
    // Validación extra: si el precio sigue siendo 0, avisamos
    if (productosFormateados.some((p) => p.precio_unitario <= 0)) {
      setErrorCrear(
        "Uno de los productos no tiene precio cargado o no se encontró.",
      );
      return;
    }

    setCreando(true);
    try {
      const respuesta = await axios.post(
        `${API_URL}/pedidos`,
        {
          id_cliente: Number(idClienteNuevo),
          productos: productosFormateados,
        },
        { headers: getAuthHeader() },
      );

      setExitoCrear("Pedido creado correctamente");
      await cargarDatos();
      setTimeout(() => cerrarModalCrear(), 1200);
    } catch (err) {
      // Si el backend sigue chillando por el null, el error vendrá aquí
      const msgError =
        err.response?.data?.error ||
        err.response?.data ||
        "Error al crear el pedido";
      setErrorCrear(msgError);
      console.error("Detalle del error:", err.response?.data);
    } finally {
      setCreando(false);
    }
  }, [idClienteNuevo, lineas, productos, cargarDatos, cerrarModalCrear]);

  // ============================================================
  // HELPERS
  // ============================================================
  const formatFecha = useCallback((fecha) => {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  // ============================================================
  // RENDERS DE ESTADO
  // ============================================================
  if (cargando)
    return (
      <div className="ped-estado">
        <div className="spinner" />
        <p>Cargando pedidos...</p>
      </div>
    );
  if (error)
    return (
      <div className="ped-estado ped-error">
        <span>⚠️</span>
        <p>{error}</p>
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
        <div>
          <h1>Pedidos</h1>
          <p>{pedidos.length} pedidos en total</p>
        </div>
        <button className="btn-primario" onClick={() => setModalCrear(true)}>
          + Nuevo pedido
        </button>
      </div>

      {/* ── FILTROS ── */}
      <div className="ped-filtros">
        <div className="filtro-grupo">
          <label>Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_ICONO[e]} {e.charAt(0).toUpperCase() + e.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Cliente</label>
          <select
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              // Agregamos 'filtro-' para que no choque con el modal de crear
              <option key={`filtro-cli-${c.id_usuario}`} value={c.id_usuario}>
                {c.nombre} {c.apellido}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-grupo">
          <label>Desde</label>
          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
          />
        </div>
        <div className="filtro-grupo">
          <label>Hasta</label>
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
          />
        </div>
        {hayFiltros && (
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {hayFiltros && (
        <p className="ped-resultado">
          Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
        </p>
      )}

      {/* ── CARDS RESUMEN ── */}
      <div className="ped-resumen">
        {ESTADOS.map((est) => (
          <div
            key={est}
            className={`resumen-card ${ESTADO_CLASE[est]} ${filtroEstado === est ? "activo" : ""}`}
            onClick={() => setFiltroEstado(filtroEstado === est ? "" : est)}
          >
            <span className="resumen-icono">{ESTADO_ICONO[est]}</span>
            <span className="resumen-count">
              {pedidos.filter((p) => p.estado === est).length}
            </span>
            <span className="resumen-label">
              {est.charAt(0).toUpperCase() + est.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* ── TABLA ── */}
      {pedidosFiltrados.length === 0 ? (
        <div className="ped-vacio">
          <span>🛒</span>
          <p>No hay pedidos que coincidan</p>
        </div>
      ) : (
        <div className="ped-tabla-wrapper">
          <table className="ped-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((p) => (
                <tr key={p.id_pedido}>
                  <td className="ped-id">#{p.id_pedido}</td>
                  <td>
                    <span className="ped-cliente-nombre">
                      {p.cliente_nombre} {p.cliente_apellido}
                    </span>
                    <span className="ped-cliente-email">{p.cliente_email}</span>
                  </td>
                  <td>{formatFecha(p.fecha)}</td>
                  <td className="ped-total">
                    ${Number(p.total).toLocaleString("es-AR")}
                  </td>
                  <td>
                    <span className={`badge-estado ${ESTADO_CLASE[p.estado]}`}>
                      {ESTADO_ICONO[p.estado]} {p.estado}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <button
                        className="btn-ver"
                        onClick={() => abrirDetalle(p)}
                      >
                        Ver detalle
                      </button>
                      {p.estado === "entregado" && (
                        <button
                          className="btn-facturar"
                          onClick={() => abrirFacturar(p)}
                        >
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
          <div
            className="modal modal-grande"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Pedido #{pedidoDetalle.id_pedido}</h2>
                <p className="modal-subtitulo">
                  {pedidoDetalle.cliente_nombre}{" "}
                  {pedidoDetalle.cliente_apellido}
                  {" · "}
                  {formatFecha(pedidoDetalle.fecha)}
                </p>
              </div>
              <button className="modal-cerrar" onClick={cerrarDetalle}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detalle-estado-section">
                <label>Estado del pedido</label>
                <div className="estado-botones">
                  {ESTADOS.filter((e) => e !== "facturado").map((est) => (
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
                      {ESTADO_ICONO[est]}{" "}
                      {est.charAt(0).toUpperCase() + est.slice(1)}
                    </button>
                  ))}
                </div>
                {pedidoDetalle.estado === "entregado" && (
                  <div className="facturar-aviso">
                    🧾 Este pedido está listo para facturar.
                    <button
                      className="btn-facturar-inline"
                      onClick={() => {
                        cerrarDetalle();
                        abrirFacturar(pedidoDetalle);
                      }}
                    >
                      Facturar ahora
                    </button>
                  </div>
                )}
                {pedidoDetalle.estado === "facturado" && (
                  <div className="facturado-aviso">
                    ✅ Este pedido ya fue facturado.
                  </div>
                )}
              </div>

              <div className="detalle-productos">
                <h3>Productos</h3>
                {cargandoDetalle ? (
                  <div className="ped-estado">
                    <div className="spinner" />
                  </div>
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
                            {d.nombre_producto}
                            {d.nombre_variante && (
                              <span className="badge-variante-detalle">
                                {d.nombre_variante}
                              </span>
                            )}
                          </td>
                          <td>
                            $
                            {Number(
                              d.precio_unitario ?? d.subtotal / d.cantidad,
                            ).toLocaleString("es-AR")}
                          </td>
                          <td>{d.cantidad}</td>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Facturar pedido #{pedidoAFacturar.id_pedido}</h2>
                <p className="modal-subtitulo">
                  {pedidoAFacturar.cliente_nombre}{" "}
                  {pedidoAFacturar.cliente_apellido}
                  {" · "}Total: $
                  {Number(pedidoAFacturar.total).toLocaleString("es-AR")}
                </p>
              </div>
              <button className="modal-cerrar" onClick={cerrarFacturar}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {exitoFact && <div className="alerta-exito">✅ {exitoFact}</div>}
              {errorFact && <div className="alerta-error">⚠️ {errorFact}</div>}
              <div className="form-col">
                <div className="field-group">
                  <label>Forma de cobro *</label>
                  <div className="formas-pago-grid">
                    {FORMAS_PAGO.map((f) => (
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
                    onChange={(e) => setObsFact(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="factura-resumen">
                <span>Total a cobrar</span>
                <strong>
                  ${Number(pedidoAFacturar.total).toLocaleString("es-AR")}
                </strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={cerrarFacturar}>
                Cancelar
              </button>
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
          <div
            className="modal modal-grande"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Nuevo pedido</h2>
              <button className="modal-cerrar" onClick={cerrarModalCrear}>
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

              <div className="field-group" style={{ marginBottom: "1.2rem" }}>
                <label>Cliente *</label>
                <select
                  value={idClienteNuevo}
                  onChange={(e) => setIdClienteNuevo(e.target.value)}
                >
                  <option value="">Seleccioná un cliente</option>
                  {clientes.map((c) => (
                    <option
                      key={`modal-cli-${c.id_usuario}`}
                      value={c.id_usuario}
                    >
                      {c.nombre} {c.apellido} — {c.email}
                    </option>
                  ))}
                </select>
              </div>

              <h3 style={{ marginBottom: "0.75rem" }}>Productos</h3>
              <div className="lineas-productos">
                {lineas.map((l, idx) => {
                  // Ya no filtramos variantes aquí porque el select principal
                  // ahora muestra la combinación de Producto + Variante directamente.

                  return (
                    <div
                      className="linea-producto"
                      key={`linea-pedido-row-${idx}`}
                    >
                      {/* Selector Único de Producto + Variante */}
                      <select
                        value={l.id_variante || ""}
                        onChange={(e) => {
                          const varId = e.target.value;
                          if (!varId) return;

                          // Buscamos la variante elegida en la lista 'productos' que viene del Back
                          const prodAsociado = productos.find(
                            (p) => p.id_variante == varId,
                          );

                          if (prodAsociado) {
                            actualizarLinea(idx, "id_variante", varId);
                            actualizarLinea(
                              idx,
                              "id_producto",
                              prodAsociado.id_producto,
                            );
                            actualizarLinea(
                              idx,
                              "precio_unitario",
                              prodAsociado.precio_venta_variante,
                            );
                          }
                        }}
                      >
                        <option value="">
                          Seleccioná un producto y variante
                        </option>
                        {productos.map((p, pIdx) => (
                          <option
                            key={`opt-var-${p.id_variante}-${pIdx}`}
                            value={p.id_variante}
                          >
                            {p.nombre} — {p.nombre_variante} ($
                            {Number(p.precio_venta_variante).toLocaleString(
                              "es-AR",
                            )}
                            )
                          </option>
                        ))}
                      </select>

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

                      {/* Botón para eliminar línea (solo si hay más de una) */}
                      {lineas.length > 1 && (
                        <button
                          className="btn-eliminar-linea"
                          type="button"
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
                  <strong>
                    ${Number(calcularTotalPreview).toLocaleString("es-AR")}
                  </strong>
                </div>
              )}

              {/* Agregué el botón de acción por si faltaba en el recorte */}
              <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
                <button className="btn-confirmar" onClick={handleCrearPedido}>
                  Crear Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
