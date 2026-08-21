// ============================================================
// VENTA DIRECTA.JSX - Venta rápida a consumidor final (mostrador)
// ============================================================
// ACTUALIZACIÓN (Fase 1): selección de cliente -- Consumidor Final
// o cliente registrado.
// ACTUALIZACIÓN (Pedido -> Cobrar): si el componente recibe
// `idPedidoCobrar` por location.state (lo manda Pedidos.jsx al
// apretar "Cobrar"), esta pantalla deja de armar una venta nueva y
// pasa a "modo Pedido": carga el pedido ya entregado en SOLO LECTURA
// (no se puede tocar productos, precios ni cliente) y muestra
// únicamente el formulario de cobro. Al confirmar, manda exactamente
// { id_pedido, forma_pago, monto_pagado, observaciones } a
// POST /ventas/directa -- el mismo endpoint y la misma lógica de
// siempre, sin backend nuevo.
//
// Si no llega idPedidoCobrar, el componente funciona EXACTAMENTE
// igual que antes (venta nueva de mostrador), sin ningún cambio de
// comportamiento.
//
// IMPORTANTE: todos los hooks se declaran incondicionalmente, en el
// mismo orden siempre (Rules of Hooks) -- la bifurcación entre modo
// Pedido y modo normal ocurre únicamente al final, en el JSX de
// retorno, nunca en qué hooks se llaman.
// ============================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./VentaDirecta.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const FORMAS_PAGO = ["efectivo", "transferencia", "debito", "credito"];
const FORMA_PAGO_ICONO = { efectivo: "💵", transferencia: "🏦", debito: "💳", credito: "💳" };
const ID_CONSUMIDOR_FINAL = 2;

