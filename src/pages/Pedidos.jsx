// ============================================================
// PEDIDOS.JSX - Gestión completa de pedidos para el dueño
// ============================================================
// ACTUALIZACIÓN: soporte para variantes de productos
// ACTUALIZACIÓN: "Cobrar" ya no abre un modal propio -- navega a
// VentaDirecta en modo Pedido (recibe id_pedido por location.state).
// No se agregó lógica de cobro nueva acá: la creó y la sigue teniendo
// VentaDirecta.jsx / POST /ventas/directa, sin duplicarla.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const TRANSICIONES_PERMITIDAS = {
  pendiente: ["confirmado", "entregado", "cancelado"],
  confirmado: ["entregado", "cancelado"],
  entregado: ["cancelado"],
  facturado: [],
  cancelado: [],
};

// Línea vacía ahora incluye id_variante
const LINEA_VACIA = { id_producto: "", id_variante: null, cantidad: 1 };

function fechaLocalISO(fecha) {
  const date = new Date(fecha);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  const [errorDetalle, setErrorDetalle] = useState("");
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const [modalCrear, setModalCrear] = useState(false);
  const [idClienteNuevo, setIdClienteNuevo] = useState("");
  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }]);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [exitoCrear, setExitoCrear] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

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
        (p.variantes || []).map((v) => ({
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

  const pedidosFiltrados = useMemo(
    () =>
      pedidos.filter((p) => {
        if (filtroEstado && p.estado !== filtroEstado) return false;
        if (filtroCliente && String(p.id_cliente) !== String(filtroCliente))
          return false;
        if (filtroFechaDesde) {
          const fecha = fechaLocalISO(p.fecha);
          if (fecha < filtroFechaDesde) return false;
        }
        if (filtroFechaHasta) {
          const fecha = fechaLocalISO(p.fecha);
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

  const abrirDetalle = useCallback(async (pedido) => {
    setPedidoDetalle(pedido);
    setCargandoDetalle(true);
    setDetalle([]);
    setErrorDetalle("");
    try {
      const res = await axios.get(
        `${API_URL}/pedidos/${pedido.id_pedido}/detalle`,
        { headers: getAuthHeader() },
      );
      setDetalle(res.data);
    } catch (err) {
      console.error(err);
      setErrorDetalle("No se pudo cargar el detalle del pedido.");
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    if (!location.state?.abrirPedido) return;
    if (pedidos.length === 0) return;

    const pedido = pedidos.find(
      (p) => Number(p.id_pedido) === Number(location.state.abrirPedido)
    );

    if (!pedido) return;

    abrirDetalle(pedido);

    navigate(location.pathname, { replace: true, state: {} });
  }, [pedidos, location.state, abrirDetalle, navigate, location.pathname]);

  const cerrarDetalle = useCallback(() => {
    setPedidoDetalle(null);
    setDetalle([]);
    setErrorDetalle("");
  }, []);

  const handleCambiarEstado = useCallback(
    async (nuevoEstado) => {
      if (!pedidoDetalle) return;
      setCambiandoEstado(true);
      setErrorDetalle("");
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
        setErrorDetalle(err.response?.data?.error || "No se pudo actualizar el estado.");
      } finally {
        setCambiandoEstado(false);
      }
    },
    [pedidoDetalle],
  );

  // ============================================================
  // COBRAR — ya no abre un modal propio. Navega a VentaDirecta en
  // modo Pedido, pasándole id_pedido por location.state. Toda la
  // lógica de cobro vive en VentaDirecta.jsx / POST /ventas/directa,
  // no se duplica acá.
  // ============================================================
  const irACobrar = useCallback(
    (pedido) => {
      navigate("/panel/venta-directa", {
        state: { idPedidoCobrar: pedido.id_pedido },
      });
    },
    [navigate],
  );

  const agregarLinea = useCallback(() => {
    setLineas((prev) => [...prev, { ...LINEA_VACIA }]);
  }, []);

  const actualizarLinea = useCallback(
    (idx, campo, valor) => {
      setLineas((prev) =>
        prev.map((l, i) => {
          if (i !== idx) return l;

          if (campo === "id_variante") {
            const varId = valor;
            const prodAsociado = productos.find((p) => p.id_variante == varId);

            if (prodAsociado) {
              return {
                ...l,
                id_variante: varId,
                id_producto: prodAsociado.id_producto,
                precio_unitario: parseFloat(prodAsociado.precio_venta_variante),
              };
            }
          }

          return { ...l, [campo]: valor };
        }),
      );
    },
    [productos],
  );

  const eliminarLinea = useCallback((idx) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const calcularTotalPreview = useMemo(() => {
    return lineas.reduce((acc, l) => {
      const variante = productos.find(
        (p) => String(p.id_variante) === String(l.id_variante),
      );
      if (!variante || Number(l.cantidad) <= 0) return acc;
      return acc + Number(variante.precio_venta_variante) * Number(l.cantidad);
    }, 0);
  }, [lineas, productos]);

  const cerrarModalCrear = useCallback(() => {
    setModalCrear(false);
    setIdClienteNuevo("");
    setLineas([{ ...LINEA_VACIA }]);
    setErrorCrear("");
    setExitoCrear("");
  }, []);

  const handleCrearPedido = useCallback(async () => {
    setErrorCrear("");
    setExitoCrear("");

    if (!idClienteNuevo) {
      setErrorCrear("Seleccioná un cliente");
      return;
    }

    if (
      lineas.some(
        (l) => !l.id_producto || !l.id_variante || Number(l.cantidad) <= 0,
      )
    ) {
      setErrorCrear("Seleccioná una variante y una cantidad mayor a cero en cada línea.");
      return;
    }

    const productosFormateados = lineas.map((l) => {
      const prodOriginal = productos.find(
        (p) => String(p.id_variante) === String(l.id_variante),
      );

      const precioFinal = prodOriginal
        ? Number(prodOriginal.precio_venta_variante)
        : Number(l.precio_unitario || 0);

      return {
        id_producto: Number(l.id_producto),
        id_variante: l.id_variante ? Number(l.id_variante) : null,
        cantidad: Number(l.cantidad),
        precio_unitario: precioFinal,
      };
    });

    if (productosFormateados.some((p) => p.precio_unitario <= 0)) {
      setErrorCrear(
        "Uno de los productos no tiene precio cargado o no se encontró.",
      );
      return;
    }

    setCreando(true);
    try {
      await axios.post(
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

  const formatFecha = useCallback((fecha) => {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

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

  return (
    <div className="pedidos-page">
      <div className="ped-header">
        <div>
          <h1>Pedidos</h1>
          <p>{pedidos.length} pedidos en total</p>
        </div>
        <button className="btn-primario" onClick={() => setModalCrear(true)}>
          + Nuevo pedido
        </button>
      </div>

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
                          onClick={() => irACobrar(p)}
                        >
                          💰 Cobrar
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
                  {ESTADOS.filter(
                    (e) =>
                      e !== "facturado" &&
                      (e === pedidoDetalle.estado ||
                        TRANSICIONES_PERMITIDAS[pedidoDetalle.estado]?.includes(e)),
                  ).map((est) => (
                    <button
                      key={est}
                      className={`btn-estado ${ESTADO_CLASE[est]} ${pedidoDetalle.estado === est ? "activo" : ""}`}
                      onClick={() => handleCambiarEstado(est)}
                      disabled={
                        cambiandoEstado ||
                        pedidoDetalle.estado === est
                      }
                    >
                      {ESTADO_ICONO[est]}{" "}
                      {est.charAt(0).toUpperCase() + est.slice(1)}
                    </button>
                  ))}
                </div>
                {pedidoDetalle.estado === "entregado" && (
                  <div className="facturar-aviso">
                    💰 Este pedido está listo para cobrar.
                    <button
                      className="btn-facturar-inline"
                      onClick={() => {
                        cerrarDetalle();
                        irACobrar(pedidoDetalle);
                      }}
                    >
                      Cobrar ahora
                    </button>
                  </div>
                )}
                {pedidoDetalle.estado === "facturado" && (
                  <div className="facturado-aviso">
                    ✅ Este pedido ya fue facturado.
                  </div>
                )}
                {errorDetalle && (
                  <div className="alerta-error">{errorDetalle}</div>
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
                  return (
                    <div
                      className="linea-producto"
                      key={`linea-pedido-row-${idx}`}
                    >
                      <select
                        value={l.id_variante || ""}
                        onChange={(e) => {
                          const varId = e.target.value;
                          if (!varId) {
                            actualizarLinea(idx, "id_variante", null);
                            actualizarLinea(idx, "id_producto", "");
                            actualizarLinea(idx, "precio_unitario", 0);
                            return;
                          }

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

                      <input
                        type="number"
                        min="1"
                        value={l.cantidad}
                        onChange={(e) =>
                          actualizarLinea(idx, "cantidad", e.target.value)
                        }
                        placeholder="Cant."
                      />

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

              <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
                <button
                  className="btn-confirmar"
                  onClick={handleCrearPedido}
                  disabled={creando}
                >
                  {creando ? "Creando..." : "Crear Pedido"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}