export default function VentaDirecta() {
  const location = useLocation();
  const navigate = useNavigate();

  const idPedidoCobrar = location.state?.idPedidoCobrar ?? null;
  const modoPedido = idPedidoCobrar !== null;

  // ── Estado: modo Pedido (Cobrar) ──────────────────────────
  const [pedidoCobro, setPedidoCobro] = useState(null);
  const [itemsPedido, setItemsPedido] = useState([]);
  const [cargandoPedido, setCargandoPedido] = useState(true);
  const [errorPedido, setErrorPedido] = useState("");

  const [formaPagoPedido, setFormaPagoPedido] = useState("");
  const [montoPagadoPedido, setMontoPagadoPedido] = useState("");
  const [obsPedido, setObsPedido] = useState("");
  const [cobrando, setCobrando] = useState(false);
  const [errorCobro, setErrorCobro] = useState("");
  const [exitoCobro, setExitoCobro] = useState("");

  // ── Estado: modo normal (venta nueva de mostrador) ────────
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);

  const [clientes, setClientes] = useState([]);
  const [modoCliente, setModoCliente] = useState("consumidor_final");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [buscadorClienteAbierto, setBuscadorClienteAbierto] = useState(false);

  const [formaPago, setFormaPago] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [tipoCobro, setTipoCobro] = useState("contado");
  const [entrega, setEntrega] = useState("");

  const [registrando, setRegistrando] = useState(false);
  const [errorVenta, setErrorVenta] = useState("");
  const [exitoVenta, setExitoVenta] = useState("");

  // ── Carga: modo Pedido ─────────────────────────────────────
  const cargarPedidoCobro = useCallback(async () => {
    if (!modoPedido) {
      setCargandoPedido(false);
      return;
    }
    setCargandoPedido(true);
    setErrorPedido("");
    try {
      const [resPedidos, resDetalle] = await Promise.all([
        axios.get(`${API_URL}/pedidos`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/pedidos/${idPedidoCobrar}/detalle`, {
          headers: getAuthHeader(),
        }),
      ]);

      const encontrado = resPedidos.data.find(
        (p) => Number(p.id_pedido) === Number(idPedidoCobrar)
      );

      if (!encontrado) {
        setErrorPedido("No se encontró el pedido.");
        return;
      }

      setPedidoCobro(encontrado);
      setItemsPedido(resDetalle.data);
      setMontoPagadoPedido(String(encontrado.total));
    } catch (err) {
      console.error(err);
      setErrorPedido("No se pudo cargar el pedido.");
    } finally {
      setCargandoPedido(false);
    }
  }, [modoPedido, idPedidoCobrar]);

  useEffect(() => {
    cargarPedidoCobro();
  }, [cargarPedidoCobro]);

  const handleConfirmarCobro = useCallback(async () => {
    setErrorCobro("");
    setExitoCobro("");

    if (!formaPagoPedido) {
      setErrorCobro("Seleccioná la forma de pago");
      return;
    }

    const total = Number(pedidoCobro?.total ?? 0);
    const monto = montoPagadoPedido === "" ? total : Number(montoPagadoPedido);

    if (!Number.isFinite(monto) || monto < 0 || monto > total) {
      setErrorCobro("El monto cobrado no puede ser negativo ni mayor al total del pedido.");
      return;
    }

    setCobrando(true);
    try {
      await axios.post(
        `${API_URL}/ventas/directa`,
        {
          id_pedido: Number(idPedidoCobrar),
          forma_pago: formaPagoPedido,
          monto_pagado: monto,
          observaciones: obsPedido || null,
        },
        { headers: getAuthHeader() }
      );
      setExitoCobro("Pedido cobrado y facturado correctamente");
      setTimeout(() => navigate("/panel/pedidos"), 1200);
    } catch (err) {
      setErrorCobro(err.response?.data?.error || "Error al cobrar el pedido");
    } finally {
      setCobrando(false);
    }
  }, [formaPagoPedido, montoPagadoPedido, obsPedido, pedidoCobro, idPedidoCobrar, navigate]);

  // ── Carga: modo normal ─────────────────────────────────────
  const cargarProductos = useCallback(async () => {
    if (modoPedido) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setError("");
    try {
      const [resProd, resUsuarios] = await Promise.all([
        axios.get(`${API_URL}/productos`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/usuarios`, { headers: getAuthHeader() }),
      ]);
      setProductos(resProd.data);
      setClientes(resUsuarios.data.filter((u) => u.rol === "cliente"));
    } catch (err) {
      setError("No se pudieron cargar los productos.");
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [modoPedido]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes.slice(0, 20);
    const q = busquedaCliente.trim().toLowerCase();
    return clientes
      .filter(
        (c) =>
          `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
          c.dni?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [clientes, busquedaCliente]);

  const elegirModoConsumidorFinal = useCallback(() => {
    setModoCliente("consumidor_final");
    setClienteSeleccionado(null);
    setBuscadorClienteAbierto(false);
    setBusquedaCliente("");
    setTipoCobro("contado");
    setEntrega("");
  }, []);

  const elegirCliente = useCallback((cliente) => {
    setModoCliente("registrado");
    setClienteSeleccionado(cliente);
    setBuscadorClienteAbierto(false);
    setBusquedaCliente("");
  }, []);

  const agregarAlCarrito = useCallback((producto, variante = null) => {
    const idVariante = variante ? variante.id_variante : null;
    const precio = variante ? variante.precio_venta : producto.precio_min;
    const stockDisponible = variante ? variante.stock : producto.stock_total;

    if (!stockDisponible || stockDisponible <= 0) return;

    setCarrito((prev) => {
      const idx = prev.findIndex(
        (l) => l.id_producto === producto.id_producto && l.id_variante === idVariante
      );
      if (idx >= 0) {
        const linea = prev[idx];
        if (linea.cantidad + 1 > stockDisponible) return prev;
        const copia = [...prev];
        copia[idx] = { ...linea, cantidad: linea.cantidad + 1 };
        return copia;
      }
      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          id_variante: idVariante,
          nombre: producto.nombre,
          nombre_variante: variante ? variante.nombre_variante : null,
          cantidad: 1,
          precio_unitario: precio || 0,
          stockDisponible,
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((idx, delta) => {
    setCarrito((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const nuevaCantidad = l.cantidad + delta;
        if (nuevaCantidad < 1) return l;
        if (nuevaCantidad > l.stockDisponible) return l;
        return { ...l, cantidad: nuevaCantidad };
      })
    );
  }, []);

  const cambiarPrecio = useCallback((idx, valor) => {
    setCarrito((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, precio_unitario: valor } : l))
    );
  }, []);

  const quitarLinea = useCallback((idx) => {
    setCarrito((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setFormaPago("");
    setObservaciones("");
    setErrorVenta("");
    setExitoVenta("");
  }, []);

  const total = useMemo(
    () =>
      carrito.reduce((acc, l) => acc + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0),
    [carrito]
  );

  const handleRegistrarVenta = useCallback(async () => {
    setErrorVenta("");
    setExitoVenta("");

    if (carrito.length === 0) {
      setErrorVenta("Agregá al menos un producto al carrito");
      return;
    }
    if (!formaPago) {
      setErrorVenta("Seleccioná la forma de pago");
      return;
    }
    if (modoCliente === "registrado" && !clienteSeleccionado) {
      setErrorVenta("Seleccioná un cliente o cambiá a Consumidor Final");
      return;
    }

    let montoPagado = total;
    if (tipoCobro === "cuenta_corriente") {
      montoPagado = entrega === "" ? 0 : Number(entrega);
      if (montoPagado < 0 || montoPagado > total) {
        setErrorVenta("La entrega no puede ser negativa ni mayor al total.");
        return;
      }
    }

    for (const l of carrito) {
      if (!l.precio_unitario || Number(l.precio_unitario) <= 0) {
        setErrorVenta("Todos los productos deben tener un precio válido");
        return;
      }
    }

    setRegistrando(true);
    try {
      await axios.post(
        `${API_URL}/ventas/directa`,
        {
          forma_pago: formaPago,
          observaciones: observaciones || null,
          id_cliente:
            modoCliente === "registrado" ? clienteSeleccionado.id_usuario : ID_CONSUMIDOR_FINAL,
          monto_pagado: montoPagado,
          productos: carrito.map((l) => ({
            id_producto: l.id_producto,
            id_variante: l.id_variante,
            cantidad: Number(l.cantidad),
            precio_unitario: Number(l.precio_unitario),
          })),
        },
        { headers: getAuthHeader() }
      );
      setExitoVenta("Venta registrada correctamente");
      setCarrito([]);
      setFormaPago("");
      setObservaciones("");
      setTipoCobro("contado");
      setEntrega("");
      elegirModoConsumidorFinal();
      await cargarProductos();
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorVenta(err.response.data?.error || "Stock insuficiente");
      } else {
        setErrorVenta(err.response?.data?.error || "Error al registrar la venta");
      }
    } finally {
      setRegistrando(false);
    }
  }, [
    carrito,
    formaPago,
    observaciones,
    modoCliente,
    clienteSeleccionado,
    tipoCobro,
    entrega,
    total,
    cargarProductos,
    elegirModoConsumidorFinal,
  ]);

  // ============================================================
  // RENDER — acá, y solo acá, se bifurca entre modo Pedido y modo
  // normal. No hay ningún hook debajo de este punto.
  // ============================================================

  if (modoPedido) {
    if (cargandoPedido) {
      return (
        <div className="vd-estado">
          <div className="spinner" />
          <p>Cargando pedido...</p>
        </div>
      );
    }

    if (errorPedido || !pedidoCobro) {
      return (
        <div className="vd-estado vd-error">
          <span>⚠️</span>
          <p>{errorPedido || "Pedido no disponible."}</p>
          <button onClick={() => navigate("/panel/pedidos")}>Volver a Pedidos</button>
        </div>
      );
    }

    const totalPedido = Number(pedidoCobro.total);

    return (
      <div className="vd-page">
        <div className="vd-header">
          <div>
            <h1>Cobrar pedido #{pedidoCobro.id_pedido}</h1>
            <p>
              {pedidoCobro.cliente_nombre} {pedidoCobro.cliente_apellido}
              {" · "}Estado: {pedidoCobro.estado}
            </p>
          </div>
          <button className="btn-secundario" onClick={() => navigate("/panel/pedidos")}>
            ← Volver
          </button>
        </div>

        <div className="vd-layout">
          <div className="vd-panel-productos">
            <h3 style={{ marginBottom: ".75rem" }}>Productos del pedido</h3>
            {itemsPedido.length === 0 ? (
              <div className="vd-vacio">
                <span>📦</span>
                <p>Este pedido no tiene productos.</p>
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
                  {itemsPedido.map((d, i) => (
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
                          d.precio_unitario ?? d.subtotal / d.cantidad
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
                      ${totalPedido.toLocaleString("es-AR")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="vd-panel-carrito">
            <div className="vd-carrito-header">
              <h2>💰 Cobro</h2>
            </div>

            <div className="vd-cliente-elegido">
              👤 {pedidoCobro.cliente_nombre} {pedidoCobro.cliente_apellido}
              <span style={{ marginLeft: "auto", fontSize: ".75rem", color: "#667085" }}>
                cliente del pedido, no editable
              </span>
            </div>

            {exitoCobro && <div className="alerta-exito">✅ {exitoCobro}</div>}
            {errorCobro && <div className="alerta-error">⚠️ {errorCobro}</div>}

            <div className="vd-carrito-footer">
              <div className="field-group">
                <label>Forma de pago *</label>
                <select
                  value={formaPagoPedido}
                  onChange={(e) => setFormaPagoPedido(e.target.value)}
                  disabled={cobrando}
                >
                  <option value="">Seleccioná...</option>
                  {FORMAS_PAGO.map((f) => (
                    <option key={f} value={f}>
                      {FORMA_PAGO_ICONO[f]} {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Monto cobrado (0 = todo a cuenta corriente)</label>
                <input
                  type="number"
                  min="0"
                  max={totalPedido}
                  step="0.01"
                  value={montoPagadoPedido}
                  onChange={(e) => setMontoPagadoPedido(e.target.value)}
                  disabled={cobrando}
                />
                {Number(montoPagadoPedido || 0) < totalPedido && (
                  <span className="vd-entrega-resto">
                    Queda a cuenta: $
                    {Math.max(0, totalPedido - Number(montoPagadoPedido || 0)).toLocaleString("es-AR")}
                  </span>
                )}
              </div>

              <div className="field-group">
                <label>Observaciones</label>
                <input
                  type="text"
                  value={obsPedido}
                  onChange={(e) => setObsPedido(e.target.value)}
                  placeholder="Opcional"
                  disabled={cobrando}
                />
              </div>

              <div className="vd-total">
                Total del pedido: <strong>${totalPedido.toLocaleString("es-AR")}</strong>
              </div>

              <button
                className="btn-primario vd-btn-confirmar"
                onClick={handleConfirmarCobro}
                disabled={cobrando}
              >
                {cobrando ? "Cobrando..." : "💰 Confirmar cobro"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Modo normal: sin cambios de comportamiento ─────────────
  if (cargando)
    return (
      <div className="vd-estado">
        <div className="spinner" />
        <p>Cargando productos...</p>
      </div>
    );
  if (error)
    return (
      <div className="vd-estado vd-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={cargarProductos}>Reintentar</button>
      </div>
    );

  return (
    <div className="vd-page">
      <div className="vd-header">
        <div>
          <h1>Venta directa</h1>
          <p>Venta rápida a consumidor final o cliente registrado</p>
        </div>
      </div>

      <div className="vd-layout">
        <div className="vd-panel-productos">
          <div className="vd-busqueda">
            <span className="busqueda-icono">🔍</span>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="busqueda-limpiar" onClick={() => setBusqueda("")}>✕</button>
            )}
          </div>

          <div className="vd-grid-productos">
            {productosFiltrados.length === 0 ? (
              <div className="vd-vacio">
                <span>📦</span>
                <p>No se encontraron productos</p>
              </div>
            ) : (
              productosFiltrados.map((p) => {
                const sinVariantes = !p.variantes || p.variantes.length === 0;
                return (
                  <div className="vd-card-producto" key={p.id_producto}>
                    <div className="vd-card-nombre">{p.nombre}</div>

                    {sinVariantes ? (
                      <button
                        className="vd-card-agregar"
                        disabled={!p.stock_total || p.stock_total <= 0}
                        onClick={() => agregarAlCarrito(p)}
                      >
                        <span>${Number(p.precio_min || 0).toLocaleString("es-AR")}</span>
                        <span className="vd-card-stock">
                          {p.stock_total > 0 ? `Stock: ${p.stock_total}` : "Sin stock"}
                        </span>
                      </button>
                    ) : (
                      <div className="vd-card-variantes">
                        {p.variantes.map((v) => (
                          <button
                            key={v.id_variante}
                            className="vd-card-agregar vd-card-agregar--chico"
                            disabled={!v.stock || v.stock <= 0}
                            onClick={() => agregarAlCarrito(p, v)}
                          >
                            <span className="vd-variante-nombre">{v.nombre_variante}</span>
                            <span>${Number(v.precio_venta || 0).toLocaleString("es-AR")}</span>
                            <span className="vd-card-stock">
                              {v.stock > 0 ? `Stock: ${v.stock}` : "Sin stock"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="vd-panel-carrito">
          <div className="vd-carrito-header">
            <h2>🛒 Carrito</h2>
            {carrito.length > 0 && (
              <button className="btn-limpiar" onClick={limpiarCarrito}>✕ Vaciar</button>
            )}
          </div>

          <div className="vd-cliente-selector">
            <div className="vd-cliente-toggle">
              <button
                className={modoCliente === "consumidor_final" ? "vd-toggle-activo" : ""}
                onClick={elegirModoConsumidorFinal}
              >
                Consumidor Final
              </button>
              <button
                className={modoCliente === "registrado" ? "vd-toggle-activo" : ""}
                onClick={() => setBuscadorClienteAbierto(true)}
              >
                Cliente registrado
              </button>
            </div>

            {modoCliente === "registrado" && clienteSeleccionado && (
              <div className="vd-cliente-elegido">
                👤 {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                {clienteSeleccionado.dni ? ` — DNI ${clienteSeleccionado.dni}` : ""}
                <button onClick={() => setBuscadorClienteAbierto(true)}>Cambiar</button>
              </div>
            )}

            {modoCliente === "registrado" && clienteSeleccionado && (
              <div className="vd-cobro-selector">
                <div className="vd-cliente-toggle">
                  <button
                    className={tipoCobro === "contado" ? "vd-toggle-activo" : ""}
                    onClick={() => { setTipoCobro("contado"); setEntrega(""); }}
                  >
                    Contado
                  </button>
                  <button
                    className={tipoCobro === "cuenta_corriente" ? "vd-toggle-activo" : ""}
                    onClick={() => setTipoCobro("cuenta_corriente")}
                  >
                    Cuenta corriente
                  </button>
                </div>

                {tipoCobro === "cuenta_corriente" && (
                  <div className="field-group vd-entrega">
                    <label>Entrega ahora (0 = todo a cuenta corriente)</label>
                    <input
                      type="number"
                      min="0"
                      max={total}
                      step="0.01"
                      value={entrega}
                      onChange={(e) => setEntrega(e.target.value)}
                      placeholder="0"
                    />
                    <span className="vd-entrega-resto">
                      Queda a cuenta: $
                      {Math.max(0, total - Number(entrega || 0)).toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {buscadorClienteAbierto && (
              <div className="vd-cliente-buscador">
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nombre o DNI..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                />
                <ul>
                  {clientesFiltrados.length === 0 ? (
                    <li className="vd-cliente-sin-resultados">Sin resultados</li>
                  ) : (
                    clientesFiltrados.map((c) => (
                      <li key={c.id_usuario}>
                        <button onClick={() => elegirCliente(c)}>
                          {c.nombre} {c.apellido}
                          {c.dni ? ` — DNI ${c.dni}` : ""}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <button
                  className="vd-cliente-cerrar"
                  onClick={() => setBuscadorClienteAbierto(false)}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>

          {exitoVenta && <div className="alerta-exito">✅ {exitoVenta}</div>}
          {errorVenta && <div className="alerta-error">⚠️ {errorVenta}</div>}

          {carrito.length === 0 ? (
            <div className="vd-carrito-vacio">
              <span>🛒</span>
              <p>Agregá productos desde el catálogo</p>
            </div>
          ) : (
            <div className="vd-lineas-carrito">
              {carrito.map((l, idx) => (
                <div className="vd-linea-carrito" key={`${l.id_producto}-${l.id_variante}`}>
                  <div className="vd-linea-info">
                    <span className="vd-linea-nombre">
                      {l.nombre}
                      {l.nombre_variante ? ` (${l.nombre_variante})` : ""}
                    </span>
                    <div className="vd-linea-precio-wrap">
                      <span>$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.precio_unitario}
                        onChange={(e) => cambiarPrecio(idx, e.target.value)}
                        className="vd-linea-precio"
                      />
                      <span className="vd-linea-subtotal">
                        = ${(Number(l.cantidad) * Number(l.precio_unitario || 0)).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                  <div className="vd-linea-cantidad">
                    <button onClick={() => cambiarCantidad(idx, -1)}>−</button>
                    <span>{l.cantidad}</span>
                    <button onClick={() => cambiarCantidad(idx, 1)}>+</button>
                  </div>
                  <button className="btn-eliminar-linea" onClick={() => quitarLinea(idx)}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          <div className="vd-carrito-footer">
            <div className="field-group">
              <label>Forma de pago *</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                <option value="">Seleccioná...</option>
                {FORMAS_PAGO.map((f) => (
                  <option key={f} value={f}>{FORMA_PAGO_ICONO[f]} {f}</option>
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

            <div className="vd-total">
              Total: <strong>${total.toLocaleString("es-AR")}</strong>
            </div>

            <button
              className="btn-primario vd-btn-confirmar"
              onClick={handleRegistrarVenta}
              disabled={registrando || carrito.length === 0}
            >
              {registrando ? "Registrando..." : "Confirmar venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}